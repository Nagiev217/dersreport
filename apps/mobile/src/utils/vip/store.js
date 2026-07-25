import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const FREE_LIMIT = 5;

export const useVipStore = create(
  persist(
    (set) => ({
      isVip: false,
      setIsVip: (v) => set({ isVip: v }),
    }),
    {
      name: "vip-storage-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
