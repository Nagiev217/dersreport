// Transliterates Cyrillic person names (typed in Russian, the app's default
// input language) into Latin script for az/en UI locales — e.g. "Асиф" → "Asif".
//
// Two layers:
//   1. NAME_OVERRIDES — exact known first-name/surname spellings where a plain
//      letter-by-letter conversion would be wrong (e.g. "Гусейнов" needs an
//      H, not a G: "Huseynov").
//   2. A generic Cyrillic→Latin letter map as the fallback for any other name.

const CYR_MAP = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh",
  щ: "shch", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
};

// Lowercased Cyrillic → correctly-cased Latin, for names/surnames where the
// generic map would mislead (missing h-sound, dj-sound, doubled consonants…).
const NAME_OVERRIDES = {
  "гусейнов": "Huseynov", "гусейнова": "Huseynova",
  "гусейн": "Huseyn", "гюсейн": "Huseyn",
  "ибрагимов": "Ibrahimov", "ибрагимова": "Ibrahimova", "ибрагим": "Ibrahim",
  "джамиль": "Jamil", "джамал": "Jamal", "джавид": "Javid",
  "мамедов": "Mammadov", "мамедова": "Mammadova", "мамед": "Mammad",
  "гейдаров": "Heydarov", "гейдарова": "Heydarova", "гейдар": "Heydar",
  "гасанов": "Hasanov", "гасанова": "Hasanova", "гасан": "Hasan",
  "гусейнли": "Huseynli",
  "нагиев": "Nagiyev", "нагиева": "Nagiyeva",
  "рзаев": "Rzayev", "рзаева": "Rzayeva",
  "алиев": "Aliyev", "алиева": "Aliyeva",
  "гулиев": "Guliyev", "гулиева": "Guliyeva",
  "джафаров": "Jafarov", "джафарова": "Jafarova",
};

function transliterateWord(word) {
  // split off trailing punctuation (e.g. the "." in an initial "Н.")
  const m = word.match(/^(.*?)([.,;:!?]*)$/s);
  const core = m[1];
  const trail = m[2];
  if (!core) return word;

  const override = NAME_OVERRIDES[core.toLowerCase()];
  if (override) return override + trail;

  // "дж" digraph → j (before per-letter mapping, so it isn't split apart)
  const prepped = core.replace(/дж/g, "j").replace(/Дж/g, "J").replace(/ДЖ/g, "J");

  let result = "";
  for (let i = 0; i < prepped.length; i++) {
    const ch = prepped[i];
    const lower = ch.toLowerCase();
    let mapped = CYR_MAP[lower];
    if (mapped === undefined) {
      result += ch; // not Cyrillic (already Latin, digit, etc.) — keep as-is
      continue;
    }
    if (lower === "е" && i === 0) mapped = "ye"; // word-initial е → ye
    const isUpper = ch !== ch.toLowerCase() && ch === ch.toUpperCase();
    if (isUpper && mapped) mapped = mapped[0].toUpperCase() + mapped.slice(1);
    result += mapped;
  }
  return result + trail;
}

const HAS_CYRILLIC = /[а-яёА-ЯЁ]/;

// Transliterates a full name ("Асиф Мамедов", "Турал Н.") word by word,
// preserving hyphens, spaces and punctuation. Non-Cyrillic input passes through.
export function transliterateName(fullName) {
  if (!fullName || !HAS_CYRILLIC.test(fullName)) return fullName;
  return fullName
    .split(" ")
    .map((word) => word.split("-").map(transliterateWord).join("-"))
    .join(" ");
}
