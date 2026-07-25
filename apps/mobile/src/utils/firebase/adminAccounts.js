import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from './config';

let _fns = null;

function fns() {
  if (!firebaseApp) throw new Error('Firebase не настроен');
  if (!_fns) _fns = getFunctions(firebaseApp, 'us-central1');
  return _fns;
}

// Boss-only. Creates a Firebase Auth user + Firestore docs for a new
// teacher/parent/admin account. Does not sign the caller out — this runs
// server-side via the Admin SDK, the Boss's own session is untouched.
export async function createManagedAccount({ email, firstName, lastName, password, role }) {
  const fn = httpsCallable(fns(), 'createManagedAccount');
  const result = await fn({ email, firstName, lastName, password, role });
  return result.data;
}

// Boss/Admin. Returns the full teacher roster: [{ uid, firstName, lastName, email, createdAt }]
export async function listManagedTeachers() {
  const fn = httpsCallable(fns(), 'listManagedTeachers');
  const result = await fn();
  return result.data.teachers;
}

// Boss/Admin. Returns one teacher's stores (students/lessons/payments/schedules/
// progress/reports/groups) — payments is omitted server-side for Admin callers.
export async function getManagedTeacherStores(teacherUid) {
  const fn = httpsCallable(fns(), 'getManagedTeacherStores');
  const result = await fn({ teacherUid });
  return result.data.stores;
}

// Boss/Admin. Returns { totals: {teachersCount, studentsCount, lessonsCount,
// reportsCount, income?}, perTeacher: { [uid]: {studentsCount, lessonsCount,
// reportsCount, income?} } } — income is present only for Boss callers.
export async function getOrgAnalytics() {
  const fn = httpsCallable(fns(), 'getOrgAnalytics');
  const result = await fn();
  return result.data;
}

// Any authenticated user. Reads the caller's own role via the Admin SDK,
// bypassing Firestore rules — used as a fallback when the direct client
// read of users/{uid} comes back empty. Returns null if no user doc exists.
export async function getMyRoleRemote() {
  const fn = httpsCallable(fns(), 'getMyRole');
  const result = await fn();
  return result.data.role;
}

// ─── Account lifecycle (Boss-only) ─────────────────────────────────────────

export async function setAccountEnabled(uid, disabled) {
  const fn = httpsCallable(fns(), 'setAccountEnabled');
  const result = await fn({ uid, disabled });
  return result.data;
}

export async function resetManagedPassword(uid, password) {
  const fn = httpsCallable(fns(), 'resetManagedPassword');
  const result = await fn({ uid, password });
  return result.data;
}

export async function deleteManagedAccount(uid) {
  const fn = httpsCallable(fns(), 'deleteManagedAccount');
  const result = await fn({ uid });
  return result.data;
}

// ─── Parents overview (Boss/Admin) ─────────────────────────────────────────
// Returns [{ uid, firstName, lastName, email, parentCode, createdAt,
// linkedTeachers: [{uid, name}] }]
export async function listManagedParents() {
  const fn = httpsCallable(fns(), 'listManagedParents');
  const result = await fn();
  return result.data.parents;
}

// ─── Organization activity feed (Boss/Admin) ───────────────────────────────
// Returns { events: [{type: 'student'|'report'|'payment', teacherUid,
// teacherName, title, subtitle?, amount?, at}] } — payment events omitted for Admin.
export async function getOrgActivity() {
  const fn = httpsCallable(fns(), 'getOrgActivity');
  const result = await fn();
  return result.data.events;
}

// ─── Finance overview (Boss-only) ──────────────────────────────────────────
export async function getFinanceOverview() {
  const fn = httpsCallable(fns(), 'getFinanceOverview');
  const result = await fn();
  return result.data;
}

// Boss-only. Returns { period, rows: [{teacherName, studentName, date,
// amount, method, note}] } — raw payment rows for one calendar period
// (YYYY-MM), the source data behind the CSV export.
export async function getMonthlyPaymentsExport(period) {
  const fn = httpsCallable(fns(), 'getMonthlyPaymentsExport');
  const result = await fn({ period });
  return result.data;
}

// Boss/Admin. Returns { weekStart, weekEnd, avgLessons, teachers:
// [{uid, name, lessonsCount, hours}] } — lesson load per teacher for the
// current Mon-Sun week, sorted busiest first.
export async function getTeacherWorkload() {
  const fn = httpsCallable(fns(), 'getTeacherWorkload');
  const result = await fn();
  return result.data;
}
