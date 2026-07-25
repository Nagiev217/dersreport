import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useStudentsStore = create(
  persist(
    (set) => ({
      students: [],

      addStudent: (student) =>
        set((state) => ({ students: [student, ...state.students] })),

      updateStudent: (id, updates) =>
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
          ),
        })),

      deleteStudent: (id) =>
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
        })),
    }),
    {
      name: "students-storage-v4",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
