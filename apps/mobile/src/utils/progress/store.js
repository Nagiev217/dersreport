import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createEncryptedStorage } from "@/utils/storage/secureStorage";

// Fixed timestamp base to avoid Date.now() in module scope (resume caching)
const T = 1749980000000;

const INITIAL_EVALUATIONS = [
  // ── Айсель М. (student 1) ──────────────────────────────────────────────────
  { id: "ev-1-1", studentId: "1", date: "2026-05-08", activity: 4, comprehension: 4, homework: 4, behavior: 4, notes: "", createdAt: T + 1 },
  { id: "ev-1-2", studentId: "1", date: "2026-05-15", activity: 5, comprehension: 5, homework: 5, behavior: 4, notes: "Отличный урок! Writing Task 2 написала идеально.", createdAt: T + 2 },
  { id: "ev-1-3", studentId: "1", date: "2026-05-22", activity: 4, comprehension: 5, homework: 4, behavior: 5, notes: "", createdAt: T + 3 },
  { id: "ev-1-4", studentId: "1", date: "2026-05-29", activity: 5, comprehension: 4, homework: 5, behavior: 5, notes: "Прекрасно разобрала Speaking Part 3.", createdAt: T + 4 },
  { id: "ev-1-5", studentId: "1", date: "2026-06-05", activity: 5, comprehension: 5, homework: 4, behavior: 5, notes: "", createdAt: T + 5 },
  { id: "ev-1-6", studentId: "1", date: "2026-06-10", activity: 5, comprehension: 5, homework: 5, behavior: 5, notes: "Лучший урок за всё время. Мотивация на высоте.", createdAt: T + 6 },

  // ── Турал Н. (student 2) ──────────────────────────────────────────────────
  { id: "ev-2-1", studentId: "2", date: "2026-04-10", activity: 3, comprehension: 3, homework: 2, behavior: 3, notes: "ДЗ не выполнено полностью.", createdAt: T + 10 },
  { id: "ev-2-2", studentId: "2", date: "2026-04-24", activity: 3, comprehension: 3, homework: 3, behavior: 3, notes: "", createdAt: T + 11 },
  { id: "ev-2-3", studentId: "2", date: "2026-05-08", activity: 3, comprehension: 4, homework: 3, behavior: 3, notes: "", createdAt: T + 12 },
  { id: "ev-2-4", studentId: "2", date: "2026-05-22", activity: 4, comprehension: 4, homework: 3, behavior: 4, notes: "Заметный прогресс в грамматике.", createdAt: T + 13 },
  { id: "ev-2-5", studentId: "2", date: "2026-06-05", activity: 4, comprehension: 3, homework: 4, behavior: 4, notes: "", createdAt: T + 14 },

  // ── Лейла К. (student 3) ──────────────────────────────────────────────────
  { id: "ev-3-1", studentId: "3", date: "2026-05-05", activity: 5, comprehension: 5, homework: 5, behavior: 5, notes: "Идеальный урок!", createdAt: T + 20 },
  { id: "ev-3-2", studentId: "3", date: "2026-05-19", activity: 5, comprehension: 5, homework: 5, behavior: 5, notes: "", createdAt: T + 21 },
  { id: "ev-3-3", studentId: "3", date: "2026-06-02", activity: 5, comprehension: 5, homework: 4, behavior: 5, notes: "Математика SAT — решила все задачи.", createdAt: T + 22 },
  { id: "ev-3-4", studentId: "3", date: "2026-06-09", activity: 5, comprehension: 5, homework: 5, behavior: 5, notes: "", createdAt: T + 23 },

  // ── Али Н. (student 4) ────────────────────────────────────────────────────
  { id: "ev-4-1", studentId: "4", date: "2026-04-15", activity: 4, comprehension: 4, homework: 4, behavior: 4, notes: "", createdAt: T + 30 },
  { id: "ev-4-2", studentId: "4", date: "2026-05-01", activity: 4, comprehension: 4, homework: 4, behavior: 5, notes: "", createdAt: T + 31 },
  { id: "ev-4-3", studentId: "4", date: "2026-05-15", activity: 4, comprehension: 5, homework: 4, behavior: 4, notes: "Хорошо разобрал Reading.", createdAt: T + 32 },
  { id: "ev-4-4", studentId: "4", date: "2026-06-01", activity: 5, comprehension: 4, homework: 5, behavior: 4, notes: "", createdAt: T + 33 },

  // ── Вагиф С. (student 5) ──────────────────────────────────────────────────
  { id: "ev-5-1", studentId: "5", date: "2026-05-14", activity: 4, comprehension: 3, homework: 3, behavior: 4, notes: "Новый ученик, входит в ритм.", createdAt: T + 40 },
  { id: "ev-5-2", studentId: "5", date: "2026-05-28", activity: 4, comprehension: 4, homework: 3, behavior: 4, notes: "", createdAt: T + 41 },
  { id: "ev-5-3", studentId: "5", date: "2026-06-11", activity: 3, comprehension: 4, homework: 4, behavior: 3, notes: "", createdAt: T + 42 },

  // ── Джамиль Б. (student 6) ────────────────────────────────────────────────
  { id: "ev-6-1", studentId: "6", date: "2026-04-08", activity: 2, comprehension: 3, homework: 2, behavior: 2, notes: "Пропустил ДЗ.", createdAt: T + 50 },
  { id: "ev-6-2", studentId: "6", date: "2026-04-22", activity: 3, comprehension: 3, homework: 3, behavior: 3, notes: "", createdAt: T + 51 },
  { id: "ev-6-3", studentId: "6", date: "2026-05-06", activity: 3, comprehension: 3, homework: 3, behavior: 3, notes: "", createdAt: T + 52 },
  { id: "ev-6-4", studentId: "6", date: "2026-05-20", activity: 3, comprehension: 4, homework: 3, behavior: 3, notes: "Небольшой прогресс.", createdAt: T + 53 },
  { id: "ev-6-5", studentId: "6", date: "2026-06-03", activity: 4, comprehension: 4, homework: 3, behavior: 4, notes: "Заметно улучшился!", createdAt: T + 54 },
  { id: "ev-6-6", studentId: "6", date: "2026-06-10", activity: 4, comprehension: 4, homework: 4, behavior: 4, notes: "", createdAt: T + 55 },
];

const INITIAL_GOALS = [
  // ── Айсель М. ─────────────────────────────────────────────────────────────
  { id: "goal-1-1", studentId: "1", title: "Достичь IELTS 8.0", description: "Подготовка к сдаче IELTS на оценку 8.0 или выше по всем секциям", progress: 75, deadline: "2026-09-01", status: "active", createdAt: T + 100 },
  { id: "goal-1-2", studentId: "1", title: "Мастерство Writing Task 2", description: "Довести написание академических эссе до автоматизма", progress: 60, deadline: "2026-07-15", status: "active", createdAt: T + 101 },

  // ── Турал Н. ──────────────────────────────────────────────────────────────
  { id: "goal-2-1", studentId: "2", title: "Деловой английский", description: "Свободно вести деловые переговоры и переписку", progress: 40, deadline: "2026-08-01", status: "active", createdAt: T + 110 },

  // ── Лейла К. ──────────────────────────────────────────────────────────────
  { id: "goal-3-1", studentId: "3", title: "SAT 1500+", description: "Подготовиться к SAT и набрать не менее 1500 баллов", progress: 85, deadline: "2026-08-15", status: "active", createdAt: T + 120 },
  { id: "goal-3-2", studentId: "3", title: "Мастерство Math секции", description: "Довести Math SAT до 800/800", progress: 90, deadline: "2026-07-01", status: "active", createdAt: T + 121 },

  // ── Али Н. ────────────────────────────────────────────────────────────────
  { id: "goal-4-1", studentId: "4", title: "IELTS 7.5 Academic", description: "Сдать IELTS Academic на 7.5 для поступления в университет", progress: 55, deadline: "2026-10-01", status: "active", createdAt: T + 130 },

  // ── Вагиф С. ──────────────────────────────────────────────────────────────
  { id: "goal-5-1", studentId: "5", title: "Базовый IELTS", description: "Подготовка к первой сдаче IELTS, цель — 6.0", progress: 25, deadline: "2026-12-01", status: "active", createdAt: T + 140 },

  // ── Джамиль Б. ────────────────────────────────────────────────────────────
  { id: "goal-6-1", studentId: "6", title: "Разговорный уровень", description: "Свободно говорить на повседневные темы без подготовки", progress: 50, deadline: "2026-09-15", status: "active", createdAt: T + 150 },
];

export const useProgressStore = create(
  persist(
    (set) => ({
      evaluations: [],
      goals: [],

      addEvaluation: (evaluation) =>
        set((state) => ({
          evaluations: [...state.evaluations, evaluation].sort(
            (a, b) => a.date.localeCompare(b.date)
          ),
        })),

      updateEvaluation: (id, updates) =>
        set((state) => ({
          evaluations: state.evaluations.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),

      deleteEvaluation: (id) =>
        set((state) => ({
          evaluations: state.evaluations.filter((e) => e.id !== id),
        })),

      addGoal: (goal) =>
        set((state) => ({
          goals: [...state.goals, goal],
        })),

      updateGoal: (id, updates) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        })),

      deleteGoal: (id) =>
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        })),
    }),
    {
      name: "progress-storage-v2",
      storage: createJSONStorage(createEncryptedStorage),
    }
  )
);
