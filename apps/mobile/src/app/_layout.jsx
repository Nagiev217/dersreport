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
import { getUserDoc, ensureTeachingProfile } from "@/utils/firebase/users";
import { prefetchAdminDashboard } from "@/utils/firebase/adminAccounts";
import { loadAllStores, saveStore, subscribeToStore } from "@/utils/firebase/firestore";
import { useStudentsStore } from "@/utils/students/store";
import { useLessonsStore } from "@/utils/lessons/store";
import { usePaymentsStore } from "@/utils/payments/store";
import { useScheduleStore } from "@/utils/schedule/store";
import { useProgressStore } from "@/utils/progress/store";
import { useReportsStore, setReportsRemoteAdapter } from "@/utils/reports/store";
import {
  addReportRemote,
  updateReportRemote,
  deleteReportRemote,
  subscribeToReports,
} from "@/utils/reports/firestoreSync";
import { useGroupsStore } from "@/utils/groups/store";
import { useParentsStore } from "@/utils/parents/store";
import { useHomeworkStore } from "@/utils/homework/store";
import { useWritingStore } from "@/utils/writing/store";
import { useExamsStore } from "@/utils/exams/store";

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
// Stores where any change is immediately critical (e.g. add/delete).
// `reports` is absent on purpose — it syncs per-document to a subcollection
// instead of through the whole-array debounced path (see reports/firestoreSync.js).
const IMMEDIATE_STORES = new Set(["students", "lessons"]);

// Syncs teacher stores to Firestore on change, loads on login
function useFirebaseSync() {
  const isLoadingRef = useRef(false);
  // Set while a remote snapshot is being written into a store. Zustand
  // notifies subscribers synchronously inside setState, so this flag is still
  // up when debouncedSave runs — which stops us from immediately echoing
  // server data back as a client write.
  const applyingRemoteRef = useRef(false);
  const timersRef = useRef({});
  // Bumped on every auth-state change so an in-flight loadIntoStores/getUserDoc
  // from a superseded sign-in (e.g. the dev account switcher's fast
  // signOut -> signInWithEmailAndPassword) can detect it's stale and bail
  // out instead of applying account A's data after account B has signed in.
  const sessionRef = useRef(0);

  useEffect(() => {
    if (!IS_FIREBASE_READY || !auth) return;

    let unsubStores = [];
    let unsubReports = null;
    let reportsPushedUp = false;

    const debouncedSave = (uid, storeName, data) => {
      if (isLoadingRef.current || applyingRemoteRef.current) return;
      clearTimeout(timersRef.current[storeName]);
      // Critical stores sync immediately; others use debounce
      const delay = IMMEDIATE_STORES.has(storeName) ? 0 : SYNC_DEBOUNCE;
      timersRef.current[storeName] = setTimeout(async () => {
        // The entry doubles as the "local edits still in flight" flag the
        // remote listener checks, so it must survive until the write lands.
        // Clearing it earlier would let a server snapshot overwrite the store
        // while this write is still carrying the older `data` closure — which
        // would then land and undo the server's change. It must also be
        // cleared eventually, or remote updates stay blocked forever.
        try {
          await saveStore(uid, storeName, data);
        } finally {
          delete timersRef.current[storeName];
        }
      }, delay);
    };

    const teardownStores = () => {
      unsubStores.forEach((fn) => fn());
      unsubStores = [];
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
      unsubReports?.();
      unsubReports = null;
      reportsPushedUp = false;
      setReportsRemoteAdapter(null);
    };

    // Reports don't go through debouncedSave — each add/update/delete writes
    // its own document, and a live subcollection query is the source of truth.
    const setupReportsSync = (uid) => {
      setReportsRemoteAdapter({
        add: (report) => addReportRemote(uid, report),
        update: (id, updates) => updateReportRemote(uid, id, updates),
        remove: (id) => deleteReportRemote(uid, id),
      });

      unsubReports = subscribeToReports(uid, (remoteReports) => {
        // First snapshot on a brand-new account: nothing remote yet, so push
        // whatever is in local storage up instead of wiping it.
        if (!reportsPushedUp) {
          reportsPushedUp = true;
          const local = useReportsStore.getState().reports;
          if (remoteReports.length === 0 && local.length > 0) {
            local.forEach((r) => addReportRemote(uid, r));
            return;
          }
        }
        useReportsStore.setState({ reports: remoteReports });
      });
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
        useGroupsStore.subscribe((state) =>
          debouncedSave(uid, "groups", state.groups)
        )
      );
      unsubStores.push(
        useParentsStore.subscribe((state) =>
          debouncedSave(uid, "parents", state.parents)
        )
      );
      unsubStores.push(
        useHomeworkStore.subscribe((state) =>
          debouncedSave(uid, "homework", state.homework)
        )
      );
      unsubStores.push(
        useWritingStore.subscribe((state) =>
          debouncedSave(uid, "writing", state.writings)
        )
      );
      unsubStores.push(
        useExamsStore.subscribe((state) =>
          debouncedSave(uid, "exams", { exams: state.exams, assignments: state.assignments })
        )
      );
    };

    // Pulls server-side writes down into the local stores. Only the three
    // stores Cloud Functions actually write are watched: Admin creates
    // schedules (which also generate lessons) and records payments. Without
    // these listeners the client would keep pushing its stale local array over
    // them on the next edit — the admin's work would just disappear.
    //
    // Not a general multi-device sync: the other stores only ever have one
    // writer (this client), so a listener there would cost reads for nothing.
    const REMOTE_WATCHED_STORES = [
      ["lessons",   (data) => useLessonsStore.setState({ lessons: data })],
      ["schedules", (data) => useScheduleStore.setState({ schedules: data })],
      ["payments",  (data) => usePaymentsStore.setState({ payments: data })],
    ];

    const setupRemoteStoreListeners = (uid) => {
      REMOTE_WATCHED_STORES.forEach(([storeName, apply]) => {
        unsubStores.push(
          subscribeToStore(uid, storeName, (data) => {
            // A pending debounced write holds newer local edits — letting the
            // server snapshot land would revert what the user just did. The
            // queued write wins and will carry the merge forward.
            if (timersRef.current[storeName]) return;
            applyingRemoteRef.current = true;
            try {
              apply(data);
            } finally {
              applyingRemoteRef.current = false;
            }
          })
        );
      });
    };

    const loadIntoStores = async (uid, mySession) => {
      isLoadingRef.current = true;
      try {
        const remote = await loadAllStores(uid);

        // A newer auth-state change (fast account switch) fired while this
        // fetch was in flight — applying it now would clobber the newer
        // session's already-loaded data with the previous account's.
        if (sessionRef.current !== mySession) return;

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
        if (remote.groups    !== null) useGroupsStore.setState({  groups:   remote.groups });
        if (remote.parents   !== null) useParentsStore.setState({ parents:  remote.parents });
        if (remote.homework  !== null) useHomeworkStore.setState({ homework: remote.homework });
        if (remote.writing   !== null) useWritingStore.setState({ writings: remote.writing });
        if (remote.exams     !== null) useExamsStore.setState({
          exams:       remote.exams.exams ?? [],
          assignments: remote.exams.assignments ?? [],
        });
      } finally {
        isLoadingRef.current = false;
      }
    };

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      const mySession = ++sessionRef.current;
      teardownStores();
      if (!user) return;

      // This whole sync loop is teacher-shaped data (teachers/{uid}/stores/*,
      // teachers/{uid}/reports/*) — parents/students get their real data
      // through parentRealtime.js/studentRealtime.js instead and never read
      // these stores, so running it for them was pure waste: extra reads on
      // every login and a debounced write under teachers/{theirUid}/... on
      // every local state change, piling up junk documents at scale.
      const userDoc = await getUserDoc(user.uid).catch(() => null);
      if (sessionRef.current !== mySession) return; // superseded mid-lookup

      // Boss/Admin dashboards are pure Cloud-Function reads (no local Zustand
      // stores involved) — kick them off now, in the background, so results
      // are already warm by the time the user actually taps into (admin-tabs)
      // instead of only starting once that screen mounts.
      if (userDoc?.role === "boss" || userDoc?.role === "admin") {
        prefetchAdminDashboard();
      }

      // Boss/Admin fall through to the teacher sync on purpose: the dashboard's
      // first quick-access tile ("Обучение") routes them into /(tabs), so they
      // can hold their own students, lessons and reports under their uid just
      // like a teacher. Skipping them here meant that data lived only in this
      // device's AsyncStorage — never uploaded, never restored after a
      // reinstall, and invisible to every cross-teacher Cloud Function.
      // Parents/students genuinely never own this shape of data (they read
      // through parentRealtime.js/studentRealtime.js), so they still bail out.
      const role = userDoc?.role;
      if (role !== "teacher" && role !== "boss" && role !== "admin") return;

      // Backfills teachers/{uid} for boss/admin accounts created before they
      // could teach — without it their students stay invisible to the
      // cross-teacher Cloud Functions behind Расписание and Финансы.
      if (role === "boss" || role === "admin") {
        await ensureTeachingProfile(user.uid, userDoc ?? {});
        if (sessionRef.current !== mySession) return;
      }

      await loadIntoStores(user.uid, mySession);
      if (sessionRef.current !== mySession) return; // superseded mid-load
      setupStoreSubscriptions(user.uid);
      setupRemoteStoreListeners(user.uid);
      setupReportsSync(user.uid);
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
          <Stack.Screen name="parent-portal/reports" />
          <Stack.Screen name="parent-portal/report/[id]" />
          <Stack.Screen name="progress/[studentId]" />
          <Stack.Screen name="homework/index" />
          <Stack.Screen name="writing/index" />
          <Stack.Screen name="weekly-report/[studentId]" />
          <Stack.Screen name="exams/index" />
          <Stack.Screen name="essay-check/index" />
          <Stack.Screen name="boss-home-test/index" />
        </Stack>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
