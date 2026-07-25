import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import {
  UserPlus, Search, X, GraduationCap, Filter,
  ChevronRight, Plus, Users,
} from "lucide-react-native";
import { useStudentsStore } from "@/utils/students/store";
import { useProgressStore } from "@/utils/progress/store";
import { useLessonsStore } from "@/utils/lessons/store";
import { useGroupsStore } from "@/utils/groups/store";
import { useVipStore, FREE_LIMIT } from "@/utils/vip/store";
import AddStudentModal from "@/components/AddStudentModal";
import GroupsView from "@/components/GroupsView";
import VipPaywallModal from "@/components/VipPaywallModal";
import { useT } from "@/utils/i18n";

// ─── tokens ──────────────────────────────────────────────────────────────────
const C = {
  primary: "#5B4FE9",
  bg:      "#FAFAFA",
  card:    "#FFFFFF",
  text:    "#111827",
  sub:     "#9CA3AF",
  border:  "#F3F4F6",
  green:   "#10B981",
  amber:   "#F59E0B",
  red:     "#EF4444",
};
const NAVY_GRAD = ["#22447A", "#152C51"];
const SHEET = "#F4F5F7";
const BLUE  = "#2563EB";

const SUBJECT_PALETTE = [
  { c: "#2563EB", bg: "#E8EEFB" },
  { c: "#10B981", bg: "#E4F6EF" },
  { c: "#8B5CF6", bg: "#F0EAFC" },
  { c: "#F59E0B", bg: "#FDF1DF" },
  { c: "#EC4899", bg: "#FCE7F1" },
  { c: "#06B6D4", bg: "#E1F5FA" },
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
  if (s >= 9) return "#10B981";
  if (s >= 8) return "#3B82F6";
  if (s >= 7) return "#F59E0B";
  if (s > 0)  return "#EF4444";
  return C.sub;
}

const PALETTE = [C.primary,"#10B981","#F59E0B","#EF4444","#06B6D4","#8B5CF6","#EC4899","#0EA5E9"];
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
function plur(n, one = "ученик", few = "ученика", many = "учеников") {
  if (n % 10 === 1 && n % 100 !== 11) return one;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return few;
  return many;
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
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: showBorder ? 1 : 0,
        borderBottomColor: C.border,
      }}
    >
      {/* Avatar */}
      <View style={{
        width: 54, height: 54, borderRadius: 27,
        backgroundColor: bg,
        alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFF" }}>
          {initials(displayName)}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 15.5, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 6 }}>
          {displayName}
        </Text>
        {student.type && (
          <View style={{ backgroundColor: sc.bg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, alignSelf: "flex-start" }}>
            <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: sc.c }}>
              {tSubject(student.type)}
            </Text>
          </View>
        )}
      </View>

      {/* Score */}
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: pctColor }}>
          {pct > 0 ? `${pct}%` : "—"}
        </Text>
        <Text style={{ fontSize: 10.5, fontFamily: "Inter_400Regular", color: C.sub, marginTop: 2 }}>
          {t("studentsPerformance")}
        </Text>
        <Text style={{ fontSize: 10.5, fontFamily: "Inter_400Regular", color: C.sub, marginTop: 1 }}>
          {lessonsCompleted} {t("homeLesson").toLowerCase()}
        </Text>
      </View>

      <ChevronRight size={16} color={C.sub} strokeWidth={2} />
    </TouchableOpacity>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────
function EmptyStudents({ onAdd }) {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 40 }}>
      <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: `${C.primary}10`, alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
        <GraduationCap size={40} color={C.primary} strokeWidth={1.4} />
      </View>
      <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 10, textAlign: "center" }}>
        {t("studentsEmptyTitle")}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: C.sub, textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
        {t("studentsEmptyHint")}
      </Text>
      <TouchableOpacity onPress={onAdd} activeOpacity={0.85} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 }}>
        <UserPlus size={18} color="#FFF" />
        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" }}>{t("studentsAddBtn")}</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptySearch({ q }) {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 56, paddingHorizontal: 40 }}>
      <Text style={{ fontSize: 36, marginBottom: 16 }}>🔍</Text>
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

  function openAddStudent() {
    if (students.length >= FREE_LIMIT && !isVip) setShowPaywall(true);
    else setShowAdd(true);
  }

  function handlePlusPress() {
    if (mainTab === "students") openAddStudent();
    else setShowAddGroup(true);
  }

  function switchMain(tab) {
    setMainTab(tab);
    setSearch("");
  }

  return (
    <>
      <View style={{ flex: 1, backgroundColor: NAVY_GRAD[0] }}>
        {/* ══ NAVY HEADER ══════════════════════════════════════════════ */}
        <LinearGradient
          colors={NAVY_GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 30 }}
        >
          {/* logo row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
              <GraduationCap size={19} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.3, lineHeight: 19 }}>
                Jeff
              </Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", letterSpacing: 0.3 }}>
                Colleges
              </Text>
            </View>
          </View>

          {/* title + buttons */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.5 }}>
              {mainTab === "students" ? t("studentsTitle") : t("studentsGroups")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => switchMain(mainTab === "students" ? "groups" : "students")}
                activeOpacity={0.75}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}
              >
                <Filter size={17} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
              <View style={{ alignItems: "center" }}>
                <TouchableOpacity
                  onPress={handlePlusPress}
                  activeOpacity={0.8}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
                >
                  <Plus size={20} color={NAVY_GRAD[1]} strokeWidth={2.5} />
                </TouchableOpacity>
                {mainTab === "students" && !isVip && students.length > 0 && (
                  <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: students.length >= FREE_LIMIT ? "#FCA5A5" : "rgba(255,255,255,0.6)", marginTop: 3 }}>
                    {students.length}/{FREE_LIMIT}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {mainTab === "groups" && (
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
              {groups.length} {tp(groups.length, "group")}
            </Text>
          )}

          {/* search bar */}
          {mainTab === "students" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 13, paddingHorizontal: 14, height: 44, marginTop: 16 }}>
              <Search size={16} color="rgba(255,255,255,0.6)" strokeWidth={2} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t("studentsSearchHint")}
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#FFFFFF" }}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <X size={15} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* status filter pills */}
          {mainTab === "students" && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginTop: 14 }}
            >
              {FILTERS.map(({ id, label, count }) => {
                const active = statusFilter === id;
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => setStatusFilter(id)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 7,
                      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
                      backgroundColor: active ? "#FFFFFF" : "rgba(255,255,255,0.12)",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium", color: active ? NAVY_GRAD[1] : "#FFFFFF" }}>
                      {label}
                    </Text>
                    <View style={{ minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: active ? BLUE : "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </LinearGradient>

        {/* ══ WHITE SHEET ══════════════════════════════════════════════ */}
        <View style={{ flex: 1, backgroundColor: SHEET, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -14 }}>

          {/* ══ STUDENTS VIEW ══════════════════════════════════════════ */}
          {mainTab === "students" && (
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 100 }}
              keyboardShouldPersistTaps="handled"
            >
              {students.length === 0 ? (
                <EmptyStudents onAdd={openAddStudent} />
              ) : (
                <View style={{ paddingHorizontal: 20 }}>
                  {displayed.length === 0 ? (
                    <EmptySearch q={search} />
                  ) : (
                    <>
                      <View style={{
                        backgroundColor: C.card,
                        borderRadius: 18,
                        overflow: "hidden",
                        shadowColor: "#0B1B3A",
                        shadowOpacity: 0.06,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                        marginBottom: 14,
                      }}>
                        {displayed.map((s, i) => (
                          <StudentRow
                            key={s.id}
                            student={s}
                            score={s._score}
                            lessonsCompleted={s.lessonsCompleted ?? 0}
                            onPress={() => router.push(`/student/${s.id}`)}
                            showBorder={i < displayed.length - 1}
                            t={t}
                            tSubject={tSubject}
                            tName={tName}
                          />
                        ))}
                      </View>

                      {/* Stats footer bar */}
                      <View style={{
                        flexDirection: "row", alignItems: "center",
                        backgroundColor: "#E8EEFB", borderRadius: 16, padding: 14, marginBottom: 14,
                      }}>
                        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                          <Users size={17} color={BLUE} strokeWidth={2} />
                        </View>
                        <View style={{ marginRight: 14 }}>
                          <Text style={{ fontSize: 10.5, fontFamily: "Inter_400Regular", color: C.sub }}>
                            {t("studentsStatTotal")}
                          </Text>
                          <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: C.text }}>
                            {enriched.length}
                          </Text>
                        </View>
                        <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 10 }}>
                          {[
                            { label: t("studentsFilterActive"),   count: activeCount,   color: C.green },
                            { label: t("studentsFilterInactive"), count: inactiveCount, color: C.amber },
                            { label: t("studentsFilterArchive"),  count: archiveCount,  color: C.sub },
                          ].map(({ label, count, color }) => (
                            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
                              <Text style={{ fontSize: 11.5, fontFamily: "Inter_500Medium", color: C.text }}>
                                {label} {count}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      {/* Add student row */}
                      <TouchableOpacity
                        onPress={openAddStudent}
                        activeOpacity={0.75}
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 14,
                          backgroundColor: C.card,
                          borderRadius: 18, paddingHorizontal: 16, paddingVertical: 15,
                          borderWidth: 1.5, borderColor: `${C.primary}20`, borderStyle: "dashed",
                        }}
                      >
                        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: `${C.primary}10`, alignItems: "center", justifyContent: "center" }}>
                          <UserPlus size={22} color={C.primary} strokeWidth={2} />
                        </View>
                        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.primary }}>
                          {t("studentsAddBtn")}
                        </Text>
                      </TouchableOpacity>
                    </>
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
