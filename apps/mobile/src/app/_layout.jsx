import { useAuth } from "@/utils/auth/useAuth";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import { onAuthStateChanged } from "firebase/auth";
import { auth, IS_FIREBASE_READY } from "@/utils/firebase/config";
import { loadAllStores, saveStore } from "@/utils/firebase/firestore";
import { useStudentsStore } from "@/utils/students/store";
import { useLessonsStore } from "@/utils/lessons/store";
import { usePaymentsStore } from "@/utils/payments/store";
import { useScheduleStore } from "@/utils/schedule/store";
import { useProgressStore } from "@/utils/progress/store";
import { useReportsStore } from "@/utils/reports/store";
import { useGroupsStore } from "@/utils/groups/store";
import { useParentsStore } from "@/utils/parents/store";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const SYNC_DEBOUNCE = 1500;
// Stores where any change is immediately critical (e.g. add/delete)
const IMMEDIATE_STORES = new Set(["students", "reports", "lessons"]);

// Syncs teacher stores to Firestore on change, loads on login
function useFirebaseSync() {
  const isLoadingRef = useRef(false);
  const timersRef = useRef({});

  useEffect(() => {
    if (!IS_FIREBASE_READY || !auth) return;

    let unsubStores = [];

    const debouncedSave = (uid, storeName, data) => {
      if (isLoadingRef.current) return;
      clearTimeout(timersRef.current[storeName]);
      // Critical stores sync immediately; others use debounce
      const delay = IMMEDIATE_STORES.has(storeName) ? 0 : SYNC_DEBOUNCE;
      timersRef.current[storeName] = setTimeout(() => {
        saveStore(uid, storeName, data);
      }, delay);
    };

    const teardownStores = () => {
      unsubStores.forEach((fn) => fn());
      unsubStores = [];
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    };

    const setupStoreSubscriptions = (uid) => {
      unsubStores.push(
        useStudentsStore.subscribe((state) =>
          debouncedSave(uid, "students", state.students)
        )
      );
      unsubStores.push(
        useLessonsStore.subscribe((state) =>
          debouncedSave(uid, "lessons", state.lessons)
        )
      );
      unsubStores.push(
        usePaymentsStore.subscribe((state) =>
          debouncedSave(uid, "payments", state.payments)
        )
      );
      unsubStores.push(
        useScheduleStore.subscribe((state) =>
          debouncedSave(uid, "schedules", state.schedules)
        )
      );
      unsubStores.push(
        useProgressStore.subscribe((state) =>
          debouncedSave(uid, "progress", {
            evaluations: state.evaluations,
            goals: state.goals,
          })
        )
      );
      unsubStores.push(
        useReportsStore.subscribe((state) =>
          debouncedSave(uid, "reports", state.reports)
        )
      );
      unsubStores.push(
        useGroupsStore.subscribe((state) =>
          debouncedSave(uid, "groups", state.groups)
        )
      );
      unsubStores.push(
        useParentsStore.subscribe((state) =>
          debouncedSave(uid, "parents", state.parents)
        )
      );
    };

    const loadIntoStores = async (uid) => {
      isLoadingRef.current = true;
      try {
        const remote = await loadAllStores(uid);

        // Only overwrite a store when Firestore has data for it.
        // If remote is null (first login, never synced), keep local data so it
        // syncs UP on the next change rather than being silently wiped.
        if (remote.students  !== null) useStudentsStore.setState({ students:  remote.students });
        if (remote.lessons   !== null) useLessonsStore.setState({  lessons:   remote.lessons });
        if (remote.payments  !== null) usePaymentsStore.setState({ payments:  remote.payments });
        if (remote.schedules !== null) useScheduleStore.setState({ schedules: remote.schedules });
        if (remote.progress  !== null) useProgressStore.setState({
          evaluations: remote.progress.evaluations ?? [],
          goals:       remote.progress.goals ?? [],
        });
        if (remote.reports   !== null) useReportsStore.setState({ reports:  remote.reports });
        if (remote.groups    !== null) useGroupsStore.setState({  groups:   remote.groups });
        if (remote.parents   !== null) useParentsStore.setState({ parents:  remote.parents });
      } finally {
        isLoadingRef.current = false;
      }
    };

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      teardownStores();
      if (user) {
        await loadIntoStores(user.uid);
        setupStoreSubscriptions(user.uid);
      }
    });

    return () => {
      unsubAuth();
      teardownStores();
    };
  }, []);
}

export default function RootLayout() {
  const { initiate, isReady } = useAuth();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useFirebaseSync();

  useEffect(() => {
    initiate();
    Notifications.requestPermissionsAsync().catch(() => {});
  }, [initiate]);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady || !fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="role-select" options={{ gestureEnabled: false }} />
          <Stack.Screen name="login" options={{ gestureEnabled: false }} />
          <Stack.Screen name="forgot-password" options={{ gestureEnabled: false }} />
          <Stack.Screen name="complete-profile" options={{ gestureEnabled: false }} />
          <Stack.Screen name="oauth-role-select" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(parent-tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(student-tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(admin-tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="student/[id]" />
          <Stack.Screen name="lesson/add" />
          <Stack.Screen name="lesson/[id]" />
          <Stack.Screen name="report/add" />
          <Stack.Screen name="report/[id]" />
          <Stack.Screen name="parent/[id]" />
          <Stack.Screen name="parent-portal/index" />
          <Stack.Screen name="parent-portal/report/[id]" />
          <Stack.Screen name="progress/[studentId]" />
        </Stack>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
