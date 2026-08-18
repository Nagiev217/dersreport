import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createEncryptedStorage } from "@/utils/storage/secureStorage";

// Homework assignment: { id, title, description, subject, studentIds,
// studentNames, dueDate ("YYYY-MM-DD"), status: "open"|"done", createdAt }
export const useHomeworkStore = create(
  persist(
    (set) => ({
      homework: [],

      addHomework: (hw) =>
        set((state) => ({ homework: [hw, ...state.homework] })),

      updateHomework: (id, updates) =>
        set((state) => ({
          homework: state.homework.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        })),

      deleteHomework: (id) =>
        set((state) => ({ homework: state.homework.filter((h) => h.id !== id) })),
    }),
    {
      name: "homework-storage-v1",
      storage: createJSONStorage(createEncryptedStorage),
    }
  )
);
