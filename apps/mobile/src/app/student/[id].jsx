import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import {
  ArrowLeft,
  Phone,
  BookOpen,
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
import { getScoreColor } from "@/data/mockData";
import { useT } from "@/utils/i18n";
import PressableScale from "@/components/PressableScale";
import AddEvaluationModal from "@/components/AddEvaluationModal";
import LinkParentModal from "@/components/LinkParentModal";
import LinkStudentModal from "@/components/LinkStudentModal";

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

const TYPE_COLORS = {
  IELTS: { bg: INDIGO_50, text: INDIGO },
  SAT: { bg: BLUE_50, text: BLUE },
  General: { bg: "#ECFDF5", text: GREEN },
};

function getAttendanceInfo(pct) {
  if (pct >= 90) return { color: GREEN, bg: "#ECFDF5" };
  if (pct >= 75) return { color: BLUE, bg: BLUE_50 };
  return { color: AMBER, bg: "#FFFBEB" };
}

function getScoreBg(color) {
  if (color === "#22C55E") return "#ECFDF5";
  if (color === "#3B82F6") return BLUE_50;
  return "#FFFBEB";
}

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

function StatBox({ value, subvalue, label, color, bgColor }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bgColor,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 12,
        alignItems: "center",
        gap: 4,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 1 }}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color, letterSpacing: -0.5 }}>
          {value}
        </Text>
        {subvalue ? (
          <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: SUB }}>
            {subvalue}
          </Text>
        ) : null}
      </View>
      <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: "#6B7280", textAlign: "center", lineHeight: 13 }}>
        {label}
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
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showLinkParentModal, setShowLinkParentModal] = useState(false);
  const [showLinkStudentModal, setShowLinkStudentModal] = useState(false);

  const student = students.find((s) => String(s.id) === String(id));

  const myEvals = evaluations.filter((e) => String(e.studentId) === String(id));
  const myGoals = goals.filter((g) => String(g.studentId) === String(id));

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

  const scoreColor = getScoreColor(student.score);
  const scoreBg = getScoreBg(scoreColor);
  const typeColor = TYPE_COLORS[student.type] || TYPE_COLORS.General;
  const attendInfo = getAttendanceInfo(student.attendance ?? 0);

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
      {/* Fills the top overscroll/bounce gap with the hero color instead of white */}
      <View pointerEvents="none" style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: BLUE_50 }} />
      {/* ─── SECTION 1 — Hero (gradient blue-50 → indigo-50 → white) ─────── */}
      <LinearGradient
        colors={[BLUE_50, INDIGO_50, "#FFFFFF"]}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 24, paddingHorizontal: 20 }}
      >
        {/* Back button */}
        <PressableScale
          onPress={() => router.back()}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center", marginBottom: 22 }}
        >
          <ArrowLeft size={20} color={TEXT} />
        </PressableScale>

        {/* Avatar + identity */}
        <Animated.View entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))} style={{ alignItems: "center" }}>
          {/* Colored avatar (per-student color) with matching glow shadow */}
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: student.avatarColor,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
              borderWidth: 3,
              borderColor: "#FFFFFF",
              shadowColor: student.avatarColor,
              shadowOpacity: 0.35,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.5 }}>
              {initials}
            </Text>
          </View>

          <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.4, marginBottom: 10 }}>
            {displayName}
          </Text>

          {/* Badges row: type + subject */}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <View style={{ paddingHorizontal: 12, paddingVertical: 5, backgroundColor: typeColor.bg, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: typeColor.text }}>
                {tSubject(student.type)}
              </Text>
            </View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "#F1F5F9", borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#6B7280" }}>
                {tSubject(student.subject)}
              </Text>
            </View>
          </View>

          {student.joinDate ? (
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>
              {t("studentJoinDate")}{student.joinDate}
            </Text>
          ) : null}
        </Animated.View>
      </LinearGradient>

      {/* ─── Content ────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14 }}>

        {/* Stats 2×2 */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatBox
              value={String(student.score)}
              subvalue={`/${student.maxScore}`}
              label={t("studentStatScore")}
              color={scoreColor}
              bgColor={scoreBg}
            />
            <StatBox
              value={String(student.lessonsCompleted ?? 0)}
              label={t("studentStatLessons")}
              color={BLUE}
              bgColor={BLUE_50}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatBox
              value={`${student.attendance ?? 0}%`}
              label={t("studentStatAttend")}
              color={attendInfo.color}
              bgColor={attendInfo.bg}
            />
            <StatBox
              value={String(student.lessonsRemaining ?? 0)}
              label={t("studentStatRemain")}
              color={AMBER}
              bgColor="#FFFBEB"
            />
          </View>
        </View>

        {/* Next Lesson — gradient spotlight card */}
        <View style={{ borderRadius: 20, overflow: "hidden" }}>
          <LinearGradient
            colors={[BLUE, INDIGO]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                {t("studentNextLesson")}
              </Text>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                {student.nextLesson}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                {tSubject(student.subject)} — {tSubject(student.type)}
              </Text>
            </View>
          </LinearGradient>
        </View>

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
