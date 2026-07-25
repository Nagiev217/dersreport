import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
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

// ─── ContentBlock ─────────────────────────────────────────────────────────────

const ContentBlock = ({ icon: Icon, iconColor = "#6B5CF6", iconBg = "#EEF0FF", title, content, leftBorderColor }) => {
  if (!content) return null;
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 10,
        borderLeftWidth: leftBorderColor ? 3 : 0,
        borderLeftColor: leftBorderColor,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
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
    5: { label: t("scoreExcellent"),  color: "#22C55E", bg: "#F0FDF4" },
    4: { label: t("scoreGood"),       color: "#3B82F6", bg: "#EFF6FF" },
    3: { label: t("scoreMedium"),     color: "#F59E0B", bg: "#FFFBEB" },
    2: { label: t("scoreBelowAvg"),   color: "#F97316", bg: "#FFF7ED" },
    1: { label: t("scorePoor"),       color: "#EF4444", bg: "#FEF2F2" },
  };

  const report = reports.find((r) => r.id === id);

  if (!report) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
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
      style={{ flex: 1, backgroundColor: "#F2F2F7" }}
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
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
        >
          <ArrowLeft size={20} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{t("reportsTitle")}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(`/report/add?id=${report.id}`)}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center" }}
          >
            <Pencil size={17} color="#6B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleDelete}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}
          >
            <Trash2 size={17} color="#EF4444" />
          </TouchableOpacity>
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
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={20} color="#6B5CF6" />
            </View>
            <View>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{tName(report.studentName)}</Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{tSubject(report.subject)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: scoreCfg.bg, borderRadius: 20 }}>
            <Star size={12} color={scoreCfg.color} fill={scoreCfg.color} />
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: scoreCfg.color }}>{scoreCfg.label}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 4 }}>
          {report.topic}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: "#F2F2F7" }}>
          <Calendar size={13} color="#8E8E93" />
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
            {formatDateFull(report.date, locale)}
          </Text>
        </View>
      </View>

      {/* Content blocks */}
      <ContentBlock icon={ClipboardList} iconColor="#6B5CF6" iconBg="#EEF0FF" title={t("reportSectionDesc")} content={report.description} leftBorderColor="#6B5CF6" />
      <ContentBlock icon={CheckCircle2} iconColor="#22C55E" iconBg="#F0FDF4" title={t("reportSectionStrengths")} content={report.strengths} leftBorderColor="#22C55E" />
      <ContentBlock icon={AlertCircle} iconColor="#F59E0B" iconBg="#FFFBEB" title={t("reportSectionDifficulties")} content={report.difficulties} leftBorderColor="#F59E0B" />
      <ContentBlock icon={BookOpen} iconColor="#3B82F6" iconBg="#EFF6FF" title={t("lessonHomework")} content={report.homework} leftBorderColor="#3B82F6" />
      <ContentBlock icon={ArrowRight} iconColor="#8B5CF6" iconBg="#EDE9FE" title={t("reportSectionNextPlan")} content={report.nextLessonPlan} leftBorderColor="#8B5CF6" />
      <ContentBlock icon={MessageSquare} iconColor="#EC4899" iconBg="#FDF2F8" title={t("reportSectionComment")} content={report.comment} leftBorderColor="#EC4899" />

      {/* Action buttons */}
      <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 8 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/report/add?id=${report.id}`)}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#6B5CF6", borderRadius: 16, paddingVertical: 15 }}
        >
          <Pencil size={17} color="#FFFFFF" />
          <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("reportEditBtn")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleDelete}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 16, paddingVertical: 15, borderWidth: 1.5, borderColor: "#FECACA" }}
        >
          <Trash2 size={17} color="#EF4444" />
          <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#EF4444" }}>{t("reportDeleteBtn")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
