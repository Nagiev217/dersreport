import { useLangStore } from "./store";
import { translations, PLURAL } from "./translations";
import { transliterateName } from "./transliterate";

// Russian pluralization: 1→форма0, 2-4→форма1, 5+→форма2
function ruPlural(count, forms) {
  const n = Math.abs(count) % 100;
  if (n >= 11 && n <= 19) return forms[2];
  const r = n % 10;
  if (r === 1) return forms[0];
  if (r >= 2 && r <= 4) return forms[1];
  return forms[2];
}

export function useT() {
  const lang = useLangStore((s) => s.lang);
  const dict = translations[lang] ?? translations.ru;
  const base = translations.ru;

  // Translate a string key, with optional {var} interpolation
  function t(key, vars) {
    let str = dict[key] ?? base[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), v);
      });
    }
    return str;
  }

  // Plural form for a count + plural key (from PLURAL map)
  function tp(count, key) {
    const entry = PLURAL[key];
    if (!entry) return key;
    if (lang === "az") return entry.az;
    if (lang === "en") return count === 1 ? entry.en[0] : entry.en[1];
    return ruPlural(count, entry.ru);
  }

  // Get month names array
  function months(short = false) {
    return dict[short ? "monthsShort" : "monthsFull"] ?? base[short ? "monthsShort" : "monthsFull"];
  }

  // Get day names array (Mon-Sun). Pass short=false for full weekday names.
  function days(short = true) {
    const key = short ? "daysShort" : "daysFull";
    return dict[key] ?? base[key];
  }

  // Translate a stored subject/lesson-type value ("IELTS", "SAT", "General" are
  // language-neutral and pass through as-is; only "Английский" has a real translation).
  function tSubject(value) {
    if (value === "Английский") return t("addLessonSubjectEnglish");
    return value;
  }

  // Translate a stored student payment-type value ("Почасовая" / "За урок" / "Месячная")
  const PAYMENT_TYPE_KEYS = {
    "Почасовая": "addStudentPayHourly",
    "За урок":   "addStudentPayLesson",
    "Месячная":  "addStudentPayMonthly",
  };
  function tPaymentType(value) {
    const key = PAYMENT_TYPE_KEYS[value];
    return key ? t(key) : value;
  }

  // Transliterate a person's name to Latin script for az/en UI (e.g. "Асиф" → "Asif").
  // Russian stays as typed, since Cyrillic is its native script.
  function tName(value) {
    if (lang === "ru") return value;
    return transliterateName(value);
  }

  // Join a list of names with ", " — strips the trailing "." abbreviation dot
  // from every name except the last, so "Асиф., Али." reads as "Асиф, Али."
  function tNameList(names) {
    const list = (names ?? []).filter(Boolean).map(tName);
    return list
      .map((n, i) => (i < list.length - 1 ? n.replace(/\.+\s*$/, "") : n))
      .join(", ");
  }

  return { t, tp, tSubject, tPaymentType, tName, tNameList, months, days, lang };
}

// Returns a locale object compatible with dateUtils functions
export function useDateLocale() {
  const { t, months, days } = useT();
  return {
    today:      t("today"),
    tomorrow:   t("tomorrow"),
    monthsShort: months(true),
    monthsFull:  months(false),
    daysShort:   days(),
  };
}

export { useLangStore } from "./store";
