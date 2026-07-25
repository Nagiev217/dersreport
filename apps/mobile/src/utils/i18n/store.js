import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useLangStore = create(
  persist(
    (set) => ({
      lang: "ru",
      setLang: (l) => set({ lang: l }),
    }),
    {
      name: "lang-storage-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
