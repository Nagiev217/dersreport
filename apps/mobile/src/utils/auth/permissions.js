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
