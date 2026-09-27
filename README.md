# DərsReport

**A tutoring center app: a detailed report after every lesson, and parents see their child's progress in real time.**

DərsReport ("Lesson Report") is a mobile app that runs a whole tutoring center in one place. Teachers manage students, schedules and lesson reports. Parents and students get the report as a push notification right after the lesson and see grades, attendance and homework. The management team handles teachers, scheduling, payments and salaries across the organization.

The app is used at the **Jeff Colleges** tutoring center (IELTS, SAT, General English). The interface is available in three languages: Russian, Azerbaijani and English.

---

## Contents

- [Who uses the app](#who-uses-the-app)
- [Features](#features)
- [Tech stack](#tech-stack)
- [How it works](#how-it-works)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Cloud Functions](#cloud-functions)
- [Design system](#design-system)
- [Project conventions](#project-conventions)
- [Known limitations](#known-limitations)

---

## Who uses the app

Five roles, each with its own set of tabs:

| Role | Who | What they see |
|---|---|---|
| **Teacher** | A tutor | Their students, lessons, schedule, reports, analytics |
| **Parent** | A student's parent | Their child's progress, teacher reports, lesson schedule |
| **Student** | The student, if they have an account | Upcoming lessons, reports, their own progress |
| **Admin** | The center's manager | Schedules and payments across all teachers |
| **Owner (Boss)** | The head of the center | Everything, including finances and teacher salaries |

Admins and the owner can also teach: the "Teaching" tile opens the regular teacher mode for them.

## Features

### Teacher

- **Students** — student cards with subject and program (IELTS, SAT, General), groups.
- **Lessons and schedule** — creating lessons, a weekly schedule, attendance tracking.
- **Lesson report** — topic, lesson description, the student's activity score (1–5), strengths, difficulties and mistakes, homework, next lesson plan, a comment for parents.
- **Homework, exams, essay checking (writing)**, a weekly report per student.
- **Analytics** — attendance, grade trends, per-student statistics.
- **Inviting parents and students** — via a one-time linking code.

### Parent and student

- **Parent home screen** — cards for each child with their average score, performance and attendance, the next lesson, recent reports.
- **"New report" push** as soon as the teacher saves a report.
- **All reports** with the activity score, lesson topic and teacher's comment.
- **Lesson schedule** and program progress.

### Management

- **Accounts** — creating, disabling, resetting passwords and deleting teacher and parent accounts (owner only).
- **Organization-wide schedule** — creating and editing teacher schedules (admin).
- **Student payments** — who has and hasn't paid for the month, payment export.
- **Finances and salaries** — a financial overview, salaries and payroll (owner only).
- **Analytics and activity** — teacher workload, activity across the organization.

## Tech stack

| Layer | What is used |
|---|---|
| Mobile app | **Expo SDK 57**, React Native 0.86, expo-router, Zustand (+ AsyncStorage), Reanimated, lucide-react-native, Inter font |
| Backend | **Firebase**: Firestore, Authentication, Cloud Functions v2 (Node.js) |
| Push | Expo Push API (from the `onReportCreated` Cloud Function) |
| Build | EAS Build (`apps/mobile/eas.json`) |
| Localization | ru / az / en in a single file, `apps/mobile/src/utils/i18n/translations.js` |

## How it works

### Data in Firestore

Top-level collections: `users`, `teachers`, `parents`, `students`, `parentCodes`, `studentCodes`, `parentAccess`, `studentAccess`.

- **Teacher data** is stored as `teachers/{uid}/stores/{storeName}` = `{ data: [...], ts }` — a whole array in one document. Stores: `students`, `lessons`, `payments`, `schedules`, `progress`, `groups`, `parents`, `homework`, `writing`, `exams`.
- **Reports** live in a separate subcollection, `teachers/{uid}/reports/{reportId}`, one document per report: over a couple of years reports outgrew Firestore's 1 MB-per-document limit.
- **Parent and student links to a teacher**: `parentAccess/{parentUid}/teachers/{teacherUid}` and `studentAccess/{studentUid}/teachers/{teacherUid}`. Only the teacher writes them, and only the parent or student themselves can read them — this is enforced in `firestore.rules`.

### Sync

- **Teacher**: on sign-in, all stores load in one request. Live subscriptions (`onSnapshot`) are kept only on stores the server can also change (`lessons`, `schedules`, `payments`). Local changes are written back to Firestore with a short delay.
- **Parent and student** read the teacher's data directly and read-only, through live subscriptions. That's why a new report and a new grade show up for them immediately.

### Access control

- The role is stored in `users/{uid}.role`. The server checks both the role and the `disabled` flag: a disabled account is cut off immediately, without waiting for its token to expire.
- UI permissions (`utils/auth/permissions.js`): finances and salaries — owner only; student payments — owner and admin; account management — owner only; editing schedules — admin only (a product decision).

## Repository structure

```
apps/mobile/            Expo app
  src/app/(tabs)/         teacher
  src/app/(parent-tabs)/  parent
  src/app/(student-tabs)/ student
  src/app/(admin-tabs)/   admin and owner
  src/app/report/, lesson/, homework/, exams/, writing/, weekly-report/, …
  src/utils/              Zustand stores, Firebase, i18n, permissions
  src/components/         shared components (PressableScale and others)
apps/web/               web part
functions/              Cloud Functions (functions/index.js)
firestore.rules         Firestore access rules
PROJECT.md              detailed architecture overview for developers (in Russian)
```

## Getting started

```bash
cd apps/mobile
npm install
npx expo start --tunnel          # on a shared Wi-Fi network you can drop --tunnel
npx expo start --tunnel --clear  # after editing babel.config.js or dependencies
```

Cloud Functions:

```bash
cd functions && npm install
firebase deploy --only functions:<name1>,<name2>
```

Checks before committing (there's no test framework):

```bash
node --check functions/index.js
# plus a Babel compile of every apps/mobile/src/**/*.{js,jsx} with cwd = apps/mobile
```

## Cloud Functions

Every function is `onCall`, with the caller's role checked on the server.

| Group | Functions | Who can call |
|---|---|---|
| Accounts | `createManagedAccount`, `setAccountEnabled`, `resetManagedPassword`, `deleteManagedAccount` | Owner |
| Role | `getMyRole` | Any signed-in user |
| Lists and analytics | `listManagedTeachers`, `listManagedParents`, `getManagedTeacherStores`, `getOrgAnalytics`, `getOrgActivity`, `getTeacherWorkload` | Owner, admin |
| Student payments | `getStudentPayments`, `addStudentPayment`, `deletePayment` | Owner, admin |
| Finances and salaries | `getFinanceOverview`, `getMonthlyPaymentsExport`, `setTeacherSalary`, `getPayroll` | Owner |
| Scheduling | `adminCreateTeacherSchedule`, `adminUpdateTeacherSchedule`, `adminDeleteTeacherSchedule`, `getOrgSchedule` | Admin (read access for the owner too) |
| Trigger | `onReportCreated` — pushes a new report to the parent and student | Runs automatically |

Every operation that modifies an array (payments, schedules) runs inside a `db.runTransaction` — otherwise concurrent requests would silently overwrite each other.

## Design system

The **Blue + Indigo + White** style:

| Token | Color | Used for |
|---|---|---|
| `BLUE` | `#2563EB` | primary accent, main buttons |
| `INDIGO` | `#4F46E5` | secondary accent |
| `BLUE_50` / `INDIGO_50` | `#EFF6FF` / `#EEF2FF` | chip and icon backgrounds |
| `TEXT` | `#111827` | primary text |
| `SUB` | `#8E93A1` | secondary text |
| `BORDER` | `#E5E9F2` | card borders |

The only font is Inter (400/500/600/700). Icons come only from lucide-react-native. Cards have borders and no shadows, spacing follows an 8pt grid, and taps go through the shared `PressableScale`. The reference screen for the new style is the parent home screen, `(parent-tabs)/index.jsx`.

## Project conventions

- **IDs** follow the pattern `` `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}` `` and are always stored as strings: a bare `Date.now()` collided within the same millisecond.
- **New UI text** goes into all three languages (ru, az, en) at once. The translations file uses CRLF line endings.
- A detailed architecture description for developers is in [`PROJECT.md`](PROJECT.md) (in Russian).

## Known limitations

- The `students` and `lessons` stores are whole-array documents, so a parent subscribed to them receives data for all of their teacher's students, with filtering done on the client. Fully closing this requires moving those stores into subcollections, the way reports already were.
- Some screens haven't been moved to the new design yet — alternative versions of screens sit side by side and are hidden from the tab bar.
