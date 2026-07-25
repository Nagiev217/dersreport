import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
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
  const [loading,     setLoading]     = useState(true);

  const data = useRef({ reports: {}, students: {}, lessons: {}, progress: {}, allowed: {} });
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

      setStudents(allStudents);
      setReports(allReports.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
      setLessons(allLessons);
      setEvaluations(allEvaluations);
      setGoals(allGoals);
      setLoading(false);
    }

    function subscribe(teacherUid, storeName, bucket) {
      const ref = doc(db, "teachers", teacherUid, "stores", storeName);
      const unsub = onSnapshot(
        ref,
        (snap) => {
          data.current[bucket][teacherUid] = snap.exists() ? snap.data().data : (bucket === "progress" ? {} : []);
          merge();
        },
        () => {
          data.current[bucket][teacherUid] = bucket === "progress" ? {} : [];
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
        subscribe(teacherUid, "reports",  "reports");
        subscribe(teacherUid, "students", "students");
        subscribe(teacherUid, "lessons",  "lessons");
        subscribe(teacherUid, "progress", "progress");
      });
    })();

    return () => {
      mounted = false;
      subs.current.forEach((u) => u());
      subs.current = [];
      data.current = { reports: {}, students: {}, lessons: {}, progress: {}, allowed: {} };
    };
  }, [uid]);

  const student = students[0] ?? null;

  return (
    <StudentDataContext.Provider value={{ student, lessons, reports, evaluations, goals, loading }}>
      {children}
    </StudentDataContext.Provider>
  );
}

export function useStudentData() {
  const ctx = useContext(StudentDataContext);
  if (!ctx) throw new Error("useStudentData must be used inside StudentDataProvider");
  return ctx;
}
