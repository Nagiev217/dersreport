const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
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

  // 'admin' is included with 'teacher': admins (like the boss) can teach via
  // the dashboard's "Обучение" tile, and every cross-teacher aggregate in this
  // file iterates collection('teachers') — without this doc their students and
  // lessons would be invisible to Расписание and Финансы.
  if (role === 'teacher' || role === 'admin') {
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
  const callerData = callerDoc.data();
  const callerRole = callerData?.role;
  if (!allowedRoles.includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Недостаточно прав');
  }
  // Disabling an Auth user blocks future sign-ins but does NOT invalidate ID
  // tokens already issued — without this check a just-disabled Boss/Admin kept
  // full API access until their token expired (up to an hour).
  if (callerData?.disabled === true) {
    throw new HttpsError('permission-denied', 'Аккаунт отключён');
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
  try {
    const batch = db.batch();
    await buildRoleDocs(batch, db, uid, role, firstName, lastName, normalizedEmail, now);
    await batch.commit();
  } catch (e) {
    // The Auth user already exists at this point — if the Firestore side
    // fails, roll it back rather than leaving an orphaned login with no
    // users/{uid} doc (invisible to the app, unrecoverable through the UI).
    await auth.deleteUser(uid).catch(() => {});
    throw new HttpsError('internal', 'Не удалось создать аккаунт (откачено)');
  }

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

// `reports` is absent: it lives in a per-document subcollection and is
// fetched separately, bounded, below.
const MANAGED_STORE_NAMES = ['students', 'lessons', 'payments', 'schedules', 'progress', 'groups'];
const MANAGED_REPORTS_LIMIT = 200;

exports.getManagedTeacherStores = onCall({ invoker: 'public' }, async (request) => {
  const { db, callerRole } = await requireStaffCaller(request, ['boss', 'admin']);
  const { teacherUid } = request.data ?? {};
  if (!teacherUid) throw new HttpsError('invalid-argument', 'teacherUid обязателен');

  const [results, reportsSnap, reportsCountSnap] = await Promise.all([
    Promise.all(
      MANAGED_STORE_NAMES.map((name) =>
        db.collection('teachers').doc(teacherUid).collection('stores').doc(name).get()
      )
    ),
    db.collection('teachers').doc(teacherUid).collection('reports')
      .orderBy('createdAt', 'desc').limit(MANAGED_REPORTS_LIMIT).get(),
    // Separate aggregation query — reportsSnap above is capped at
    // MANAGED_REPORTS_LIMIT for display, so reportsSnap.docs.length can't be
    // used as the true total once a teacher passes that cap.
    db.collection('teachers').doc(teacherUid).collection('reports').count().get(),
  ]);

  const stores = {};
  MANAGED_STORE_NAMES.forEach((name, i) => {
    stores[name] = results[i].exists ? (results[i].data().data ?? null) : null;
  });
  stores.reports = reportsSnap.docs.map((d) => d.data());
  stores.reportsCount = reportsCountSnap.data().count;

  if (callerRole === 'admin') {
    delete stores.payments; // Admin has no finance access
  }

  return { stores };
});

// `reports` uses an aggregation count query instead — no need to pull the
// records themselves just to read a length.
const ANALYTICS_STORE_NAMES = ['students', 'lessons', 'payments'];

// Boss/Admin. Aggregates counts across every teacher in one call so the
// roster screen doesn't need N client round-trips. Income is included only
// for Boss (same finance rule as getManagedTeacherStores).
exports.getOrgAnalytics = onCall({ invoker: 'public' }, async (request) => {
  const { db, callerRole } = await requireStaffCaller(request, ['boss', 'admin']);

  const teachersSnap = await db.collection('teachers').get();
  const teacherUids = teachersSnap.docs.map((d) => d.id);

  const perTeacherResults = await Promise.all(
    teacherUids.map(async (uid) => {
      const [results, reportsCountSnap] = await Promise.all([
        Promise.all(
          ANALYTICS_STORE_NAMES.map((name) =>
            db.collection('teachers').doc(uid).collection('stores').doc(name).get()
          )
        ),
        db.collection('teachers').doc(uid).collection('reports').count().get(),
      ]);
      const [studentsSnap, lessonsSnap, paymentsSnap] = results;
      const studentsCount = studentsSnap.exists ? (studentsSnap.data().data ?? []).length : 0;
      const lessonsCount  = lessonsSnap.exists  ? (lessonsSnap.data().data ?? []).length  : 0;
      const reportsCount  = reportsCountSnap.data().count;
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
  // updateUser({disabled:true}) only blocks new sign-ins; already-issued ID
  // tokens stay valid for up to an hour, and Firestore rules honour them.
  // Revoking refresh tokens cuts the session off at the next token refresh
  // instead of letting it run to expiry.
  if (disabled) {
    await getAuth().revokeRefreshTokens(uid).catch(() => {});
  }
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
  const parentUids = parentsSnap.docs.map((d) => d.id);

  // The disabled flags (users/{uid}) and the parent→teacher links
  // (parentAccess/{uid}/teachers) both only need the parent uids, so they're
  // independent of each other. Awaiting the first before starting the second
  // cost an extra full round-trip wave for no reason.
  const [disabledMap, linksPerParent] = await Promise.all([
    buildDisabledMap(db, parentUids),
    Promise.all(
      parentUids.map((uid) =>
        db.collection('parentAccess').doc(uid).collection('teachers').get()
      )
    ),
  ]);

  const parents = parentsSnap.docs.map((d, i) => {
    const p = d.data();
    const linkedTeachers = linksPerParent[i].docs.map((l) => ({
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
  });

  return { parents };
});

// ─── Organization-wide activity feed (Boss/Admin) ──────────────────────────
// New students, new reports, and (Boss-only) new payments across every
// teacher, newest first. Payment events are omitted for Admin — same
// finance rule as the rest of this API.

// `reports` uses a bounded, pre-sorted subcollection query instead.
const ACTIVITY_STORE_NAMES = ['students', 'payments'];
// The final merge slices to 40 events overall, so no single teacher can
// contribute more than 40 — fetching more per teacher would be wasted work.
const ACTIVITY_FEED_LIMIT = 40;

exports.getOrgActivity = onCall({ invoker: 'public' }, async (request) => {
  const { db, callerRole } = await requireStaffCaller(request, ['boss', 'admin']);

  const teachersSnap = await db.collection('teachers').get();
  const teacherNames = buildTeacherNameMap(teachersSnap);
  const teacherUids = teachersSnap.docs.map((d) => d.id);

  const events = [];

  await Promise.all(
    teacherUids.map(async (uid) => {
      const [storeSnaps, reportsSnap] = await Promise.all([
        Promise.all(
          ACTIVITY_STORE_NAMES.map((name) =>
            db.collection('teachers').doc(uid).collection('stores').doc(name).get()
          )
        ),
        db.collection('teachers').doc(uid).collection('reports')
          .orderBy('createdAt', 'desc').limit(ACTIVITY_FEED_LIMIT).get(),
      ]);
      const [studentsSnap, paymentsSnap] = storeSnaps;
      const teacherName = teacherNames[uid] ?? uid;

      (studentsSnap.exists ? (studentsSnap.data().data ?? []) : []).forEach((s) => {
        if (!s.createdAt) return;
        events.push({ type: 'student', teacherUid: uid, teacherName, title: s.name ?? '', at: s.createdAt });
      });

      reportsSnap.docs.forEach((d) => {
        const r = d.data();
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

  return { events: events.slice(0, ACTIVITY_FEED_LIMIT) };
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

// Boss/Admin. Deletes one payment server-side — bypasses the client's 1.5s
// debounced sync, which can silently lose a delete if the app closes first.
// Admin is included because Admin is now the only role that *records*
// payments (see addStudentPayment) — without delete, a mistyped amount would
// be unfixable from the app.
exports.deletePayment = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['boss', 'admin']);
  const { teacherUid, paymentId } = request.data ?? {};
  if (!teacherUid || !paymentId) throw new HttpsError('invalid-argument', 'teacherUid и paymentId обязательны');

  // Transactional: the whole array is rewritten with merge:false, so a plain
  // read-then-write would let two concurrent calls each start from the same
  // snapshot and have the later write silently discard the earlier one.
  const ref = db.collection('teachers').doc(teacherUid).collection('stores').doc('payments');
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const payments = snap.exists ? (snap.data().data ?? []) : [];
    const filtered = payments.filter((p) => p.id !== paymentId);
    if (filtered.length === payments.length) throw new HttpsError('not-found', 'Платёж не найден');
    tx.set(ref, { data: filtered, ts: Date.now() }, { merge: false });
  });
  return { success: true };
});

// ─── Student payments (Boss/Admin) ─────────────────────────────────────────
// Powers the Финансы screen: for one calendar period, every student across
// every teacher with whether they've paid. This is the two-sided version of
// getFinanceOverview's `debtors` (which is unpaid-only, current-period-only,
// Boss-only) — same underlying heuristic: a student counts as paid if ANY
// payment exists with that `period`, regardless of amount.

const PERIOD_RE = /^\d{4}-\d{2}$/;
// Same pattern as SCHEDULE_DATE_RE further down, declared locally rather than
// forward-referencing a `const` defined ~500 lines below (which would work
// only by accident of call timing).
const PAYMENT_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAYMENT_METHODS = ['cash', 'card', 'transfer'];

exports.getStudentPayments = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['boss', 'admin']);
  const period = (request.data ?? {}).period || currentPeriod();
  if (!PERIOD_RE.test(period)) {
    throw new HttpsError('invalid-argument', 'period должен быть в формате YYYY-MM');
  }

  const teachersSnap = await db.collection('teachers').get();
  const teacherNames = buildTeacherNameMap(teachersSnap);

  const perTeacher = await Promise.all(
    teachersSnap.docs.map(async (d) => {
      const teacherUid = d.id;
      const [studentsSnap, paymentsSnap] = await Promise.all([
        db.collection('teachers').doc(teacherUid).collection('stores').doc('students').get(),
        db.collection('teachers').doc(teacherUid).collection('stores').doc('payments').get(),
      ]);
      const students = studentsSnap.exists ? (studentsSnap.data().data ?? []) : [];
      const payments = paymentsSnap.exists ? (paymentsSnap.data().data ?? []) : [];

      // studentId -> the payment covering this period (first one wins).
      const paidMap = {};
      payments.forEach((p) => {
        if (p.period !== period) return;
        const sid = String(p.studentId);
        if (!paidMap[sid]) paidMap[sid] = p;
      });

      return students.map((s) => {
        const paid = paidMap[String(s.id)];
        return {
          studentId: String(s.id),
          studentName: s.name ?? '',
          teacherUid,
          teacherName: teacherNames[teacherUid],
          // Carried through so the client can prefill an expected amount
          // without duplicating pricing rules server-side.
          paymentType: s.paymentType ?? null,
          rate: s.rate ?? 0,
          paid: !!paid,
          paymentId: paid ? (paid.id ?? null) : null,
          amount: paid ? (paid.amount ?? 0) : null,
          date: paid ? (paid.date ?? null) : null,
          method: paid ? (paid.method ?? null) : null,
          note: paid ? (paid.note ?? '') : null,
        };
      });
    })
  );

  const rows = perTeacher.flat().sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1; // unpaid first — that's the actionable side
    return (a.studentName || '').localeCompare(b.studentName || '');
  });

  const collected = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const paidCount = rows.filter((r) => r.paid).length;

  return {
    period,
    rows,
    totals: { collected, paidCount, unpaidCount: rows.length - paidCount },
  };
});

// Boss/Admin. Records one payment into a teacher's payments store. Teachers
// no longer have any payment UI of their own, so this is the only way a
// payment enters the system.
exports.addStudentPayment = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['boss', 'admin']);
  const { teacherUid, studentId, amount, date, period, method, note } = request.data ?? {};

  await requireTeachingAccount(db, teacherUid);

  if (!studentId) throw new HttpsError('invalid-argument', 'studentId обязателен');
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0 || amt > 100000) {
    throw new HttpsError('invalid-argument', 'amount должен быть числом от 1 до 100000');
  }
  if (!PAYMENT_DATE_RE.test(date ?? '')) {
    throw new HttpsError('invalid-argument', 'date должен быть в формате YYYY-MM-DD');
  }
  if (!PERIOD_RE.test(period ?? '')) {
    throw new HttpsError('invalid-argument', 'period должен быть в формате YYYY-MM');
  }
  if (!PAYMENT_METHODS.includes(method)) {
    throw new HttpsError('invalid-argument', 'method недопустим');
  }

  const storesRef = db.collection('teachers').doc(teacherUid).collection('stores');
  const studentsRef = storesRef.doc('students');
  const paymentsRef = storesRef.doc('payments');

  // The id is built outside the transaction body on purpose: that body can be
  // retried on contention, and regenerating the id per attempt would make the
  // value returned to the client depend on which attempt won.
  const now = Date.now();
  const paymentId = `pay-${now}-${Math.random().toString(36).slice(2, 8)}`;

  // Transactional for the same reason as deletePayment: appending to a
  // whole-array doc with merge:false loses one of two concurrent writes.
  await db.runTransaction(async (tx) => {
    const [studentsSnap, paymentsSnap] = await tx.getAll(studentsRef, paymentsRef);

    const students = studentsSnap.exists ? (studentsSnap.data().data ?? []) : [];
    const student = students.find((s) => String(s.id) === String(studentId));
    if (!student) throw new HttpsError('not-found', 'Ученик не найден у этого учителя');

    const payments = paymentsSnap.exists ? (paymentsSnap.data().data ?? []) : [];
    const record = {
      id: paymentId,
      studentId: String(studentId),
      studentName: student.name ?? '',
      amount: amt,
      date,
      period,
      method,
      note: typeof note === 'string' ? note.slice(0, 200) : '',
      createdAt: now,
    };

    tx.set(paymentsRef, { data: [...payments, record], ts: now }, { merge: false });
  });

  return { success: true, paymentId };
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

// ─── Push notifications: new report → notify linked student + parents ──────
// Tokens are Expo push tokens (client uses getExpoPushTokenAsync), so we send
// via Expo's push API, not admin.messaging(). Targeting needs no collectionGroup
// queries — the teacher's own students/parents stores already denormalize the
// links: student.linkedStudentUid (the student's account uid) and the parents
// store's {appUserId, studentIds}.

// Profile collections that can hold an Expo push token in `fcmToken`.
const TOKEN_COLLECTIONS = ['teachers', 'parents', 'students'];

// Clears a token that Expo has told us is dead. Left in place it would be
// retried on every future notification forever, and — worse — Expo recycles
// tokens, so a stale one can start delivering another person's notifications
// to whoever inherited it.
async function purgeExpoToken(token) {
  const db = getFirestore();
  await Promise.all(
    TOKEN_COLLECTIONS.map(async (coll) => {
      const snap = await db.collection(coll).where('fcmToken', '==', token).get();
      await Promise.all(snap.docs.map((d) => d.ref.update({ fcmToken: null })));
    })
  ).catch(() => {});
}

async function sendExpoPush(messages) {
  const valid = messages.filter((m) => typeof m.to === 'string' && m.to.startsWith('Expo'));
  if (valid.length === 0) return;
  // Expo accepts up to 100 messages per request.
  for (let i = 0; i < valid.length; i += 100) {
    const chunk = valid.slice(i, i + 100);
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      });
      // The HTTP call succeeding says nothing about delivery: Expo reports
      // per-message outcomes in the body, positionally matching the request.
      // Previously the response was discarded, so dead tokens were never
      // noticed and simply accumulated.
      const body = await res.json().catch(() => null);
      const tickets = Array.isArray(body?.data) ? body.data : [];
      const dead = tickets
        .map((ticket, idx) => (ticket?.details?.error === 'DeviceNotRegistered' ? chunk[idx]?.to : null))
        .filter(Boolean);
      await Promise.all([...new Set(dead)].map(purgeExpoToken));
    } catch (e) {
      console.error('Expo push send failed:', e.message);
    }
  }
}

// Reads a profile doc's Expo token from a given top-level collection.
async function getExpoToken(db, collection, uid) {
  if (!uid) return null;
  const snap = await db.collection(collection).doc(uid).get();
  return snap.exists ? (snap.data().fcmToken ?? null) : null;
}

// Fires once per new report document. The previous whole-array version had to
// diff before/after and guard with a 15-minute createdAt window to avoid
// re-notifying on bulk writes — neither is needed now that each report is its
// own document.
exports.onReportCreated = onDocumentCreated('teachers/{teacherUid}/reports/{reportId}', async (event) => {
  const { teacherUid } = event.params;
  const report = event.data?.data();
  if (!report) return;

  const db = getFirestore();

  // Load the teacher's students + parents stores once (denormalized link source).
  const [studentsSnap, parentsSnap] = await Promise.all([
    db.collection('teachers').doc(teacherUid).collection('stores').doc('students').get(),
    db.collection('teachers').doc(teacherUid).collection('stores').doc('parents').get(),
  ]);
  const students = studentsSnap.exists ? (studentsSnap.data().data ?? []) : [];
  const parents = parentsSnap.exists ? (parentsSnap.data().data ?? []) : [];

  const messages = [];
  const sid = String(report.studentId);
  const subject = report.subject ?? '';

  // Student's own account.
  const student = students.find((s) => String(s.id) === sid);
  if (student?.linkedStudentUid) {
    const token = await getExpoToken(db, 'students', student.linkedStudentUid);
    if (token) {
      messages.push({
        to: token,
        title: 'Новый отчёт',
        body: subject ? `Преподаватель добавил отчёт по предмету ${subject}` : 'Преподаватель добавил новый отчёт',
        sound: 'default',
        data: { type: 'new_report', teacherUid, reportId: String(report.id) },
      });
    }
  }

  // Parents linked to this student (parents store: {appUserId, studentIds}).
  const linkedParents = parents.filter(
    (p) => p.appUserId && (p.studentIds ?? []).map(String).includes(sid)
  );
  for (const p of linkedParents) {
    const token = await getExpoToken(db, 'parents', p.appUserId);
    if (token) {
      const who = student?.name ? ` по ученику ${student.name}` : '';
      messages.push({
        to: token,
        title: 'Новый отчёт',
        body: subject ? `Новый отчёт${who} — ${subject}` : `Новый отчёт${who}`,
        sound: 'default',
        data: { type: 'new_report', teacherUid, reportId: String(report.id), studentId: sid },
      });
    }
  }

  await sendExpoPush(messages);
});

// ─── Teacher salaries / payroll (Boss-only) ────────────────────────────────
// Salary config lives on teachers/{uid}: { salaryType, salaryRate }.
// salaryType: "per_lesson" | "hourly" | "fixed" | "none".
// Boss writes it via this function (Admin SDK) since it's another user's doc.

exports.setTeacherSalary = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['boss']);
  const { teacherUid, salaryType, salaryRate } = request.data ?? {};
  if (!teacherUid || !['per_lesson', 'hourly', 'fixed', 'none'].includes(salaryType)) {
    throw new HttpsError('invalid-argument', 'teacherUid и корректный salaryType обязательны');
  }
  const rate = Number(salaryRate) || 0;
  if (!Number.isFinite(rate) || rate < 0 || rate > 100000) {
    throw new HttpsError('invalid-argument', 'salaryRate должен быть числом от 0 до 100000');
  }
  // Without this check a typo'd uid would be happily created by set(merge:true)
  // as a brand-new teachers/{uid} doc, and that phantom teacher would then show
  // up in every aggregate here (payroll, workload, schedule, payments).
  await requireTeachingAccount(db, teacherUid);
  await db.collection('teachers').doc(teacherUid).set(
    { salaryType, salaryRate: rate, updatedAt: Date.now() },
    { merge: true }
  );
  return { success: true };
});

// Computes each teacher's salary for one calendar month (YYYY-MM) from their
// salary config + completed lessons that month.
exports.getPayroll = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['boss']);
  const period = (request.data ?? {}).period || currentPeriod();

  const teachersSnap = await db.collection('teachers').get();
  const rows = await Promise.all(teachersSnap.docs.map(async (d) => {
    const t = d.data();
    const name = `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || t.email || d.id;
    const salaryType = t.salaryType || 'none';
    const rate = Number(t.salaryRate) || 0;

    const snap = await db.collection('teachers').doc(d.id).collection('stores').doc('lessons').get();
    const lessons = snap.exists ? (snap.data().data ?? []) : [];
    const monthLessons = lessons.filter((l) => (l.date || '').startsWith(period) && l.status === 'completed');
    const lessonCount = monthLessons.length;
    const hours = monthLessons.reduce((s, l) => s + (l.duration ?? 60) / 60, 0);

    let amount = 0;
    if (salaryType === 'per_lesson') amount = lessonCount * rate;
    else if (salaryType === 'hourly') amount = Math.round(hours * rate);
    else if (salaryType === 'fixed') amount = rate;

    return { uid: d.id, name, email: t.email ?? '', salaryType, rate, lessonCount, hours: Math.round(hours * 10) / 10, amount };
  }));

  rows.sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return { period, total, rows };
});

// ─── Admin: manage a teacher's schedule (Admin-only) ───────────────────────
// Deliberately excludes Boss — see apps/mobile/src/utils/auth/permissions.js
// (canManageSchedules), a product decision, not an oversight.
//
// `generateLessonsForSchedule`/`findScheduleConflicts` below are ported
// near-verbatim from apps/mobile/src/utils/schedule/store.js (pure functions,
// no RN/zustand deps) — that file stays the source of truth; keep both in
// sync if the recurrence algorithm ever changes.

function scheduleDateStr(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Mirrors scheduleBaseTs in apps/mobile/src/utils/schedule/store.js — see the
// comment there for why the whole id is hashed rather than one character read.
function scheduleBaseTs(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000000;
  return 1750100000000 + h * 100;
}

function generateLessonsForSchedule(schedule) {
  const start = new Date(schedule.startDate + 'T12:00:00');
  const endDate = schedule.endDate ? new Date(schedule.endDate + 'T23:59:59') : null;
  const maxCount = schedule.lessonsCount ?? 52;
  const baseTs = scheduleBaseTs(schedule.id);
  const isParity = schedule.frequency === 'odd' || schedule.frequency === 'even';
  const wantOdd = schedule.frequency === 'odd';

  const freqDays =
    schedule.frequency === 'weekly' ? 7
    : schedule.frequency === 'biweekly' ? 14
    : schedule.frequency === 'monthly' ? 28
    : typeof schedule.frequency === 'number' ? schedule.frequency
    : 7;

  let current = new Date(start.getTime());
  if (isParity) {
    while (current.getDate() % 2 !== (wantOdd ? 1 : 0)) current.setDate(current.getDate() + 1);
  } else {
    while (current.getDay() !== schedule.dayOfWeek) current.setDate(current.getDate() + 1);
  }

  const lessons = [];
  let count = 0;
  while (count < maxCount) {
    if (endDate && current > endDate) break;
    if (isParity && (current.getTime() - start.getTime()) > 366 * 86400000) break;

    lessons.push({
      id: `sched-${schedule.id}-${count}`,
      scheduleId: schedule.id,
      subject: schedule.subject,
      studentIds: schedule.studentIds,
      studentNames: schedule.studentNames,
      date: scheduleDateStr(current),
      time: schedule.time,
      duration: schedule.duration,
      format: schedule.format ?? 'Онлайн',
      status: 'planned',
      notes: '',
      homework: '',
      createdAt: baseTs + count,
    });

    count++;
    if (isParity) {
      current.setDate(current.getDate() + 2);
      while (current.getDate() % 2 !== (wantOdd ? 1 : 0)) current.setDate(current.getDate() + 1);
    } else {
      current.setDate(current.getDate() + freqDays);
    }
  }
  return lessons;
}

function findScheduleConflicts(newLessons, existingLessons) {
  const conflicts = [];
  for (const newL of newLessons) {
    const ns = new Date(`${newL.date}T${newL.time}:00`).getTime();
    const ne = ns + (newL.duration ?? 60) * 60000;
    for (const ex of existingLessons) {
      if (ex.date !== newL.date || ex.status === 'cancelled') continue;
      const es = new Date(`${ex.date}T${ex.time}:00`).getTime();
      const ee = es + (ex.duration ?? 60) * 60000;
      if (ns < ee && ne > es) {
        conflicts.push({ lesson: newL, conflictWith: ex });
        break;
      }
    }
  }
  return conflicts;
}

const SCHEDULE_DURATIONS = [30, 45, 60, 90, 120];
const SCHEDULE_FORMATS = ['Онлайн', 'Офлайн'];
const SCHEDULE_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'odd', 'even'];
const SCHEDULE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SCHEDULE_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const SCHEDULE_DAY_LABELS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function scheduleDayLabel(dayOfWeek) {
  return SCHEDULE_DAY_LABELS[dayOfWeek] ?? '';
}

function validateScheduleFields(data) {
  const { subject, time, duration, format, startDate, endDate, frequency, studentIds } = data;
  if (typeof subject !== 'string' || !subject.trim()) {
    throw new HttpsError('invalid-argument', 'subject обязателен');
  }
  if (!SCHEDULE_TIME_RE.test(time ?? '')) {
    throw new HttpsError('invalid-argument', 'time должен быть в формате HH:MM');
  }
  if (!SCHEDULE_DURATIONS.includes(Number(duration))) {
    throw new HttpsError('invalid-argument', 'duration недопустим');
  }
  if (!SCHEDULE_FORMATS.includes(format)) {
    throw new HttpsError('invalid-argument', 'format недопустим');
  }
  if (!SCHEDULE_DATE_RE.test(startDate ?? '')) {
    throw new HttpsError('invalid-argument', 'startDate должен быть в формате YYYY-MM-DD');
  }
  if (endDate && !SCHEDULE_DATE_RE.test(endDate)) {
    throw new HttpsError('invalid-argument', 'endDate должен быть в формате YYYY-MM-DD');
  }
  if (!SCHEDULE_FREQUENCIES.includes(frequency)) {
    throw new HttpsError('invalid-argument', 'frequency недопустима');
  }
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new HttpsError('invalid-argument', 'studentIds обязателен и не может быть пустым');
  }
}

// Validates the account that OWNS the teaching data at teachers/{uid}.
// Deliberately does NOT require role === 'teacher': Boss and Admin can teach
// too — the dashboard's first quick-access tile ("Обучение") routes them into
// the teacher UI at /(tabs) — so they legitimately own students, lessons and
// schedules under their own uid. Only parents/students never can.
async function requireTeachingAccount(db, teacherUid) {
  if (!teacherUid) throw new HttpsError('invalid-argument', 'teacherUid обязателен');
  const doc = await getManagedUserDoc(db, teacherUid);
  if (doc.role === 'parent' || doc.role === 'student') {
    throw new HttpsError('failed-precondition', 'Указанный аккаунт не может вести занятия');
  }
  return doc;
}

function scheduleStoreRefs(db, teacherUid) {
  const base = db.collection('teachers').doc(teacherUid).collection('stores');
  return { schedulesRef: base.doc('schedules'), lessonsRef: base.doc('lessons') };
}

async function readScheduleStores(tx, schedulesRef, lessonsRef) {
  const [schedulesSnap, lessonsSnap] = await tx.getAll(schedulesRef, lessonsRef);
  return {
    schedules: schedulesSnap.exists ? (schedulesSnap.data().data ?? []) : [],
    lessons: lessonsSnap.exists ? (lessonsSnap.data().data ?? []) : [],
  };
}

async function notifyTeacherScheduleChange(db, teacherUid, title, body, data) {
  const token = await getExpoToken(db, 'teachers', teacherUid);
  if (!token) return;
  await sendExpoPush([{ to: token, title, body, sound: 'default', data }]);
}

// daysOfWeek: number[] — lets Admin create a Mon/Wed/Fri-style schedule in one
// submission; each day becomes its own schedule entry + lesson batch (the
// underlying data model is still one-day-per-schedule, matching the teacher's
// own CreateScheduleModal.jsx), written together in a single batch.
exports.adminCreateTeacherSchedule = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['admin']);
  const data = request.data ?? {};
  const { teacherUid, daysOfWeek, studentIds, studentNames, subject, time, duration, format, startDate, endDate, lessonsCount, frequency, force } = data;

  await requireTeachingAccount(db, teacherUid);
  validateScheduleFields(data);

  const isParity = frequency === 'odd' || frequency === 'even';
  const days = isParity
    ? [null]
    : (Array.isArray(daysOfWeek) ? daysOfWeek : [daysOfWeek]).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  if (!isParity && days.length === 0) {
    throw new HttpsError('invalid-argument', 'Нужно выбрать хотя бы один день недели');
  }

  const now = Date.now();
  const newSchedules = days.map((day) => ({
    id: `sch-${now}-${day ?? 'p'}-${Math.random().toString(36).slice(2, 6)}`,
    studentIds, studentNames: studentNames ?? [],
    subject, dayOfWeek: day, time, duration: Number(duration),
    format, startDate, endDate: endDate || null,
    lessonsCount: lessonsCount ?? null, frequency, createdAt: now,
  }));

  const newLessons = newSchedules.flatMap((s) => generateLessonsForSchedule(s));

  const { schedulesRef, lessonsRef } = scheduleStoreRefs(db, teacherUid);

  // Transactional so a concurrent write can't be lost, and so the conflict
  // check is made against the same snapshot that the write is based on —
  // previously another admin could insert a colliding lesson in the gap
  // between the check and the commit. Returning early without writing simply
  // commits nothing.
  const conflicts = await db.runTransaction(async (tx) => {
    const { schedules: existingSchedules, lessons: existingLessons } =
      await readScheduleStores(tx, schedulesRef, lessonsRef);

    const found = findScheduleConflicts(newLessons, existingLessons);
    if (found.length > 0 && !force) return found;

    tx.set(schedulesRef, { data: [...existingSchedules, ...newSchedules], ts: now }, { merge: false });
    tx.set(lessonsRef, { data: [...existingLessons, ...newLessons], ts: now }, { merge: false });
    return null;
  });

  if (conflicts) {
    return {
      conflicts: conflicts.map((c) => ({ date: c.lesson.date, time: c.lesson.time, conflictWith: c.conflictWith.subject ?? '' })),
    };
  }

  const dayLabels = days.filter((d) => d !== null).map(scheduleDayLabel).join(', ');
  await notifyTeacherScheduleChange(
    db, teacherUid,
    'Новое расписание',
    dayLabels ? `Администратор добавил расписание: ${subject}, ${dayLabels} в ${time}` : `Администратор добавил расписание: ${subject}, ${time}`,
    { type: 'admin_schedule_created', scheduleIds: newSchedules.map((s) => s.id) }
  );

  return { success: true, scheduleIds: newSchedules.map((s) => s.id), lessonsCreated: newLessons.length };
});

// Single-day edit (matches the teacher's own edit flow) — regenerates every
// lesson tied to this scheduleId from scratch, same as CreateScheduleModal.jsx.
exports.adminUpdateTeacherSchedule = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['admin']);
  const data = request.data ?? {};
  const { teacherUid, scheduleId, studentIds, studentNames, subject, dayOfWeek, time, duration, format, startDate, endDate, lessonsCount, frequency, force } = data;

  await requireTeachingAccount(db, teacherUid);
  if (!scheduleId) throw new HttpsError('invalid-argument', 'scheduleId обязателен');
  validateScheduleFields(data);

  const isParity = frequency === 'odd' || frequency === 'even';
  if (!isParity && !(Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6)) {
    throw new HttpsError('invalid-argument', 'dayOfWeek должен быть от 0 до 6');
  }

  const { schedulesRef, lessonsRef } = scheduleStoreRefs(db, teacherUid);
  const now = Date.now();
  const updatedSchedule = {
    id: scheduleId, studentIds, studentNames: studentNames ?? [],
    subject, dayOfWeek: isParity ? null : dayOfWeek, time, duration: Number(duration),
    format, startDate, endDate: endDate || null,
    lessonsCount: lessonsCount ?? null, frequency, createdAt: now,
  };
  const newLessons = generateLessonsForSchedule(updatedSchedule);

  // Transactional — same reasoning as adminCreateTeacherSchedule.
  const conflicts = await db.runTransaction(async (tx) => {
    const { schedules: existingSchedules, lessons: existingLessons } =
      await readScheduleStores(tx, schedulesRef, lessonsRef);

    if (!existingSchedules.some((s) => s.id === scheduleId)) {
      throw new HttpsError('not-found', 'Расписание не найдено');
    }

    const otherLessons = existingLessons.filter((l) => l.scheduleId !== scheduleId);
    const found = findScheduleConflicts(newLessons, otherLessons);
    if (found.length > 0 && !force) return found;

    const updatedSchedules = existingSchedules.map((s) => (s.id === scheduleId ? updatedSchedule : s));
    tx.set(schedulesRef, { data: updatedSchedules, ts: now }, { merge: false });
    tx.set(lessonsRef, { data: [...otherLessons, ...newLessons], ts: now }, { merge: false });
    return null;
  });

  if (conflicts) {
    return {
      conflicts: conflicts.map((c) => ({ date: c.lesson.date, time: c.lesson.time, conflictWith: c.conflictWith.subject ?? '' })),
    };
  }

  await notifyTeacherScheduleChange(
    db, teacherUid,
    'Расписание изменено',
    `Администратор изменил расписание: ${subject}, ${scheduleDayLabel(dayOfWeek)} в ${time}`.trim(),
    { type: 'admin_schedule_updated', scheduleId }
  );

  return { success: true, lessonsCreated: newLessons.length };
});

exports.adminDeleteTeacherSchedule = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['admin']);
  const { teacherUid, scheduleId } = request.data ?? {};
  await requireTeachingAccount(db, teacherUid);
  if (!scheduleId) throw new HttpsError('invalid-argument', 'scheduleId обязателен');

  const { schedulesRef, lessonsRef } = scheduleStoreRefs(db, teacherUid);

  // Transactional — same reasoning as adminCreateTeacherSchedule. The deleted
  // schedule is returned out so the notification below can name its subject
  // without re-reading the doc it just removed.
  const target = await db.runTransaction(async (tx) => {
    const { schedules: existingSchedules, lessons: existingLessons } =
      await readScheduleStores(tx, schedulesRef, lessonsRef);

    const found = existingSchedules.find((s) => s.id === scheduleId);
    if (!found) throw new HttpsError('not-found', 'Расписание не найдено');

    const now = Date.now();
    tx.set(schedulesRef, { data: existingSchedules.filter((s) => s.id !== scheduleId), ts: now }, { merge: false });
    tx.set(lessonsRef, { data: existingLessons.filter((l) => l.scheduleId !== scheduleId), ts: now }, { merge: false });
    return found;
  });

  await notifyTeacherScheduleChange(
    db, teacherUid,
    'Расписание удалено',
    `Администратор удалил расписание: ${target.subject ?? ''}`.trim(),
    { type: 'admin_schedule_deleted', scheduleId }
  );

  return { success: true };
});

// ─── Org-wide schedule (Boss/Admin) ────────────────────────────────────────
// Powers the Admin "Расписание" tab: every teacher's lessons for one
// calendar date, merged into a single chronological feed. Same read-every-
// teacher's-whole-lessons-array cost profile as getTeacherWorkload/
// getFinanceOverview elsewhere in this file — consistent with this app's
// accepted lessons/schedules architecture (unlike `reports`, which was
// migrated to a subcollection specifically because it didn't scale this way).
exports.getOrgSchedule = onCall({ invoker: 'public' }, async (request) => {
  const { db } = await requireStaffCaller(request, ['boss', 'admin']);
  const { date } = request.data ?? {};
  if (!SCHEDULE_DATE_RE.test(date ?? '')) {
    throw new HttpsError('invalid-argument', 'date обязателен (YYYY-MM-DD)');
  }

  const teachersSnap = await db.collection('teachers').get();
  const teacherNames = buildTeacherNameMap(teachersSnap);

  const perTeacher = await Promise.all(
    teachersSnap.docs.map(async (d) => {
      const teacherUid = d.id;
      const snap = await db.collection('teachers').doc(teacherUid).collection('stores').doc('lessons').get();
      const lessons = snap.exists ? (snap.data().data ?? []) : [];
      const dayLessons = lessons.filter((l) => l.date === date);
      return { teacherUid, teacherName: teacherNames[teacherUid], lessons: dayLessons };
    })
  );

  const events = perTeacher
    .flatMap(({ teacherUid, teacherName, lessons }) =>
      lessons.map((l) => ({ ...l, teacherUid, teacherName }))
    )
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  // Every teacher is kept (even with 0 lessons that day) so the filter row
  // on the client stays stable as the selected date changes.
  const teachers = perTeacher.map(({ teacherUid, teacherName, lessons }) => ({
    teacherUid, teacherName, count: lessons.length,
  }));

  return { date, events, teachers };
});
