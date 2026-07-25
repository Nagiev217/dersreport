import { useEffect, useState } from "react";
import { auth } from "@/utils/firebase/config";
import { getUserDoc } from "@/utils/firebase/users";
import { getMyRoleRemote } from "@/utils/firebase/adminAccounts";

// Fetches the signed-in user's own role from Firestore. Returns null while
// loading (or if there's no signed-in user) — callers should treat null as
// "not yet confirmed" and default to the more restrictive UI state.
export function useMyRole() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const uid = auth?.currentUser?.uid;
    if (!uid) return;
    getUserDoc(uid).then(async (doc) => {
      let r = doc?.role ?? null;
      if (!r) {
        // Direct client read can come back empty for roles the Firestore
        // rules don't cover (e.g. boss/admin) — fall back to the Admin-SDK
        // lookup used elsewhere (functions/index.js: getMyRole).
        r = await getMyRoleRemote().catch(() => null);
      }
      if (!cancelled) setRole(r);
    });
    return () => { cancelled = true; };
  }, []);

  return role;
}
