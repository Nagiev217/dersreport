import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, IS_FIREBASE_READY } from './config';

// Save one store's data to Firestore
export async function saveStore(uid, storeName, data) {
  if (!IS_FIREBASE_READY || !uid || !db) return;
  try {
    await setDoc(
      doc(db, 'teachers', uid, 'stores', storeName),
      { data, ts: Date.now() },
      { merge: false }
    );
  } catch (e) {
    // Swallow — local data is still safe in AsyncStorage
  }
}

// Load one store from Firestore; returns null if no data yet
export async function loadStore(uid, storeName) {
  if (!IS_FIREBASE_READY || !uid || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'teachers', uid, 'stores', storeName));
    return snap.exists() ? snap.data().data : null;
  } catch {
    return null;
  }
}

// Load all stores in parallel.
// `reports` is absent: it lives in a per-document subcollection with its own
// live listener (see utils/reports/firestoreSync.js), not a whole-array doc.
export async function loadAllStores(uid) {
  const names = ['students', 'lessons', 'payments', 'schedules', 'progress', 'groups', 'parents', 'homework', 'writing', 'exams'];
  const results = await Promise.all(names.map((n) => loadStore(uid, n)));
  return Object.fromEntries(names.map((n, i) => [n, results[i]]));
}

// Live listener for one store doc.
//
// Needed because saveStore() writes the client's WHOLE local array with
// merge:false. Without a listener the client never learns about server-side
// writes (Cloud Functions: adminCreateTeacherSchedule, addStudentPayment, …),
// so the next local edit would push a stale array and silently wipe them.
//
// `hasPendingWrites` filters out the local echo of our own writes, which
// Firestore delivers optimistically before they reach the server — applying
// those would be a no-op at best and a write loop at worst. A missing doc is
// ignored rather than applied as empty, matching loadAllStores(): a teacher
// who has never synced must keep their local data, not have it erased.
export function subscribeToStore(uid, storeName, onData) {
  if (!IS_FIREBASE_READY || !uid || !db) return () => {};
  return onSnapshot(
    doc(db, 'teachers', uid, 'stores', storeName),
    (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (!snap.exists()) return;
      const data = snap.data()?.data;
      if (data === undefined || data === null) return;
      onData(data);
    },
    () => {} // offline/permission errors: keep local data, don't crash
  );
}

// Save all stores in parallel (used on first login to push local data)
export async function saveAllStores(uid, storesData) {
  const entries = Object.entries(storesData);
  await Promise.all(entries.map(([name, data]) => saveStore(uid, name, data)));
}
