import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

const pad = (n) => String(n).padStart(2, "0");

export function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// dayOfWeek uses JS getDay() convention: 0=Sun, 1=Mon, ..., 6=Sat
export const DAYS_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
export const DAYS_FULL = [
  "Воскресенье", "Понедельник", "Вторник", "Среда",
  "Четверг", "Пятница", "Суббота",
];

export const FREQ_OPTIONS = [
  { value: "weekly", label: "Еженедельно" },
  { value: "biweekly", label: "Раз в 2 нед." },
  { value: "monthly", label: "Ежемесячно" },
  { value: "odd", label: "Нечётные дни" },
  { value: "even", label: "Чётные дни" },
];

// odd/even = lessons on odd/even calendar days of the month (common AZ school
// convention), ignoring dayOfWeek. All other frequencies step by a fixed
// Deterministic per-schedule base for generated lessons' createdAt, so
// regenerating a schedule doesn't churn their ordering. Hashes the whole id:
// the previous version read a single character at index 4, which for ids
// shaped `sch-<timestamp>-…` is always the first digit of Date.now() — a
// constant in practice, so lessons from different schedules were handed
// identical createdAt values. Scaled by 100 to leave room for the per-lesson
// index added on top (schedules cap out at 52 lessons).
function scheduleBaseTs(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000000;
  return 1750100000000 + h * 100;
}

// number of days from the first matching weekday.
export function generateLessonsForSchedule(schedule) {
  const start = new Date(schedule.startDate + "T12:00:00");
  const endDate = schedule.endDate
    ? new Date(schedule.endDate + "T23:59:59")
    : null;
  const maxCount = schedule.lessonsCount ?? 52;
  const baseTs = scheduleBaseTs(schedule.id);
  const isParity = schedule.frequency === "odd" || schedule.frequency === "even";
  const wantOdd = schedule.frequency === "odd";

  const freqDays =
    schedule.frequency === "weekly" ? 7
    : schedule.frequency === "biweekly" ? 14
    : schedule.frequency === "monthly" ? 28
    : typeof schedule.frequency === "number" ? schedule.frequency
    : 7;

  let current = new Date(start.getTime());
  if (isParity) {
    // Advance to the first day matching the requested parity.
    while (current.getDate() % 2 !== (wantOdd ? 1 : 0)) {
      current.setDate(current.getDate() + 1);
    }
  } else {
    // Advance to first occurrence of the target day of week.
    while (current.getDay() !== schedule.dayOfWeek) {
      current.setDate(current.getDate() + 1);
    }
  }

  const lessons = [];
  let count = 0;

  while (count < maxCount) {
    if (endDate && current > endDate) break;
    // Safety bound for parity mode (steps day-by-day, could run long).
    if (isParity && (current.getTime() - start.getTime()) > 366 * 86400000) break;

    lessons.push({
      id: `sched-${schedule.id}-${count}`,
      scheduleId: schedule.id,
      subject: schedule.subject,
      studentIds: schedule.studentIds,
      studentNames: schedule.studentNames,
      date: toDateStr(current),
      time: schedule.time,
      duration: schedule.duration,
      format: schedule.format ?? "Онлайн",
      status: "planned",
      notes: "",
      homework: "",
      createdAt: baseTs + count,
    });

    count++;
    if (isParity) {
      // Step to the next day of the same parity: +2 keeps parity within a
      // month; at month boundaries the parity can flip, so re-align.
      current.setDate(current.getDate() + 2);
      while (current.getDate() % 2 !== (wantOdd ? 1 : 0)) {
        current.setDate(current.getDate() + 1);
      }
    } else {
      current.setDate(current.getDate() + freqDays);
    }
  }

  return lessons;
}

export function findConflicts(newLessons, existingLessons) {
  const conflicts = [];
  for (const newL of newLessons) {
    const ns = new Date(`${newL.date}T${newL.time}:00`).getTime();
    const ne = ns + (newL.duration ?? 60) * 60000;
    for (const ex of existingLessons) {
      if (ex.date !== newL.date || ex.status === "cancelled") continue;
      const es = new Date(`${ex.date}T${ex.time}:00`).getTime();
      const ee = es + (ex.duration ?? 60) * 60000;
      if (ns < ee && ne > es) {
        conflicts.push({ lesson: newL, conflictWith: ex });
        break;
      }
    }
  }
  return conflicts;
}

export const useScheduleStore = create(
  persist(
    (set) => ({
      schedules: [],

      addSchedule: (schedule) =>
        set((state) => ({ schedules: [...state.schedules, schedule] })),

      updateSchedule: (id, updates) =>
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      deleteSchedule: (id) =>
        set((state) => ({
          schedules: state.schedules.filter((s) => s.id !== id),
        })),
    }),
    {
      name: "schedule-storage-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
