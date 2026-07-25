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
import { useT, useDateLocale } from "@/utils/i18n";

// ─── InfoRow ──────────────────────────────────────────────────────────────────

const InfoRow = ({ icon: Icon, label, value, iconColor = "#6B5CF6" }) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: "#F2F2F7",
    }}
  >
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        backgroundColor: "#F2F2F7",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        marginTop: 1,
      }}
    >
      <Icon size={15} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: 12,
          fontFamily: "Inter_400Regular",
          color: "#8E8E93",
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontFamily: "Inter_500Medium",
          color: "#1C1C1E",
          lineHeight: 20,
        }}
      >
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
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    }}
  >
    {title && (
      <Text
        style={{
          fontSize: 13,
          fontFamily: "Inter_600SemiBold",
          color: "#8E8E93",
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
    planned:   { label: t("statusPlanned"),   color: "#6B5CF6", bg: "#EEF0FF", Icon: Circle },
    completed: { label: t("statusCompleted"), color: "#22C55E", bg: "#F0FDF4", Icon: CheckCircle2 },
    cancelled: { label: t("statusCancelled"), color: "#EF4444", bg: "#FEF2F2", Icon: XCircle },
  };

  const FORMAT_LABELS = { "Онлайн": t("online"), "Офлайн": t("offline") };

  const lesson = lessons.find((l) => l.id === id);

  if (!lesson) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F2F2F7",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 16, fontFamily: "Inter_500Medium", color: "#8E8E93", marginBottom: 24 }}>
          {t("lessonNotFound")}
        </Text>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#6B5CF6", borderRadius: 14 }}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
            {t("back")}
          </Text>
        </TouchableOpacity>
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
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} color="#1C1C1E" />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 17,
            fontFamily: "Inter_700Bold",
            color: "#1C1C1E",
          }}
        >
          {t("lessonDetail")}
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleEdit}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: "#EEF0FF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Pencil size={17} color="#6B5CF6" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleDelete}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: "#FEF2F2",
              alignItems: "center",
              justifyContent: "center",
            }}
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
        {/* Subject row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "#EEF0FF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BookOpen size={20} color="#6B5CF6" />
            </View>
            <Text
              style={{
                fontSize: 22,
                fontFamily: "Inter_700Bold",
                color: "#1C1C1E",
              }}
            >
              {tSubject(lesson.subject)}
            </Text>
          </View>

          {/* Status badge */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: statusCfg.bg,
              borderRadius: 20,
            }}
          >
            <StatusIcon size={13} color={statusCfg.color} />
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_600SemiBold",
                color: statusCfg.color,
              }}
            >
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* Time / duration / format row */}
        <View
          style={{
            flexDirection: "row",
            gap: 16,
            paddingTop: 12,
            borderTopWidth: 0.5,
            borderTopColor: "#F2F2F7",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Clock size={14} color="#6B5CF6" />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
                color: "#1C1C1E",
              }}
            >
              {lesson.time}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Timer size={14} color="#8E8E93" />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: "#3C3C43",
              }}
            >
              {lesson.duration} {t("min_abbr")}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Video size={14} color="#8E8E93" />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: "#3C3C43",
              }}
            >
              {FORMAT_LABELS[lesson.format] ?? lesson.format ?? t("online")}
            </Text>
          </View>
        </View>
      </View>

      {/* Details card */}
      <SectionCard title={t("lessonDetails")}>
        <InfoRow icon={Calendar} label={t("lessonDate")} value={formatDateFull(lesson.date, locale)} iconColor="#6B5CF6" />
        <InfoRow icon={Users}    label={t("lessonStudents")} value={studentNames} iconColor="#3B82F6" />
        <View style={{ height: 6 }} />
      </SectionCard>

      {/* Notes */}
      {lesson.notes ? (
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 12,
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: 16,
            borderLeftWidth: 3,
            borderLeftColor: "#6B5CF6",
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}
          >
            <ClipboardList size={15} color="#6B5CF6" />
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: "#6B5CF6",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {t("lessonNotes")}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: "#3C3C43",
              lineHeight: 20,
            }}
          >
            {lesson.notes}
          </Text>
        </View>
      ) : null}

      {/* Homework */}
      {lesson.homework ? (
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 12,
            backgroundColor: "#FFFBEB",
            borderRadius: 16,
            padding: 16,
            borderLeftWidth: 3,
            borderLeftColor: "#F59E0B",
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}
          >
            <BookOpen size={15} color="#F59E0B" />
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                color: "#F59E0B",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {t("lessonHomework")}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_400Regular",
              color: "#3C3C43",
              lineHeight: 20,
            }}
          >
            {lesson.homework}
          </Text>
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 4 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleEdit}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: "#6B5CF6",
            borderRadius: 16,
            paddingVertical: 15,
          }}
        >
          <Pencil size={17} color="#FFFFFF" />
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Inter_600SemiBold",
              color: "#FFFFFF",
            }}
          >
            {t("edit")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleDelete}
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
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Inter_600SemiBold",
              color: "#EF4444",
            }}
          >
            {t("lessonDelete")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
