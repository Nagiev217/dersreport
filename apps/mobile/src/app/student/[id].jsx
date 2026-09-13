import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useState, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import {
  ArrowLeft,
  Phone,
  Clock,
  Calendar,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Star,
  Plus,
  Users,
  Link2,
  CalendarRange,
  Trash2,
} from "lucide-react-native";
import { useStudentsStore } from "@/utils/students/store";
import { unlinkStudentFromTeacher } from "@/utils/firebase/roles";
import { auth } from "@/utils/firebase/config";
import { useProgressStore } from "@/utils/progress/store";
import { useParentsStore } from "@/utils/parents/store";
import { useReportsStore } from "@/utils/reports/store";
import { useLessonsStore } from "@/utils/lessons/store";
import { getScoreColor } from "@/data/mockData";
import { useT } from "@/utils/i18n";
import PressableScale from "@/components/PressableScale";
import AddEvaluationModal from "@/components/AddEvaluationModal";
import LinkParentModal from "@/components/LinkParentModal";
import LinkStudentModal from "@/components/LinkStudentModal";

// "Светлый минимализм" — верхний блок оформлен по тому же canvas, что и
// остальные вкладки (Lesson Reports Home.dc.html, turn t7, option 7b).
// Остальные секции ниже (родители/привязки/заметки) не тронуты.
const INK7B  = "#0B1437";
const BLUE7B = "#2F5BE8";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";
const GREEN = "#22C55E";
const AMBER = "#D97706";

function SectionCard({ children, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          padding: 18,
          borderWidth: 1,
          borderColor: BORDER,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function SectionHeader({ title, icon: Icon }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center" }}>
        <Icon size={14} color={BLUE} />
      </View>
      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT }}>
        {title}
      </Text>
    </View>
  );
}

function ContactRow({ icon: Icon, label, value }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={BLUE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 1 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function StudentProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, tSubject, tName } = useT();

  const { students, updateStudent } = useStudentsStore();
  const { evaluations, goals } = useProgressStore();
  const { parents, unlinkStudent } = useParentsStore();
  const { reports } = useReportsStore();
  const { lessons } = useLessonsStore();
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showLinkParentModal, setShowLinkParentModal] = useState(false);
  const [showLinkStudentModal, setShowLinkStudentModal] = useState(false);

  const student = students.find((s) => String(s.id) === String(id));

  const myEvals = evaluations.filter((e) => String(e.studentId) === String(id));
  const myGoals = goals.filter((g) => String(g.studentId) === String(id));

  // "Отчёты за..." — canvas 7b: последний завершённый урок этого ученика
  // без отчёта, чипы "над чем работаем" и история отчётов.
  const myReports = useMemo(
    () => reports.filter((r) => String(r.studentId) === String(id)).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [reports, id]
  );
  const avgScore10 = myReports.length
    ? Math.round((myReports.reduce((s, r) => s + (r.activityScore ?? 0), 0) / myReports.length) * 20) / 10
    : null;
  const pendingLesson = useMemo(() => {
    const hasReport = (l) => myReports.some((r) => r.date === l.date);
    return lessons
      .filter((l) => (l.studentIds ?? []).includes(String(id)) && l.status === "completed" && !hasReport(l))
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  }, [lessons, myReports, id]);
  const workingOn = [...new Set(myReports.map((r) => r.difficulties).filter(Boolean))].slice(0, 3);

  const avgActivity = myEvals.length
    ? (myEvals.reduce((s, e) => s + e.activity, 0) / myEvals.length).toFixed(1)
    : null;
  const progressPct = myEvals.length
    ? Math.round(
        (myEvals.reduce((s, e) => s + (e.activity + e.comprehension + e.homework + e.behavior) / 4, 0) /
          myEvals.length /
          5) *
          100
      )
    : null;
  const hwPct = myEvals.length
    ? Math.round((myEvals.filter((e) => e.homework >= 4).length / myEvals.length) * 100)
    : null;
  const activeGoals = myGoals.filter((g) => g.status === "active").length;

  if (!student) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "#FFFBEB", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <AlertCircle size={30} color={AMBER} />
        </View>
        <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 6 }}>
          {t("studentNotFound")}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", marginBottom: 24 }}>
          {t("studentNotFoundHint")}
        </Text>
        <PressableScale onPress={() => router.back()} scaleTo={0.96} style={{ borderRadius: 12, overflow: "hidden" }}>
          <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
              {t("back")}
            </Text>
          </LinearGradient>
        </PressableScale>
      </View>
    );
  }

  const displayName = tName(student.name);
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const hasSkills = student.skills && student.skills.length > 0;
  const hasHistory = student.lessonHistory && student.lessonHistory.length > 0;
  const hasContact = student.phone;
  const hasNotes = student.notes && student.notes.trim().length > 0;

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── SECTION 1 — Hero (canvas 7b, тёмный INK) ─────────────────── */}
      <View style={{ backgroundColor: INK7B, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: "hidden", paddingTop: insets.top + 8, paddingBottom: 24, paddingHorizontal: 20 }}>
        <View pointerEvents="none" style={{ position: "absolute", right: -50, top: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: "rgba(79,70,229,0.5)" }} />

        <PressableScale
          onPress={() => router.back()}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft size={16} color="rgba(255,255,255,0.85)" />
          <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.85)" }}>{t("studentsTitle")}</Text>
        </PressableScale>

        <Animated.View entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))} style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18, marginBottom: 16 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{initials}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.4 }}>{displayName}</Text>
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.72)" }}>
              {[tSubject(student.type), tSubject(student.subject)].filter(Boolean).join(" · ")}
            </Text>
          </View>
        </Animated.View>

        <View style={{ flexDirection: "row", gap: 9 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 13, gap: 3 }}>
            <Text style={{ fontSize: 19, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.4 }}>{avgScore10 ?? "—"}</Text>
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)" }}>Средняя</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 13, gap: 3 }}>
            <Text style={{ fontSize: 19, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.4 }}>{myReports.length}</Text>
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)" }}>{t("studentStatLessons")}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 13, gap: 3 }}>
            <Text style={{ fontSize: 19, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.4 }}>{student.attendance ?? 0}%</Text>
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)" }}>{t("studentStatAttend")}</Text>
          </View>
        </View>
      </View>

      {/* ─── Content ────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14 }}>

        {/* Отчёт за N — незаполненный отчёт по последнему завершённому уроку */}
        {pendingLesson && (
          <PressableScale
            onPress={() => router.push(`/report/add?studentId=${id}`)}
            scaleTo={0.985}
            style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(47,91,232,.4)", borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 13 }}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontSize: 14.5, fontFamily: "Inter_700Bold", color: TEXT }}>Отчёт за {pendingLesson.date}</Text>
              <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: "#3730A3" }}>Не отправлен</Text>
            </View>
            <View style={{ backgroundColor: INK7B, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 11 }}>
              <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>Заполнить</Text>
            </View>
          </PressableScale>
        )}

        {/* Над чем работаем */}
        {workingOn.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: SUB, textTransform: "uppercase", letterSpacing: 1 }}>Над чем работаем</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {workingOn.map((w, i) => (
                <View key={i} style={{ backgroundColor: "#EEF1FC", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9 }}>
                  <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: "#3730A3", maxWidth: 220 }}>{w}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* История отчётов */}
        {myReports.length > 0 && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: SUB, textTransform: "uppercase", letterSpacing: 1 }}>История отчётов</Text>
              <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: BLUE7B }}>Все {myReports.length}</Text>
            </View>
            {myReports.slice(0, 5).map((r) => (
              <PressableScale
                key={r.id}
                onPress={() => router.push(`/report/${r.id}`)}
                scaleTo={0.985}
                style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16, flexDirection: "row", gap: 13, alignItems: "flex-start" }}
              >
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#EEF1FC", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#3730A3" }}>{r.activityScore ?? "—"}</Text>
                </View>
                <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 14.5, fontFamily: "Inter_700Bold", color: TEXT }}>{r.topic ?? "Отчёт"}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: SUB }}>{r.date}</Text>
                  </View>
                  {!!r.comment && (
                    <Text numberOfLines={2} style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: SUB, lineHeight: 18 }}>{r.comment}</Text>
                  )}
                </View>
              </PressableScale>
            ))}
          </View>
        )}

        {/* ── Weekly report for parents (Azerbaijani) ──────────────── */}
        <PressableScale
          onPress={() => router.push(`/weekly-report/${id}`)}
          scaleTo={0.985}
          accessibilityRole="button"
          accessibilityLabel={t("weeklyReportTitle")}
          style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: BORDER }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}>
            <CalendarRange size={18} color={INDIGO} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{t("weeklyReportTitle")}</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>{t("weeklyReportSubtitle")}</Text>
          </View>
          <ChevronRight size={17} color="#C6CBD5" />
        </PressableScale>

        {/* ── Progress Block ─────────────────────────────────────── */}
        <SectionCard>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={14} color={BLUE} />
              </View>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT }}>{t("studentGrowth")}</Text>
            </View>
            <PressableScale
              onPress={() => router.push(`/progress/${id}`)}
              scaleTo={0.95}
              style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: BLUE_50, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}
            >
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: BLUE }}>{t("studentGrowthDetails")}</Text>
              <ChevronRight size={13} color={BLUE} />
            </PressableScale>
          </View>

          {/* Quick stats row */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            <View style={{ flex: 1, backgroundColor: BLUE_50, borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: BLUE }}>
                {progressPct !== null ? `${progressPct}%` : "—"}
              </Text>
              <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2, textAlign: "center" }}>
                {t("studentProgressIdx")}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#ECFDF5", borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: GREEN }}>
                {avgActivity !== null ? `${avgActivity}/5` : "—"}
              </Text>
              <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2, textAlign: "center" }}>
                {t("studentAvgActivity")}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#FFFBEB", borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: AMBER }}>
                {hwPct !== null ? `${hwPct}%` : "—"}
              </Text>
              <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2, textAlign: "center" }}>
                {t("studentHWDone")}
              </Text>
            </View>
          </View>

          {/* Goals + Evals summary */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Star size={13} color={AMBER} fill={AMBER} />
              <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#3C3C43" }}>
                {t("studentEvalCount", { n: myEvals.length })}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <CheckCircle size={13} color={GREEN} />
              <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#3C3C43" }}>
                {t("studentGoalCount", { n: activeGoals })}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <PressableScale
              onPress={() => setShowEvalModal(true)}
              scaleTo={0.97}
              style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}
            >
              <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 42, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                <Plus size={15} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("studentRateBtn")}</Text>
              </LinearGradient>
            </PressableScale>
            <PressableScale
              onPress={() => router.push(`/progress/${id}`)}
              scaleTo={0.97}
              style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
            >
              <TrendingUp size={15} color={TEXT} />
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }}>{t("studentChartsBtn")}</Text>
            </PressableScale>
          </View>
        </SectionCard>

        {/* Parents / Linking */}
        {(() => {
          const linkedParents = parents.filter(
            (p) => (p.studentIds ?? []).includes(String(id))
          );
          return (
            <SectionCard>
              <SectionHeader title={t("studentParents")} icon={Users} />

              {linkedParents.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 8, marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#C7C7CC", textAlign: "center" }}>
                    {t("studentNoParents")}
                  </Text>
                </View>
              ) : (
                <View style={{ marginBottom: 12, gap: 8 }}>
                  {linkedParents.map((parent) => (
                    <View
                      key={parent.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: BLUE_50,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        gap: 10,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => router.push(`/parent/${parent.id}`)}
                        activeOpacity={0.7}
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}
                      >
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: parent.avatarColor ?? "#0EA5E9", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                            {tName(parent.name)?.[0] ?? "?"}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                            {tName(parent.name)}
                          </Text>
                          {parent.parentCode ? (
                            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>
                              {parent.parentCode}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "#ECFDF5", borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: GREEN }}>{t("studentLinked")}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            t("studentUnlink"),
                            t("studentUnlinkMsg", { parent: tName(parent.name), student: displayName }),
                            [
                              { text: t("cancel"), style: "cancel" },
                              {
                                text: t("studentUnlinkBtn"),
                                style: "destructive",
                                onPress: () => unlinkStudent(parent.id, String(id)),
                              },
                            ]
                          );
                        }}
                        style={{ padding: 4 }}
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <PressableScale
                onPress={() => setShowLinkParentModal(true)}
                scaleTo={0.98}
                style={{
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: BLUE_50,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <Link2 size={15} color={BLUE} />
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: BLUE }}>
                  {t("studentLinkParent")}
                </Text>
              </PressableScale>
            </SectionCard>
          );
        })()}

        {/* Student account linking — 1:1, unlike the parents list above */}
        <SectionCard>
          <SectionHeader title={t("studentLinkStudentAccount")} icon={Link2} />
          {student.linkedStudentUid ? (
            <View
              style={{
                flexDirection: "row", alignItems: "center", backgroundColor: "#ECFDF5",
                borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 10, marginBottom: 12,
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                  {tName(student.linkedStudentName)?.[0] ?? "?"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                  {tName(student.linkedStudentName)}
                </Text>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "#D1FAE5", borderRadius: 8 }}>
                <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: GREEN }}>{t("studentLinked")}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    t("studentUnlink"),
                    t("studentUnlinkMsg", { parent: tName(student.linkedStudentName), student: displayName }),
                    [
                      { text: t("cancel"), style: "cancel" },
                      {
                        text: t("studentUnlinkBtn"),
                        style: "destructive",
                        onPress: async () => {
                          const teacherUid = auth?.currentUser?.uid;
                          await unlinkStudentFromTeacher(teacherUid, student.linkedStudentUid);
                          updateStudent(student.id, { linkedStudentUid: null, linkedStudentName: null });
                        },
                      },
                    ]
                  );
                }}
                style={{ padding: 4 }}
              >
                <Trash2 size={15} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <PressableScale
              onPress={() => setShowLinkStudentModal(true)}
              scaleTo={0.98}
              style={{
                height: 44, borderRadius: 12, backgroundColor: "#ECFDF5",
                alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6,
              }}
            >
              <Link2 size={15} color={GREEN} />
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: GREEN }}>
                {t("studentLinkStudentAccount")}
              </Text>
            </PressableScale>
          )}
        </SectionCard>

        {/* Skills / Progress */}
        {hasSkills && (
          <SectionCard>
            <SectionHeader title={t("studentSkillsTitle")} icon={TrendingUp} />
            {student.skills.map((skill, index) => {
              const skillColor = getScoreColor(skill.score);
              const pct = (skill.score / skill.maxScore) * 100;
              const isLast = index === student.skills.length - 1;
              return (
                <View key={skill.label} style={{ marginBottom: isLast ? 0 : 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43" }}>
                      {skill.label}
                    </Text>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: skillColor }}>
                      {skill.score}/{skill.maxScore}
                    </Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                    <View style={{ width: `${pct}%`, height: "100%", backgroundColor: skillColor, borderRadius: 3 }} />
                  </View>
                </View>
              );
            })}
          </SectionCard>
        )}

        {/* Contacts & Payment */}
        {hasContact && (
          <SectionCard>
            <SectionHeader title={t("studentContactsTitle")} icon={Phone} />
            <View style={{ gap: 14 }}>
              {student.phone ? (
                <ContactRow icon={Phone} label={t("studentPhoneLabel")} value={student.phone} />
              ) : null}
            </View>
          </SectionCard>
        )}

        {/* Lesson History */}
        {hasHistory && (
          <SectionCard>
            <SectionHeader title={t("studentHistoryTitle")} icon={Calendar} />
            {student.lessonHistory.map((lesson, index) => {
              const isLast = index === student.lessonHistory.length - 1;
              return (
                <View
                  key={lesson.id}
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    paddingBottom: isLast ? 0 : 14,
                    marginBottom: isLast ? 0 : 14,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: "#F1F5F9",
                  }}
                >
                  {/* Timeline */}
                  <View style={{ alignItems: "center", width: 16 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE, marginTop: 5 }} />
                    {!isLast && (
                      <View style={{ width: 1.5, flex: 1, backgroundColor: "#E5E5EA", marginTop: 4, minHeight: 16 }} />
                    )}
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 4 }}>
                      {lesson.topic}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Calendar size={11} color={SUB} />
                        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>
                          {lesson.date}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Clock size={11} color={SUB} />
                        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>
                          {lesson.time} · {lesson.duration}{t("min_abbr")}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Done badge */}
                  <View style={{ justifyContent: "center" }}>
                    <CheckCircle size={16} color={GREEN} />
                  </View>
                </View>
              );
            })}
          </SectionCard>
        )}

        {/* Notes */}
        {hasNotes && (
          <SectionCard>
            <SectionHeader title={t("studentNotesTitle")} icon={MessageSquare} />
            <View style={{ backgroundColor: BLUE_50, borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: BLUE }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#3C3C43", lineHeight: 22 }}>
                {student.notes}
              </Text>
            </View>
          </SectionCard>
        )}

        {/* Empty state — newly added student with no extra data */}
        {!hasSkills && !hasHistory && !hasContact && !hasNotes && (
          <SectionCard>
            <View style={{ alignItems: "center", paddingVertical: 16 }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: SUB, textAlign: "center" }}>
                {t("studentNoInfo")}
              </Text>
            </View>
          </SectionCard>
        )}
      </View>
    </ScrollView>

    <AddEvaluationModal
      visible={showEvalModal}
      onClose={() => setShowEvalModal(false)}
      studentId={String(id)}
      studentName={student.name}
    />
    <LinkParentModal
      visible={showLinkParentModal}
      onClose={() => setShowLinkParentModal(false)}
      studentId={String(id)}
      studentName={student.name}
    />
    <LinkStudentModal
      visible={showLinkStudentModal}
      onClose={() => setShowLinkStudentModal(false)}
      studentId={String(id)}
      studentName={student.name}
    />
    </>
  );
}
