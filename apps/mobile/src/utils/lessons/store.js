import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

const pad = (n) => String(n).padStart(2, "0");

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const INITIAL_LESSONS = [
  {
    id: "mock-lesson-1",
    subject: "IELTS",
    studentIds: ["1"],
    studentNames: ["Айсель М."],
    date: offsetDate(0),
    time: "16:30",
    duration: 60,
    format: "Онлайн",
    status: "planned",
    notes: "",
    homework: "Writing Task 2 — эссе на тему Environment",
    createdAt: 1718000001000,
  },
  {
    id: "mock-lesson-2",
    subject: "SAT",
    studentIds: ["3"],
    studentNames: ["Лейла К."],
    date: offsetDate(1),
    time: "15:30",
    duration: 90,
    format: "Онлайн",
    status: "planned",
    notes: "Работаем над Math секцией",
    homework: "Решить 20 задач по алгебре из рабочей тетради",
    createdAt: 1718000002000,
  },
  {
    id: "mock-lesson-3",
    subject: "General",
    studentIds: ["2"],
    studentNames: ["Турал Н."],
    date: offsetDate(1),
    time: "17:00",
    duration: 60,
    format: "Офлайн",
    status: "planned",
    notes: "",
    homework: "",
    createdAt: 1718000003000,
  },
  {
    id: "mock-lesson-4",
    subject: "IELTS",
    studentIds: ["4"],
    studentNames: ["Али Н."],
    date: offsetDate(3),
    time: "13:30",
    duration: 60,
    format: "Онлайн",
    status: "planned",
    notes: "Фокус на Academic Writing и расширение словаря",
    homework: "",
    createdAt: 1718000004000,
  },
  {
    id: "mock-lesson-5",
    subject: "IELTS",
    studentIds: ["5"],
    studentNames: ["Вагиф С."],
    date: offsetDate(-1),
    time: "16:30",
    duration: 60,
    format: "Онлайн",
    status: "completed",
    notes: "Хорошая сессия. Разобрали стратегию и структуру экзамена.",
    homework: "Написать 2 страницы дневника на английском языке",
    createdAt: 1718000005000,
  },
  {
    id: "mock-lesson-6",
    subject: "General",
    studentIds: ["6"],
    studentNames: ["Джамиль Б."],
    date: offsetDate(-2),
    time: "15:30",
    duration: 60,
    format: "Офлайн",
    status: "completed",
    notes: "Практика деловых переписок",
    homework: "Написать деловое письмо-ответ на клиентскую жалобу",
    createdAt: 1718000006000,
  },
];

function sortByDateTime(a, b) {
  return (
    new Date(`${a.date}T${a.time}:00`).getTime() -
    new Date(`${b.date}T${b.time}:00`).getTime()
  );
}

export const useLessonsStore = create(
  persist(
    (set) => ({
      lessons: [],

      addLesson: (lesson) =>
        set((state) => ({
          lessons: [...state.lessons, lesson].sort(sortByDateTime),
        })),

      updateLesson: (id, updates) =>
        set((state) => ({
          lessons: state.lessons
            .map((l) => (l.id === id ? { ...l, ...updates } : l))
            .sort(sortByDateTime),
        })),

      deleteLesson: (id) =>
        set((state) => ({
          lessons: state.lessons.filter((l) => l.id !== id),
        })),

      addLessons: (newLessons) =>
        set((state) => ({
          lessons: [...state.lessons, ...newLessons].sort(sortByDateTime),
        })),

      deleteByScheduleId: (scheduleId) =>
        set((state) => ({
          lessons: state.lessons.filter((l) => l.scheduleId !== scheduleId),
        })),

      deleteFutureByScheduleId: (scheduleId, fromDate) =>
        set((state) => ({
          lessons: state.lessons.filter(
            (l) => !(l.scheduleId === scheduleId && l.date >= fromDate)
          ),
        })),
    }),
    {
      name: "lessons-storage-v2",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
