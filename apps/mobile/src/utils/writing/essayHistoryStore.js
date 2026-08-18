import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Student's own IELTS essay checks — stored ON-DEVICE only. Students have no
// server-side store of their own (rules give them read-only linkage access),
// so this history never syncs; it's a private local scratchpad of past runs.
// Item: { id, task, essay, result, createdAt }
export const useEssayHistoryStore = create(
  persist(
    (set) => ({
      history: [],
      addCheck: (item) =>
        set((state) => ({ history: [item, ...state.history].slice(0, 20) })),
      deleteCheck: (id) =>
        set((state) => ({ history: state.history.filter((h) => h.id !== id) })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "essay-history-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
