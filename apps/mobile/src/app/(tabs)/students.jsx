import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import {
  UserPlus, Search, X, GraduationCap, Users2,
  ChevronRight, Plus, Users, Clock,
} from "lucide-react-native";
import { useStudentsStore } from "@/utils/students/store";
import { useProgressStore } from "@/utils/progress/store";
import { useLessonsStore } from "@/utils/lessons/store";
import { useGroupsStore } from "@/utils/groups/store";
import { useVipStore, FREE_LIMIT } from "@/utils/vip/store";
import AddStudentModal from "@/components/AddStudentModal";
import GroupsView from "@/components/GroupsView";
import VipPaywallModal from "@/components/VipPaywallModal";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const C = {
  primary: BLUE,
  card:    "#FFFFFF",
  text:    "#111827",
  sub:     "#8E93A1",
  green:   "#22C55E",
  amber:   "#D97706",
  red:     "#EF4444",
};
const BORDER = "#E5E9F2";

const SUBJECT_PALETTE = [
  { c: BLUE,       bg: BLUE_50 },
  { c: "#22C55E",  bg: "#ECFDF5" },
  { c: INDIGO,     bg: INDIGO_50 },
  { c: "#D97706",  bg: "#FFFBEB" },
  { c: "#EC4899",  bg: "#FCE7F1" },
  { c: "#06B6D4",  bg: "#E1F5FA" },
];
function subjectColors(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return SUBJECT_PALETTE[h % SUBJECT_PALETTE.length];
}

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
  if (s >= 9) return "#22C55E";
  if (s >= 8) return BLUE;
  if (s >= 7) return "#D97706";
  if (s > 0)  return "#EF4444";
  return C.sub;
}

const PALETTE = [C.primary, "#22C55E", "#D97706", "#EF4444", "#06B6D4", INDIGO, "#EC4899", "#0EA5E9"];
function avatarBg(name = "", override) {
  if (override) return override;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}

function getStudentNextLesson(lessons, studentId, todayLabel, tomorrowLabel, shortMonths) {
  const today    = todayStr();
  const tomorrow = tomorrowStr();
  const now      = new Date();
  const nowMin   = now.getHours() * 60 + now.getMinutes();
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
  const day = l.date === today ? todayLabel : l.date === tomorrow ? tomorrowLabel : (() => {
    const [, mo, d] = l.date.split("-").map(Number);
    return `${d} ${shortMonths[mo - 1]}`;
  })();
  return { label: l.time ? `${day}, ${l.time}` : day, date: l.date };
}

// ─── Student list row ──────────────────────────────────────────────────────────
function StudentRow({ student, score, lessonsCompleted, onPress, showBorder, t, tSubject, tName }) {
  const bg  = avatarBg(student.name, student.avatarColor);
  const displayName = tName(student.name);
  const pct = score > 0 ? Math.round(score * 10) : 0;
  const pctColor = pct > 0 ? scoreColor(score) : C.sub;
  const sc  = subjectColors(student.type ?? student.subject ?? "");
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        borderTopWidth: showBorder ? 1 : 0,
        borderTopColor: "#F1F5F9",
      }}
    >
      {/* Avatar */}
      <View style={{
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: bg,
        alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" }}>
          {initials(displayName)}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 6 }}>
          {displayName}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {student.type && (
            <View style={{ backgroundColor: sc.bg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: sc.c }}>
                {tSubject(student.type)}
              </Text>
            </View>
          )}
          {student._next ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Clock size={10.5} color={C.sub} />
              <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: C.sub }}>
                {student._next.label}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Score */}
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: pctColor }}>
          {pct > 0 ? `${pct}%` : "—"}
        </Text>
        <Text style={{ fontSize: 10.5, fontFamily: "Inter_400Regular", color: C.sub, marginTop: 1 }}>
          {lessonsCompleted} {t("homeLesson").toLowerCase()}
        </Text>
      </View>

      <ChevronRight size={16} color={C.sub} strokeWidth={2} />
    </PressableScale>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────
function EmptyStudents({ onAdd }) {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 40 }}>
      <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
        <GraduationCap size={40} color={C.primary} strokeWidth={1.4} />
      </View>
      <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 10, textAlign: "center" }}>
        {t("studentsEmptyTitle")}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: C.sub, textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
        {t("studentsEmptyHint")}
      </Text>
      <PressableScale onPress={onAdd} scaleTo={0.96} style={{ borderRadius: 16, overflow: "hidden" }}>
        <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 28, paddingVertical: 14 }}>
          <UserPlus size={18} color="#FFF" />
          <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" }}>{t("studentsAddBtn")}</Text>
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

function EmptySearch({ q }) {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 56, paddingHorizontal: 40 }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Search size={26} color={BLUE} strokeWidth={1.8} />
      </View>
      <Text style={{ fontSize: 17, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 6 }}>{t("noResults")}</Text>
      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: C.sub, textAlign: "center" }}>
        {t("studentsNoResults", { q })}
      </Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StudentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tp, tSubject, tName, months } = useT();

  const [mainTab,      setMainTab]      = useState("students"); // "students" | "groups"
  const [search,       setSearch]       = useState("");
  const [statusFilter,    setStatusFilter]    = useState("all"); // all | active | inactive | archive
  const [showAdd,         setShowAdd]         = useState(false);
  const [showAddGroup,    setShowAddGroup]    = useState(false);
  const [showPaywall,     setShowPaywall]     = useState(false);

  const { students }    = useStudentsStore();
  const { evaluations } = useProgressStore();
  const { lessons }     = useLessonsStore();
  const { groups }      = useGroupsStore();
  const { isVip }       = useVipStore();

  const shortMonths = months(true);
  const todayLabel    = t("today");
  const tomorrowLabel = t("tomorrow");

  const enriched = useMemo(() =>
    students.map(s => {
      const evs  = evaluations.filter(e => e.studentId === s.id).sort((a, b) => b.createdAt - a.createdAt);
      const last  = evs[0];
      const score = last ? ((last.activity + last.comprehension + last.homework + last.behavior) / 4) * 2 : 0;
      const next  = getStudentNextLesson(lessons, s.id, todayLabel, tomorrowLabel, shortMonths);
      return { ...s, _score: score, _next: next };
    }),
    [students, evaluations, lessons, todayLabel, tomorrowLabel, shortMonths],
  );

  // Status counts — "active" = has an upcoming lesson scheduled, "archive" not modeled yet
  const activeCount   = useMemo(() => enriched.filter(s => s._next).length, [enriched]);
  const inactiveCount = enriched.length - activeCount;
  const archiveCount  = 0;

  const statusFiltered = useMemo(() => {
    if (statusFilter === "active")   return enriched.filter(s => s._next);
    if (statusFilter === "inactive") return enriched.filter(s => !s._next);
    if (statusFilter === "archive")  return [];
    return enriched;
  }, [enriched, statusFilter]);

  // Filtered list (respects search on top of the status filter)
  const displayed = useMemo(() => {
    if (!search) return statusFiltered;
    const q = search.toLowerCase();
    return statusFiltered.filter(s => s.name.toLowerCase().includes(q));
  }, [statusFiltered, search]);

  const FILTERS = [
    { id: "all",      label: t("studentsFilterAll"),      count: enriched.length },
    { id: "active",   label: t("studentsFilterActive"),   count: activeCount },
    { id: "inactive", label: t("studentsFilterInactive"), count: inactiveCount },
    { id: "archive",  label: t("studentsFilterArchive"),  count: archiveCount },
  ];

  const HERO_STATS = [
    { icon: Users,  value: enriched.length, label: t("studentsStatTotal"),      color: BLUE,      bg: BLUE_50 },
    { icon: Clock,  value: activeCount,     label: t("studentsFilterActive"),   color: "#22C55E", bg: "#ECFDF5" },
    { icon: Users2, value: inactiveCount,   label: t("studentsFilterInactive"), color: "#D97706", bg: "#FFFBEB" },
  ];

  function openAddStudent() {
    if (students.length >= FREE_LIMIT && !isVip) setShowPaywall(true);
    else setShowAdd(true);
  }

  function handleFabPress() {
    if (mainTab === "students") openAddStudent();
    else setShowAddGroup(true);
  }

  function switchMain(tab) {
    setMainTab(tab);
    setSearch("");
  }

  return (
    <>
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        {/* Fills the top overscroll/bounce gap with the hero color instead of white */}
        <View pointerEvents="none" style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: BLUE_50 }} />
        {/* ── SECTION 1 — Hero (gradient blue-50 → indigo-50 → white) ── */}
        <LinearGradient
          colors={[BLUE_50, INDIGO_50, "#FFFFFF"]}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 22 }}
        >
          {/* logo row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}>
              <GraduationCap size={18} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: C.text, letterSpacing: -0.3, lineHeight: 19 }}>
                Jeff
              </Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: C.sub, letterSpacing: 0.3 }}>
                Colleges
              </Text>
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))}>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: C.text, letterSpacing: -0.5, marginBottom: 16 }}>
              {t("studentsTitle")}
            </Text>

            {/* Segmented control — Students / Groups */}
            <View style={{ flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 4, borderWidth: 1, borderColor: BORDER }}>
              {[
                { key: "students", label: t("studentsTitle") },
                { key: "groups",   label: t("studentsGroups") },
              ].map((seg) => {
                const active = mainTab === seg.key;
                return (
                  <PressableScale
                    key={seg.key}
                    onPress={() => switchMain(seg.key)}
                    scaleTo={0.97}
                    accessibilityRole="button"
                    accessibilityLabel={seg.label}
                    accessibilityState={{ selected: active }}
                    style={{
                      flex: 1, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center",
                      backgroundColor: active ? BLUE : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 13.5, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? "#FFFFFF" : C.sub }}>
                      {seg.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </Animated.View>

          {mainTab === "groups" ? (
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: C.sub, marginTop: 12 }}>
              {groups.length} {tp(groups.length, "group")}
            </Text>
          ) : (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              {HERO_STATS.map((s, i) => (
                <Animated.View
                  key={s.label}
                  entering={FadeInDown.delay(60 + i * 60).duration(360).easing(Easing.out(Easing.cubic))}
                  style={{ flex: 1 }}
                >
                  <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: BORDER, shadowColor: INDIGO, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: s.bg, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                      <s.icon size={14} color={s.color} />
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: C.text, letterSpacing: -0.3 }}>{s.value}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: C.sub, marginTop: 1 }}>{s.label}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </LinearGradient>

        {/* ── SECTION 2 — Content (white) ── */}
        <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>

          {/* ══ STUDENTS VIEW ══════════════════════════════════════════ */}
          {mainTab === "students" && (
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 18, paddingBottom: insets.bottom + 110 }}
              keyboardShouldPersistTaps="handled"
            >
              {students.length === 0 ? (
                <EmptyStudents onAdd={openAddStudent} />
              ) : (
                <View style={{ paddingHorizontal: 20 }}>
                  {/* search bar */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 13, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, height: 44, marginBottom: 12 }}>
                    <Search size={16} color={C.sub} strokeWidth={2} />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder={t("studentsSearchHint")}
                      placeholderTextColor="#B7BCC7"
                      style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: C.text }}
                    />
                    {search.length > 0 && (
                      <TouchableOpacity onPress={() => setSearch("")}>
                        <X size={15} color={C.sub} strokeWidth={2} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* status filter pills */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, marginBottom: 16 }}
                  >
                    {FILTERS.map(({ id, label, count }) => {
                      const active = statusFilter === id;
                      return (
                        <PressableScale
                          key={id}
                          onPress={() => setStatusFilter(id)}
                          scaleTo={0.95}
                          accessibilityRole="button"
                          accessibilityLabel={label}
                          accessibilityState={{ selected: active }}
                          style={{
                            flexDirection: "row", alignItems: "center", gap: 7,
                            paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
                            backgroundColor: active ? BLUE : "#FFFFFF",
                            borderWidth: 1, borderColor: active ? BLUE : BORDER,
                          }}
                        >
                          <Text style={{ fontSize: 13, fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium", color: active ? "#FFFFFF" : C.text }}>
                            {label}
                          </Text>
                          <View style={{ minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: active ? "rgba(255,255,255,0.25)" : BLUE_50, alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: active ? "#FFFFFF" : BLUE }}>{count}</Text>
                          </View>
                        </PressableScale>
                      );
                    })}
                  </ScrollView>

                  {displayed.length === 0 ? (
                    <EmptySearch q={search} />
                  ) : (
                    <View style={{
                      backgroundColor: C.card,
                      borderRadius: 18,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: BORDER,
                    }}>
                      {displayed.map((s, i) => (
                        <Animated.View key={s.id} entering={FadeInDown.delay(20 + i * 30).duration(280)}>
                          <StudentRow
                            student={s}
                            score={s._score}
                            lessonsCompleted={s.lessonsCompleted ?? 0}
                            onPress={() => router.push(`/student/${s.id}`)}
                            showBorder={i > 0}
                            t={t}
                            tSubject={tSubject}
                            tName={tName}
                          />
                        </Animated.View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          )}

          {/* ══ GROUPS VIEW ══════════════════════════════════════════════ */}
          {mainTab === "groups" && (
            <GroupsView
              bottomInset={insets.bottom}
              showAddModal={showAddGroup}
              onCloseAddModal={() => setShowAddGroup(false)}
            />
          )}
        </View>

        {/* ── Floating action button — add student / add group ── */}
        <View style={{ position: "absolute", right: 20, bottom: insets.bottom + 22, alignItems: "flex-end" }}>
          {mainTab === "students" && !isVip && students.length > 0 && (
            <View style={{ backgroundColor: students.length >= FREE_LIMIT ? "#FEF2F2" : "#FFFFFF", borderWidth: 1, borderColor: students.length >= FREE_LIMIT ? "#FCA5A5" : BORDER, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: students.length >= FREE_LIMIT ? "#EF4444" : C.sub }}>
                {students.length}/{FREE_LIMIT}
              </Text>
            </View>
          )}
          <PressableScale
            onPress={handleFabPress}
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel={mainTab === "students" ? t("studentsAddBtn") : t("studentsGroups")}
            style={{ borderRadius: 30, overflow: "hidden", shadowColor: INDIGO, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}
          >
            <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 58, height: 58, alignItems: "center", justifyContent: "center" }}>
              <Plus size={26} color="#FFFFFF" strokeWidth={2.4} />
            </LinearGradient>
          </PressableScale>
        </View>
      </View>

      <AddStudentModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <VipPaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgraded={() => { setShowPaywall(false); setShowAdd(true); }}
      />
    </>
  );
}
