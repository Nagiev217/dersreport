import { getFunctions, httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseApp } from './config';

let _fns = null;

function fns() {
  if (!firebaseApp) throw new Error('Firebase не настроен');
  if (!_fns) _fns = getFunctions(firebaseApp, 'us-central1');
  return _fns;
}

// ─── Short-lived promise cache, backed by a stale-while-revalidate disk copy ──
// The Boss/Admin screens re-fetch on every focus (useFocusEffect), so moving
// between admin tabs used to re-run all the aggregate Cloud Functions each
// time (~1-2s apiece, more on a cold Cloud Functions instance). Cache their
// results in memory for 60s and dedupe concurrent calls, so navigation within
// a session is instant. Mutations and pull-to-refresh clear it.
//
// On top of that, every result is mirrored to AsyncStorage. The *first* call
// for a key in a cold app session races that disk copy against the network:
// if yesterday's numbers are sitting on disk, they paint instantly instead of
// staring at a spinner while a Cloud Function cold-starts — the real (fresh)
// result still lands in the in-memory cache moments later, so the very next
// natural re-focus (switching admin tabs is routine) already shows it.
const TTL = 60_000;
const DISK_TTL = 24 * 60 * 60 * 1000; // don't show fallback data older than this
const DISK_PREFIX = 'adminCache:';
const _cache = new Map(); // key -> { ts, promise }

async function readDiskCache(key) {
  try {
    const raw = await AsyncStorage.getItem(DISK_PREFIX + key);
    if (!raw) return undefined;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > DISK_TTL) return undefined;
    return data;
  } catch {
    return undefined;
  }
}

function writeDiskCache(key, data) {
  AsyncStorage.setItem(DISK_PREFIX + key, JSON.stringify({ ts: Date.now(), data })).catch(() => {});
}

function cached(key, producer) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return hit.promise;

  const isCold = !hit; // nothing in memory yet this session — worth trying disk
  const fresh = producer();
  fresh.then((data) => writeDiskCache(key, data)).catch(() => {});
  _cache.set(key, { ts: Date.now(), promise: fresh });
  // On failure, drop it so the next call retries instead of caching the error.
  fresh.catch(() => { if (_cache.get(key)?.promise === fresh) _cache.delete(key); });

  if (!isCold) return fresh;

  // Race the network against disk. A disk miss/expiry resolves to a promise
  // that never settles, so the race falls through to `fresh` in that case —
  // it never "wins" with undefined.
  const disk = readDiskCache(key).then((data) => (data === undefined ? new Promise(() => {}) : data));
  return Promise.race([fresh, disk]);
}

export function clearAdminCache() {
  _cache.clear();
  // The disk mirror must go too. Without this, the next read after a mutation
  // sees an empty in-memory cache, treats itself as a cold start, and races
  // the *stale* AsyncStorage copy against the network — AsyncStorage always
  // wins that race, so a just-recorded payment would keep showing as unpaid
  // until DISK_TTL (24h) expired.
  AsyncStorage.getAllKeys()
    .then((keys) => AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(DISK_PREFIX))))
    .catch(() => {});
}

// Fire off the dashboard's aggregate reads in the background as soon as we
// know the signed-in user is Boss/Admin (called from _layout.jsx right after
// role resolution) — by the time they actually navigate to the admin tab,
// results are already in flight or resolved, instead of only starting once
// the dashboard screen mounts.
export function prefetchAdminDashboard() {
  getOrgAnalytics().catch(() => {});
  getFinanceOverview().catch(() => {});
  getTeacherWorkload().catch(() => {});
  getOrgActivity().catch(() => {});
  listManagedTeachers().catch(() => {});
  listManagedParents().catch(() => {});
  // Расписание and Финансы are heavy cross-teacher aggregates on rarely-called
  // (so almost always cold-starting) functions — warming today / the current
  // month here is what makes the first open feel instant rather than a
  // multi-second wait.
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const ymd = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  getStudentPayments(ymd.slice(0, 7)).catch(() => {});
  getOrgSchedule(ymd).catch(() => {});
}

// ─── Mutations (Boss-only) — each clears the cache so reads reflect changes ──

export async function createManagedAccount({ email, firstName, lastName, password, role }) {
  const result = await httpsCallable(fns(), 'createManagedAccount')({ email, firstName, lastName, password, role });
  clearAdminCache();
  return result.data;
}

export async function setAccountEnabled(uid, disabled) {
  const result = await httpsCallable(fns(), 'setAccountEnabled')({ uid, disabled });
  clearAdminCache();
  return result.data;
}

export async function resetManagedPassword(uid, password) {
  const result = await httpsCallable(fns(), 'resetManagedPassword')({ uid, password });
  clearAdminCache();
  return result.data;
}

export async function deleteManagedAccount(uid) {
  const result = await httpsCallable(fns(), 'deleteManagedAccount')({ uid });
  clearAdminCache();
  return result.data;
}

// Boss-only. Sets a teacher's salary config { salaryType, salaryRate }.
export async function setTeacherSalary(teacherUid, salaryType, salaryRate) {
  const result = await httpsCallable(fns(), 'setTeacherSalary')({ teacherUid, salaryType, salaryRate });
  clearAdminCache();
  return result.data;
}

// ─── Cached reads (Boss/Admin) ─────────────────────────────────────────────

// Boss/Admin. Returns the full teacher roster: [{ uid, firstName, lastName, email, createdAt }]
export function listManagedTeachers() {
  return cached('listManagedTeachers', async () => {
    const result = await httpsCallable(fns(), 'listManagedTeachers')();
    return result.data.teachers;
  });
}

// Boss/Admin. One teacher's stores — payments omitted server-side for Admin.
export function getManagedTeacherStores(teacherUid) {
  return cached(`teacherStores:${teacherUid}`, async () => {
    const result = await httpsCallable(fns(), 'getManagedTeacherStores')({ teacherUid });
    return result.data.stores;
  });
}

// Boss/Admin. { totals: {..., income?}, perTeacher: {...} } — income boss-only.
export function getOrgAnalytics() {
  return cached('getOrgAnalytics', async () => {
    const result = await httpsCallable(fns(), 'getOrgAnalytics')();
    return result.data;
  });
}

// Boss/Admin. { events: [...] } — payment events omitted for Admin.
export function getOrgActivity() {
  return cached('getOrgActivity', async () => {
    const result = await httpsCallable(fns(), 'getOrgActivity')();
    return result.data.events;
  });
}

// Boss-only. Finance overview (income, avgCheck, debtors, monthly, byMethod, byTeacher).
export function getFinanceOverview() {
  return cached('getFinanceOverview', async () => {
    const result = await httpsCallable(fns(), 'getFinanceOverview')();
    return result.data;
  });
}

// Boss/Admin. { weekStart, weekEnd, avgLessons, teachers: [...] } — this week's load.
export function getTeacherWorkload() {
  return cached('getTeacherWorkload', async () => {
    const result = await httpsCallable(fns(), 'getTeacherWorkload')();
    return result.data;
  });
}

// Boss/Admin. Every teacher's lessons for one date (YYYY-MM-DD), merged into
// a single chronological feed — powers the Admin "Расписание" tab.
export function getOrgSchedule(date) {
  return cached(`orgSchedule:${date}`, async () => {
    const result = await httpsCallable(fns(), 'getOrgSchedule')({ date });
    return result.data;
  });
}

// Boss/Admin. Every student across every teacher with paid/unpaid status for
// one period (YYYY-MM) — powers the "Финансы" screen.
export function getStudentPayments(period) {
  return cached(`studentPayments:${period}`, async () => {
    const result = await httpsCallable(fns(), 'getStudentPayments')({ period });
    return result.data;
  });
}

// Boss/Admin mutations — clear the cache so the list reflects the change.
export async function addStudentPayment(payload) {
  const result = await httpsCallable(fns(), 'addStudentPayment')(payload);
  clearAdminCache();
  return result.data;
}

export async function deletePayment(teacherUid, paymentId) {
  const result = await httpsCallable(fns(), 'deletePayment')({ teacherUid, paymentId });
  clearAdminCache();
  return result.data;
}

// Boss/Admin. Parents overview.
export function listManagedParents() {
  return cached('listManagedParents', async () => {
    const result = await httpsCallable(fns(), 'listManagedParents')();
    return result.data.parents;
  });
}

// Boss-only. Payroll for one month (YYYY-MM): { period, total, rows: [{uid,
// name, salaryType, rate, lessonCount, hours, amount}] }.
export function getPayroll(period) {
  return cached(`payroll:${period ?? ''}`, async () => {
    const result = await httpsCallable(fns(), 'getPayroll')({ period });
    return result.data;
  });
}

// ─── Teacher schedules (Admin-only — see permissions.js:canManageSchedules) ─
// Each returns `{ success, ... }` on write, or `{ conflicts: [...] }` if the
// new lesson slots collide with existing ones and `force` wasn't passed —
// callers should show a confirm dialog and resubmit with `force: true`.

export async function adminCreateTeacherSchedule(payload) {
  const result = await httpsCallable(fns(), 'adminCreateTeacherSchedule')(payload);
  if (result.data?.success) clearAdminCache();
  return result.data;
}

export async function adminUpdateTeacherSchedule(payload) {
  const result = await httpsCallable(fns(), 'adminUpdateTeacherSchedule')(payload);
  if (result.data?.success) clearAdminCache();
  return result.data;
}

export async function adminDeleteTeacherSchedule(teacherUid, scheduleId) {
  const result = await httpsCallable(fns(), 'adminDeleteTeacherSchedule')({ teacherUid, scheduleId });
  clearAdminCache();
  return result.data;
}

// ─── Uncached (role check / on-demand export) ──────────────────────────────

// Any authenticated user. Reads the caller's own role via the Admin SDK.
export async function getMyRoleRemote() {
  const result = await httpsCallable(fns(), 'getMyRole')();
  return result.data.role;
}

// Boss-only. Raw payment rows for one period (YYYY-MM) — CSV export source.
export async function getMonthlyPaymentsExport(period) {
  const result = await httpsCallable(fns(), 'getMonthlyPaymentsExport')({ period });
  return result.data;
}
