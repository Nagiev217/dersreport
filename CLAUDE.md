# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**DərsReport** ("Lesson Report") — an app for running a tutoring center. Teachers manage students, schedules, and lesson reports; parents and students see progress in real time; admin/boss manage teachers, scheduling, and finances org-wide.

- **Stack**: Expo (React Native) + Firebase (Firestore, Auth, Cloud Functions v2). Monorepo: mobile app in `apps/mobile/`, server code in `functions/`.
- **Platforms**: iOS and Android via Expo Go / a development build.
- **Firebase project**: `dersreport` (see `.firebaserc`).
- The owner/developer is not a professional programmer and works primarily through Claude Code — explain findings in plain terms, confirm before hard-to-reverse actions (push to GitHub, deleting files, dependency upgrades, prod deploys), and diagnose with a test/log/read before proposing a fix rather than guessing.
- A more detailed narrative version of this file may exist outside the repo (e.g. `~/Downloads/PROJECT.md` on the maintainer's machine) — if present, read it too and treat it as authoritative over this file when they disagree, updating whichever is stale.

## Commands

There is no configured lint or test suite (no ESLint config, no Jest). Verification instead relies on:

```bash
# Syntax-check the Cloud Functions entrypoint
node --check functions/index.js

# "Compile" every mobile source file with Babel to catch syntax errors
# (must run with cwd = apps/mobile so babel.config.js — and its worklets
# plugin needs — are picked up)
cd apps/mobile && node -e "
const { transformFileSync } = require('@babel/core');
const glob = require('glob'); // or walk the fs manually if glob isn't installed
glob.sync('src/**/*.{js,jsx}').forEach(f => transformFileSync(f));
"
```

Run the app:
```bash
cd apps/mobile
npx expo start --tunnel      # or drop --tunnel on shared Wi-Fi — faster/more reliable
npx expo start --tunnel --clear   # after editing babel.config.js or deps — Metro otherwise serves a stale cached transform
npm run ios                  # expo run:ios
npm run android              # expo run:android
```

Cloud Functions:
```bash
firebase deploy --only functions:<name1>,<name2>   # deploy specific functions
cd functions && npm run serve                       # firebase emulators:start --only functions
```
The first `firebase deploy` attempt on this kind of setup often fails with a transient `Cannot determine backend specification. Timeout after 10000` — retrying immediately usually succeeds.

Testing Firestore rules requires the Firestore emulator (`@firebase/rules-unit-testing`), which needs **JDK 21+** — check `JAVA_HOME` before `firebase emulators:exec` if the system Java is older.

## Architecture

### Roles and route groups

Five roles, each with its own tab group under `apps/mobile/src/app/`:

| Role | Screens folder | Who |
|---|---|---|
| `teacher` | `(tabs)/` | Runs their own students, lessons, reports |
| `parent` | `(parent-tabs)/` | Views their child's progress |
| `student` | `(student-tabs)/` | The student, if they have an account |
| `admin` | `(admin-tabs)/` | Manages scheduling and payments org-wide |
| `boss` | `(admin-tabs)/` (same UI, different permissions) | Owner — sees everything, including teacher salaries |

Role lives at `users/{uid}.role`, read via `getMyRole` / `requireStaffCaller` server-side. **Boss and Admin can also teach** — the first Quick Access tile ("Обучение"/Teaching) routes them into `/(tabs)`, so they legitimately own `teachers/{theirUid}/...` data just like an ordinary teacher (this dual identity is a recurring source of "duplicate data" bugs when a parent is linked to both their teacher-identity and their admin-identity).

### Firestore data model

Top-level collections: `users`, `teachers`, `parents`, `students`, `parentCodes`, `studentCodes`, `parentAccess`, `studentAccess`.

**Teacher data uses a "whole array in one document" pattern**: `teachers/{uid}/stores/{storeName}` = `{ data: [...], ts }`, fully overwritten (`merge: false`) on every change. Store names: `students`, `lessons`, `payments`, `schedules`, `progress`, `groups`, `parents`, `homework`, `writing`, `exams`.

**Exception — `reports`**: migrated to a real subcollection, `teachers/{uid}/reports/{reportId}`, one document per report (the old whole-array approach hit Firestore's 1MB document limit after a couple years of reports).

**Parent/student ↔ teacher links**: `parentAccess/{parentUid}/teachers/{teacherUid}` = `{ studentIds: [...], teacherName, linkedAt }`; similarly `studentAccess/{studentUid}/teachers/{teacherUid}` = `{ studentId, ... }` (a student has one id, not an array). Only the owning teacher writes these; only the parent/student themselves can read — enforced in `firestore.rules`.

**`studentId` must always be a string** (`String(id)`) wherever it appears in reports/links. IDs are generated as `` `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}` `` — a bare `Date.now()` collided when created in the same millisecond and broke React keys. Use the same pattern for any new id-generation site.

**Known limitation, not a bug** (documented in `firestore.rules`): `students` and `lessons` are whole-array documents, so a parent subscribing to a teacher's store physically receives *all* of that teacher's students/lessons, not just their own — the client filters client-side. Fully closing this needs migrating those stores to subcollections the way `reports` already was; that migration hasn't been started.

### Client ↔ Firestore sync (two different patterns)

**Teacher client** (`apps/mobile/src/app/_layout.jsx`, `useFirebaseSync`): on login,
1. Loads every store in one shot (`loadAllStores`).
2. Subscribes to live `onSnapshot` updates only for stores something *other* than this client can also write (`lessons`, `schedules`, `payments` — Cloud Functions write these on Admin actions). The rest are client-only writes, so no listener is needed for them.
3. On local mutation, debounces a write back to Firestore (`students`/`lessons` write immediately, everything else after ~1.5s).

Locally, teacher-side state lives in per-domain Zustand stores under `apps/mobile/src/utils/{domain}/store.js` (e.g. `useStudentsStore`, `useLessonsStore`, `useReportsStore`), each persisted to `AsyncStorage`; `useFirebaseSync` is the bridge that keeps these in sync with Firestore. Reading only one side (the store file, or only `_layout.jsx`) gives an incomplete picture of how teacher data actually flows.

**Parent/student clients** read a teacher's data directly and read-only, via `apps/mobile/src/utils/firebase/parentRealtime.js` / `studentRealtime.js` — separate `onSnapshot` subscriptions on `teachers/{uid}/stores/{name}` (just `students`, `lessons`, and for students also `progress`, `exams`) plus a query against the `reports` subcollection filtered with `where("studentId", "in", [...])`.

### Cloud Functions (`functions/index.js`)

All functions are `onCall`, gated by `requireStaffCaller(request, ['boss','admin'])`, which checks both `users/{uid}.role` **and** `users/{uid}.disabled` — a disabled account's Firebase Auth token isn't invalidated instantly, so the disabled check has to happen server-side too.

Grouped by purpose:
- **Accounts** (Boss-only): `createManagedAccount`, `setAccountEnabled`, `resetManagedPassword`, `deleteManagedAccount`
- **Role**: `getMyRole` (public, reads your own role)
- **Lists/aggregates** (Boss+Admin): `listManagedTeachers`, `listManagedParents`, `getManagedTeacherStores`, `getOrgAnalytics`, `getOrgActivity`, `getTeacherWorkload`
- **Student payments** (Boss+Admin): `getStudentPayments`, `addStudentPayment`, `deletePayment`
- **Finance/payroll** (Boss-only): `getFinanceOverview`, `getMonthlyPaymentsExport`, `setTeacherSalary`, `getPayroll`
- **Scheduling** (Admin-only to write; `getOrgSchedule` is Boss+Admin read)
- **Trigger**: `onReportCreated` — pushes to the parent/student via the Expo push API when a report is created

Any mutation touching an array field (`addStudentPayment`, `deletePayment`, `admin*Schedule`) is wrapped in `db.runTransaction` — without it, concurrent calls silently clobbered each other via a read-modify-write race on the same document.

### Permissions

Defined in `apps/mobile/src/utils/auth/permissions.js`:
- `canViewFinance` — Boss only (teacher salaries/payroll)
- `canViewPayments` — Boss + Admin (student payments are operational data, distinct from payroll)
- `canManageAccounts` — Boss only
- `canManageSchedules` — Admin only, **deliberately not Boss** — Boss doesn't edit schedules by product decision

### i18n

Three locales in one file: `apps/mobile/src/utils/i18n/translations.js`, objects `ru`, `az`, `en` in that order (~1000+ lines each). **The file uses CRLF line endings** — a programmatic edit (not the Edit tool) using `\n`-based regex won't match; split on `/\r?\n/` and rejoin with the same EOL. Any new user-facing string goes into all three locales at once — `grep -c "^  keyName:" translations.js` should come back `3`.

### Design system (Blue + Indigo + White)

Tokens aren't centralized — they're redeclared as constants at the top of each screen (look for `const BLUE = "#2563EB"`). When touching a screen, reuse these exact values rather than inventing new ones:

```
BLUE      #2563EB   — primary accent, primary buttons, active states
INDIGO    #4F46E5   — secondary accent, usually mixed with BLUE
BLUE_50   #EFF6FF   — background for chips/icons on the BLUE accent
INDIGO_50 #EEF2FF   — background for chips/icons on the INDIGO accent
TEXT      #111827   — primary text
SUB       #8E93A1   — secondary text, labels
BORDER    #E5E9F2   — card borders and dividers
```
Plus a few recurring non-brand accents for statuses: green `#16A34A` / `#ECFDF5` (success/attendance), amber `#D97706` / `#FFFBEB` (grades/warnings), red `#EF4444` (unread badge).

- **Type**: only Inter — `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold` (loaded via `useFonts` in `apps/mobile/src/app/_layout.jsx`). No other typeface/weight. Roughly: `11-13` small labels, `14-15` card body text, `16-18` section headings/names, `24-28` big dashboard numbers. Headings carry a small negative `letterSpacing` (`-0.2`…`-0.6`).
- **Cards**: `borderWidth: 1, borderColor: BORDER`, no shadows (except stat cards, which get a light indigo shadow). Radius by role: `10-13` small elements (icon chips, buttons), `18-20` normal section cards, `22+` large accent cards. Circular elements use `borderRadius` = exactly half the side.
- **Spacing**: 8pt grid. On the parent dashboard this is formalized as `const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }` — reuse that shape instead of bare numbers when rebuilding a screen in this style.
- **Icons**: `lucide-react-native` only — no emoji as icons, no raster images for UI chrome. Icon size inside a colored chip is usually `16-20px` in a `32-40px` chip.
- **Touch feedback**: the shared `PressableScale` component (`apps/mobile/src/components/PressableScale.jsx`), a Reanimated spring driven by `dampingRatio` (not duration, so repeated taps mid-animation behave predictably). Wrap anything tappable in it rather than hand-rolling a `TouchableOpacity` animation.
- **Reusable section patterns** (see `(parent-tabs)/index.jsx` as the reference): `SectionCard` (titled card with an optional "See all →" link) and `StatCard` (square stat tile: colored icon, big number, label). Check whether one of these fits before writing a new one.
- **Not every screen is migrated to this style yet.** Undecided variant pairs exist side by side, registered in their `_layout.jsx` with `href: null` (reachable only by direct navigation, hidden from the tab bar): `(parent-tabs)/child.jsx` vs `child-variant-modules.jsx`, `(parent-tabs)/reports.jsx` vs `reports-variant-timeline.jsx`, `(admin-tabs)/analytics.jsx` vs `analytics-variant-calm/premium/tabs.jsx`. `(parent-tabs)/index.jsx` is fully migrated with real (non-mock) data and is the best reference for a new screen in this style.
- The `ui-ux-pro-max` skill (`.claude/skills/ui-ux-pro-max`) is available for design work, but its `--design-system` command gives generic recommendations that don't know about this project's established style — when working on an existing screen, consistency with Blue+Indigo+White wins over what the skill proposes from scratch. Its checklist (44pt+ touch targets, contrast, safe area, no emoji icons) is still worth applying regardless.
