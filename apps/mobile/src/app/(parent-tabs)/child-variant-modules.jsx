import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  BookOpen,
  Calendar,
  FileText,
  Star,
  ChevronRight,
  Users,
  Edit3,
  ArrowLeft,
  GraduationCap,
  TrendingUp,
  CheckCircle2,
  Trophy,
  BarChart3,
  FlaskConical,
} from "lucide-react-native";

import { useParentData } from "../../utils/firebase/parentRealtime";
import { useT } from "../../utils/i18n";
import PressableScale from "@/components/PressableScale";

// ─── Design tokens — Blue + Indigo + White, matching the parent home screen ──
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT   = "#111827";
const SUB    = "#8E93A1";
const BORDER = "#E5E9F2";
const GREEN  = "#22C55E";
const AMBER  = "#D97706";

// ─── Helpers (identical to child.jsx — data layer untouched) ────────────────

const pad = (n) => String(n).padStart(2, "0");

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const SUBJECT_COLORS = [BLUE, INDIGO, GREEN, "#F97316", "#EC4899", AMBER, "#14B8A6", "#EF4444"];

function subjectColor(name) {
  let h = 0;
  for (const c of (name ?? "")) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return SUBJECT_COLORS[Math.abs(h) % SUBJECT_COLORS.length];
}

function subjectInitial(name) {
  return (name ?? "?")[0].toUpperCase();
}

function formatRelative(s, t) {
  if (!s) return "—";
  if (s === todayStr()) return t("today");
  if (s === tomorrowStr()) return t("tomorrow");
  return s;
}

// ─── Module shell — every card-module shares this header + container ────────

function Module({ icon: Icon, iconColor = INDIGO, iconBg = INDIGO_50, title, action, children }) {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
            <Icon size={15} color={iconColor} />
          </View>
          <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT }}>{title}</Text>
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

// ─── Subject row ──────────────────────────────────────────────────────────────

function SubjectRow({ subject, pct, color, tSubject, isLast }) {
  const bgColor = color + "1F";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 11, gap: 12, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: BORDER }}>
      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: bgColor, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color }}>{subjectInitial(tSubject(subject))}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>
          {tSubject(subject)}
        </Text>
        <View style={{ height: 4, backgroundColor: BORDER, borderRadius: 2, overflow: "hidden" }}>
          <View style={{ width: `${pct}%`, height: 4, backgroundColor: color, borderRadius: 2 }} />
        </View>
      </View>
      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT, width: 38, textAlign: "right" }}>
        {pct}%
      </Text>
    </View>
  );
}

// ─── Child selector (multiple children) ──────────────────────────────────────

function ChildSelector({ children, selected, onSelect }) {
  const { tName } = useT();
  if (children.length <= 1) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: "row", paddingVertical: 8 }}
    >
      {children.map((c) => {
        const cName = tName(c.name);
        const active = selected?.id === c.id;
        return (
          <PressableScale
            key={c.id}
            onPress={() => onSelect(c)}
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={cName}
            accessibilityState={{ selected: active }}
            style={{
              flexDirection: "row", alignItems: "center", gap: 8,
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
              backgroundColor: active ? BLUE : "#FFFFFF",
              borderWidth: 1, borderColor: active ? BLUE : BORDER,
            }}
          >
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: active ? "rgba(255,255,255,0.3)" : (c.avatarColor ?? BLUE), alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFF" }}>{cName?.[0]}</Text>
            </View>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFF" : TEXT }}>
              {cName}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
// Test variant: "card-modules" — every section (attendance, performance,
// homework, next lesson, subjects, achievements) is its own always-visible
// card, stacked vertically. No tab-switching, unlike child.jsx's tabbed
// overview/performance/attendance/achievements layout. Data derivation is
// identical to child.jsx — this file only restructures presentation.

export default function ParentChildVariantModules() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tSubject, tName } = useT();

  const { reports: allReports, students: children, lessons: allLessons, loading } = useParentData();
  const [selectedChild, setSelectedChild] = useState(null);

  useEffect(() => {
    if (!children.length) return;
    setSelectedChild((prev) =>
      prev ? children.find((c) => c.id === prev.id) ?? children[0] : children[0]
    );
  }, [children]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={BLUE} size="large" />
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, marginTop: 12 }}>
          {t("loadingData")}
        </Text>
      </View>
    );
  }

  if (children.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Users size={32} color={BLUE} />
        </View>
        <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT, textAlign: "center", marginBottom: 8 }}>
          {t("parentNoChildren")}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", lineHeight: 20 }}>
          {t("parentNoChildrenHint")}
        </Text>
      </View>
    );
  }

  const child = selectedChild;
  const childId = String(child?.id ?? "");

  const myReports = allReports
    .filter((r) => String(r.studentId) === childId)
    .sort((a, b) => b.createdAt - a.createdAt);

  const today = todayStr();

  const completedLessons = allLessons
    .filter((l) => (l.studentIds ?? []).includes(childId) && l.status === "completed")
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));

  const upcomingLessons = allLessons
    .filter((l) => (l.studentIds ?? []).includes(childId) && l.date >= today && l.status === "planned")
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  const lastLesson = completedLessons[0] ?? null;
  const lastReport = lastLesson ? myReports.find((r) => r.lessonId === lastLesson.id) ?? myReports[0] : myReports[0];
  const nextLesson = upcomingLessons[0] ?? null;
  const homework = myReports.find((r) => r.homework) ?? null;

  const totalLessons = child?.lessonsCompleted ?? 0;
  const attend = child?.attendance ?? 0;
  const avgScore = myReports.length > 0
    ? (myReports.reduce((s, r) => s + (r.activityScore ?? 3), 0) / myReports.length).toFixed(1)
    : "—";

  const subjectMap = {};
  myReports.forEach((r) => {
    const subj = r.subject ?? child?.subject ?? "—";
    if (!subjectMap[subj]) subjectMap[subj] = { scores: [] };
    subjectMap[subj].scores.push(r.activityScore ?? 3);
  });
  if (child?.subject && !subjectMap[child.subject]) {
    subjectMap[child.subject] = { scores: [] };
  }
  const subjectList = Object.entries(subjectMap).map(([subj, { scores }]) => ({
    subject: subj,
    pct: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 20) : Math.round(attend),
    color: subjectColor(subj),
  }));

  const childDisplayName = tName(child?.name);
  const initials = childDisplayName
    ? childDisplayName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?";

  const pctColors = { 100: GREEN, 80: BLUE, 60: AMBER, 40: "#F97316", 20: "#EF4444" };
  const lastReportPct = lastReport ? (lastReport.activityScore ?? 3) * 20 : null;
  const lastReportColor = lastReportPct !== null ? (pctColors[lastReportPct] ?? AMBER) : AMBER;

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* ── Nav bar ── */}
      <View style={{
        backgroundColor: "#FFFFFF",
        paddingTop: insets.top + 4,
        paddingHorizontal: 16,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <PressableScale
          onPress={() => router.push("/(parent-tabs)/")}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
        >
          <ArrowLeft size={20} color={TEXT} />
        </PressableScale>
        <Text style={{ fontSize: 17, fontFamily: "Inter_600SemiBold", color: TEXT }}>
          {t("parentChildTitle")}
        </Text>
        {/* Temporary — jumps back to the current tabbed version for
            side-by-side comparison. Remove once a version is picked. */}
        <PressableScale
          onPress={() => router.push("/(parent-tabs)/child")}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Текущая версия"
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}
        >
          <FlaskConical size={18} color={INDIGO} />
        </PressableScale>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ── */}
        <LinearGradient
          colors={[BLUE, INDIGO]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 22, padding: 20, overflow: "hidden" }}
        >
          <View style={{ position: "absolute", right: 16, top: 10, opacity: 0.15 }}>
            <GraduationCap size={110} color="#FFFFFF" />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: child?.avatarColor ?? BLUE,
              alignItems: "center", justifyContent: "center",
              borderWidth: 3, borderColor: "rgba(255,255,255,0.5)",
            }}>
              <Text style={{ fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 4 }}>
                {childDisplayName}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginBottom: 14 }}>
                {tSubject(child?.type ?? child?.subject ?? "—")}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  alignSelf: "flex-start",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
                }}
              >
                <Edit3 size={13} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                  {t("childEditBtn")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* ── Child selector ── */}
        {children.length > 1 && (
          <ChildSelector children={children} selected={selectedChild} onSelect={setSelectedChild} />
        )}

        {/* ── Quick stats strip ── */}
        <View style={{
          flexDirection: "row", gap: 10,
          marginHorizontal: 16, marginTop: 12, marginBottom: 4,
        }}>
          {[
            { Icon: BookOpen,     value: totalLessons, label: t("statsTotalLessons"),   color: INDIGO, bg: INDIGO_50 },
            { Icon: CheckCircle2, value: `${attend}%`, label: t("childAvgAttendLabel"), color: GREEN,  bg: "#ECFDF5" },
            { Icon: Star,         value: avgScore,     label: t("childAvgScoreLabel"),  color: AMBER,  bg: "#FFFBEB" },
          ].map(({ Icon, value, label, color, bg }, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: BORDER }}>
              <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <Icon size={15} color={color} fill={i === 2 && avgScore !== "—" ? color : "none"} />
              </View>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>{value}</Text>
              <Text numberOfLines={1} style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: SUB, marginTop: 2 }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── MODULE: Next lesson ── */}
        <View style={{ marginTop: 8 }}>
          <Module icon={Calendar} iconColor={BLUE} iconBg={BLUE_50} title={t("childNextLesson")}>
            {nextLesson ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: BLUE_50, borderRadius: 14, padding: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                  <Calendar size={20} color={BLUE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT }}>
                    {tSubject(nextLesson.subject)}
                  </Text>
                  <Text style={{ fontSize: 12.5, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>
                    {formatRelative(nextLesson.date, t)}{nextLesson.time ? `, ${nextLesson.time}` : ""}
                    {nextLesson.endTime ? ` – ${nextLesson.endTime}` : ""}
                    {nextLesson.room ? ` · ${nextLesson.room}` : ""}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#C7C7CC", textAlign: "center", paddingVertical: 12 }}>—</Text>
            )}
          </Module>

          {/* ── MODULE: Homework ── */}
          <Module icon={FileText} iconColor={GREEN} iconBg="#F0FDF4" title={t("childHW")}>
            {homework ? (
              <View style={{ backgroundColor: "#F0FDF4", borderRadius: 14, padding: 14 }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 4 }}>
                  {tSubject(homework.subject)}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, lineHeight: 19 }}>
                  {homework.homework}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#C7C7CC", textAlign: "center", paddingVertical: 12 }}>—</Text>
            )}
          </Module>

          {/* ── MODULE: Attendance ── */}
          <Module icon={TrendingUp} iconColor={GREEN} iconBg="#ECFDF5" title={t("childAvgAttendLabel")}>
            <View style={{ alignItems: "center", paddingVertical: 6 }}>
              <Text style={{ fontSize: 40, fontFamily: "Inter_700Bold", color: BLUE }}>{attend}%</Text>
              <View style={{ width: "100%", height: 8, backgroundColor: BORDER, borderRadius: 4, marginTop: 14, overflow: "hidden" }}>
                <View style={{ width: `${attend}%`, height: 8, backgroundColor: attend >= 90 ? GREEN : attend >= 75 ? AMBER : "#EF4444", borderRadius: 4 }} />
              </View>
            </View>
          </Module>

          {/* ── MODULE: Performance (last lesson + recent scores) ── */}
          <Module icon={BarChart3} iconColor={INDIGO} iconBg={INDIGO_50} title={t("childScoreDynamic")}>
            {lastLesson || lastReport ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: myReports.length > 1 ? 14 : 0, paddingBottom: myReports.length > 1 ? 14 : 0, borderBottomWidth: myReports.length > 1 ? 1 : 0, borderBottomColor: BORDER }}>
                <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={20} color={INDIGO} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT }}>
                    {tSubject((lastLesson ?? lastReport)?.subject)}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>
                    {formatRelative((lastLesson ?? lastReport)?.date, t)}{lastReport?.topic ? ` · ${lastReport.topic}` : ""}
                  </Text>
                </View>
                {lastReportPct !== null && (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: lastReportColor + "1F", borderRadius: 10 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: lastReportColor }}>{lastReportPct}%</Text>
                  </View>
                )}
              </View>
            ) : null}

            {myReports.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 16 }}>
                <Star size={28} color="#C7C7CC" />
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginTop: 10 }}>
                  {t("childReportsEmpty")}
                </Text>
              </View>
            ) : (
              myReports.slice(1, 4).map((r, idx, arr) => {
                const pct = (r.activityScore ?? 3) * 20;
                const color = pctColors[pct] ?? AMBER;
                return (
                  <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: BORDER }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }} numberOfLines={1}>{r.topic ?? tSubject(r.subject)}</Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>{r.date}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 9, paddingVertical: 3, backgroundColor: color + "1F", borderRadius: 9 }}>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color }}>{pct}%</Text>
                    </View>
                  </View>
                );
              })
            )}
          </Module>

          {/* ── MODULE: Subjects breakdown ── */}
          {subjectList.length > 0 && (
            <Module icon={GraduationCap} iconColor={BLUE} iconBg={BLUE_50} title={t("childSubjectsTitle")}>
              {subjectList.map(({ subject, pct, color }, idx) => (
                <SubjectRow key={subject} subject={subject} pct={pct} color={color} tSubject={tSubject} isLast={idx === subjectList.length - 1} />
              ))}
            </Module>
          )}

          {/* ── MODULE: Achievements ── */}
          <Module icon={Trophy} iconColor={AMBER} iconBg="#FFFBEB" title={t("childTabAchievements")}>
            <View style={{ alignItems: "center", paddingVertical: 12 }}>
              <Star size={36} color={AMBER} fill={AMBER} />
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginTop: 12, textAlign: "center" }}>
                {t("childReportsEmpty")}
              </Text>
            </View>
          </Module>
        </View>
      </ScrollView>
    </View>
  );
}
