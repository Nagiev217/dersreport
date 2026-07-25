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
  MoreVertical,
  CheckCircle2,
  ArrowLeft,
  GraduationCap,
} from "lucide-react-native";

import { useParentData } from "../../utils/firebase/parentRealtime";
import { useT } from "../../utils/i18n";

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

const SUBJECT_COLORS = ["#6B5CF6", "#3B82F6", "#22C55E", "#F97316", "#EC4899", "#F59E0B", "#14B8A6", "#EF4444"];

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
  const bgColor = color + "22"; // 13% opacity
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 12 }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bgColor, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color }}>{subjectInitial(tSubject(subject))}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1C1C1E", marginBottom: 6 }}>
          {tSubject(subject)}
        </Text>
        <View style={{ height: 4, backgroundColor: "#F2F2F7", borderRadius: 2, overflow: "hidden" }}>
          <View style={{ width: `${pct}%`, height: 4, backgroundColor: color, borderRadius: 2 }} />
        </View>
      </View>
      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#1C1C1E", width: 44, textAlign: "right" }}>
        {pct}%
      </Text>
      <ChevronRight size={16} color="#C7C7CC" />
    </TouchableOpacity>
  );
}

// ─── Last lesson card ─────────────────────────────────────────────────────────

function LastLessonCard({ lesson, report, t, tSubject }) {
  const color = "#6B5CF6";
  const pct = report ? (report.activityScore ?? 3) * 20 : null;
  const pctColors = { 100: "#22C55E", 80: "#3B82F6", 60: "#F59E0B", 40: "#F97316", 20: "#EF4444" };
  const pctColor = pctColors[pct] ?? "#F59E0B";

  return (
    <View style={{
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center" }}>
          <BookOpen size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 3 }}>
            {tSubject(lesson.subject)}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93", marginBottom: 3 }}>
            {formatRelative(lesson.date, t)}{lesson.time ? `, ${lesson.time}` : ""}
            {lesson.endTime ? ` – ${lesson.endTime}` : ""}
          </Text>
          {report?.topic && (
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
              {t("childHWTopic")}: {report.topic}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#F2F2F7", borderRadius: 20 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#8E8E93" }}>
                {t("childLessonDone")}
              </Text>
            </View>
          </View>
        </View>
        {pct !== null && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: pctColor + "22", borderRadius: 10 }}>
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
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#8E8E93", marginBottom: 10 }}>
          {t("childNextLesson")}
        </Text>
        {nextLesson ? (
          <>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Calendar size={16} color="#6B5CF6" />
            </View>
            <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 4 }}>
              {tSubject(nextLesson.subject)}
            </Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93", lineHeight: 18 }}>
              {formatRelative(nextLesson.date, t)}{nextLesson.time ? `, ${nextLesson.time}` : ""}
              {nextLesson.endTime ? ` – ${nextLesson.endTime}` : ""}
            </Text>
            {nextLesson.room && (
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
                {nextLesson.room}
              </Text>
            )}
          </>
        ) : (
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#C7C7CC" }}>—</Text>
        )}
      </View>

      {/* Homework */}
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#8E8E93", marginBottom: 10 }}>
          {t("childHW")}
        </Text>
        {homework ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" }}>
                <FileText size={16} color="#22C55E" />
              </View>
              <ChevronRight size={16} color="#C7C7CC" />
            </View>
            <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 4 }}>
              {tSubject(homework.subject)}
            </Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93", lineHeight: 18 }} numberOfLines={2}>
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
        return (
        <TouchableOpacity
          key={c.id}
          onPress={() => onSelect(c)}
          style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
            backgroundColor: selected?.id === c.id ? "#6B5CF6" : "#F2F2F7",
          }}
        >
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: selected?.id === c.id ? "rgba(255,255,255,0.3)" : (c.avatarColor ?? "#6B5CF6"), alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFF" }}>{cName?.[0]}</Text>
          </View>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: selected?.id === c.id ? "#FFF" : "#1C1C1E" }}>
            {cName}
          </Text>
        </TouchableOpacity>
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
      <View style={{ flex: 1, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#6B5CF6" size="large" />
      </View>
    );
  }

  if (children.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Users size={32} color="#6B5CF6" />
        </View>
        <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E", textAlign: "center", marginBottom: 8 }}>
          {t("parentNoChildren")}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center", lineHeight: 20 }}>
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
    <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
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
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(parent-tabs)/")}
          style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
        >
          <ArrowLeft size={22} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}>
          {t("parentChildTitle")}
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
        >
          <MoreVertical size={22} color="#1C1C1E" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ── */}
        <LinearGradient
          colors={["#8B7CF8", "#6B5CF6", "#5A4CD6"]}
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
              backgroundColor: child?.avatarColor ?? "#8B7CF8",
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
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
        }}>
          {[
            { Icon: BookOpen,     value: totalLessons, label: t("statsTotalLessons"), color: "#6B5CF6" },
            { Icon: CheckCircle2, value: `${attend}%`, label: t("childAvgAttendLabel"), color: "#22C55E" },
            { Icon: Star,         value: avgScore,     label: t("childAvgScoreLabel"), color: "#F59E0B" },
          ].map(({ Icon, value, label, color }, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Icon size={18} color={color} fill={i === 2 && avgScore !== "—" ? color : "none"} />
                <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{value}</Text>
              </View>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center" }}>
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
                  color: activeTab === tab ? "#6B5CF6" : "#8E8E93",
                }}>
                  {tabLabels[tab]}
                </Text>
                {activeTab === tab && (
                  <View style={{ height: 2, backgroundColor: "#6B5CF6", borderRadius: 1, marginTop: 2 }} />
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
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
                    {t("childSubjectsTitle")}
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#8E8E93" }}>
                    {t("seeAll")}
                  </Text>
                </View>
                {subjectList.map(({ subject, pct, color }, idx) => (
                  <View key={subject}>
                    <SubjectRow subject={subject} pct={pct} color={color} tSubject={tSubject} />
                    {idx < subjectList.length - 1 && <View style={{ height: 0.5, backgroundColor: "#F2F2F7" }} />}
                  </View>
                ))}
                <View style={{ height: 4 }} />
              </View>
            )}

            {/* Last lesson */}
            {(lastLesson || lastReport) && (
              <View>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 8 }}>
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
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 16 }}>
                {t("childScoreDynamic")}
              </Text>
              {myReports.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Star size={32} color="#C7C7CC" />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 12 }}>
                    {t("childReportsEmpty")}
                  </Text>
                </View>
              ) : (
                myReports.slice(0, 5).map((r) => {
                  const pct = (r.activityScore ?? 3) * 20;
                  const pctColors = { 100: "#22C55E", 80: "#3B82F6", 60: "#F59E0B", 40: "#F97316", 20: "#EF4444" };
                  const color = pctColors[pct] ?? "#F59E0B";
                  return (
                    <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#F2F2F7" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }} numberOfLines={1}>{r.topic ?? tSubject(r.subject)}</Text>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{r.date}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: color + "22", borderRadius: 10 }}>
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
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 24, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <Text style={{ fontSize: 48, fontFamily: "Inter_700Bold", color: "#6B5CF6" }}>{attend}%</Text>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 8 }}>
                {t("childAvgAttendLabel")}
              </Text>
              <View style={{ width: "100%", height: 8, backgroundColor: "#F2F2F7", borderRadius: 4, marginTop: 20, overflow: "hidden" }}>
                <View style={{ width: `${attend}%`, height: 8, backgroundColor: attend >= 90 ? "#22C55E" : attend >= 75 ? "#F59E0B" : "#EF4444", borderRadius: 4 }} />
              </View>
            </View>
          </View>
        )}

        {activeTab === "achievements" && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 32, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <Star size={40} color="#F59E0B" fill="#F59E0B" />
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#1C1C1E", marginTop: 16 }}>
                {t("childTabAchievements")}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 8, textAlign: "center" }}>
                {t("childReportsEmpty")}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
