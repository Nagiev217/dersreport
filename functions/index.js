const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generateUniqueParentCode(db) {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = 'PRT-';
    for (let i = 0; i < 6; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    const snap = await db.collection('parentCodes').doc(code).get();
    if (!snap.exists) return code;
  }
  return 'PRT-' + Date.now().toString(36).toUpperCase().slice(-6);
}

async function generateUniqueStudentCode(db) {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = 'STU-';
    for (let i = 0; i < 6; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    const snap = await db.collection('studentCodes').doc(code).get();
    if (!snap.exists) return code;
  }
  return 'STU-' + Date.now().toString(36).toUpperCase().slice(-6);
}

// Builds the Firestore docs for a new account of the given role onto `batch`.
// 'admin'/'boss' only get the users/{uid} doc — they have no teacher/parent profile.
async function buildRoleDocs(batch, db, uid, role, firstName, lastName, normalizedEmail, now) {
  batch.set(db.collection('users').doc(uid), {
    uid,
    role,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    emailVerified: true,
    verifiedAt: now,
    provider: 'email',
    profileCompleted: false,
    createdAt: now,
    updatedAt: now,
  });

  let parentCode = null;
  let studentCode = null;

  if (role === 'teacher') {
    batch.set(db.collection('teachers').doc(uid), {
      uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      subjects: [],
      lessonPrice: null,
      description: '',
      photoURL: null,
      fcmToken: null,
      createdAt: now,
      updatedAt: now,
    });
  } else if (role === 'parent') {
    parentCode = await generateUniqueParentCode(db);
    batch.set(db.collection('parents').doc(uid), {
      uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      parentCode,
      phone: null,
      photoURL: null,
      additionalInfo: '',
      fcmToken: null,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(db.collection('parentCodes').doc(parentCode), {
      uid,
      name: `${firstName.trim()} ${lastName.trim()}`,
    });
  } else if (role === 'student') {
    studentCode = await generateUniqueStudentCode(db);
    batch.set(db.collection('students').doc(uid), {
      uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      studentCode,
      phone: null,
      photoURL: null,
      additionalInfo: '',
      fcmToken: null,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(db.collection('studentCodes').doc(studentCode), {
      uid,
      name: `${firstName.trim()} ${lastName.trim()}`,
    });
  }

  return { parentCode, studentCode };
}

// Verifies the caller is authenticated and their users/{uid}.role is in
// `allowedRoles`. Throws HttpsError otherwise. Used to gate the Boss/Admin
// managed-account API below.
async function requireStaffCaller(request, allowedRoles) {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError('unauthenticated', 'Требуется авторизация');
  const db = getFirestore();
  const callerDoc = await db.collection('users').doc(callerUid).get();
  const callerRole = callerDoc.data()?.role;
  if (!allowedRoles.includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Недостаточно прав');
  }
  return { callerUid, callerRole, db };
}

// uid -> display name, built once per call from an already-fetched
// teachers snapshot. Used by the analytics/activity/finance endpoints below.
function buildTeacherNameMap(teachersSnap) {
  const names = {};
  teachersSnap.docs.forEach((d) => {
    const t = d.data();
    names[d.id] = `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || t.email || d.id;
  });
  return names;
}

// Loads a target account's users/{uid} doc, 404s if missing.
async function getManagedUserDoc(db, uid) {
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Аккаунт не найден');
  return snap.data();
}

// ─── Boss/Admin managed-account API ────────────────────────────────────────
// Cross-teacher visibility for Boss/Admin goes through these callables
// (Admin SDK — bypasses Firestore rules) rather than direct client reads,
// since there is no per-teacher linkage doc for boss/admin like parents have.

exports.createManagedAccount = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['boss']);
  const { email, firstName, lastName, password, role } = request.data ?? {};

  if (!email || !firstName || !lastName || !password || !role) {
    throw new HttpsError('invalid-argument', 'Отсутствуют обязательные поля');
  }
  if (!['teacher', 'parent', 'admin', 'student'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Неверная роль пользователя');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const auth = getAuth();

  let uid;
  try {
    const userRecord = await auth.createUser({
      email: normalizedEmail,
      password,
      displayName: `${firstName.trim()} ${lastName.trim()}`,
      emailVerified: true,
    });
    uid = userRecord.uid;
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Аккаунт с этим email уже существует');
    }
    if (e.code === 'auth/weak-password') {
      throw new HttpsError('invalid-argument', 'Пароль слишком слабый');
    }
    throw new HttpsError('internal', 'Не удалось создать аккаунт');
  }

  const now = Date.now();
  const batch = db.batch();
  await buildRoleDocs(batch, db, uid, role, firstName, lastName, normalizedEmail, now);
  await batch.commit();

  return { uid };
});

// Admin-SDK role lookup for the caller's own account — bypasses Firestore
// rules entirely, used as a fallback when the client-side users/{uid} read
// comes back empty (e.g. rules written before the boss/admin roles existed).
exports.getMyRole = onCall({ invoker: 'public' }, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError('unauthenticated', 'Требуется авторизация');
  const db = getFirestore();
  const snap = await db.collection('users').doc(callerUid).get();
  return { role: snap.exists ? (snap.data()?.role ?? null) : null };
});

// Fetches users/{uid}.disabled for a batch of uids in parallel — used to
// surface account status (enabled/disabled) in the Boss/Admin roster views.
async function buildDisabledMap(db, uids) {
  const snaps = await Promise.all(uids.map((uid) => db.collection('users').doc(uid).get()));
  const map = {};
  snaps.forEach((s, i) => { map[uids[i]] = !!s.data()?.disabled; });
  return map;
}

exports.listManagedTeachers = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['boss', 'admin']);
  const snap = await db.collection('teachers').get();
  const uids = snap.docs.map((d) => d.id);
  const disabledMap = await buildDisabledMap(db, uids);
  return {
    teachers: snap.docs.map((d) => {
      const t = d.data();
      return {
        uid: d.id,
        firstName: t.firstName ?? '',
        lastName: t.lastName ?? '',
        email: t.email ?? '',
        createdAt: t.createdAt ?? null,
        disabled: disabledMap[d.id] ?? false,
      };
    }),
  };
});

const MANAGED_STORE_NAMES = ['students', 'lessons', 'payments', 'schedules', 'progress', 'reports', 'groups'];

exports.getManagedTeacherStores = onCall({ invoker: 'public' }, async (request) => {
  const { db, callerRole } = await requireStaffCaller(request, ['boss', 'admin']);
  const { teacherUid } = request.data ?? {};
  if (!teacherUid) throw new HttpsError('invalid-argument', 'teacherUid обязателен');

  const results = await Promise.all(
    MANAGED_STORE_NAMES.map((name) =>
      db.collection('teachers').doc(teacherUid).collection('stores').doc(name).get()
    )
  );

  const stores = {};
  MANAGED_STORE_NAMES.forEach((name, i) => {
    stores[name] = results[i].exists ? (results[i].data().data ?? null) : null;
  });

  if (callerRole === 'admin') {
    delete stores.payments; // Admin has no finance access
  }

  return { stores };
});

const ANALYTICS_STORE_NAMES = ['students', 'lessons', 'reports', 'payments'];

// Boss/Admin. Aggregates counts across every teacher in one call so the
// roster screen doesn't need N client round-trips. Income is included only
// for Boss (same finance rule as getManagedTeacherStores).
exports.getOrgAnalytics = onCall({ invoker: 'public' }, async (request) => {
  const { db, callerRole } = await requireStaffCaller(request, ['boss', 'admin']);

  const teachersSnap = await db.collection('teachers').get();
  const teacherUids = teachersSnap.docs.map((d) => d.id);

  const perTeacherResults = await Promise.all(
    teacherUids.map(async (uid) => {
      const results = await Promise.all(
        ANALYTICS_STORE_NAMES.map((name) =>
          db.collection('teachers').doc(uid).collection('stores').doc(name).get()
        )
      );
      const [studentsSnap, lessonsSnap, reportsSnap, paymentsSnap] = results;
      const studentsCount = studentsSnap.exists ? (studentsSnap.data().data ?? []).length : 0;
      const lessonsCount  = lessonsSnap.exists  ? (lessonsSnap.data().data ?? []).length  : 0;
      const reportsCount  = reportsSnap.exists  ? (reportsSnap.data().data ?? []).length  : 0;
      const payments      = paymentsSnap.exists ? (paymentsSnap.data().data ?? []) : [];
      const income = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
      return { uid, studentsCount, lessonsCount, reportsCount, income };
    })
  );

  const totals = perTeacherResults.reduce(
    (acc, t) => {
      acc.studentsCount += t.studentsCount;
      acc.lessonsCount += t.lessonsCount;
      acc.reportsCount += t.reportsCount;
      acc.income += t.income;
      return acc;
    },
    { studentsCount: 0, lessonsCount: 0, reportsCount: 0, income: 0 }
  );

  const perTeacher = {};
  perTeacherResults.forEach((t) => {
    perTeacher[t.uid] = {
      studentsCount: t.studentsCount,
      lessonsCount: t.lessonsCount,
      reportsCount: t.reportsCount,
      ...(callerRole === 'boss' ? { income: t.income } : {}),
    };
  });

  return {
    totals: {
      teachersCount: teacherUids.length,
      studentsCount: totals.studentsCount,
      lessonsCount: totals.lessonsCount,
      reportsCount: totals.reportsCount,
      ...(callerRole === 'boss' ? { income: totals.income } : {}),
    },
    perTeacher,
  };
});

// ─── Account lifecycle management (Boss-only) ──────────────────────────────
// Disable/enable/reset-password/delete for any teacher/parent/admin account.
// A disabled Firebase Auth user simply can't sign in (Firebase enforces this
// natively — no extra client-side check needed). Boss accounts are never a
// valid target here, and a Boss can't act on their own account through this
// API — that avoids accidentally locking out the only Boss.

exports.setAccountEnabled = onCall({ invoker: 'public' }, async (request) => {
  const { callerUid, db } = await requireStaffCaller(request, ['boss']);
  const { uid, disabled } = request.data ?? {};
  if (!uid || typeof disabled !== 'boolean') {
    throw new HttpsError('invalid-argument', 'uid и disabled обязательны');
  }
  if (uid === callerUid) {
    throw new HttpsError('failed-precondition', 'Нельзя изменить статус своего же аккаунта');
  }
  const target = await getManagedUserDoc(db, uid);
  if (target.role === 'boss') {
    throw new HttpsError('permission-denied', 'Нельзя изменить статус другого Boss-аккаунта');
  }

  await getAuth().updateUser(uid, { disabled });
  await db.collection('users').doc(uid).set({ disabled, updatedAt: Date.now() }, { merge: true });

  return { success: true };
});

exports.resetManagedPassword = onCall({ invoker: 'public' }, async (request) => {
  const { callerUid, db } = await requireStaffCaller(request, ['boss']);
  const { uid, password } = request.data ?? {};
  if (!uid || !password) {
    throw new HttpsError('invalid-argument', 'uid и password обязательны');
  }
  if (uid === callerUid) {
    throw new HttpsError('failed-precondition', 'Смените свой пароль через профиль');
  }
  const target = await getManagedUserDoc(db, uid);
  if (target.role === 'boss') {
    throw new HttpsError('permission-denied', 'Нельзя сменить пароль другого Boss-аккаунта');
  }

  try {
    await getAuth().updateUser(uid, { password });
  } catch (e) {
    if (e.code === 'auth/weak-password') {
      throw new HttpsError('invalid-argument', 'Пароль слишком слабый');
    }
    throw new HttpsError('internal', 'Не удалось сменить пароль');
  }

  return { success: true };
});

exports.deleteManagedAccount = onCall({ invoker: 'public' }, async (request) => {
  const { callerUid, db } = await requireStaffCaller(request, ['boss']);
  const { uid } = request.data ?? {};
  if (!uid) throw new HttpsError('invalid-argument', 'uid обязателен');
  if (uid === callerUid) {
    throw new HttpsError('failed-precondition', 'Нельзя удалить свой же аккаунт');
  }
  const target = await getManagedUserDoc(db, uid);
  if (target.role === 'boss') {
    throw new HttpsError('permission-denied', 'Нельзя удалить другой Boss-аккаунт');
  }

  // Revoke access immediately.
  try {
    await getAuth().deleteUser(uid);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') {
      throw new HttpsError('internal', 'Не удалось удалить аккаунт из Auth');
    }
  }

  // Remove profile docs — teaching/payment history under teachers/{uid}/stores
  // is intentionally left in place (orphaned, not wiped) so past records
  // survive even after the account itself is gone.
  const batch = db.batch();
  batch.delete(db.collection('users').doc(uid));
  if (target.role === 'teacher') batch.delete(db.collection('teachers').doc(uid));
  if (target.role === 'parent') batch.delete(db.collection('parents').doc(uid));
  if (target.role === 'student') batch.delete(db.collection('students').doc(uid));
  await batch.commit();

  return { success: true };
});

// ─── Parents overview (Boss/Admin) ─────────────────────────────────────────

exports.listManagedParents = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['boss', 'admin']);

  const [parentsSnap, teachersSnap] = await Promise.all([
    db.collection('parents').get(),
    db.collection('teachers').get(),
  ]);
  const teacherNames = buildTeacherNameMap(teachersSnap);
  const disabledMap = await buildDisabledMap(db, parentsSnap.docs.map((d) => d.id));

  const parents = await Promise.all(
    parentsSnap.docs.map(async (d) => {
      const p = d.data();
      const linksSnap = await db.collection('parentAccess').doc(d.id).collection('teachers').get();
      const linkedTeachers = linksSnap.docs.map((l) => ({
        uid: l.id,
        name: teacherNames[l.id] ?? l.id,
      }));
      return {
        uid: d.id,
        firstName: p.firstName ?? '',
        lastName: p.lastName ?? '',
        email: p.email ?? '',
        parentCode: p.parentCode ?? null,
        createdAt: p.createdAt ?? null,
        disabled: disabledMap[d.id] ?? false,
        linkedTeachers,
      };
    })
  );

  return { parents };
});

// ─── Organization-wide activity feed (Boss/Admin) ──────────────────────────
// New students, new reports, and (Boss-only) new payments across every
// teacher, newest first. Payment events are omitted for Admin — same
// finance rule as the rest of this API.

const ACTIVITY_STORE_NAMES = ['students', 'reports', 'payments'];

exports.getOrgActivity = onCall({ invoker: 'public' }, async (request) => {
  const { db, callerRole } = await requireStaffCaller(request, ['boss', 'admin']);

  const teachersSnap = await db.collection('teachers').get();
  const teacherNames = buildTeacherNameMap(teachersSnap);
  const teacherUids = teachersSnap.docs.map((d) => d.id);

  const events = [];

  await Promise.all(
    teacherUids.map(async (uid) => {
      const [studentsSnap, reportsSnap, paymentsSnap] = await Promise.all(
        ACTIVITY_STORE_NAMES.map((name) =>
          db.collection('teachers').doc(uid).collection('stores').doc(name).get()
        )
      );
      const teacherName = teacherNames[uid] ?? uid;

      (studentsSnap.exists ? (studentsSnap.data().data ?? []) : []).forEach((s) => {
        if (!s.createdAt) return;
        events.push({ type: 'student', teacherUid: uid, teacherName, title: s.name ?? '', at: s.createdAt });
      });

      (reportsSnap.exists ? (reportsSnap.data().data ?? []) : []).forEach((r) => {
        if (!r.createdAt) return;
        events.push({
          type: 'report', teacherUid: uid, teacherName,
          title: r.studentName ?? '', subtitle: r.subject ?? '', at: r.createdAt,
        });
      });

      if (callerRole === 'boss') {
        (paymentsSnap.exists ? (paymentsSnap.data().data ?? []) : []).forEach((p) => {
          if (!p.createdAt) return;
          events.push({
            type: 'payment', teacherUid: uid, teacherName,
            title: p.studentName ?? '', amount: p.amount ?? 0, at: p.createdAt,
          });
        });
      }
    })
  );

  events.sort((a, b) => b.at - a.at);

  return { events: events.slice(0, 40) };
});

// ─── Finance overview (Boss-only) ──────────────────────────────────────────
// Monthly income breakdown, income/avg-check per teacher, and "debtors" —
// students with no payment recorded for the current calendar period. Debt
// detection is a heuristic (payment.period === current YYYY-MM), since the
// data model has no explicit paid/pending status on students.

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Boss-only. Deletes one payment server-side — bypasses the client's 1.5s
// debounced sync, which can silently lose a delete if the app closes first.
exports.deletePayment = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['boss']);
  const { teacherUid, paymentId } = request.data ?? {};
  if (!teacherUid || !paymentId) throw new HttpsError('invalid-argument', 'teacherUid и paymentId обязательны');

  const ref = db.collection('teachers').doc(teacherUid).collection('stores').doc('payments');
  const snap = await ref.get();
  const payments = snap.exists ? (snap.data().data ?? []) : [];
  const filtered = payments.filter((p) => p.id !== paymentId);
  if (filtered.length === payments.length) throw new HttpsError('not-found', 'Платёж не найден');

  await ref.set({ data: filtered, ts: Date.now() }, { merge: false });
  return { success: true };
});

exports.getFinanceOverview = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['boss']);

  const teachersSnap = await db.collection('teachers').get();
  const teacherNames = buildTeacherNameMap(teachersSnap);
  const teacherUids = teachersSnap.docs.map((d) => d.id);
  const period = currentPeriod();

  const perTeacherResults = await Promise.all(
    teacherUids.map(async (uid) => {
      const [studentsSnap, paymentsSnap] = await Promise.all([
        db.collection('teachers').doc(uid).collection('stores').doc('students').get(),
        db.collection('teachers').doc(uid).collection('stores').doc('payments').get(),
      ]);
      const students = studentsSnap.exists ? (studentsSnap.data().data ?? []) : [];
      const payments = paymentsSnap.exists ? (paymentsSnap.data().data ?? []) : [];

      const paidThisPeriod = new Set(
        payments.filter((p) => p.period === period).map((p) => p.studentId)
      );
      const debtors = students
        .filter((s) => !paidThisPeriod.has(s.id))
        .map((s) => ({ studentId: s.id, studentName: s.name ?? '', teacherUid: uid, teacherName: teacherNames[uid] }));

      const income = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

      const monthly = {};
      const byMethod = {};
      payments.forEach((p) => {
        const key = p.period ?? (p.date ? p.date.slice(0, 7) : 'unknown');
        monthly[key] = (monthly[key] ?? 0) + (p.amount ?? 0);
        const m = p.method || 'other';
        byMethod[m] = (byMethod[m] ?? 0) + (p.amount ?? 0);
      });

      return { uid, income, paymentsCount: payments.length, debtors, monthly, byMethod };
    })
  );

  const totalIncome = perTeacherResults.reduce((s, t) => s + t.income, 0);
  const totalPayments = perTeacherResults.reduce((s, t) => s + t.paymentsCount, 0);
  const avgCheck = totalPayments > 0 ? Math.round(totalIncome / totalPayments) : 0;

  const monthlyTotals = {};
  perTeacherResults.forEach((t) => {
    Object.entries(t.monthly).forEach(([p, amt]) => {
      monthlyTotals[p] = (monthlyTotals[p] ?? 0) + amt;
    });
  });
  const monthlyBreakdown = Object.entries(monthlyTotals)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .map(([p, amount]) => ({ period: p, amount }));

  const debtors = perTeacherResults.flatMap((t) => t.debtors);

  const methodTotals = {};
  perTeacherResults.forEach((t) => {
    Object.entries(t.byMethod).forEach(([m, amt]) => {
      methodTotals[m] = (methodTotals[m] ?? 0) + amt;
    });
  });
  const byMethod = Object.entries(methodTotals)
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount);

  const byTeacher = perTeacherResults
    .map((t) => ({
      uid: t.uid,
      name: teacherNames[t.uid],
      income: t.income,
      paymentsCount: t.paymentsCount,
      avgCheck: t.paymentsCount > 0 ? Math.round(t.income / t.paymentsCount) : 0,
    }))
    .sort((a, b) => b.income - a.income);

  return { totalIncome, avgCheck, currentPeriod: period, monthlyBreakdown, byMethod, debtors, byTeacher };
});

// Boss-only. Flat list of every payment across every teacher for a given
// period (defaults to the current month) — the raw rows behind a CSV export,
// as opposed to getFinanceOverview's aggregated totals.
exports.getMonthlyPaymentsExport = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['boss']);
  const period = (request.data ?? {}).period || currentPeriod();

  const teachersSnap = await db.collection('teachers').get();
  const teacherNames = buildTeacherNameMap(teachersSnap);
  const teacherUids = teachersSnap.docs.map((d) => d.id);

  const perTeacherPayments = await Promise.all(
    teacherUids.map(async (uid) => {
      const snap = await db.collection('teachers').doc(uid).collection('stores').doc('payments').get();
      const payments = snap.exists ? (snap.data().data ?? []) : [];
      return payments
        .filter((p) => (p.period ?? (p.date ? p.date.slice(0, 7) : null)) === period)
        .map((p) => ({
          teacherName: teacherNames[uid] ?? uid,
          studentName: p.studentName ?? '',
          date: p.date ?? '',
          amount: p.amount ?? 0,
          method: p.method ?? '',
          note: p.note ?? '',
        }));
    })
  );

  const rows = perTeacherPayments.flat().sort((a, b) => a.date.localeCompare(b.date));

  return { period, rows };
});

// ─── Teacher workload (Boss/Admin) ─────────────────────────────────────────
// Lesson count + hours per teacher for the current calendar week (Mon-Sun) —
// operational data, not finance, so both Boss and Admin see it.

function currentWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: toStr(monday), end: toStr(sunday) };
}

exports.getTeacherWorkload = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['boss', 'admin']);
  const { start, end } = currentWeekRange();

  const teachersSnap = await db.collection('teachers').get();
  const teacherNames = buildTeacherNameMap(teachersSnap);
  const teacherUids = teachersSnap.docs.map((d) => d.id);

  const teachers = await Promise.all(
    teacherUids.map(async (uid) => {
      const snap = await db.collection('teachers').doc(uid).collection('stores').doc('lessons').get();
      const lessons = snap.exists ? (snap.data().data ?? []) : [];
      const weekLessons = lessons.filter((l) => l.date >= start && l.date <= end && l.status !== 'cancelled');
      const minutes = weekLessons.reduce((sum, l) => sum + (l.duration ?? 60), 0);
      return {
        uid,
        name: teacherNames[uid] ?? uid,
        lessonsCount: weekLessons.length,
        hours: Math.round((minutes / 60) * 10) / 10,
      };
    })
  );

  teachers.sort((a, b) => b.lessonsCount - a.lessonsCount);
  const avgLessons = teachers.length > 0
    ? Math.round((teachers.reduce((s, t) => s + t.lessonsCount, 0) / teachers.length) * 10) / 10
    : 0;

  return { weekStart: start, weekEnd: end, avgLessons, teachers };
});
