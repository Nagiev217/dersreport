import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth, IS_FIREBASE_READY } from "@/utils/firebase/config";
import { getUserDoc } from "@/utils/firebase/users";
import { getMyRoleRemote } from "@/utils/firebase/adminAccounts";
import { isStaffRole } from "@/utils/auth/permissions";
import { getCachedRole, setCachedRole } from "@/utils/auth/roleCache";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Possible states:
// "loading"    — waiting for Firebase auth + role check
// "onboarding" — first launch, show tutorial
// "no-auth"    — not logged in → role-select
// "teacher"    → /(tabs)
// "parent"     → /(parent-tabs)
// "student"    → /(student-tabs)
// "admin"      → /(admin-tabs)  (boss or admin role)

export default function Index() {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    if (!IS_FIREBASE_READY || !auth) {
      // No Firebase config — check onboarding then fall through to role-select
      AsyncStorage.getItem("onboardingDone").then(done => {
        if (!cancelled) setStatus(done ? "no-auth" : "onboarding");
      });
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;

      // Always check onboarding first
      let done = null;
      try { done = await AsyncStorage.getItem("onboardingDone"); } catch {}
      if (!done) { if (!cancelled) setStatus("onboarding"); return; }

      if (!user) { if (!cancelled) setStatus("no-auth"); return; }

      // Try cache for instant redirect — only trusted if it belongs to this uid
      const cached = await getCachedRole(user.uid);
      if (cached === "parent")            { if (!cancelled) setStatus("parent");  return; }
      if (cached === "student")           { if (!cancelled) setStatus("student"); return; }
      if (isStaffRole(cached))            { if (!cancelled) setStatus("admin");   return; }
      if (cached === "teacher")           { if (!cancelled) setStatus("teacher"); return; }

      // Fallback to Firestore
      const userData = await getUserDoc(user.uid);
      let role = userData?.role;
      if (!role) role = await getMyRoleRemote().catch(() => null);
      role = role ?? "teacher";
      setCachedRole(user.uid, role).catch(() => {});
      if (!cancelled) setStatus(
        role === "parent" ? "parent" : role === "student" ? "student" : isStaffRole(role) ? "admin" : "teacher"
      );
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: "#6B5CF6", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  if (status === "onboarding") return <Redirect href="/onboarding" />;
  if (status === "no-auth")    return <Redirect href="/role-select" />;
  if (status === "parent")     return <Redirect href="/(parent-tabs)" />;
  if (status === "student")    return <Redirect href="/(student-tabs)" />;
  if (status === "admin")      return <Redirect href="/(admin-tabs)" />;
  return <Redirect href="/(tabs)" />;
}
