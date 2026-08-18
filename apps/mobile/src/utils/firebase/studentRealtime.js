import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onSnapshot, doc, collection, query, where } from "firebase/firestore";
import { db, IS_FIREBASE_READY } from "./config";
import { auth } from "./config";
import { getStudentAccess } from "./roles";

const StudentDataContext = createContext(null);

// Mirrors ParentDataProvider, but a student account maps to exactly one
// roster id per linked teacher (not many), and payments is never
// subscribed to — financial data isn't fetched for the student view at all.
export function StudentDataProvider({ children }) {
  const [reports,     setReports]     = useState([]);
  const [students,    setStudents]    = useState([]);
  const [lessons,     setLessons]     = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [goals,       setGoals]       = useState([]);
  const [assignedExams, setAssignedExams] = useState([]);
  const [loading,     setLoading]     = useState(true);

  const data = useRef({ reports: {}, students: {}, lessons: {}, progress: {}, exams: {}, allowed: {} });
  const subs = useRef([]);

  const uid = auth?.currentUser?.uid;

  useEffect(() => {
    if (!uid || !IS_FIREBASE_READY || !db) {
      setLoading(false);
      return;
    }

    let mounted = true;

    function merge() {
      if (!mounted) return;
      const d = data.current;

      const allStudents = Object.entries(d.students).flatMap(([tuid, arr]) =>
        (arr ?? []).filter((s) => d.allowed[tuid]?.has(String(s.id)))
      );
      const allReports = Object.entries(d.reports).flatMap(([tuid, arr]) =>
        (arr ?? []).filter((r) => d.allowed[tuid]?.has(String(r.studentId)))
      );
      const allLessons = Object.entries(d.lessons).flatMap(([tuid, arr]) =>
        (arr ?? []).filter((l) =>
          (l.studentIds ?? []).some((id) => d.allowed[tuid]?.has(String(id)))
        )
      );
      const allEvaluations = Object.entries(d.progress).flatMap(([tuid, p]) =>
        (p?.evaluations ?? []).filter((e) => d.allowed[tuid]?.has(String(e.studentId)))
      );
      const allGoals = Object.entries(d.progress).flatMap(([tuid, p]) =>
        (p?.goals ?? []).filter((g) => d.allowed[tuid]?.has(String(g.studentId)))
      );
      // Exams store doc is { exams: [...], assignments: [...] }; surface this
      // student's assignments joined with their exam meta.
      const allAssignedExams = Object.entries(d.exams).flatMap(([tuid, ex]) => {
        const exList = ex?.exams ?? [];
        return (ex?.assignments ?? [])
          .filter((a) => d.allowed[tuid]?.has(String(a.studentId)))
          .map((a) => {
            const exam = exList.find((e) => e.id === a.examId);
            return {
              ...a,
              section: a.section ?? exam?.section,
              questionCount: exam?.questions?.length ?? 0,
              totalPoints: exam?.totalPoints ?? 0,
            };
          });
      });

      setStudents(allStudents);
      setReports(allReports.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
      setLessons(allLessons);
      setEvaluations(allEvaluations);
      setGoals(allGoals);
      setAssignedExams(allAssignedExams.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")));
      setLoading(false);
    }

    const OBJECT_BUCKETS = new Set(["progress", "exams"]);
    function subscribe(teacherUid, storeName, bucket) {
      const ref = doc(db, "teachers", teacherUid, "stores", storeName);
      const unsub = onSnapshot(
        ref,
        (snap) => {
          data.current[bucket][teacherUid] = snap.exists() ? snap.data().data : (OBJECT_BUCKETS.has(bucket) ? {} : []);
          merge();
        },
        () => {
          data.current[bucket][teacherUid] = OBJECT_BUCKETS.has(bucket) ? {} : [];
          merge();
        }
      );
      subs.current.push(unsub);
    }

    // Reports live in a per-document subcollection — query just this
    // student's own records rather than the teacher's entire array.
    function subscribeReports(teacherUid, studentId) {
      const q = query(
        collection(db, "teachers", teacherUid, "reports"),
        where("studentId", "==", String(studentId))
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          data.current.reports[teacherUid] = snap.docs.map((d) => d.data());
          merge();
        },
        (err) => {
          console.error(`[studentRealtime] reports query failed for teacher ${teacherUid} (studentId: ${studentId}):`, err?.code, err?.message);
          data.current.reports[teacherUid] = [];
          merge();
        }
      );
      subs.current.push(unsub);
    }

    (async () => {
      const links = await getStudentAccess(uid);
      if (!mounted) return;

      if (links.length === 0) {
        setLoading(false);
        return;
      }

      links.forEach(({ teacherUid, studentId }) => {
        data.current.allowed[teacherUid] = new Set([String(studentId)]);
        subscribeReports(teacherUid, studentId);
        subscribe(teacherUid, "students", "students");
        subscribe(teacherUid, "lessons",  "lessons");
        subscribe(teacherUid, "progress", "progress");
        subscribe(teacherUid, "exams",    "exams");
      });
    })();

    return () => {
      mounted = false;
      subs.current.forEach((u) => u());
      subs.current = [];
      data.current = { reports: {}, students: {}, lessons: {}, progress: {}, exams: {}, allowed: {} };
    };
  }, [uid]);

  const student = students[0] ?? null;

  return (
    <StudentDataContext.Provider value={{ student, lessons, reports, evaluations, goals, assignedExams, loading }}>
      {children}
    </StudentDataContext.Provider>
  );
}

export function useStudentData() {
  const ctx = useContext(StudentDataContext);
  if (!ctx) throw new Error("useStudentData must be used inside StudentDataProvider");
  return ctx;
}
