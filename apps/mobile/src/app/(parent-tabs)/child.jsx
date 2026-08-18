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
  CheckCircle2,
  ArrowLeft,
  GraduationCap,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatTime(dateStr, timeStr) {
  return timeStr ?? "";
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

// ─── Subject row ──────────────────────────────────────────────────────────────

function SubjectRow({ subject, pct, color, tSubject }) {
  const bgColor = color + "1F"; // ~12% opacity
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 12 }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bgColor, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color }}>{subjectInitial(tSubject(subject))}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>
          {tSubject(subject)}
        </Text>
        <View style={{ height: 4, backgroundColor: BORDER, borderRadius: 2, overflow: "hidden" }}>
          <View style={{ width: `${pct}%`, height: 4, backgroundColor: color, borderRadius: 2 }} />
        </View>
      </View>
      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT, width: 44, textAlign: "right" }}>
        {pct}%
      </Text>
      <ChevronRight size={16} color="#C7C7CC" />
    </TouchableOpacity>
  );
}

// ─── Last lesson card ─────────────────────────────────────────────────────────

function LastLessonCard({ lesson, report, t, tSubject }) {
  const pct = report ? (report.activityScore ?? 3) * 20 : null;
  const pctColors = { 100: GREEN, 80: BLUE, 60: AMBER, 40: "#F97316", 20: "#EF4444" };
  const pctColor = pctColors[pct] ?? AMBER;

  return (
    <View style={{
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: BORDER,
    }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}>
          <BookOpen size={22} color={INDIGO} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 3 }}>
            {tSubject(lesson.subject)}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 3 }}>
            {formatRelative(lesson.date, t)}{lesson.time ? `, ${lesson.time}` : ""}
            {lesson.endTime ? ` – ${lesson.endTime}` : ""}
          </Text>
          {report?.topic && (
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>
              {t("childHWTopic")}: {report.topic}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#F1F5F9", borderRadius: 20 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: SUB }}>
                {t("childLessonDone")}
              </Text>
            </View>
          </View>
        </View>
        {pct !== null && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: pctColor + "1F", borderRadius: 10 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: pctColor }}>{pct}%</Text>
            </View>
            <ChevronRight size={16} color="#C7C7CC" />
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Two bottom cards ─────────────────────────────────────────────────────────

function BottomCards({ nextLesson, homework, t, tSubject }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {/* Next lesson */}
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: BORDER }}>
        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: SUB, marginBottom: 10 }}>
          {t("childNextLesson")}
        </Text>
        {nextLesson ? (
          <>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Calendar size={16} color={BLUE} />
            </View>
            <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 4 }}>
              {tSubject(nextLesson.subject)}
            </Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, lineHeight: 18 }}>
              {formatRelative(nextLesson.date, t)}{nextLesson.time ? `, ${nextLesson.time}` : ""}
              {nextLesson.endTime ? ` – ${nextLesson.endTime}` : ""}
            </Text>
            {nextLesson.room && (
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>
                {nextLesson.room}
              </Text>
            )}
          </>
        ) : (
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#C7C7CC" }}>—</Text>
        )}
      </View>

      {/* Homework */}
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: BORDER }}>
        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: SUB, marginBottom: 10 }}>
          {t("childHW")}
        </Text>
        {homework ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" }}>
                <FileText size={16} color={GREEN} />
              </View>
              <ChevronRight size={16} color="#C7C7CC" />
            </View>
            <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 4 }}>
              {tSubject(homework.subject)}
            </Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, lineHeight: 18 }} numberOfLines={2}>
              {homework.homework}
            </Text>
          </>
        ) : (
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#C7C7CC" }}>—</Text>
        )}
      </View>
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
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8, flexDirection: "row", paddingVertical: 8 }}
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

const TABS = ["overview", "performance", "attendance", "achievements"];

export default function ParentChild() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tSubject, tName } = useT();

  const { reports: allReports, students: children, lessons: allLessons, loading } = useParentData();
  const [selectedChild, setSelectedChild] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Auto-select first child (or keep current if still present)
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

  // Group by subject for the performance list
  const subjectMap = {};
  myReports.forEach((r) => {
    const subj = r.subject ?? child?.subject ?? "—";
    if (!subjectMap[subj]) subjectMap[subj] = { scores: [] };
    subjectMap[subj].scores.push(r.activityScore ?? 3);
  });
  // Also include the child's primary subject even if no reports
  if (child?.subject && !subjectMap[child.subject]) {
    subjectMap[child.subject] = { scores: [] };
  }
  const subjectList = Object.entries(subjectMap).map(([subj, { scores }]) => ({
    subject: subj,
    pct: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 20) : Math.round(attend),
    color: subjectColor(subj),
  }));

  const tabLabels = {
    overview:     t("childTabOverview"),
    performance:  t("childTabPerformance"),
    attendance:   t("childTabAttendance"),
    achievements: t("childTabAchievements"),
  };

  const childDisplayName = tName(child?.name);
  const initials = childDisplayName
    ? childDisplayName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?";

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
        {/* Temporary — links to the "card-modules" test variant for side-by-side
            comparison. Remove once a version is picked. */}
        <PressableScale
          onPress={() => router.push("/(parent-tabs)/child-variant-modules")}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Тестовая версия"
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}
        >
          <FlaskConical size={18} color={INDIGO} />
        </PressableScale>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ── */}
        <LinearGradient
          colors={[BLUE, INDIGO]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 22, padding: 20, overflow: "hidden" }}
        >
          {/* Backpack decoration */}
          <View style={{ position: "absolute", right: 16, top: 10, opacity: 0.15 }}>
            <GraduationCap size={110} color="#FFFFFF" />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            {/* Avatar */}
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

        {/* ── Stats row ── */}
        <View style={{
          backgroundColor: "#FFFFFF",
          marginHorizontal: 16,
          marginTop: 12,
          borderRadius: 18,
          paddingVertical: 16,
          paddingHorizontal: 8,
          flexDirection: "row",
          borderWidth: 1,
          borderColor: BORDER,
        }}>
          {[
            { Icon: BookOpen,     value: totalLessons, label: t("statsTotalLessons"), color: INDIGO },
            { Icon: CheckCircle2, value: `${attend}%`, label: t("childAvgAttendLabel"), color: GREEN },
            { Icon: Star,         value: avgScore,     label: t("childAvgScoreLabel"), color: AMBER },
          ].map(({ Icon, value, label, color }, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Icon size={18} color={color} fill={i === 2 && avgScore !== "—" ? color : "none"} />
                <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT }}>{value}</Text>
              </View>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Tabs ── */}
        <View style={{
          backgroundColor: "#FFFFFF",
          marginHorizontal: 16,
          marginTop: 12,
          borderRadius: 18,
          paddingHorizontal: 4,
          borderWidth: 1,
          borderColor: BORDER,
        }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row" }}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
                style={{ paddingHorizontal: 16, paddingVertical: 14 }}
              >
                <Text style={{
                  fontSize: 14,
                  fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_400Regular",
                  color: activeTab === tab ? BLUE : SUB,
                }}>
                  {tabLabels[tab]}
                </Text>
                {activeTab === tab && (
                  <View style={{ height: 2, backgroundColor: BLUE, borderRadius: 1, marginTop: 2 }} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Tab content ── */}
        {activeTab === "overview" && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
            {/* Subjects */}
            {subjectList.length > 0 && (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT }}>
                    {t("childSubjectsTitle")}
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: BLUE }}>
                    {t("seeAll")}
                  </Text>
                </View>
                {subjectList.map(({ subject, pct, color }, idx) => (
                  <View key={subject}>
                    <SubjectRow subject={subject} pct={pct} color={color} tSubject={tSubject} />
                    {idx < subjectList.length - 1 && <View style={{ height: 1, backgroundColor: BORDER }} />}
                  </View>
                ))}
                <View style={{ height: 4 }} />
              </View>
            )}

            {/* Last lesson */}
            {(lastLesson || lastReport) && (
              <View>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 8 }}>
                  {t("childLastLesson")}
                </Text>
                <LastLessonCard lesson={lastLesson ?? { subject: lastReport?.subject, date: lastReport?.date, time: "" }} report={lastReport} t={t} tSubject={tSubject} />
              </View>
            )}

            {/* Next lesson + Homework */}
            {(nextLesson || homework) && (
              <BottomCards nextLesson={nextLesson} homework={homework} t={t} tSubject={tSubject} />
            )}
          </View>
        )}

        {activeTab === "performance" && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 20, borderWidth: 1, borderColor: BORDER }}>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 16 }}>
                {t("childScoreDynamic")}
              </Text>
              {myReports.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Star size={32} color="#C7C7CC" />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, marginTop: 12 }}>
                    {t("childReportsEmpty")}
                  </Text>
                </View>
              ) : (
                myReports.slice(0, 5).map((r) => {
                  const pct = (r.activityScore ?? 3) * 20;
                  const pctColors = { 100: GREEN, 80: BLUE, 60: AMBER, 40: "#F97316", 20: "#EF4444" };
                  const color = pctColors[pct] ?? AMBER;
                  return (
                    <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }} numberOfLines={1}>{r.topic ?? tSubject(r.subject)}</Text>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>{r.date}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: color + "1F", borderRadius: 10 }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color }}>{pct}%</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {activeTab === "attendance" && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 24, alignItems: "center", borderWidth: 1, borderColor: BORDER }}>
              <Text style={{ fontSize: 48, fontFamily: "Inter_700Bold", color: BLUE }}>{attend}%</Text>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, marginTop: 8 }}>
                {t("childAvgAttendLabel")}
              </Text>
              <View style={{ width: "100%", height: 8, backgroundColor: BORDER, borderRadius: 4, marginTop: 20, overflow: "hidden" }}>
                <View style={{ width: `${attend}%`, height: 8, backgroundColor: attend >= 90 ? GREEN : attend >= 75 ? AMBER : "#EF4444", borderRadius: 4 }} />
              </View>
            </View>
          </View>
        )}

        {activeTab === "achievements" && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 32, alignItems: "center", borderWidth: 1, borderColor: BORDER }}>
              <Star size={40} color={AMBER} fill={AMBER} />
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: TEXT, marginTop: 16 }}>
                {t("childTabAchievements")}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginTop: 8, textAlign: "center" }}>
                {t("childReportsEmpty")}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
