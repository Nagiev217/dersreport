import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

const T = 1748000000000; // May 2026 base — no Date.now() in module scope

// Realistic 5-month payment history for 6 students
// Students 2 (Турал) and 5 (Вагиф) haven't paid June — useful demo of debt state
const INITIAL_PAYMENTS = [
  // Айсель М. (id: 1) — Почасовая, 25 AZN/ч — 4 h/month = 100 AZN
  { id: "pay-1-1", studentId: "1", studentName: "Айсель М.", amount: 100, date: "2026-06-03", period: "2026-06", method: "card",     note: "",          createdAt: T + 100 },
  { id: "pay-1-2", studentId: "1", studentName: "Айсель М.", amount: 100, date: "2026-05-02", period: "2026-05", method: "card",     note: "",          createdAt: T + 200 },
  { id: "pay-1-3", studentId: "1", studentName: "Айсель М.", amount: 100, date: "2026-04-04", period: "2026-04", method: "card",     note: "",          createdAt: T + 300 },
  { id: "pay-1-4", studentId: "1", studentName: "Айсель М.", amount: 100, date: "2026-03-06", period: "2026-03", method: "card",     note: "",          createdAt: T + 400 },
  { id: "pay-1-5", studentId: "1", studentName: "Айсель М.", amount: 100, date: "2026-02-05", period: "2026-02", method: "card",     note: "",          createdAt: T + 500 },

  // Турал Н. (id: 2) — За урок, 20 AZN — НЕ платил июнь!
  { id: "pay-2-1", studentId: "2", studentName: "Турал Н.",  amount:  60, date: "2026-05-07", period: "2026-05", method: "cash",     note: "3 урока",   createdAt: T + 600 },
  { id: "pay-2-2", studentId: "2", studentName: "Турал Н.",  amount:  80, date: "2026-04-08", period: "2026-04", method: "cash",     note: "4 урока",   createdAt: T + 700 },
  { id: "pay-2-3", studentId: "2", studentName: "Турал Н.",  amount:  60, date: "2026-03-10", period: "2026-03", method: "cash",     note: "",          createdAt: T + 800 },
  { id: "pay-2-4", studentId: "2", studentName: "Турал Н.",  amount:  60, date: "2026-02-06", period: "2026-02", method: "cash",     note: "",          createdAt: T + 900 },

  // Лейла К. (id: 3) — Месячная, 150 AZN
  { id: "pay-3-1", studentId: "3", studentName: "Лейла К.",  amount: 150, date: "2026-06-01", period: "2026-06", method: "transfer", note: "",          createdAt: T + 1000 },
  { id: "pay-3-2", studentId: "3", studentName: "Лейла К.",  amount: 150, date: "2026-05-01", period: "2026-05", method: "transfer", note: "",          createdAt: T + 1100 },
  { id: "pay-3-3", studentId: "3", studentName: "Лейла К.",  amount: 150, date: "2026-04-01", period: "2026-04", method: "transfer", note: "",          createdAt: T + 1200 },
  { id: "pay-3-4", studentId: "3", studentName: "Лейла К.",  amount: 150, date: "2026-03-02", period: "2026-03", method: "transfer", note: "",          createdAt: T + 1300 },
  { id: "pay-3-5", studentId: "3", studentName: "Лейла К.",  amount: 150, date: "2026-02-03", period: "2026-02", method: "transfer", note: "",          createdAt: T + 1400 },

  // Али Н. (id: 4) — Почасовая, 25 AZN/ч
  { id: "pay-4-1", studentId: "4", studentName: "Али Н.",    amount: 100, date: "2026-06-05", period: "2026-06", method: "card",     note: "",          createdAt: T + 1500 },
  { id: "pay-4-2", studentId: "4", studentName: "Али Н.",    amount: 100, date: "2026-05-06", period: "2026-05", method: "card",     note: "",          createdAt: T + 1600 },
  { id: "pay-4-3", studentId: "4", studentName: "Али Н.",    amount: 100, date: "2026-04-07", period: "2026-04", method: "card",     note: "",          createdAt: T + 1700 },
  { id: "pay-4-4", studentId: "4", studentName: "Али Н.",    amount: 100, date: "2026-03-04", period: "2026-03", method: "card",     note: "",          createdAt: T + 1800 },

  // Вагиф С. (id: 5) — НЕ платил июнь!
  { id: "pay-5-1", studentId: "5", studentName: "Вагиф С.",  amount: 100, date: "2026-05-10", period: "2026-05", method: "cash",     note: "",          createdAt: T + 1900 },
  { id: "pay-5-2", studentId: "5", studentName: "Вагиф С.",  amount: 100, date: "2026-04-09", period: "2026-04", method: "cash",     note: "",          createdAt: T + 2000 },
  { id: "pay-5-3", studentId: "5", studentName: "Вагиф С.",  amount: 100, date: "2026-03-11", period: "2026-03", method: "cash",     note: "",          createdAt: T + 2100 },

  // Джамиль Б. (id: 6)
  { id: "pay-6-1", studentId: "6", studentName: "Джамиль Б.", amount:  80, date: "2026-06-02", period: "2026-06", method: "card",    note: "",          createdAt: T + 2200 },
  { id: "pay-6-2", studentId: "6", studentName: "Джамиль Б.", amount:  80, date: "2026-05-03", period: "2026-05", method: "card",    note: "",          createdAt: T + 2300 },
  { id: "pay-6-3", studentId: "6", studentName: "Джамиль Б.", amount:  80, date: "2026-04-04", period: "2026-04", method: "card",    note: "",          createdAt: T + 2400 },
  { id: "pay-6-4", studentId: "6", studentName: "Джамиль Б.", amount:  80, date: "2026-03-05", period: "2026-03", method: "card",    note: "",          createdAt: T + 2500 },
];

export const usePaymentsStore = create(
  persist(
    (set) => ({
      payments: [],

      addPayment: (payment) =>
        set((state) => ({
          payments: [payment, ...state.payments].sort((a, b) =>
            b.date.localeCompare(a.date)
          ),
        })),

      updatePayment: (id, updates) =>
        set((state) => ({
          payments: state.payments.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      deletePayment: (id) =>
        set((state) => ({
          payments: state.payments.filter((p) => p.id !== id),
        })),
    }),
    {
      name: "payments-storage-v2",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
