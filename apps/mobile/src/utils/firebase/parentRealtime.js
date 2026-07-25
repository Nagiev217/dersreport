import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db, IS_FIREBASE_READY } from "./config";
import { auth } from "./config";
import { getParentAccess } from "./roles";

const ParentDataContext = createContext(null);

export function ParentDataProvider({ children }) {
  const [reports,  setReports]  = useState([]);
  const [students, setStudents] = useState([]);
  const [lessons,  setLessons]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  // mutable containers — shared across closures without re-subscribing
  const data = useRef({ reports: {}, students: {}, lessons: {}, allowed: {} });
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

      setStudents(allStudents);
      setReports(allReports.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
      setLessons(allLessons);
      setLoading(false);
    }

    function subscribe(teacherUid, storeName, bucket) {
      const ref = doc(db, "teachers", teacherUid, "stores", storeName);
      const unsub = onSnapshot(
        ref,
        (snap) => {
          data.current[bucket][teacherUid] = snap.exists() ? (snap.data().data ?? []) : [];
          merge();
        },
        () => {
          data.current[bucket][teacherUid] = [];
          merge();
        }
      );
      subs.current.push(unsub);
    }

    (async () => {
      const links = await getParentAccess(uid);
      if (!mounted) return;

      if (links.length === 0) {
        setLoading(false);
        return;
      }

      links.forEach(({ teacherUid, studentIds }) => {
        data.current.allowed[teacherUid] = new Set(studentIds.map(String));
        subscribe(teacherUid, "reports",  "reports");
        subscribe(teacherUid, "students", "students");
        subscribe(teacherUid, "lessons",  "lessons");
      });
    })();

    return () => {
      mounted = false;
      subs.current.forEach((u) => u());
      subs.current = [];
      data.current = { reports: {}, students: {}, lessons: {}, allowed: {} };
    };
  }, [uid]);

  return (
    <ParentDataContext.Provider value={{ reports, students, lessons, loading }}>
      {children}
    </ParentDataContext.Provider>
  );
}

export function useParentData() {
  const ctx = useContext(ParentDataContext);
  if (!ctx) throw new Error("useParentData must be used inside ParentDataProvider");
  return ctx;
}
