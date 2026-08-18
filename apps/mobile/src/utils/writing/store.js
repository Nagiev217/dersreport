import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// IELTS Writing assessment. The four official band criteria (0–9, half-points):
//   Task 1  → Task Achievement | Task 2 → Task Response  (stored as `task_criterion`)
//   Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.
// overall = rounded average of the four to the nearest 0.5 (IELTS rounding).
// Shape: { id, studentId, studentName, task (1|2), essay, taskCriterion,
//          coherence, lexical, grammar, overall, feedback, date, createdAt }
export function ieltsOverall(a, b, c, d) {
  const avg = (a + b + c + d) / 4;
  return Math.round(avg * 2) / 2; // nearest 0.5
}

export const useWritingStore = create(
  persist(
    (set) => ({
      writings: [],

      addWriting: (w) =>
        set((state) => ({ writings: [w, ...state.writings] })),

      updateWriting: (id, updates) =>
        set((state) => ({
          writings: state.writings.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        })),

      deleteWriting: (id) =>
        set((state) => ({ writings: state.writings.filter((w) => w.id !== id) })),
    }),
    {
      name: "writing-storage-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
