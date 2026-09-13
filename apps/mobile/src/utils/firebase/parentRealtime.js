import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onSnapshot, doc, collection, query, where } from "firebase/firestore";
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

      // A parent can be granted access to the same child under more than one
      // teacherUid (e.g. a Boss/Admin's own dual teacher identity mirrors the
      // same student records into a second teachers/{uid}/stores doc — see
      // PROJECT.md "Boss и Admin могут сами преподавать"). Dedupe by id so a
      // child, lesson, or report doesn't visually double just because its
      // source data exists under two teacher documents.
      const dedupeById = (arr) => [...new Map(arr.map((x) => [String(x.id), x])).values()];

      setStudents(dedupeById(allStudents));
      setReports(dedupeById(allReports).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
      setLessons(dedupeById(allLessons));
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

    // Reports live in a per-document subcollection, so we query only this
    // parent's children instead of pulling the teacher's whole array down
    // and filtering it here. Security rules enforce the same scoping.
    function subscribeReports(teacherUid, studentIds) {
      // Firestore caps 'in' at 30 values; a parent's children under a single
      // teacher will never come close.
      const ids = studentIds.map(String).slice(0, 30);
      if (ids.length === 0) {
        data.current.reports[teacherUid] = [];
        return;
      }
      const q = query(
        collection(db, "teachers", teacherUid, "reports"),
        where("studentId", "in", ids)
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          data.current.reports[teacherUid] = snap.docs.map((d) => d.data());
          merge();
        },
        (err) => {
          // Was silently swallowed before — surface it so a rules/linkage
          // mismatch shows up in the console instead of just "no data".
          console.error(`[parentRealtime] reports query failed for teacher ${teacherUid} (studentIds: ${ids.join(",")}):`, err?.code, err?.message);
          data.current.reports[teacherUid] = [];
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
        subscribeReports(teacherUid, studentIds);
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
