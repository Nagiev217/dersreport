import { doc, setDoc, getDoc } from 'firebase/firestore';
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

// Save all stores in parallel (used on first login to push local data)
export async function saveAllStores(uid, storesData) {
  const entries = Object.entries(storesData);
  await Promise.all(entries.map(([name, data]) => saveStore(uid, name, data)));
}
