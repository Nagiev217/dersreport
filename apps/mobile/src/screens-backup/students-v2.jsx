import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import {
  UserPlus, Search, X, ArrowUpDown,
  GraduationCap, CalendarDays, ChevronRight,
  TrendingUp, Users, Star, Check,
} from "lucide-react-native";
import { useStudentsStore } from "@/utils/students/store";
import { useProgressStore } from "@/utils/progress/store";
import { useLessonsStore } from "@/utils/lessons/store";
import AddStudentModal from "@/components/AddStudentModal";

// ─── tokens ──────────────────────────────────────────────────────────────────
const C = {
  primary: "#5B4FE9",
  grad1: "#4338CA",
  grad2: "#7C3AED",
  bg: "#F4F3FD",
  card: "#FFFFFF",
  text: "#1A1A2E",
  sub: "#8B8BAA",
  border: "#EEECF8",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
};

// ─── helpers ─────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function scoreColor(s) {
  if (s >= 8) return C.green;
  if (s >= 6) return C.amber;
  return C.red;
}

const AVATAR_PALETTE = [C.primary,"#10B981","#F59E0B","#EF4444","#06B6D4","#8B5CF6","#EC4899","#14B8A6"];
function avatarBg(name = "", override) {
  if (override) return override;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}

const SUBJECT_COLORS = {
  IELTS:   { text: "#7C3AED", bg: "#F5F3FF" },
  SAT:     { text: "#1D4ED8", bg: "#EFF6FF" },
  General: { text: "#0369A1", bg: "#F0F9FF" },
  Общий:   { text: "#0369A1", bg: "#F0F9FF" },
};
function subjectStyle(type) {
  return SUBJECT_COLORS[type] ?? { text: "#374151", bg: "#F3F4F6" };
}

function nextLessonLabel(lessons, studentId) {
  const today = todayStr();
  const tom   = tomorrowStr();
  const now   = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const upcoming = lessons
    .filter(l =>
      l.status !== "completed" && l.status !== "cancelled" &&
      l.studentIds?.includes(studentId) && l.date &&
      (l.date > today || (l.date === today && (() => {
        const [h, m] = (l.time ?? "00:00").split(":").map(Number);
        return h * 60 + m > nowMin;
      })()))
    )
    .sort((a, b) => `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`));
  const l = upcoming[0];
  if (!l) return null;
  const day = l.date === today ? "Сегодня" : l.date === tom ? "Завтра" : (() => {
    const [, mo, d] = l.date.split("-").map(Number);
    return `${d} ${["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"][mo-1]}`;
  })();
  return l.time ? `${day}, ${l.time}` : day;
}

const SORT_MODES = [
  { key: "name",   label: "По имени",  icon: "Az" },
  { key: "score",  label: "По оценке", icon: "↓" },
  { key: "lesson", label: "По уроку",  icon: "📅" },
];

const FILTERS = ["Все", "IELTS", "SAT", "Общий"];

// ─── StudentCard (new design) ────────────────────────────────────────────────
function StudentCard({ student, score, nextLesson, onPress }) {
  const bg = avatarBg(student.name, student.avatarColor);
  const sc = score > 0 ? scoreColor(score) : null;
  const subj = subjectStyle(student.type);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={{
        backgroundColor: C.card, borderRadius: 20,
        overflow: "hidden", marginBottom: 12,
        shadowColor: C.primary, shadowOpacity: 0.08,
        shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4,
      }}
    >
      {/* Left accent stripe */}
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: bg }} />

      <View style={{ padding: 16, paddingLeft: 20 }}>
        {/* Top row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {/* Avatar */}
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFF" }}>{initials(student.name)}</Text>
          </View>

          {/* Name + tags */}
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: C.text }} numberOfLines={1}>
              {student.name}
            </Text>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {student.type && (
                <View style={{ backgroundColor: subj.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 }}>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: subj.text }}>{student.type}</Text>
                </View>
              )}
              {student.subject && student.subject !== student.type && (
                <View style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 }}>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280" }} numberOfLines={1}>{student.subject}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Score ring */}
          {sc ? (
            <View style={{ alignItems: "center", gap: 3 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: `${sc}14`, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: `${sc}30` }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: sc }}>{score.toFixed(1)}</Text>
              </View>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: C.sub }}>из 10</Text>
            </View>
          ) : (
            <ChevronRight size={18} color={C.sub} strokeWidth={2} />
          )}
        </View>

        {/* Bottom row */}
        {(sc || nextLesson) && (
          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, flexDirection: "row", alignItems: "center", gap: 12 }}>
            {/* Progress bar */}
            {sc && (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: C.sub }}>Активность</Text>
                  <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: sc }}>{Math.round(score * 10)}%</Text>
                </View>
                <View style={{ height: 5, backgroundColor: C.border, borderRadius: 3, overflow: "hidden" }}>
                  <View style={{ width: `${Math.min(score * 10, 100)}%`, height: "100%", backgroundColor: sc, borderRadius: 3 }} />
                </View>
              </View>
            )}

            {/* Next lesson */}
            {nextLesson && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <CalendarDays size={12} color={C.primary} strokeWidth={2} />
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: C.primary }}>{nextLesson}</Text>
              </View>
            )}

            {sc && <ChevronRight size={16} color={C.sub} strokeWidth={2} />}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── SortSheet ───────────────────────────────────────────────────────────────
function SortSheet({ visible, current, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} onPress={onClose}>
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, gap: 8 }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.sub, marginBottom: 8, textAlign: "center" }}>Сортировка</Text>
          {SORT_MODES.map(m => (
            <TouchableOpacity
              key={m.key}
              onPress={() => { onSelect(m.key); onClose(); }}
              activeOpacity={0.75}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 14, backgroundColor: current === m.key ? `${C.primary}10` : "transparent" }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: current === m.key ? C.primary : C.bg, alignItems: "center", justifyContent: "center" }}>
                {current === m.key
                  ? <Check size={17} color="#FFF" strokeWidth={2.5} />
                  : <ArrowUpDown size={17} color={C.sub} strokeWidth={2} />
                }
              </View>
              <Text style={{ fontSize: 15, fontFamily: current === m.key ? "Inter_600SemiBold" : "Inter_400Regular", color: current === m.key ? C.primary : C.text }}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── EmptyStudents ───────────────────────────────────────────────────────────
function EmptyStudents({ onAdd }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 32 }}>
      <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: `${C.primary}12`, alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
        <GraduationCap size={42} color={C.primary} strokeWidth={1.5} />
      </View>
      <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center", marginBottom: 8 }}>
        Пока нет учеников
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: C.sub, textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
        Добавьте первого ученика, чтобы начать отслеживать прогресс и успеваемость
      </Text>
      <TouchableOpacity
        onPress={onAdd}
        activeOpacity={0.85}
        style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 15, borderRadius: 16 }}
      >
        <UserPlus size={18} color="#FFF" strokeWidth={2} />
        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" }}>Добавить ученика</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── EmptySearch ─────────────────────────────────────────────────────────────
function EmptySearch({ query }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 32 }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Search size={26} color={C.sub} strokeWidth={1.8} />
      </View>
      <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 6 }}>Ничего не найдено</Text>
      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: C.sub, textAlign: "center" }}>
        По запросу «{query}» учеников не нашлось
      </Text>
    </View>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function StudentsScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("Все");
  const [sort,    setSort]    = useState("name");
  const [showSort, setShowSort] = useState(false);
  const [showAdd,  setShowAdd]  = useState(false);

  const { students }    = useStudentsStore();
  const { evaluations } = useProgressStore();
  const { lessons }     = useLessonsStore();

  // Compute score per student from last evaluation
  const scoredStudents = useMemo(() =>
    students.map(s => {
      const evs  = evaluations.filter(e => e.studentId === s.id).sort((a, b) => b.createdAt - a.createdAt);
      const last  = evs[0];
      const score = last ? ((last.activity + last.comprehension + last.homework + last.behavior) / 4) * 2 : 0;
      const next  = nextLessonLabel(lessons, s.id);
      return { ...s, _score: score, _next: next };
    }),
    [students, evaluations, lessons],
  );

  // Stats
  const avgScore = useMemo(() => {
    const scored = scoredStudents.filter(s => s._score > 0);
    if (!scored.length) return 0;
    return scored.reduce((acc, s) => acc + s._score, 0) / scored.length;
  }, [scoredStudents]);

  const todayCount = useMemo(() => {
    const today = todayStr();
    return lessons.filter(l => l.date === today && l.status !== "cancelled").length;
  }, [lessons]);

  // Filter + sort
  const displayed = useMemo(() => {
    let list = scoredStudents.filter(s => {
      const matchQ = !search || s.name.toLowerCase().includes(search.toLowerCase());
      const matchF = filter === "Все" || s.type === filter || (filter === "Общий" && (s.type === "General" || s.type === "Общий"));
      return matchQ && matchF;
    });
    if (sort === "name")   list = [...list].sort((a, b) => a.name.localeCompare(b.name, "ru"));
    if (sort === "score")  list = [...list].sort((a, b) => b._score - a._score);
    if (sort === "lesson") list = [...list].sort((a, b) => {
      if (!a._next && !b._next) return 0;
      if (!a._next) return 1;
      if (!b._next) return -1;
      return a._next.localeCompare(b._next);
    });
    return list;
  }, [scoredStudents, search, filter, sort]);

  const sortLabel = SORT_MODES.find(m => m.key === sort)?.label ?? "По имени";

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ GRADIENT HEADER ══════════════════════════════════════════ */}
        <LinearGradient
          colors={[C.grad1, C.grad2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 20, paddingHorizontal: 22, paddingBottom: 40 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <View>
              <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: -0.5 }}>Ученики</Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                {students.length > 0
                  ? `${students.length} ${students.length === 1 ? "ученик" : students.length < 5 ? "ученика" : "учеников"}`
                  : "Добавьте первого ученика"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowAdd(true)}
              activeOpacity={0.85}
              style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" }}
            >
              <UserPlus size={20} color="#FFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Mini stat pills */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
              <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFF" }}>{students.length}</Text>
              <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)", marginTop: 2 }}>всего</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
              <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFF" }}>{avgScore > 0 ? avgScore.toFixed(1) : "—"}</Text>
              <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)", marginTop: 2 }}>средний балл</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
              <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFF" }}>{todayCount}</Text>
              <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)", marginTop: 2 }}>уроков сегодня</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ═══ SEARCH + SORT (floating over gradient) ═══════════════════ */}
        <View style={{ marginHorizontal: 20, marginTop: -20 }}>
          <View style={{
            flexDirection: "row", gap: 10, backgroundColor: C.card,
            borderRadius: 18, padding: 10,
            shadowColor: C.primary, shadowOpacity: 0.1,
            shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 6,
          }}>
            {/* Search input */}
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 12, height: 42 }}>
              <Search size={16} color={C.sub} strokeWidth={2} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Поиск ученика..."
                placeholderTextColor={C.sub}
                style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: C.text }}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
                  <X size={15} color={C.sub} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>

            {/* Sort button */}
            <TouchableOpacity
              onPress={() => setShowSort(true)}
              activeOpacity={0.8}
              style={{ height: 42, paddingHorizontal: 12, borderRadius: 12, backgroundColor: `${C.primary}10`, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 }}
            >
              <ArrowUpDown size={15} color={C.primary} strokeWidth={2} />
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.primary }}>
                {sort === "name" ? "А–Я" : sort === "score" ? "Балл" : "Урок"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══ FILTER CHIPS ════════════════════════════════════════════ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, gap: 8 }}
        >
          {FILTERS.map(f => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                activeOpacity={0.75}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: active ? C.primary : C.card,
                  borderWidth: 1,
                  borderColor: active ? C.primary : C.border,
                  shadowColor: active ? C.primary : "transparent",
                  shadowOpacity: active ? 0.25 : 0,
                  shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: active ? 3 : 0,
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular", color: active ? "#FFF" : C.sub }}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ═══ RESULTS COUNT ═══════════════════════════════════════════ */}
        {students.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: C.sub }}>
              {displayed.length > 0
                ? `${displayed.length} ${displayed.length === 1 ? "ученик" : displayed.length < 5 ? "ученика" : "учеников"}`
                : ""}
            </Text>
          </View>
        )}

        {/* ═══ STUDENT CARDS ═══════════════════════════════════════════ */}
        <View style={{ paddingHorizontal: 20, paddingTop: students.length > 0 ? 0 : 0 }}>
          {students.length === 0 ? (
            <EmptyStudents onAdd={() => setShowAdd(true)} />
          ) : displayed.length === 0 ? (
            <EmptySearch query={search || filter} />
          ) : (
            displayed.map(s => (
              <StudentCard
                key={s.id}
                student={s}
                score={s._score}
                nextLesson={s._next}
                onPress={() => router.push(`/student/${s.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ═══ FAB ════════════════════════════════════════════════════════ */}
      {students.length > 0 && (
        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          activeOpacity={0.88}
          style={{
            position: "absolute", bottom: insets.bottom + 24, right: 22,
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: C.primary, borderRadius: 22,
            paddingHorizontal: 20, paddingVertical: 14,
            shadowColor: C.primary, shadowOpacity: 0.4,
            shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8,
          }}
        >
          <UserPlus size={18} color="#FFF" strokeWidth={2} />
          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" }}>Добавить</Text>
        </TouchableOpacity>
      )}

      <SortSheet visible={showSort} current={sort} onSelect={setSort} onClose={() => setShowSort(false)} />
      <AddStudentModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
