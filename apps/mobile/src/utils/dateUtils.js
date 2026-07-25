const MONTH_SHORT_RU = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];
const MONTH_FULL_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const DAY_SHORT_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

// locale shape: { today, tomorrow, monthsShort, monthsFull, daysShort }
// All fields are optional — falls back to Russian defaults.

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayStr() {
  return toDateStr(new Date());
}

export function isToday(dateStr) {
  return dateStr === todayStr();
}

export function isTomorrow(dateStr) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateStr === toDateStr(tomorrow);
}

export function isPast(dateStr) {
  return dateStr < todayStr();
}

// "Сегодня" | "Завтра" | "14 июн"
export function formatDateShort(dateStr, locale = {}) {
  const { today = "Сегодня", tomorrow = "Завтра", monthsShort = MONTH_SHORT_RU } = locale;
  if (isToday(dateStr)) return today;
  if (isTomorrow(dateStr)) return tomorrow;
  const d = parseDate(dateStr);
  return `${d.getDate()} ${monthsShort[d.getMonth()]}`;
}

// "Сегодня" | "Завтра" | "14 июня, Пт"
export function formatDateFull(dateStr, locale = {}) {
  const { today = "Сегодня", tomorrow = "Завтра", monthsFull = MONTH_FULL_RU, daysShort = DAY_SHORT_RU } = locale;
  if (isToday(dateStr)) return today;
  if (isTomorrow(dateStr)) return tomorrow;
  const d = parseDate(dateStr);
  return `${d.getDate()} ${monthsFull[d.getMonth()]}, ${daysShort[d.getDay()]}`;
}

// "Пн" | "Вт" | ...
export function formatDayName(date, locale = {}) {
  const { daysShort = DAY_SHORT_RU } = locale;
  return daysShort[date.getDay()];
}

// "14" (day number)
export function formatDayNum(date) {
  return String(date.getDate());
}

// "июн" | "июл" | ...
export function formatMonthShort(date, locale = {}) {
  const { monthsShort = MONTH_SHORT_RU } = locale;
  return monthsShort[date.getMonth()];
}

// Generate next N days starting from today
export function getNextDays(count = 14) {
  const days = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push(d);
  }
  return days;
}

// Generates half-hour slots from startHour to endHour inclusive
export function getTimeSlots(startHour = 6, endHour = 22) {
  const slots = [];
  for (let h = startHour; h <= endHour; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < endHour) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}
