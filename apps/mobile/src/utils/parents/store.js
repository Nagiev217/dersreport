import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const INITIAL_PARENTS = [
  {
    id: "parent-1",
    name: "Фатима М.",
    phone: "+994 50 111 22 33",
    email: "fatima.m@gmail.com",
    appUserId: null,
    avatarColor: "#C084FC",
    studentIds: ["1"],
    createdAt: 1717000001000,
  },
  {
    id: "parent-2",
    name: "Рустам Н.",
    phone: "+994 55 222 33 44",
    email: "rustam.n@gmail.com",
    appUserId: null,
    avatarColor: "#A5B4FC",
    studentIds: ["2"],
    createdAt: 1717000002000,
  },
  {
    id: "parent-3",
    name: "Нилуфар К.",
    phone: "+994 70 333 44 55",
    email: "nilufar.k@gmail.com",
    appUserId: null,
    avatarColor: "#FDA4AF",
    studentIds: ["3"],
    createdAt: 1717000003000,
  },
];

export const useParentsStore = create(
  persist(
    (set, get) => ({
      parents: INITIAL_PARENTS,

      addParent: (parent) =>
        set((state) => ({ parents: [parent, ...state.parents] })),

      updateParent: (id, updates) =>
        set((state) => ({
          parents: state.parents.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      deleteParent: (id) =>
        set((state) => ({
          parents: state.parents.filter((p) => p.id !== id),
        })),

      // Adds studentId to parent's studentIds list (bi-directional link managed from students side)
      linkStudent: (parentId, studentId) =>
        set((state) => ({
          parents: state.parents.map((p) =>
            p.id === parentId
              ? {
                  ...p,
                  studentIds: [
                    ...new Set([...(p.studentIds ?? []), studentId]),
                  ],
                }
              : p
          ),
        })),

      unlinkStudent: (parentId, studentId) =>
        set((state) => ({
          parents: state.parents.map((p) =>
            p.id === parentId
              ? {
                  ...p,
                  studentIds: (p.studentIds ?? []).filter(
                    (id) => id !== studentId
                  ),
                }
              : p
          ),
        })),

      getParentsByStudent: (studentId) =>
        get().parents.filter((p) => (p.studentIds ?? []).includes(studentId)),
    }),
    {
      name: "parents-storage-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
