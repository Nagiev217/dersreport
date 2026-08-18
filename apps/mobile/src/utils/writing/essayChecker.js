// ─────────────────────────────────────────────────────────────────────────
// IELTS Writing AI checker (student-facing).
//
// The public entry point is `checkEssay({ text, task })` → Promise<result>.
// Today it runs a fully on-device heuristic engine (no external API, works
// offline, zero cost). The async signature is deliberate: swapping to a real
// LLM later means replacing the body of `checkEssay` with a call to a Cloud
// Function (e.g. httpsCallable(fns, 'checkEssay')) — nothing else in the app
// changes, because callers already `await` this and read the same shape.
//
// Bands follow the four official IELTS criteria (0–9, half-points). Scores &
// quoted phrases stay in English; all advice is written in Russian so it is
// clear to the students (bilingual, per product decision).
//
// Result shape:
// {
//   task, wordCount, targetWords, overall,
//   criteria: [{ key, band, titleEn, subtitleRu, adviceRu: [..] }],  // ×4
//   strengthsRu: [..], improvementsRu: [..], summaryRu
// }
// ─────────────────────────────────────────────────────────────────────────

import { ieltsOverall } from "./store";

const TARGET = { 1: 150, 2: 250 }; // IELTS minimum word counts

// Common cohesive devices — presence & variety feed Coherence & Cohesion.
const LINKERS = [
  "however", "therefore", "moreover", "furthermore", "nevertheless",
  "consequently", "in addition", "for instance", "for example", "on the other hand",
  "in contrast", "as a result", "firstly", "secondly", "finally", "in conclusion",
  "to conclude", "overall", "in summary", "on the whole", "besides", "whereas",
  "although", "despite", "in spite of", "meanwhile", "similarly", "likewise",
];

// Subordinators / connectors — density feeds Grammatical Range (complex sentences).
const COMPLEX_MARKERS = [
  "because", "although", "though", "whereas", "while", "which", "whom", "whose",
  "that", "since", "unless", "if", "when", "despite", "however", "therefore",
  "moreover", "furthermore", "nevertheless", "consequently", "who",
];

const clampBand = (n) => Math.max(3, Math.min(9, Math.round(n * 2) / 2));

function tokenizeWords(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || []);
}
function splitSentences(text) {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
}
function splitParagraphs(text) {
  const parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : (text.trim() ? [text.trim()] : []);
}
function countMatches(lowerText, phrases) {
  let n = 0;
  const found = new Set();
  for (const p of phrases) {
    const re = new RegExp(`\\b${p.replace(/ /g, "\\s+")}\\b`, "g");
    const m = lowerText.match(re);
    if (m) { n += m.length; found.add(p); }
  }
  return { count: n, distinct: found.size };
}
function stdev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const v = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  return Math.sqrt(v);
}

// Cheap, high-precision error heuristics (avoid false positives — we only flag
// things that are almost always genuine mistakes).
function detectErrors(text, sentences) {
  const errors = [];
  const standaloneI = text.match(/(^|[^A-Za-z])i([^A-Za-z]|$)/g);
  if (standaloneI && standaloneI.length) {
    errors.push({ ru: 'Местоимение «I» всегда пишется с заглавной буквы.', example: 'i think → I think' });
  }
  const dup = text.toLowerCase().match(/\b(\w+)\s+\1\b/);
  if (dup) errors.push({ ru: `Повтор слова подряд: «${dup[0]}».`, example: dup[0] });

  const lowerStart = sentences.filter((s) => /^[a-z]/.test(s)).length;
  if (lowerStart > 0) {
    errors.push({ ru: `Предложение(й) с маленькой буквы: ${lowerStart}. Начинай предложение с заглавной.`, example: null });
  }
  const runOns = sentences.filter((s) => tokenizeWords(s).length > 40).length;
  if (runOns > 0) {
    errors.push({ ru: `Слишком длинные предложения (${runOns}): разбей их, чтобы избежать run-on.`, example: null });
  }
  const trimmed = text.trim();
  if (trimmed && !/[.!?]$/.test(trimmed)) {
    errors.push({ ru: 'Текст не заканчивается точкой (. ! ?).', example: null });
  }
  return errors;
}

// ── Per-criterion scoring ─────────────────────────────────────────────────

function scoreTask({ wordCount, target, paraCount }) {
  const ratio = wordCount / target;
  let band;
  if (ratio >= 1) band = 7;
  else if (ratio >= 0.9) band = 6;
  else if (ratio >= 0.75) band = 5;
  else if (ratio >= 0.5) band = 4;
  else band = 3;
  if (paraCount >= 3) band += 0.5; // intro / body / conclusion structure
  if (paraCount >= 4) band += 0.5;

  const advice = [];
  if (ratio < 1) advice.push(`Объём: ${wordCount} из ${target} слов. Недобор снижает балл — допиши минимум до ${target}.`);
  else advice.push(`Объём в норме (${wordCount}/${target} слов) — так держать.`);
  if (paraCount < 3) advice.push('Раздели работу на абзацы: вступление, 2 основных абзаца, вывод.');
  advice.push('Убедись, что ответил на ВСЕ части задания и высказал чёткую позицию (для Task 2).');
  return { band: clampBand(band), advice };
}

function scoreCoherence({ paraCount, linkerCount, linkerDistinct, sentenceCount }) {
  let band = 5;
  if (paraCount >= 3) band += 1;
  if (paraCount >= 4) band += 0.5;
  const density = sentenceCount ? linkerCount / sentenceCount : 0;
  if (linkerCount === 0) band -= 1.5;
  else if (density > 2) band -= 0.5;      // over-stuffed with connectors
  else if (density >= 0.25) band += 1;
  if (linkerDistinct >= 5) band += 0.5;

  const advice = [];
  if (linkerCount === 0) advice.push('Нет связок между идеями. Добавь: however, therefore, in addition, for example.');
  else if (density > 2) advice.push('Слишком много связок — они теряют смысл. Используй их дозированно.');
  else advice.push(`Связки использованы (${linkerDistinct} разных) — старайся не повторять одни и те же.`);
  if (paraCount < 3) advice.push('Каждую новую мысль начинай с нового абзаца — это улучшает связность.');
  advice.push('Используй referencing (this, these, such, it), чтобы связывать предложения.');
  return { band: clampBand(band), advice };
}

function scoreLexical({ ttr, avgWordLen, wordCount }) {
  let band = 5;
  if (ttr >= 0.5) band += 1.5;
  else if (ttr >= 0.42) band += 1;
  else if (ttr >= 0.34) band += 0.5;
  else band -= 0.5; // repetitive vocabulary
  if (avgWordLen >= 4.8) band += 0.5;
  if (wordCount < 80) band -= 0.5; // too short to show range

  const advice = [];
  if (ttr < 0.4) advice.push('Словарь однообразный — избегай повторов, используй синонимы (например good → beneficial, effective).');
  else advice.push('Хорошее разнообразие лексики. Добавляй тематические collocations (make a decision, play a role).');
  advice.push('Используй менее частотные слова там, где уместно, но не в ущерб точности.');
  advice.push('Проверяй word form: e.g. «benefit» (сущ.) vs «beneficial» (прил.).');
  return { band: clampBand(band), advice };
}

function scoreGrammar({ complexRatio, varietyStdev, errorCount }) {
  let band = 5;
  if (complexRatio >= 0.3) band += 1;
  else if (complexRatio >= 0.15) band += 0.5;
  if (varietyStdev >= 4) band += 0.5;
  band -= Math.min(2, errorCount * 0.4);

  const advice = [];
  if (complexRatio < 0.2) advice.push('Мало сложных предложений. Используй because / although / which, чтобы объединять идеи.');
  else advice.push('Есть сложные конструкции — хорошо для критерия Grammatical Range.');
  advice.push('Чередуй короткие и длинные предложения — это повышает variety.');
  advice.push('Перечитай на ошибки в артиклях (a/an/the) и согласовании времён.');
  return { band: clampBand(band), advice };
}

// ── Public API ────────────────────────────────────────────────────────────

export async function checkEssay({ text, task = 2 }) {
  const clean = (text || "").trim();
  const target = TARGET[task] ?? 250;

  const words = tokenizeWords(clean);
  const wordCount = words.length;
  const sentences = splitSentences(clean);
  const sentenceCount = sentences.length;
  const paragraphs = splitParagraphs(clean);
  const paraCount = paragraphs.length;

  const uniqueWords = new Set(words.slice(0, 220)); // TTR on a capped window
  const ttr = wordCount ? uniqueWords.size / Math.min(wordCount, 220) : 0;
  const avgWordLen = wordCount ? words.reduce((a, w) => a + w.length, 0) / wordCount : 0;

  const lower = clean.toLowerCase();
  const link = countMatches(lower, LINKERS);
  const cx = countMatches(lower, COMPLEX_MARKERS);
  const complexSentences = sentences.filter((s) =>
    COMPLEX_MARKERS.some((m) => new RegExp(`\\b${m}\\b`).test(s.toLowerCase()))
  ).length;
  const complexRatio = sentenceCount ? complexSentences / sentenceCount : 0;
  const sentLengths = sentences.map((s) => tokenizeWords(s).length);
  const varietyStdev = stdev(sentLengths);
  const errors = detectErrors(clean, sentences);

  const t = scoreTask({ wordCount, target, paraCount });
  const c = scoreCoherence({ paraCount, linkerCount: link.count, linkerDistinct: link.distinct, sentenceCount });
  const l = scoreLexical({ ttr, avgWordLen, wordCount });
  const g = scoreGrammar({ complexRatio, varietyStdev, errorCount: errors.length });

  const overall = ieltsOverall(t.band, c.band, l.band, g.band);

  const criteria = [
    { key: "task", titleEn: task === 1 ? "Task Achievement" : "Task Response", subtitleRu: "Ответ на задание", band: t.band, adviceRu: t.advice },
    { key: "coherence", titleEn: "Coherence & Cohesion", subtitleRu: "Связность текста", band: c.band, adviceRu: c.advice },
    { key: "lexical", titleEn: "Lexical Resource", subtitleRu: "Словарный запас", band: l.band, adviceRu: l.advice },
    { key: "grammar", titleEn: "Grammatical Range & Accuracy", subtitleRu: "Грамматика", band: g.band, adviceRu: g.advice },
  ];

  // Strengths / improvements — driven by the highest & lowest bands.
  const sorted = [...criteria].sort((a, b) => b.band - a.band);
  const strengthsRu = [];
  const improvementsRu = [];
  if (sorted[0].band >= 6) strengthsRu.push(`Сильная сторона: ${sorted[0].titleEn} (${sorted[0].band.toFixed(1)}).`);
  if (wordCount >= target) strengthsRu.push('Объём соответствует требованиям IELTS.');
  if (paraCount >= 3) strengthsRu.push('Хорошая структура по абзацам.');
  improvementsRu.push(`Что улучшить в первую очередь: ${sorted[3].titleEn} (${sorted[3].band.toFixed(1)}).`);
  if (errors.length) improvementsRu.push(...errors.map((e) => e.ru));
  if (!strengthsRu.length) strengthsRu.push('Продолжай практиковаться — есть над чем работать по всем критериям.');

  const summaryRu =
    `Предварительная оценка: Band ${overall.toFixed(1)} (из 9). ` +
    `Это ориентир от учебного алгоритма, не официальный балл. ` +
    `Финальную оценку ставит преподаватель.`;

  return { task, wordCount, targetWords: target, overall, criteria, strengthsRu, improvementsRu, summaryRu, errors };
}
