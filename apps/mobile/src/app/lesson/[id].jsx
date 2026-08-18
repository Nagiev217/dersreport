import {
  View,
  Text,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Clock,
  Calendar,
  Timer,
  Video,
  BookOpen,
  ClipboardList,
  Users,
  CheckCircle2,
  Circle,
  XCircle,
} from "lucide-react-native";
import { useLessonsStore } from "@/utils/lessons/store";
import { formatDateFull } from "@/utils/dateUtils";
import PressableScale from "@/components/PressableScale";
import { useT, useDateLocale } from "@/utils/i18n";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";
const AMBER = "#D97706";

// ─── InfoRow ──────────────────────────────────────────────────────────────────

const InfoRow = ({ icon: Icon, label, value, iconColor = BLUE, first = false }) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 12,
      borderTopWidth: first ? 0 : 1,
      borderTopColor: "#F1F5F9",
    }}
  >
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        marginTop: 1,
      }}
    >
      <Icon size={15} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 2 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT, lineHeight: 20 }}>
        {value || "—"}
      </Text>
    </View>
  </View>
);

// ─── SectionCard ──────────────────────────────────────────────────────────────

const SectionCard = ({ title, children }) => (
  <View
    style={{
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      marginHorizontal: 20,
      marginBottom: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: BORDER,
    }}
  >
    {title && (
      <Text
        style={{
          fontSize: 13,
          fontFamily: "Inter_600SemiBold",
          color: SUB,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          paddingTop: 14,
          paddingBottom: 6,
        }}
      >
        {title}
      </Text>
    )}
    {children}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LessonDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tSubject, tName, tNameList } = useT();
  const locale = useDateLocale();
  const { id } = useLocalSearchParams();
  const { lessons, deleteLesson } = useLessonsStore();

  const STATUS_CONFIG = {
    planned:   { label: t("statusPlanned"),   color: INDIGO, bg: INDIGO_50, Icon: Circle },
    completed: { label: t("statusCompleted"), color: "#22C55E", bg: "#ECFDF5", Icon: CheckCircle2 },
    cancelled: { label: t("statusCancelled"), color: "#EF4444", bg: "#FEF2F2", Icon: XCircle },
  };

  const FORMAT_LABELS = { "Онлайн": t("online"), "Офлайн": t("offline") };

  const lesson = lessons.find((l) => l.id === id);

  if (!lesson) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 16, fontFamily: "Inter_500Medium", color: SUB, marginBottom: 24 }}>
          {t("lessonNotFound")}
        </Text>
        <PressableScale onPress={() => router.back()} scaleTo={0.96} style={{ borderRadius: 14, overflow: "hidden" }}>
          <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
              {t("back")}
            </Text>
          </LinearGradient>
        </PressableScale>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[lesson.status] ?? STATUS_CONFIG.planned;
  const StatusIcon = statusCfg.Icon;

  const studentNames = Array.isArray(lesson.studentNames)
    ? tNameList(lesson.studentNames)
    : tName(lesson.student ?? "—");

  const handleEdit = () => router.push(`/lesson/add?id=${lesson.id}`);

  const handleDelete = () => {
    Alert.alert(
      t("lessonDeleteTitle"),
      `${tSubject(lesson.subject)} · ${formatDateFull(lesson.date, locale)} · ${lesson.time}`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => { deleteLesson(lesson.id); router.back(); },
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
      {/* Fills the top overscroll/bounce gap with the hero color instead of white */}
      <View pointerEvents="none" style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: BLUE_50 }} />
      {/* ── SECTION 1 — Hero (gradient blue-50 → indigo-50 → white) ── */}
      <LinearGradient
        colors={[BLUE_50, INDIGO_50, "#FFFFFF"]}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 16 }}
      >
        {/* Header row */}
        <Animated.View entering={FadeInDown.duration(300).easing(Easing.out(Easing.cubic))} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <PressableScale onPress={() => router.back()} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t("back")} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={20} color={TEXT} />
          </PressableScale>

          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>
            {t("lessonDetail")}
          </Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <PressableScale onPress={handleEdit} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t("edit")} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center" }}>
              <Pencil size={17} color={BLUE} />
            </PressableScale>

            <PressableScale onPress={handleDelete} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t("lessonDelete")} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={17} color="#EF4444" />
            </PressableScale>
          </View>
        </Animated.View>

        {/* Hero card */}
        <Animated.View entering={FadeInDown.delay(40).duration(320)}>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER }}>
            {/* Subject row */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={20} color={INDIGO} />
                </View>
                <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT }}>
                  {tSubject(lesson.subject)}
                </Text>
              </View>

              {/* Status badge */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: statusCfg.bg, borderRadius: 20 }}>
                <StatusIcon size={13} color={statusCfg.color} />
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: statusCfg.color }}>
                  {statusCfg.label}
                </Text>
              </View>
            </View>

            {/* Time / duration / format row */}
            <View style={{ flexDirection: "row", gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Clock size={14} color={BLUE} />
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                  {lesson.time}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Timer size={14} color={SUB} />
                <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#3C3C43" }}>
                  {lesson.duration} {t("min_abbr")}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Video size={14} color={SUB} />
                <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#3C3C43" }}>
                  {FORMAT_LABELS[lesson.format] ?? lesson.format ?? t("online")}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* ── SECTION 2 — Content (white) ── */}
      <View style={{ paddingTop: 16 }}>
        {/* Details card */}
        <SectionCard title={t("lessonDetails")}>
          <InfoRow icon={Calendar} label={t("lessonDate")} value={formatDateFull(lesson.date, locale)} iconColor={BLUE} first />
          <InfoRow icon={Users}    label={t("lessonStudents")} value={studentNames} iconColor={INDIGO} />
          <View style={{ height: 6 }} />
        </SectionCard>

        {/* Notes */}
        {lesson.notes ? (
          <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: BLUE_50, borderRadius: 16, padding: 16, borderLeftWidth: 3, borderLeftColor: BLUE }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <ClipboardList size={15} color={BLUE} />
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: BLUE, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("lessonNotes")}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#3C3C43", lineHeight: 20 }}>
              {lesson.notes}
            </Text>
          </View>
        ) : null}

        {/* Homework */}
        {lesson.homework ? (
          <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: "#FFFBEB", borderRadius: 16, padding: 16, borderLeftWidth: 3, borderLeftColor: AMBER }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <BookOpen size={15} color={AMBER} />
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: AMBER, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("lessonHomework")}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#3C3C43", lineHeight: 20 }}>
              {lesson.homework}
            </Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 4 }}>
          <PressableScale onPress={handleEdit} scaleTo={0.97} style={{ borderRadius: 16, overflow: "hidden" }}>
            <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 }}>
              <Pencil size={17} color="#FFFFFF" />
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                {t("edit")}
              </Text>
            </LinearGradient>
          </PressableScale>

          <PressableScale
            onPress={handleDelete}
            scaleTo={0.97}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: "#FEF2F2",
              borderRadius: 16,
              paddingVertical: 15,
              borderWidth: 1.5,
              borderColor: "#FECACA",
            }}
          >
            <Trash2 size={17} color="#EF4444" />
            <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#EF4444" }}>
              {t("lessonDelete")}
            </Text>
          </PressableScale>
        </View>
      </View>
    </ScrollView>
  );
}
