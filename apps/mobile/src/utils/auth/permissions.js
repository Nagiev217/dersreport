// Role constants + client-side permission checks. Mirrors the enforcement
// done server-side in functions/index.js (requireStaffCaller / getManagedTeacherStores) —
// these client checks are for UI only, the Cloud Functions are the real gate.

export const ROLES = {
  TEACHER: 'teacher',
  PARENT: 'parent',
  STUDENT: 'student',
  ADMIN: 'admin',
  BOSS: 'boss',
};

export const isStaffRole = (role) => role === ROLES.BOSS || role === ROLES.ADMIN;

// Boss sees finance/payments data; Admin does not.
export const canViewFinance = (role) => role !== ROLES.ADMIN;

// Only Boss can create teacher/parent/admin accounts.
export const canManageAccounts = (role) => role === ROLES.BOSS;

// Admin-only (deliberately excludes Boss) — writes a teacher's schedule on
// their behalf. An intentional exception to the usual "Boss can do
// everything Admin can" pattern, per product decision.
export const canManageSchedules = (role) => role === ROLES.ADMIN;

// Student payment records — both Boss and Admin manage these. Deliberately
// separate from canViewFinance (teacher salaries/payroll), which stays
// Boss-only: student payments are operational, salaries are not.
export const canViewPayments = (role) => isStaffRole(role);
