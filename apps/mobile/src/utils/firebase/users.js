import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db, IS_FIREBASE_READY } from './config';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genCode() {
  let s = 'PRT-';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

async function uniqueParentCode() {
  for (let i = 0; i < 5; i++) {
    const code = genCode();
    const snap = await getDoc(doc(db, 'parentCodes', code));
    if (!snap.exists()) return code;
  }
  return `PRT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerTeacher(uid, { firstName, lastName, email }) {
  if (!IS_FIREBASE_READY || !db) return;
  const now = Date.now();
  await Promise.all([
    setDoc(doc(db, 'users', uid), {
      uid, role: 'teacher', firstName, lastName, email,
      createdAt: now, updatedAt: now, profileCompleted: false,
    }),
    setDoc(doc(db, 'teachers', uid), {
      uid, firstName, lastName, email,
      subjects: [], lessonPrice: null, description: '',
      photoURL: null, fcmToken: null,
      createdAt: now, updatedAt: now,
    }),
  ]);
}

export async function registerParent(uid, { firstName, lastName, email }) {
  if (!IS_FIREBASE_READY || !db) return null;
  const now = Date.now();
  const parentCode = await uniqueParentCode();
  await Promise.all([
    setDoc(doc(db, 'users', uid), {
      uid, role: 'parent', firstName, lastName, email,
      createdAt: now, updatedAt: now, profileCompleted: false,
    }),
    setDoc(doc(db, 'parents', uid), {
      uid, firstName, lastName, email, parentCode,
      phone: null, photoURL: null, additionalInfo: '',
      fcmToken: null, createdAt: now, updatedAt: now,
    }),
    setDoc(doc(db, 'parentCodes', parentCode), {
      uid, name: `${firstName} ${lastName}`.trim(),
    }),
  ]);
  return parentCode;
}

// Boss/Admin can teach too (the dashboard's "Обучение" tile routes them into
// the teacher UI), but createManagedAccount only builds a teachers/{uid} doc
// for role 'teacher'. Without that doc they are invisible to every
// cross-teacher Cloud Function — those all iterate collection('teachers') — so
// their students never show up in Финансы and their lessons never show up in
// Расписание. Writing a subcollection under teachers/{uid} does NOT create the
// parent doc, so it has to be created explicitly.
//
// Called on login so existing boss/admin accounts get backfilled, not just
// newly created ones. The existence check keeps it to one read per login
// instead of a write every time.
export async function ensureTeachingProfile(uid, { firstName, lastName, email }) {
  if (!IS_FIREBASE_READY || !db) return;
  try {
    const snap = await getDoc(doc(db, 'teachers', uid));
    if (snap.exists()) return;
    const now = Date.now();
    await setDoc(doc(db, 'teachers', uid), {
      uid,
      firstName: firstName ?? '',
      lastName: lastName ?? '',
      email: email ?? '',
      subjects: [], lessonPrice: null, description: '',
      photoURL: null, fcmToken: null,
      createdAt: now, updatedAt: now,
    });
  } catch {}
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getUserDoc(uid) {
  if (!IS_FIREBASE_READY || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

export async function getTeacherDoc(uid) {
  if (!IS_FIREBASE_READY || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'teachers', uid));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

export async function getParentDoc(uid) {
  if (!IS_FIREBASE_READY || !db) return null;
  try {
    const newSnap = await getDoc(doc(db, 'parents', uid));
    if (newSnap.exists()) return newSnap.data();
    // Legacy fallback
    const oldSnap = await getDoc(doc(db, 'parentProfiles', uid));
    return oldSnap.exists() ? oldSnap.data() : null;
  } catch { return null; }
}

// ─── Profile completion ───────────────────────────────────────────────────────

export async function markProfileCompleted(uid) {
  if (!IS_FIREBASE_READY || !db) return;
  try {
    await updateDoc(doc(db, 'users', uid), { profileCompleted: true, updatedAt: Date.now() });
  } catch {}
}

export async function updateTeacherProfile(uid, data) {
  if (!IS_FIREBASE_READY || !db) return;
  await setDoc(doc(db, 'teachers', uid), { ...data, updatedAt: Date.now() }, { merge: true });
}

export async function updateParentProfile(uid, data) {
  if (!IS_FIREBASE_READY || !db) return;
  try {
    const snap = await getDoc(doc(db, 'parents', uid));
    const coll = snap.exists() ? 'parents' : 'parentProfiles';
    await setDoc(doc(db, coll, uid), { ...data, updatedAt: Date.now() }, { merge: true });
  } catch {}
}

// ─── FCM token ────────────────────────────────────────────────────────────────

export async function saveFcmToken(uid, role, token) {
  if (!IS_FIREBASE_READY || !db || !token) return;
  // Boss/Admin store their token alongside teachers: they hold teaching data
  // under teachers/{uid} and notifyTeacherScheduleChange reads the token from
  // there. Defaulting them to 'parents' (as the old ternary did) created a
  // phantom parent doc that then showed up in the Parents roster.
  const coll =
    role === 'teacher' || role === 'boss' || role === 'admin' ? 'teachers'
    : role === 'student' ? 'students'
    : 'parents';
  try {
    await setDoc(doc(db, coll, uid), { fcmToken: token, updatedAt: Date.now() }, { merge: true });
  } catch {}
}
