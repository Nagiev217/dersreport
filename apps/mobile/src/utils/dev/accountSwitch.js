import { signOut, signInWithEmailAndPassword } from "firebase/auth";
import { auth, IS_FIREBASE_READY } from "@/utils/firebase/config";
import { getUserDoc } from "@/utils/firebase/users";
import { getMyRoleRemote } from "@/utils/firebase/adminAccounts";
import { isStaffRole } from "@/utils/auth/permissions";
import { setCachedRole, clearCachedRole } from "@/utils/auth/roleCache";
import { getSavedAccounts } from "./savedAccounts";

// Signs out of whatever account is active, signs into the saved account for
// `targetRole` (saved automatically by login.jsx on a real sign-in), then
// navigates to that role's tab group — same sign-in + role-resolution
// sequence as the real login screen, just triggered from a button.
export async function switchToDevAccount(targetRole, router) {
  const saved = await getSavedAccounts();
  const creds = saved[targetRole];
  if (!creds?.email || !creds?.password) {
    throw new Error(`Ещё не входили в аккаунт с ролью «${targetRole}» на этом устройстве`);
  }
  if (!IS_FIREBASE_READY || !auth) {
    throw new Error("Firebase не готов");
  }

  await clearCachedRole();
  await signOut(auth).catch(() => {});

  const cred = await signInWithEmailAndPassword(auth, creds.email.trim().toLowerCase(), creds.password);

  const userData = await getUserDoc(cred.user.uid);
  let role = userData?.role;
  if (!role) role = await getMyRoleRemote().catch(() => null);
  role = role ?? targetRole;

  await setCachedRole(cred.user.uid, role);

  router.replace(
    role === "parent" ? "/(parent-tabs)"
      : role === "student" ? "/(student-tabs)"
      : isStaffRole(role) ? "/(admin-tabs)" : "/(tabs)"
  );
}
