import {
  doc, setDoc, getDoc, getDocs,
  deleteDoc, collection,
} from 'firebase/firestore';
import { db, IS_FIREBASE_READY } from './config';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateParentCode() {
  let code = 'PRT-';
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

// ─── User (compat: reads from /users, writes to /users) ──────────────────────

export async function saveUserRole(uid, role, name, email) {
  if (!IS_FIREBASE_READY || !db) return;
  const now = Date.now();
  // Split name into parts if possible
  const parts = (name ?? '').trim().split(' ');
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ');
  await setDoc(doc(db, 'users', uid), {
    uid, role,
    firstName, lastName,
    name: name ?? '',
    email: email ?? '',
    createdAt: now, updatedAt: now,
    profileCompleted: false,
  }, { merge: true });
}

export async function getUserData(uid) {
  if (!IS_FIREBASE_READY || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

// ─── Parent profile (checks new /parents then legacy /parentProfiles) ─────────

export async function createParentProfile(uid, name, email) {
  if (!IS_FIREBASE_READY || !db) return null;

  let code = generateParentCode();
  for (let i = 0; i < 4; i++) {
    const existing = await getDoc(doc(db, 'parentCodes', code));
    if (!existing.exists()) break;
    code = generateParentCode();
  }

  const now = Date.now();
  const parts = (name ?? '').trim().split(' ');

  await Promise.all([
    setDoc(doc(db, 'parents', uid), {
      uid, parentCode: code,
      firstName: parts[0] ?? '', lastName: parts.slice(1).join(' '),
      name: name ?? '', email: email ?? '',
      phone: null, photoURL: null, additionalInfo: '',
      fcmToken: null, createdAt: now, updatedAt: now,
    }),
    setDoc(doc(db, 'parentCodes', code), { uid, name: name ?? '' }),
  ]);

  return code;
}

export async function getParentProfile(uid) {
  if (!IS_FIREBASE_READY || !db) return null;
  try {
    // New collection first
    const newSnap = await getDoc(doc(db, 'parents', uid));
    if (newSnap.exists()) return newSnap.data();
    // Legacy fallback
    const oldSnap = await getDoc(doc(db, 'parentProfiles', uid));
    return oldSnap.exists() ? oldSnap.data() : null;
  } catch { return null; }
}

// ─── Lookup parent by PRT code ────────────────────────────────────────────────

export async function lookupParentByCode(rawCode) {
  if (!IS_FIREBASE_READY || !db) return null;
  const code = rawCode.toUpperCase().trim();
  try {
    const snap = await getDoc(doc(db, 'parentCodes', code));
    if (!snap.exists()) return null;
    return { uid: snap.data().uid, name: snap.data().name, code };
  } catch { return null; }
}

// ─── Linking ──────────────────────────────────────────────────────────────────

export async function linkParentToStudent(teacherUid, teacherName, parentUid, parentCode, studentId) {
  if (!IS_FIREBASE_READY || !db) return;
  const ref = doc(db, 'parentAccess', parentUid, 'teachers', teacherUid);
  const existing = await getDoc(ref);
  const existingIds = existing.exists() ? (existing.data().studentIds ?? []) : [];
  const newIds = [...new Set([...existingIds, String(studentId)])];
  await setDoc(ref, { studentIds: newIds, teacherName: teacherName ?? '', linkedAt: Date.now() });
}

export async function unlinkParentFromStudent(teacherUid, parentUid, studentId) {
  if (!IS_FIREBASE_READY || !db) return;
  const ref = doc(db, 'parentAccess', parentUid, 'teachers', teacherUid);
  const existing = await getDoc(ref);
  if (!existing.exists()) return;
  const newIds = (existing.data().studentIds ?? []).filter(id => id !== String(studentId));
  if (newIds.length === 0) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, { ...existing.data(), studentIds: newIds });
  }
}

// ─── Parent access (list of teacher links) ───────────────────────────────────

export async function getParentAccess(parentUid) {
  if (!IS_FIREBASE_READY || !db) return [];
  try {
    const snap = await getDocs(collection(db, 'parentAccess', parentUid, 'teachers'));
    return snap.docs.map(d => ({ teacherUid: d.id, ...d.data() }));
  } catch { return []; }
}

// ─── Load teacher store (used by parent's "child" screen) ─────────────────────

export async function loadTeacherStore(teacherUid, storeName) {
  if (!IS_FIREBASE_READY || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'teachers', teacherUid, 'stores', storeName));
    return snap.exists() ? snap.data().data : null;
  } catch { return null; }
}

// ─── Student profile / linking ─────────────────────────────────────────────
// A student account is Boss-created only (no self-serve creation), then
// linked by a teacher to one roster entry per teacher — one studentId per
// teacher, not an array like parentAccess, since a student is one person.

export async function getStudentProfile(uid) {
  if (!IS_FIREBASE_READY || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'students', uid));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

export async function lookupStudentByCode(rawCode) {
  if (!IS_FIREBASE_READY || !db) return null;
  const code = rawCode.toUpperCase().trim();
  try {
    const snap = await getDoc(doc(db, 'studentCodes', code));
    if (!snap.exists()) return null;
    return { uid: snap.data().uid, name: snap.data().name, code };
  } catch { return null; }
}

export async function linkStudentToTeacher(teacherUid, teacherName, studentUid, studentId) {
  if (!IS_FIREBASE_READY || !db) return;
  const ref = doc(db, 'studentAccess', studentUid, 'teachers', teacherUid);
  await setDoc(ref, { studentId: String(studentId), teacherName: teacherName ?? '', linkedAt: Date.now() });
}

export async function unlinkStudentFromTeacher(teacherUid, studentUid) {
  if (!IS_FIREBASE_READY || !db) return;
  await deleteDoc(doc(db, 'studentAccess', studentUid, 'teachers', teacherUid));
}

export async function getStudentAccess(studentUid) {
  if (!IS_FIREBASE_READY || !db) return [];
  try {
    const snap = await getDocs(collection(db, 'studentAccess', studentUid, 'teachers'));
    return snap.docs.map(d => ({ teacherUid: d.id, ...d.data() }));
  } catch { return []; }
}
