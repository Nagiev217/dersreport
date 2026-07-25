import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

const T = 1749980000000;

// Groups start empty — users create and populate them with real students
const INITIAL_GROUPS = [
  { id: "gr-1", name: "IELTS Подготовка",   emoji: "📚", emojiColor: "#EDEDF9", studentIds: [], category: "active",  createdAt: T + 1 },
  { id: "gr-2", name: "SAT Программа",       emoji: "📐", emojiColor: "#E8F0FE", studentIds: [], category: "active",  createdAt: T + 2 },
  { id: "gr-3", name: "Общий Английский",    emoji: "🌍", emojiColor: "#E8F5E9", studentIds: [], category: "active",  createdAt: T + 3 },
];

export const useGroupsStore = create(
  persist(
    (set) => ({
      groups: INITIAL_GROUPS,

      addGroup: (group) =>
        set((state) => ({ groups: [...state.groups, group] })),

      updateGroup: (id, updates) =>
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),

      deleteGroup: (id) =>
        set((state) => ({ groups: state.groups.filter((g) => g.id !== id) })),

      archiveGroup: (id) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, category: "archived" } : g
          ),
        })),

      unarchiveGroup: (id) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, category: "active" } : g
          ),
        })),

      addStudentToGroup: (groupId, studentId) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId && !g.studentIds.includes(studentId)
              ? { ...g, studentIds: [...g.studentIds, studentId] }
              : g
          ),
        })),

      removeStudentFromGroup: (groupId, studentId) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? { ...g, studentIds: g.studentIds.filter((id) => id !== studentId) }
              : g
          ),
        })),
    }),
    {
      name: "groups-storage-v2",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
