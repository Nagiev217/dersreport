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
  "Воскресенье", "Понедельник", "Вторник", "Среда",ф
  "Четверг", "Пятница", "Суббота",
];

export const FREQ_OPTIONS = [
  { value: "weekly", label: "Еженедельно" },
  { value: "biweekly", label: "Раз в 2 нед." },
  { value: "monthly", label: "Ежемесячно" },
];

export function generateLessonsForSchedule(schedule) {
  const freqDays =
    schedule.frequency === "weekly" ? 7
    : schedule.frequency === "biweekly" ? 14
    : schedule.frequency === "monthly" ? 28
    : typeof schedule.frequency === "number" ? schedule.frequency
    : 7;

  const start = new Date(schedule.startDate + "T12:00:00");
  let current = new Date(start.getTime());

  // Advance to first occurrence of the target day of week
  while (current.getDay() !== schedule.dayOfWeek) {
    current.setDate(current.getDate() + 1);
  }

  const endDate = schedule.endDate
    ? new Date(schedule.endDate + "T23:59:59")
    : null;
  const maxCount = schedule.lessonsCount ?? 52;

  const lessons = [];
  let count = 0;
  const baseTs = 1750100000000 + (schedule.id.charCodeAt(4) ?? 0);

  while (count < maxCount) {
    if (endDate && current > endDate) break;

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
    current.setDate(current.getDate() + freqDays);
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
