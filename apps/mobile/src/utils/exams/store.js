import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// IELTS exam built by a teacher/admin.
// exam = { id, title, section: "listening"|"reading"|"writing"|"speaking",
//          questions: [ { id, type: "mcq"|"tfng"|"short", text,
//                         options: [..], answer, points } ],
//          totalPoints, createdAt, updatedAt }
// assignment = { id, examId, examTitle, section, studentId, studentName,
//                dueDate, assignedAt, status: "assigned"|"done" }

export const IELTS_SECTIONS = ["listening", "reading", "writing", "speaking"];
export const QUESTION_TYPES = ["mcq", "tfng", "short"];

export function totalPoints(questions) {
  return (questions ?? []).reduce((s, q) => s + (Number(q.points) || 0), 0);
}

export const useExamsStore = create(
  persist(
    (set) => ({
      exams: [],
      assignments: [],

      addExam: (exam) => set((state) => ({ exams: [exam, ...state.exams] })),
      updateExam: (id, updates) =>
        set((state) => ({ exams: state.exams.map((e) => (e.id === id ? { ...e, ...updates } : e)) })),
      deleteExam: (id) =>
        set((state) => ({
          exams: state.exams.filter((e) => e.id !== id),
          // Cascade: drop assignments for a deleted exam.
          assignments: state.assignments.filter((a) => a.examId !== id),
        })),

      addAssignments: (rows) => set((state) => ({ assignments: [...rows, ...state.assignments] })),
      updateAssignment: (id, updates) =>
        set((state) => ({ assignments: state.assignments.map((a) => (a.id === id ? { ...a, ...updates } : a)) })),
      deleteAssignment: (id) =>
        set((state) => ({ assignments: state.assignments.filter((a) => a.id !== id) })),
    }),
    {
      name: "exams-storage-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
