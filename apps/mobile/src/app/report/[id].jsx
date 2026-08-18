import {
  View,
  Text,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Star,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Calendar,
  MessageSquare,
  ArrowRight,
} from "lucide-react-native";
import { useReportsStore } from "@/utils/reports/store";
import { formatDateFull } from "@/utils/dateUtils";
import { useT, useDateLocale } from "@/utils/i18n";
import PressableScale from "@/components/PressableScale";

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

// ─── ContentBlock ─────────────────────────────────────────────────────────────

const ContentBlock = ({ icon: Icon, iconColor = INDIGO, iconBg = INDIGO_50, title, content, leftBorderColor }) => {
  if (!content) return null;
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: BORDER,
        borderLeftWidth: leftBorderColor ? 3 : 1,
        borderLeftColor: leftBorderColor ?? BORDER,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
          <Icon size={14} color={iconColor} />
        </View>
        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: iconColor, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {title}
        </Text>
      </View>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#3C3C43", lineHeight: 21 }}>
        {content}
      </Text>
    </View>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ReportDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tSubject, tName } = useT();
  const locale = useDateLocale();
  const { id } = useLocalSearchParams();
  const { reports, deleteReport } = useReportsStore();

  const SCORE_CFG = {
    5: { label: t("scoreExcellent"),  color: GREEN,  bg: "#F0FDF4" },
    4: { label: t("scoreGood"),       color: BLUE,   bg: BLUE_50 },
    3: { label: t("scoreMedium"),     color: AMBER,  bg: "#FFFBEB" },
    2: { label: t("scoreBelowAvg"),   color: "#F97316", bg: "#FFF7ED" },
    1: { label: t("scorePoor"),       color: "#EF4444", bg: "#FEF2F2" },
  };

  const report = reports.find((r) => r.id === id);

  if (!report) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
        <Text style={{ fontSize: 16, fontFamily: "Inter_500Medium", color: SUB, marginBottom: 24 }}>{t("reportNotFound")}</Text>
        <PressableScale onPress={() => router.back()} scaleTo={0.96} style={{ borderRadius: 14, overflow: "hidden" }}>
          <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("back")}</Text>
          </LinearGradient>
        </PressableScale>
      </View>
    );
  }

  const scoreCfg = SCORE_CFG[report.activityScore] ?? SCORE_CFG[3];

  const handleDelete = () => {
    Alert.alert(
      t("reportDeleteTitle"),
      `${report.topic} — ${tName(report.studentName)}`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => { deleteReport(report.id); router.back(); },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <PressableScale
          onPress={() => router.back()}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
        >
          <ArrowLeft size={20} color={TEXT} />
        </PressableScale>
        <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>{t("reportsTitle")}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <PressableScale
            onPress={() => router.push(`/report/add?id=${report.id}`)}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={t("reportEditBtn")}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}
          >
            <Pencil size={17} color={INDIGO} />
          </PressableScale>
          <PressableScale
            onPress={handleDelete}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={t("reportDeleteBtn")}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}
          >
            <Trash2 size={17} color="#EF4444" />
          </PressableScale>
        </View>
      </View>

      {/* Hero card */}
      <View
        style={{
          marginHorizontal: 20,
          marginBottom: 12,
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: BORDER,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={20} color={INDIGO} />
            </View>
            <View>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{tName(report.studentName)}</Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>{tSubject(report.subject)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: scoreCfg.bg, borderRadius: 20 }}>
            <Star size={12} color={scoreCfg.color} fill={scoreCfg.color} />
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: scoreCfg.color }}>{scoreCfg.label}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 4 }}>
          {report.topic}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDER }}>
          <Calendar size={13} color={SUB} />
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>
            {formatDateFull(report.date, locale)}
          </Text>
        </View>
      </View>

      {/* Content blocks */}
      <ContentBlock icon={ClipboardList} iconColor={INDIGO} iconBg={INDIGO_50} title={t("reportSectionDesc")} content={report.description} leftBorderColor={INDIGO} />
      <ContentBlock icon={CheckCircle2} iconColor={GREEN} iconBg="#F0FDF4" title={t("reportSectionStrengths")} content={report.strengths} leftBorderColor={GREEN} />
      <ContentBlock icon={AlertCircle} iconColor={AMBER} iconBg="#FFFBEB" title={t("reportSectionDifficulties")} content={report.difficulties} leftBorderColor={AMBER} />
      <ContentBlock icon={BookOpen} iconColor={BLUE} iconBg={BLUE_50} title={t("lessonHomework")} content={report.homework} leftBorderColor={BLUE} />
      <ContentBlock icon={ArrowRight} iconColor={INDIGO} iconBg={INDIGO_50} title={t("reportSectionNextPlan")} content={report.nextLessonPlan} leftBorderColor={INDIGO} />
      <ContentBlock icon={MessageSquare} iconColor="#EC4899" iconBg="#FDF2F8" title={t("reportSectionComment")} content={report.comment} leftBorderColor="#EC4899" />

      {/* Action buttons */}
      <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 8 }}>
        <PressableScale
          onPress={() => router.push(`/report/add?id=${report.id}`)}
          scaleTo={0.98}
          style={{ borderRadius: 16, overflow: "hidden" }}
        >
          <LinearGradient
            colors={[BLUE, INDIGO]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 }}
          >
            <Pencil size={17} color="#FFFFFF" />
            <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("reportEditBtn")}</Text>
          </LinearGradient>
        </PressableScale>
        <PressableScale
          onPress={handleDelete}
          scaleTo={0.98}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 16, paddingVertical: 15, borderWidth: 1.5, borderColor: "#FECACA" }}
        >
          <Trash2 size={17} color="#EF4444" />
          <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#EF4444" }}>{t("reportDeleteBtn")}</Text>
        </PressableScale>
      </View>
    </ScrollView>
  );
}
