import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Phone,
  CreditCard,
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
  Wallet,
  Banknote,
  ArrowRightLeft,
  Users,
  Link2,
  Trash2,
} from "lucide-react-native";
import { useStudentsStore } from "@/utils/students/store";
import { unlinkStudentFromTeacher } from "@/utils/firebase/roles";
import { auth } from "@/utils/firebase/config";
import { useProgressStore } from "@/utils/progress/store";
import { usePaymentsStore } from "@/utils/payments/store";
import { useLessonsStore } from "@/utils/lessons/store";
import { useParentsStore } from "@/utils/parents/store";
import { getScoreColor } from "@/data/mockData";
import { useT } from "@/utils/i18n";
import AddEvaluationModal from "@/components/AddEvaluationModal";
import AddPaymentModal from "@/components/AddPaymentModal";
import LinkParentModal from "@/components/LinkParentModal";
import LinkStudentModal from "@/components/LinkStudentModal";

const TYPE_COLORS = {
  IELTS: { bg: "#EEF0FF", text: "#6B5CF6" },
  SAT: { bg: "#EFF6FF", text: "#3B82F6" },
  General: { bg: "#ECFDF5", text: "#10B981" },
};

function getAttendanceInfo(pct) {
  if (pct >= 90) return { color: "#22C55E", bg: "#F0FDF4" };
  if (pct >= 75) return { color: "#3B82F6", bg: "#EFF6FF" };
  return { color: "#F59E0B", bg: "#FFFBEB" };
}

function getScoreBg(color) {
  if (color === "#22C55E") return "#F0FDF4";
  if (color === "#3B82F6") return "#EFF6FF";
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
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
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
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: "#EEF0FF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={14} color="#6B5CF6" />
      </View>
      <Text
        style={{
          fontSize: 15,
          fontFamily: "Inter_700Bold",
          color: "#1C1C1E",
        }}
      >
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
      <View
        style={{ flexDirection: "row", alignItems: "baseline", gap: 1 }}
      >
        <Text
          style={{
            fontSize: 22,
            fontFamily: "Inter_700Bold",
            color,
            letterSpacing: -0.5,
          }}
        >
          {value}
        </Text>
        {subvalue ? (
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_500Medium",
              color: "#8E8E93",
            }}
          >
            {subvalue}
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          fontSize: 10,
          fontFamily: "Inter_500Medium",
          color: "#6B7280",
          textAlign: "center",
          lineHeight: 13,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ContactRow({ icon: Icon, label, value }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          backgroundColor: "#F2F2F7",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={16} color="#6B5CF6" />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Inter_400Regular",
            color: "#8E8E93",
            marginBottom: 1,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Inter_500Medium",
            color: "#1C1C1E",
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const METHOD_ICON = { cash: Banknote, card: CreditCard, transfer: ArrowRightLeft };

const padN = (n) => String(n).padStart(2, "0");

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${padN(d.getMonth() + 1)}`;
}

export default function StudentProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, tSubject, tName, months } = useT();

  const MONTHS_FULL  = months(false);
  const MONTHS_SHORT = months(true);
  const METHOD_LABEL = { cash: t("addPayCash"), card: t("addPayCard"), transfer: t("addPayTransfer") };
  const PAYMENT_TYPE_LABELS = {
    "Почасовая": t("addStudentPayHourly"),
    "За урок":   t("addStudentPayLesson"),
    "Месячная":  t("addStudentPayMonthly"),
  };

  function periodLabel(period) {
    if (!period) return "";
    const [y, m] = period.split("-").map(Number);
    return `${MONTHS_FULL[m - 1]} ${y}`;
  }

  function formatDateShort(dateStr) {
    const [, m, d] = dateStr.split("-").map(Number);
    return `${padN(d)} ${MONTHS_SHORT[m - 1]}`;
  }

  const { students, updateStudent } = useStudentsStore();
  const { evaluations, goals } = useProgressStore();
  const { payments, deletePayment } = usePaymentsStore();
  const { lessons } = useLessonsStore();
  const { parents, unlinkStudent } = useParentsStore();
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
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

  // ─── Payment metrics ────────────────────────────────────────────────────────
  const thisPeriod = currentPeriod();

  const myPayments = payments
    .filter((p) => String(p.studentId) === String(id))
    .sort((a, b) => b.date.localeCompare(a.date));

  const receivedThisMonth = myPayments
    .filter((p) => p.period === thisPeriod)
    .reduce((sum, p) => sum + p.amount, 0);

  const allTimeReceived = myPayments.reduce((sum, p) => sum + p.amount, 0);

  if (!student) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F2F2F7",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 40,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: "#FFF1F0",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <AlertCircle size={30} color="#F59E0B" />
        </View>
        <Text
          style={{
            fontSize: 18,
            fontFamily: "Inter_700Bold",
            color: "#1C1C1E",
            marginBottom: 6,
          }}
        >
          {t("studentNotFound")}
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_400Regular",
            color: "#8E8E93",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          {t("studentNotFoundHint")}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          style={{
            paddingHorizontal: 24,
            paddingVertical: 12,
            backgroundColor: "#6B5CF6",
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Inter_600SemiBold",
              color: "#FFFFFF",
            }}
          >
            {t("back")}
          </Text>
        </TouchableOpacity>
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

  // Expected amount this month — based on payment type + completed lessons
  const completedThisMonth = lessons.filter(
    (l) =>
      l.date.startsWith(thisPeriod) &&
      l.studentIds.includes(student.id) &&
      l.status === "completed"
  );
  const expectedThisMonth =
    student.paymentType === "Месячная"
      ? student.rate ?? 0
      : student.paymentType === "Почасовая"
      ? Math.round(
          completedThisMonth.reduce(
            (s, l) => s + (student.rate ?? 0) * ((l.duration ?? 60) / 60),
            0
          )
        )
      : student.paymentType === "За урок"
      ? completedThisMonth.length * (student.rate ?? 0)
      : 0;

  const balance = receivedThisMonth - expectedThisMonth;

  const hasSkills = student.skills && student.skills.length > 0;
  const hasHistory = student.lessonHistory && student.lessonHistory.length > 0;
  const hasContact = student.phone || student.paymentType || student.rate;
  const hasNotes = student.notes && student.notes.trim().length > 0;

  const paymentLabel =
    student.paymentType === "Почасовая"
      ? `${PAYMENT_TYPE_LABELS["Почасовая"]} — ${student.rate ?? 0} AZN/ч`
      : student.paymentType === "Месячная"
        ? `${PAYMENT_TYPE_LABELS["Месячная"]} — ${student.rate ?? 0} AZN`
        : student.paymentType === "За урок"
          ? `${PAYMENT_TYPE_LABELS["За урок"]} — ${student.rate ?? 0} AZN`
          : student.paymentType
            ? (PAYMENT_TYPE_LABELS[student.paymentType] ?? student.paymentType)
            : t("studentPayNotSet");

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F2F2F7" }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          paddingTop: insets.top + 8,
          paddingBottom: 28,
          paddingHorizontal: 20,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 3,
        }}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.75}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: "#F2F2F7",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 22,
          }}
        >
          <ArrowLeft size={20} color="#1C1C1E" />
        </TouchableOpacity>

        {/* Avatar + identity */}
        <View style={{ alignItems: "center" }}>
          {/* Colored avatar with matching glow shadow */}
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: student.avatarColor,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
              shadowColor: student.avatarColor,
              shadowOpacity: 0.4,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <Text
              style={{
                fontSize: 28,
                fontFamily: "Inter_700Bold",
                color: "#FFFFFF",
                letterSpacing: -0.5,
              }}
            >
              {initials}
            </Text>
          </View>

          <Text
            style={{
              fontSize: 24,
              fontFamily: "Inter_700Bold",
              color: "#1C1C1E",
              letterSpacing: -0.4,
              marginBottom: 10,
            }}
          >
            {displayName}
          </Text>

          {/* Badges row: type + subject */}
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                backgroundColor: typeColor.bg,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_600SemiBold",
                  color: typeColor.text,
                }}
              >
                {tSubject(student.type)}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                backgroundColor: "#F2F2F7",
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_500Medium",
                  color: "#6B7280",
                }}
              >
                {tSubject(student.subject)}
              </Text>
            </View>
          </View>

          {student.joinDate ? (
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: "#8E8E93",
              }}
            >
              {t("studentJoinDate")}{student.joinDate}
            </Text>
          ) : null}
        </View>
      </View>

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
              color="#6B5CF6"
              bgColor="#EEF0FF"
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
              color="#F59E0B"
              bgColor="#FFFBEB"
            />
          </View>
        </View>

        {/* Next Lesson — purple card matching app style */}
        <View
          style={{
            backgroundColor: "#EEF0FF",
            borderRadius: 20,
            padding: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            shadowColor: "#6B5CF6",
            shadowOpacity: 0.1,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: "#DDD9FF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookOpen size={22} color="#6B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Inter_600SemiBold",
                color: "#6B5CF6",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 4,
              }}
            >
              {t("studentNextLesson")}
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Inter_700Bold",
                color: "#1C1C1E",
              }}
            >
              {student.nextLesson}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_400Regular",
                color: "#6B7280",
                marginTop: 2,
              }}
            >
              {tSubject(student.subject)} — {tSubject(student.type)}
            </Text>
          </View>
        </View>

        {/* ── Progress Block ─────────────────────────────────────── */}
        <SectionCard>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={14} color="#6B5CF6" />
              </View>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{t("studentGrowth")}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/progress/${id}`)}
              style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#EEF0FF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}
            >
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#6B5CF6" }}>{t("studentGrowthDetails")}</Text>
              <ChevronRight size={13} color="#6B5CF6" />
            </TouchableOpacity>
          </View>

          {/* Quick stats row */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            <View style={{ flex: 1, backgroundColor: "#EEF0FF", borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#6B5CF6" }}>
                {progressPct !== null ? `${progressPct}%` : "—"}
              </Text>
              <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 2, textAlign: "center" }}>
                {t("studentProgressIdx")}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#ECFDF5", borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#22C55E" }}>
                {avgActivity !== null ? `${avgActivity}/5` : "—"}
              </Text>
              <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 2, textAlign: "center" }}>
                {t("studentAvgActivity")}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#FFFBEB", borderRadius: 12, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#F59E0B" }}>
                {hwPct !== null ? `${hwPct}%` : "—"}
              </Text>
              <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 2, textAlign: "center" }}>
                {t("studentHWDone")}
              </Text>
            </View>
          </View>

          {/* Goals + Evals summary */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Star size={13} color="#F59E0B" fill="#F59E0B" />
              <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#3C3C43" }}>
                {t("studentEvalCount", { n: myEvals.length })}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <CheckCircle size={13} color="#22C55E" />
              <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#3C3C43" }}>
                {t("studentGoalCount", { n: activeGoals })}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowEvalModal(true)}
              activeOpacity={0.85}
              style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: "#6B5CF6", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
            >
              <Plus size={15} color="#FFFFFF" />
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("studentRateBtn")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/progress/${id}`)}
              activeOpacity={0.85}
              style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
            >
              <TrendingUp size={15} color="#1C1C1E" />
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}>{t("studentChartsBtn")}</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* ── Финансы ─────────────────────────────────────────────── */}
        <SectionCard>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: "#ECFDF5",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Wallet size={14} color="#10B981" />
              </View>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
                {t("studentFinance")}
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#8E8E93" }}>
              {periodLabel(thisPeriod)}
            </Text>
          </View>

          {/* Balance row */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <View
              style={{
                flex: 1, backgroundColor: "#F2F2F7", borderRadius: 14,
                padding: 12, alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
                {expectedThisMonth > 0 ? `${expectedThisMonth} ₼` : "—"}
              </Text>
              <Text
                style={{
                  fontSize: 10, fontFamily: "Inter_400Regular",
                  color: "#8E8E93", marginTop: 3, textAlign: "center",
                }}
              >
                {t("studentExpected")}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: receivedThisMonth > 0 ? "#ECFDF5" : "#F2F2F7",
                borderRadius: 14, padding: 12, alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 18, fontFamily: "Inter_700Bold",
                  color: receivedThisMonth > 0 ? "#10B981" : "#8E8E93",
                }}
              >
                {receivedThisMonth > 0 ? `${receivedThisMonth} ₼` : "0 ₼"}
              </Text>
              <Text
                style={{
                  fontSize: 10, fontFamily: "Inter_400Regular",
                  color: "#8E8E93", marginTop: 3, textAlign: "center",
                }}
              >
                {t("studentReceived")}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor:
                  expectedThisMonth === 0
                    ? "#F2F2F7"
                    : balance >= 0
                    ? "#ECFDF5"
                    : "#FEF2F2",
                borderRadius: 14, padding: 12, alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 18, fontFamily: "Inter_700Bold",
                  color:
                    expectedThisMonth === 0
                      ? "#8E8E93"
                      : balance >= 0
                      ? "#10B981"
                      : "#EF4444",
                }}
              >
                {expectedThisMonth === 0
                  ? "—"
                  : balance >= 0
                  ? "✓"
                  : `${Math.abs(balance)} ₼`}
              </Text>
              <Text
                style={{
                  fontSize: 10, fontFamily: "Inter_400Regular",
                  color: "#8E8E93", marginTop: 3, textAlign: "center",
                }}
              >
                {expectedThisMonth === 0
                  ? t("studentDebt")
                  : balance >= 0
                  ? t("studentPaid")
                  : t("studentDebt")}
              </Text>
            </View>
          </View>

          {/* All-time total */}
          {allTimeReceived > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#F8F8FF",
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
                {t("studentTotalReceived")}
              </Text>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#6B5CF6" }}>
                {allTimeReceived} ₼
              </Text>
            </View>
          )}

          {/* Payment history — last 4 */}
          {myPayments.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              {myPayments.slice(0, 4).map((p, idx) => {
                const MethodIcon = METHOD_ICON[p.method] ?? Banknote;
                const isLast = idx === Math.min(myPayments.length, 4) - 1;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => {
                      setEditingPayment(p);
                      setShowPaymentModal(true);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingVertical: 10,
                      borderBottomWidth: isLast ? 0 : 0.5,
                      borderBottomColor: "#F2F2F7",
                    }}
                  >
                    <View
                      style={{
                        width: 34, height: 34, borderRadius: 10,
                        backgroundColor: "#F2F2F7",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <MethodIcon size={15} color="#6B5CF6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}
                      >
                        {p.amount} ₼
                        {p.note ? (
                          <Text
                            style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}
                          >
                            {" "}· {p.note}
                          </Text>
                        ) : null}
                      </Text>
                      <Text
                        style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 1 }}
                      >
                        {formatDateShort(p.date)} · {METHOD_LABEL[p.method] ?? p.method} · {periodLabel(p.period)}
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                        backgroundColor: "#ECFDF5",
                      }}
                    >
                      <Text
                        style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#10B981" }}
                      >
                        +{p.amount} ₼
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {myPayments.length === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 12, marginBottom: 12 }}>
              <Text
                style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#C7C7CC" }}
              >
                {t("studentNoPayments")}
              </Text>
            </View>
          )}

          {/* Add payment button */}
          <TouchableOpacity
            onPress={() => {
              setEditingPayment(null);
              setShowPaymentModal(true);
            }}
            activeOpacity={0.85}
            style={{
              height: 44, borderRadius: 12,
              backgroundColor: "#ECFDF5",
              alignItems: "center", justifyContent: "center",
              flexDirection: "row", gap: 6,
            }}
          >
            <Plus size={15} color="#10B981" />
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#10B981" }}>
              {t("studentAddPayment")}
            </Text>
          </TouchableOpacity>
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
                        backgroundColor: "#F8F8FF",
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: parent.avatarColor ?? "#0EA5E9",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                          {tName(parent.name)?.[0] ?? "?"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}>
                          {tName(parent.name)}
                        </Text>
                        {parent.parentCode ? (
                          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
                            {parent.parentCode}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "#ECFDF5", borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#22C55E" }}>{t("studentLinked")}</Text>
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

              <TouchableOpacity
                onPress={() => setShowLinkParentModal(true)}
                style={{
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "#EEF0FF",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <Link2 size={15} color="#6B5CF6" />
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#6B5CF6" }}>
                  {t("studentLinkParent")}
                </Text>
              </TouchableOpacity>
            </SectionCard>
          );
        })()}

        {/* Student account linking — 1:1, unlike the parents list above */}
        <SectionCard>
          <SectionHeader title={t("studentLinkStudentAccount")} icon={Link2} />
          {student.linkedStudentUid ? (
            <View
              style={{
                flexDirection: "row", alignItems: "center", backgroundColor: "#F8F8FF",
                borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 10, marginBottom: 12,
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                  {tName(student.linkedStudentName)?.[0] ?? "?"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}>
                  {tName(student.linkedStudentName)}
                </Text>
              </View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "#ECFDF5", borderRadius: 8 }}>
                <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#22C55E" }}>{t("studentLinked")}</Text>
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
            <TouchableOpacity
              onPress={() => setShowLinkStudentModal(true)}
              style={{
                height: 44, borderRadius: 12, backgroundColor: "#ECFDF5",
                alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6,
              }}
            >
              <Link2 size={15} color="#10B981" />
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#10B981" }}>
                {t("studentLinkStudentAccount")}
              </Text>
            </TouchableOpacity>
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
                <View
                  key={skill.label}
                  style={{ marginBottom: isLast ? 0 : 14 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_500Medium",
                        color: "#3C3C43",
                      }}
                    >
                      {skill.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_700Bold",
                        color: skillColor,
                      }}
                    >
                      {skill.score}/{skill.maxScore}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: "#F2F2F7",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        backgroundColor: skillColor,
                        borderRadius: 3,
                      }}
                    />
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
                <ContactRow
                  icon={Phone}
                  label={t("studentPhoneLabel")}
                  value={student.phone}
                />
              ) : null}
              {(student.paymentType || student.rate) ? (
                <ContactRow
                  icon={CreditCard}
                  label={t("studentPayLabel")}
                  value={paymentLabel}
                />
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
                    borderBottomWidth: isLast ? 0 : 0.5,
                    borderBottomColor: "#F2F2F7",
                  }}
                >
                  {/* Timeline */}
                  <View style={{ alignItems: "center", width: 16 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#6B5CF6",
                        marginTop: 5,
                      }}
                    />
                    {!isLast && (
                      <View
                        style={{
                          width: 1.5,
                          flex: 1,
                          backgroundColor: "#E5E5EA",
                          marginTop: 4,
                          minHeight: 16,
                        }}
                      />
                    )}
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_600SemiBold",
                        color: "#1C1C1E",
                        marginBottom: 4,
                      }}
                    >
                      {lesson.topic}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Calendar size={11} color="#8E8E93" />
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_400Regular",
                            color: "#8E8E93",
                          }}
                        >
                          {lesson.date}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Clock size={11} color="#8E8E93" />
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_400Regular",
                            color: "#8E8E93",
                          }}
                        >
                          {lesson.time} · {lesson.duration}{t("min_abbr")}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Done badge */}
                  <View style={{ justifyContent: "center" }}>
                    <CheckCircle size={16} color="#22C55E" />
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
            <View
              style={{
                backgroundColor: "#F8F8FF",
                borderRadius: 12,
                padding: 14,
                borderLeftWidth: 3,
                borderLeftColor: "#6B5CF6",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: "#3C3C43",
                  lineHeight: 22,
                }}
              >
                {student.notes}
              </Text>
            </View>
          </SectionCard>
        )}

        {/* Empty state — newly added student with no extra data */}
        {!hasSkills && !hasHistory && !hasContact && !hasNotes && (
          <SectionCard>
            <View style={{ alignItems: "center", paddingVertical: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_500Medium",
                  color: "#8E8E93",
                  textAlign: "center",
                }}
              >
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
    <AddPaymentModal
      visible={showPaymentModal}
      onClose={() => {
        setShowPaymentModal(false);
        setEditingPayment(null);
      }}
      studentId={String(id)}
      studentName={student.name}
      defaultAmount={expectedThisMonth}
      defaultPeriod={thisPeriod}
      editPayment={editingPayment}
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
