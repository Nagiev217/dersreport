// ─── Month/date helpers ───────────────────────────────────────────────────────

const MONTHS_RU_MAP = {
  Январь: 0, Февраль: 1, Март: 2, Апрель: 3,
  Май: 4, Июнь: 5, Июль: 6, Август: 7,
  Сентябрь: 8, Октябрь: 9, Ноябрь: 10, Декабрь: 11,
};

export const MONTHS_SHORT = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

export function parseJoinDate(str) {
  if (!str) return new Date(2024, 0, 1);
  const parts = str.trim().split(" ");
  const month = MONTHS_RU_MAP[parts[0]] ?? 0;
  const year = parseInt(parts[1]) || 2024;
  return new Date(year, month, 1);
}

export function monthsBetween(d1, d2) {
  return Math.max(
    0,
    (d2.getFullYear() - d1.getFullYear()) * 12 +
      (d2.getMonth() - d1.getMonth())
  );
}

// ─── Period filter ────────────────────────────────────────────────────────────

export const PERIODS = ["Сегодня", "Неделя", "Месяц", "Год", "Всё время"];

export function getPeriodBounds(period) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  if (period === "Сегодня") {
    return { start: todayStr, end: todayStr };
  }
  if (period === "Неделя") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    const start = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { start, end: todayStr };
  }
  if (period === "Месяц") {
    const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    return { start, end: todayStr };
  }
  if (period === "Год") {
    const start = `${now.getFullYear()}-01-01`;
    return { start, end: todayStr };
  }
  return { start: "2000-01-01", end: todayStr };
}

export function inPeriod(dateStr, bounds) {
  return dateStr >= bounds.start && dateStr <= bounds.end;
}

// ─── Income calculations ──────────────────────────────────────────────────────

export function incomePerLesson(student, durationMin = 60) {
  if (!student) return 0;
  const rate = student.rate ?? 0;
  if (student.paymentType === "Почасовая") return rate * (durationMin / 60);
  if (student.paymentType === "За урок") return rate;
  if (student.paymentType === "Месячная") return rate / 8; // ~8 lessons/month
  return 0;
}

export function computeLessonIncome(lesson, studentsMap) {
  return (lesson.studentIds ?? []).reduce((total, sid) => {
    const s = studentsMap[sid];
    return total + incomePerLesson(s, lesson.duration ?? 60);
  }, 0);
}

// All-time income from student data (since lessons store is limited to recent data)
export function computeAllTimeIncome(students) {
  const now = new Date();
  return students.reduce((total, s) => {
    if (s.paymentType === "Месячная") {
      const joinDate = parseJoinDate(s.joinDate);
      const months = Math.max(monthsBetween(joinDate, now), 1);
      return total + (s.rate ?? 0) * months;
    }
    const perLesson = incomePerLesson(s, 60);
    return total + perLesson * (s.lessonsCompleted ?? 0);
  }, 0);
}

// Income from lessons store filtered by period
export function computePeriodIncome(lessons, studentsMap, bounds) {
  return lessons
    .filter((l) => l.status === "completed" && inPeriod(l.date, bounds))
    .reduce((total, l) => total + computeLessonIncome(l, studentsMap), 0);
}

// ─── Monthly chart data (last N months) ──────────────────────────────────────

export function getMonthlyIncomeData(students, lessons, months = 6) {
  const now = new Date();
  const studentsMap = Object.fromEntries(students.map((s) => [s.id, s]));

  return Array.from({ length: months }, (_, i) => {
    const monthsBack = months - 1 - i;
    const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const year = d.getFullYear();
    const month = d.getMonth();

    // Real income from lessons store for this month
    const fromLessons = lessons
      .filter((l) => {
        if (l.status !== "completed") return false;
        const ld = new Date(l.date);
        return ld.getFullYear() === year && ld.getMonth() === month;
      })
      .reduce((sum, l) => sum + computeLessonIncome(l, studentsMap), 0);

    // Estimated income from student data (for months without lesson store data)
    const estimated = students.reduce((sum, s) => {
      const joinDate = parseJoinDate(s.joinDate);
      if (joinDate > d) return sum; // Student not yet enrolled
      if (s.paymentType === "Месячная") return sum + (s.rate ?? 0);
      const totalMonths = Math.max(monthsBetween(joinDate, now), 1);
      const avgLessonsPerMonth = (s.lessonsCompleted ?? 0) / totalMonths;
      return sum + avgLessonsPerMonth * incomePerLesson(s, 60);
    }, 0);

    const value = Math.round(fromLessons > 0 ? fromLessons : estimated);
    return { value, label: MONTHS_SHORT[month], year, month };
  });
}

export function getMonthlyLessonData(students, lessons, months = 6) {
  const now = new Date();

  return Array.from({ length: months }, (_, i) => {
    const monthsBack = months - 1 - i;
    const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const year = d.getFullYear();
    const month = d.getMonth();

    // Real count from lessons store
    const fromLessons = lessons.filter((l) => {
      const ld = new Date(l.date);
      return ld.getFullYear() === year && ld.getMonth() === month && l.status !== "cancelled";
    }).length;

    // Estimated from student data
    const estimated = students.reduce((sum, s) => {
      const joinDate = parseJoinDate(s.joinDate);
      if (joinDate > d) return sum;
      const totalMonths = Math.max(monthsBetween(joinDate, now), 1);
      return sum + (s.lessonsCompleted ?? 0) / totalMonths;
    }, 0);

    const value = Math.round(fromLessons > 0 ? fromLessons : estimated);
    return { value, label: MONTHS_SHORT[month], year, month };
  });
}

// ─── Student metrics ──────────────────────────────────────────────────────────

export function getStudentRanking(students, key, limit = 5) {
  return [...students]
    .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))
    .slice(0, limit);
}

export function getAttendanceDistribution(students) {
  const high = students.filter((s) => (s.attendance ?? 0) >= 90).length;
  const mid = students.filter((s) => (s.attendance ?? 0) >= 70 && (s.attendance ?? 0) < 90).length;
  const low = students.filter((s) => (s.attendance ?? 0) < 70).length;
  return [
    { label: "Высокая (≥90%)", value: high, color: "#22C55E" },
    { label: "Средняя (70–89%)", value: mid, color: "#F59E0B" },
    { label: "Низкая (<70%)", value: low, color: "#EF4444" },
  ];
}

// ─── Lesson metrics ───────────────────────────────────────────────────────────

export function getLessonMetrics(lessons, bounds) {
  const periodLessons = lessons.filter((l) => inPeriod(l.date, bounds));
  const completed = periodLessons.filter((l) => l.status === "completed");
  const cancelled = periodLessons.filter((l) => l.status === "cancelled");
  const planned = periodLessons.filter((l) => l.status === "planned");

  const avgDuration =
    completed.length > 0
      ? Math.round(completed.reduce((s, l) => s + (l.duration ?? 60), 0) / completed.length)
      : 0;

  return {
    total: periodLessons.length,
    completed: completed.length,
    cancelled: cancelled.length,
    planned: planned.length,
    avgDuration,
  };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatAZN(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value).toString();
}

export function formatInt(value) {
  return Math.round(value).toString();
}
