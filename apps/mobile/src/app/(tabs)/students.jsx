import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Search, X, GraduationCap, Plus } from "lucide-react-native";
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

// "Светлый минимализм" — тот же canvas, что и остальные вкладки
// (Lesson Reports Home.dc.html, turn t7, option 7a).
const INK    = "#0B1437";
const BLUE   = "#2F5BE8";
const BG     = "#F5F6FA";
const SUB    = "rgba(11,20,55,.62)";
const BORDER = "rgba(11,20,55,.07)";
const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 };

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

// ─── Карточка ученика в списке (canvas 7a) ─────────────────────────────────
function StudentRow({ student, score, index, onPress, t, tSubject, tName }) {
  const displayName = tName(student.name);
  const pct = score > 0 ? Math.round(score * 10) : 0;
  const barColor = index % 2 ? INK : BLUE;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16, gap: 14 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#EEF1FC", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#3730A3" }}>{initials(displayName)}</Text>
        </View>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.1 }}>{displayName}</Text>
          <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: SUB }}>
            {[student.type ? tSubject(student.type) : null, student._next?.label].filter(Boolean).join(" · ")}
          </Text>
        </View>
        {student._next && (
          <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(47,91,232,.1)" }}>
            <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: BLUE }}>{t("studentsFilterActive")}</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(11,20,55,.08)" }}>
          <View style={{ height: "100%", width: `${pct}%`, borderRadius: 3, backgroundColor: pct > 0 ? barColor : "transparent" }} />
        </View>
        <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: INK }}>
          {pct > 0 ? `${pct}%` : "—"}
        </Text>
      </View>
    </PressableScale>
  );
}

// ─── Пустые состояния ───────────────────────────────────────────────────────
function EmptyStudents({ onAdd }) {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 40 }}>
      <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
        <GraduationCap size={40} color={BLUE} strokeWidth={1.4} />
      </View>
      <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: INK, marginBottom: 10, textAlign: "center" }}>
        {t("studentsEmptyTitle")}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
        {t("studentsEmptyHint")}
      </Text>
      <PressableScale onPress={onAdd} scaleTo={0.96} style={{ backgroundColor: INK, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Plus size={18} color="#FFF" />
        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" }}>{t("studentsAddBtn")}</Text>
      </PressableScale>
    </View>
  );
}

function EmptySearch({ q }) {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 56, paddingHorizontal: 40 }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Search size={26} color={BLUE} strokeWidth={1.8} />
      </View>
      <Text style={{ fontSize: 17, fontFamily: "Inter_600SemiBold", color: INK, marginBottom: 6 }}>{t("noResults")}</Text>
      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
        {t("studentsNoResults", { q })}
      </Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StudentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tSubject, tName, months } = useT();

  const [mainTab,   setMainTab]   = useState("students"); // "students" | "groups"
  const [search,    setSearch]    = useState("");
  const [showAdd,      setShowAdd]      = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showPaywall,  setShowPaywall]  = useState(false);

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

  const displayed = useMemo(() => {
    if (!search) return enriched;
    const q = search.toLowerCase();
    return enriched.filter(s => s.name.toLowerCase().includes(q));
  }, [enriched, search]);

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
      <View style={{ flex: 1, backgroundColor: BG }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + 110 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Заголовок */}
          <View style={{ paddingHorizontal: S.xl, paddingBottom: S.md, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.5 }}>{t("studentsTitle")}</Text>
            <PressableScale onPress={openAddStudent}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: BLUE }}>{t("studentsAddBtn")}</Text>
            </PressableScale>
          </View>

          {/* Поиск */}
          <View style={{ paddingHorizontal: S.xl, paddingBottom: S.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 15, height: 46 }}>
              <Search size={16} color={SUB} strokeWidth={2} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t("studentsSearchHint")}
                placeholderTextColor="rgba(11,20,55,.4)"
                style={{ flex: 1, fontSize: 13.5, fontFamily: "Inter_500Medium", color: INK }}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <X size={15} color={SUB} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Сегменты — индивидуальные / группы (canvas 7a) */}
          <View style={{ paddingHorizontal: S.xl, paddingBottom: S.lg }}>
            <View style={{ flexDirection: "row", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 5, gap: 4 }}>
              {[
                { key: "students", label: t("studentsTitle"), n: enriched.length },
                { key: "groups",   label: t("studentsGroups"), n: groups.length },
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
                      flex: 1, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center",
                      flexDirection: "row", gap: 6,
                      backgroundColor: active ? INK : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 13.5, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? "#FFFFFF" : SUB }}>
                      {seg.label}
                    </Text>
                    <View style={{ minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: active ? "rgba(255,255,255,0.18)" : "rgba(11,20,55,.06)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: active ? "#FFFFFF" : SUB }}>{seg.n}</Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          </View>

          {/* ══ СПИСОК УЧЕНИКОВ ══ */}
          {mainTab === "students" && (
            students.length === 0 ? (
              <EmptyStudents onAdd={openAddStudent} />
            ) : displayed.length === 0 ? (
              <EmptySearch q={search} />
            ) : (
              <View style={{ paddingHorizontal: S.xl, gap: S.sm }}>
                {displayed.map((s, i) => (
                  <Animated.View key={s.id} entering={FadeInDown.delay(20 + i * 30).duration(280)}>
                    <StudentRow
                      student={s}
                      score={s._score}
                      index={i}
                      onPress={() => router.push(`/student/${s.id}`)}
                      t={t}
                      tSubject={tSubject}
                      tName={tName}
                    />
                  </Animated.View>
                ))}
              </View>
            )
          )}

          {/* ══ ГРУППЫ ══ */}
          {mainTab === "groups" && (
            <GroupsView
              bottomInset={insets.bottom}
              showAddModal={showAddGroup}
              onCloseAddModal={() => setShowAddGroup(false)}
            />
          )}
        </ScrollView>

        {/* FAB — добавить ученика / группу */}
        <View style={{ position: "absolute", right: S.xl, bottom: insets.bottom + 22, alignItems: "flex-end" }}>
          {mainTab === "students" && !isVip && students.length > 0 && (
            <View style={{ backgroundColor: students.length >= FREE_LIMIT ? "#FEF2F2" : "#FFFFFF", borderWidth: 1, borderColor: students.length >= FREE_LIMIT ? "#FCA5A5" : BORDER, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: students.length >= FREE_LIMIT ? "#EF4444" : SUB }}>
                {students.length}/{FREE_LIMIT}
              </Text>
            </View>
          )}
          <PressableScale
            onPress={handleFabPress}
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel={mainTab === "students" ? t("studentsAddBtn") : t("studentsGroups")}
            style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: INK, alignItems: "center", justifyContent: "center", shadowColor: INK, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}
          >
            <Plus size={26} color="#FFFFFF" strokeWidth={2.4} />
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
