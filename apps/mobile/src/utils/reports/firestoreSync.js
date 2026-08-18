import {
  collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy,
} from "firebase/firestore";
import { db, IS_FIREBASE_READY } from "../firebase/config";

// Reports live at teachers/{uid}/reports/{reportId} — one document per report,
// not a single document holding the whole array like the other stores. A
// teacher writing one report per lesson would blow past Firestore's 1MB
// per-document cap in about a year on the old model.
//
// The document ID is the report's own `id` field, so `report/[id].jsx` can
// address a report straight from its router param.

export async function addReportRemote(uid, report) {
  if (!IS_FIREBASE_READY || !uid || !db || !report?.id) return;
  try {
    await setDoc(doc(db, "teachers", uid, "reports", String(report.id)), report);
  } catch (e) {
    // Offline writes are queued and retried by the SDK; a genuine failure
    // leaves the local AsyncStorage copy intact, same as saveStore(). Still
    // worth logging — a permission/rules error here was invisible before.
    console.error("[reports] addReportRemote failed:", e?.code, e?.message);
  }
}

export async function updateReportRemote(uid, id, updates) {
  if (!IS_FIREBASE_READY || !uid || !db || !id) return;
  try {
    await setDoc(doc(db, "teachers", uid, "reports", String(id)), updates, { merge: true });
  } catch (e) {
    console.error("[reports] updateReportRemote failed:", e?.code, e?.message);
  }
}

export async function deleteReportRemote(uid, id) {
  if (!IS_FIREBASE_READY || !uid || !db || !id) return;
  try {
    await deleteDoc(doc(db, "teachers", uid, "reports", String(id)));
  } catch (e) {
    console.error("[reports] deleteReportRemote failed:", e?.code, e?.message);
  }
}

// Live listener over the teacher's own reports — this is the source of truth
// once online, replacing the old one-shot loadStore() fetch.
export function subscribeToReports(uid, callback) {
  if (!IS_FIREBASE_READY || !uid || !db) return () => {};
  const q = query(collection(db, "teachers", uid, "reports"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => d.data())),
    (err) => console.error("[reports] subscribeToReports failed:", err?.code, err?.message),
  );
}
