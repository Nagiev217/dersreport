import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import {
  ArrowLeft,
  Star,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Calendar,
  ArrowRight,
  ClipboardList,
  Shield,
} from "lucide-react-native";
import { useReportsStore } from "@/utils/reports/store";
import { formatDateFull } from "@/utils/dateUtils";
import { useT, useDateLocale } from "@/utils/i18n";

// ─── Config ────────────────────────────────────────────────────────────────────

function makeScoreCfg(t) {
  return {
    5: { label: t("scoreExcellent"), color: "#22C55E", bg: "#F0FDF4", stars: 5 },
    4: { label: t("scoreGood"),      color: "#3B82F6", bg: "#EFF6FF", stars: 4 },
    3: { label: t("scoreMedium"),    color: "#F59E0B", bg: "#FFFBEB", stars: 3 },
    2: { label: t("scorePoor"),      color: "#F97316", bg: "#FFF7ED", stars: 2 },
    1: { label: t("scoreBad"),       color: "#EF4444", bg: "#FEF2F2", stars: 1 },
  };
}

// ─── Stars display ─────────────────────────────────────────────────────────────

const StarsRow = ({ score, color }) => (
  <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={20}
        color={color}
        fill={n <= score ? color : "none"}
      />
    ))}
  </View>
);

// ─── Section Block ─────────────────────────────────────────────────────────────

const SectionBlock = ({ icon: Icon, iconColor, iconBg, title, content, borderColor, isHighlight = false }) => {
  if (!content) return null;
  return (
    <View
      style={{
        backgroundColor: isHighlight ? "#FAFAFA" : "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 10,
        borderLeftWidth: borderColor ? 3 : 0,
        borderLeftColor: borderColor,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            backgroundColor: iconBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={15} color={iconColor} />
        </View>
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_700Bold",
            color: iconColor,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {title}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 14,
          fontFamily: "Inter_400Regular",
          color: "#3C3C43",
          lineHeight: 22,
        }}
      >
        {content}
      </Text>
    </View>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ParentReportDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, parentId } = useLocalSearchParams();
  const { reports, markAsRead } = useReportsStore();
  const { t, tSubject, tName } = useT();
  const locale = useDateLocale();

  const report = reports.find((r) => r.id === id);

  useEffect(() => {
    if (report && !report.isRead) {
      markAsRead(report.id);
    }
  }, [report?.id]);

  if (!report) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Text style={{ fontSize: 16, fontFamily: "Inter_500Medium", color: "#8E8E93", marginBottom: 24 }}>{t("reportNotFound")}</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#6B5CF6", borderRadius: 14 }}
        >
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const SCORE_CFG = makeScoreCfg(t);
  const scoreCfg = SCORE_CFG[report.activityScore] ?? SCORE_CFG[3];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F2F2F7" }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Parent mode header */}
      <View
        style={{
          backgroundColor: "#6B5CF6",
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 24,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
            <Shield size={11} color="#FFFFFF" />
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("reportLessonBadge")}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Hero info */}
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.3, marginBottom: 4 }}>
          {tName(report.studentName)}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginBottom: 14 }}>
          {tSubject(report.subject)} · {formatDateFull(report.date, locale)}
        </Text>

        {/* Activity score in purple header */}
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
            {t("reportActivityLabel")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <StarsRow score={report.activityScore} color="#FFFFFF" />
            <View style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12 }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                {scoreCfg.label}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Topic card */}
      <View
        style={{
          marginHorizontal: 20,
          marginTop: 14,
          marginBottom: 12,
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          padding: 16,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={14} color="#6B5CF6" />
          </View>
          <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: "#6B5CF6", textTransform: "uppercase", letterSpacing: 0.8 }}>{t("reportTopicLabel")}</Text>
        </View>
        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
          {report.topic}
        </Text>
      </View>

      {/* Content sections */}
      <SectionBlock
        icon={ClipboardList}
        iconColor="#6B5CF6"
        iconBg="#EEF0FF"
        title={t("reportSectionDesc")}
        content={report.description}
        borderColor="#6B5CF6"
      />
      <SectionBlock
        icon={CheckCircle2}
        iconColor="#22C55E"
        iconBg="#F0FDF4"
        title={t("reportSectionStrengths")}
        content={report.strengths}
        borderColor="#22C55E"
      />
      <SectionBlock
        icon={AlertCircle}
        iconColor="#F59E0B"
        iconBg="#FFFBEB"
        title={t("reportDifficulties")}
        content={report.difficulties}
        borderColor="#F59E0B"
      />

      {/* Homework highlighted */}
      {report.homework && (
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 10,
            backgroundColor: "#FFFBEB",
            borderRadius: 16,
            padding: 16,
            borderWidth: 1.5,
            borderColor: "#FDE68A",
            shadowColor: "#F59E0B",
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: "#FDE68A", alignItems: "center", justifyContent: "center" }}>
              <ClipboardList size={15} color="#D97706" />
            </View>
            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#D97706", textTransform: "uppercase", letterSpacing: 0.8 }}>
              {t("reportHomework")}
            </Text>
          </View>
          <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: "#3C3C43", lineHeight: 22 }}>
            {report.homework}
          </Text>
        </View>
      )}

      <SectionBlock
        icon={ArrowRight}
        iconColor="#8B5CF6"
        iconBg="#EDE9FE"
        title={t("reportSectionNextPlan")}
        content={report.nextLessonPlan}
        borderColor="#8B5CF6"
      />

      {/* Teacher comment highlighted */}
      {report.comment && (
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 10,
            backgroundColor: "#EEF0FF",
            borderRadius: 16,
            padding: 16,
            borderWidth: 1.5,
            borderColor: "#DDD9FF",
            shadowColor: "#6B5CF6",
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: "#DDD9FF", alignItems: "center", justifyContent: "center" }}>
              <MessageSquare size={14} color="#6B5CF6" />
            </View>
            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#6B5CF6", textTransform: "uppercase", letterSpacing: 0.8 }}>
              {t("reportSectionComment")}
            </Text>
          </View>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#3C3C43", lineHeight: 22, fontStyle: "italic" }}>
            «{report.comment}»
          </Text>
        </View>
      )}

      {/* Meta */}
      <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" }}>
          <Calendar size={12} color="#C7C7CC" />
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#C7C7CC" }}>
            {t("reportCreatedOn")} {new Date(report.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
