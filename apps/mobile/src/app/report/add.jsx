import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useCallback, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import { ArrowLeft, Star, Users, ChevronDown, X } from "lucide-react-native";
import { useReportsStore } from "@/utils/reports/store";
import { useStudentsStore } from "@/utils/students/store";
import { toDateStr, formatDateFull, getNextDays } from "@/utils/dateUtils";
import * as Notifications from "expo-notifications";
import PressableScale from "@/components/PressableScale";
import { useT, useDateLocale } from "@/utils/i18n";

// ─── Configure local notifications ───────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";

// ─── Sub-components ────────────────────────────────────────────────────────────

const SectionLabel = ({ children }) => (
  <Text
    style={{
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: SUB,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
      marginTop: 20,
    }}
  >
    {children}
  </Text>
);

const FieldInput = ({ value, onChangeText, placeholder, multiline = false, minHeight = 48 }) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="#C7C7CC"
    multiline={multiline}
    numberOfLines={multiline ? 4 : 1}
    style={{
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: TEXT,
      minHeight,
      textAlignVertical: multiline ? "top" : "center",
      borderWidth: 1.5,
      borderColor: BORDER,
    }}
  />
);

// Activity score picker (1-5 stars)
const ActivityScorePicker = ({ value, onChange }) => {
  const { t } = useT();
  const cfg = [
    { score: 1, label: t("scorePoor") },
    { score: 2, label: t("scoreBelowAvg") },
    { score: 3, label: t("scoreMedium") },
    { score: 4, label: t("scoreGood") },
    { score: 5, label: t("scoreExcellent") },
  ];
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {cfg.map(({ score, label }) => {
          const active = score === value;
          return (
            <PressableScale
              key={score}
              scaleTo={0.94}
              onPress={() => onChange(score)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: active ? BLUE : "#FFFFFF",
                borderWidth: active ? 0 : 1.5,
                borderColor: BORDER,
              }}
            >
              <Star
                size={18}
                color={active ? "#FFFFFF" : "#C7C7CC"}
                fill={active ? "#FFFFFF" : "none"}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                  color: active ? "#FFFFFF" : SUB,
                  marginTop: 3,
                }}
              >
                {score}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      {value > 0 && (
        <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: BLUE, marginTop: 6, textAlign: "center" }}>
          {cfg.find((c) => c.score === value)?.label}
        </Text>
      )}
    </View>
  );
};

// Student picker modal
const StudentPickerModal = ({ visible, onClose, onSelect, currentStudentId }) => {
  const { t, tSubject, tName } = useT();
  const { students } = useStudentsStore();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingBottom: 32,
              maxHeight: "70%",
            }}
          >
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 14 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{t("reportAddPickStudent")}</Text>
              <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
                <X size={16} color={SUB} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={students}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#F1F5F9" }} />}
              renderItem={({ item }) => {
                const checked = item.id === currentStudentId;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => { onSelect(item); onClose(); }}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.avatarColor ?? BLUE, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" }}>{tName(item.name)?.[0] ?? "?"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{tName(item.name)}</Text>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>{tSubject(item.type)} · {tSubject(item.subject)}</Text>
                    </View>
                    {checked && <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#FFF", fontSize: 12 }}>✓</Text></View>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const DAYS = getNextDays(14);

export default function AddReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tSubject, tName, days, months } = useT();
  const locale = useDateLocale();
  const { id: editId, studentId: preStudentId } = useLocalSearchParams();
  const { reports, addReport, updateReport } = useReportsStore();
  const { students } = useStudentsStore();

  const isEdit = Boolean(editId);
  const existing = isEdit ? reports.find((r) => r.id === editId) : null;

  // Preselect student if passed
  const preStudent = preStudentId
    ? students.find((s) => s.id === preStudentId)
    : null;

  // ─ Form state
  const [student, setStudent] = useState(() => {
    if (existing) return students.find((s) => s.id === existing.studentId) ?? null;
    return preStudent ?? null;
  });
  const [date, setDate] = useState(existing?.date ?? toDateStr(new Date()));
  const [topic, setTopic] = useState(existing?.topic ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [activityScore, setActivityScore] = useState(existing?.activityScore ?? 0);
  const [strengths, setStrengths] = useState(existing?.strengths ?? "");
  const [difficulties, setDifficulties] = useState(existing?.difficulties ?? "");
  const [homework, setHomework] = useState(existing?.homework ?? "");
  const [nextLessonPlan, setNextLessonPlan] = useState(existing?.nextLessonPlan ?? "");
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [showStudentPicker, setShowStudentPicker] = useState(false);

  const canSave = student !== null && topic.trim().length > 0 && activityScore > 0;

  const handleSave = useCallback(async () => {
    if (!canSave) {
      Alert.alert(t("reportAddValidation"), t("reportAddValidationMsg"));
      return;
    }
    const basePayload = {
      studentId: student.id,
      studentName: student.name,
      subject: student.type ?? student.subject ?? "General",
      date,
      lessonId: existing?.lessonId ?? null,
      topic: topic.trim(),
      description: description.trim(),
      activityScore,
      strengths: strengths.trim(),
      difficulties: difficulties.trim(),
      homework: homework.trim(),
      nextLessonPlan: nextLessonPlan.trim(),
      comment: comment.trim(),
    };

    if (isEdit && editId) {
      // Preserve isRead — don't re-alert parent for an existing report
      updateReport(editId, { ...basePayload, updatedAt: Date.now() });
    } else {
      const payload = { ...basePayload, notificationSent: false, isRead: false };
      const newReport = {
        // Random suffix: this id is now the Firestore document id, so two
        // reports created in the same millisecond would overwrite each other.
        id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        ...payload,
      };
      addReport(newReport);

      // Send local notification to simulate parent notification
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === "granted") {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: t("reportNotifTitle", { name: tName(student.name) }),
              body: `${tSubject(basePayload.subject)} · ${formatDateFull(date, locale)} · ${t("reportNotifBody")}`,
              data: { reportId: newReport.id, studentId: student.id },
            },
            trigger: null,
          });
        }
      } catch {
        // Notifications unavailable in this environment
      }
    }

    router.back();
  }, [canSave, student, date, topic, description, activityScore, strengths, difficulties, homework, nextLessonPlan, comment, isEdit, editId]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#FFFFFF" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <Animated.View entering={FadeInDown.duration(320).easing(Easing.out(Easing.cubic))} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <PressableScale onPress={() => router.back()} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t("back")} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}>
              <ArrowLeft size={20} color={TEXT} />
            </PressableScale>
            <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>
              {isEdit ? t("reportEditTitle") : t("homeNewReport")}
            </Text>
            <PressableScale
              scaleTo={0.95}
              disabled={!canSave}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel={t("save")}
              style={{ borderRadius: 12, overflow: "hidden" }}
            >
              <LinearGradient
                colors={canSave ? [BLUE, INDIGO] : ["#C7C7CC", "#C7C7CC"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingHorizontal: 16, height: 38, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                  {t("save")}
                </Text>
              </LinearGradient>
            </PressableScale>
          </Animated.View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20 }}>
          {/* ── Student ── */}
          <SectionLabel>{t("reportAddStudent")}</SectionLabel>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowStudentPicker(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 14,
              borderWidth: 1.5,
              borderColor: student ? BLUE : BORDER,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {student ? (
                <>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: student.avatarColor ?? BLUE, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" }}>{tName(student.name)?.[0]}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{tName(student.name)}</Text>
                </>
              ) : (
                <>
                  <Users size={18} color={SUB} />
                  <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: SUB }}>{t("reportAddPickStudentHint")}</Text>
                </>
              )}
            </View>
            <ChevronDown size={16} color={SUB} />
          </TouchableOpacity>

          {/* ── Date ── */}
          <SectionLabel>{t("reportAddDate")}</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DAYS.map((d) => {
              const str = toDateStr(d);
              const isSelected = str === date;
              const daysArr = days();
              const monthArr = months(true);
              return (
                <PressableScale
                  key={str}
                  scaleTo={0.94}
                  onPress={() => setDate(str)}
                  style={{
                    width: 56,
                    height: 70,
                    borderRadius: 14,
                    backgroundColor: isSelected ? BLUE : "#FFFFFF",
                    borderWidth: isSelected ? 0 : 1.5,
                    borderColor: BORDER,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: isSelected ? "rgba(255,255,255,0.8)" : SUB, marginBottom: 2 }}>
                    {daysArr[(d.getDay() + 6) % 7]}
                  </Text>
                  <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: isSelected ? "#FFFFFF" : TEXT, lineHeight: 28 }}>
                    {d.getDate()}
                  </Text>
                  <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: isSelected ? "rgba(255,255,255,0.7)" : SUB, marginTop: 1 }}>
                    {monthArr[d.getMonth()]}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>

          {/* ── Topic ── */}
          <SectionLabel>{t("reportAddTopic")}</SectionLabel>
          <FieldInput
            value={topic}
            onChangeText={setTopic}
            placeholder={t("reportAddTopicHint")}
          />

          {/* ── Description ── */}
          <SectionLabel>{t("reportAddDesc")}</SectionLabel>
          <FieldInput
            value={description}
            onChangeText={setDescription}
            placeholder={t("reportAddDescHint")}
            multiline
            minHeight={90}
          />

          {/* ── Activity Score ── */}
          <SectionLabel>{t("reportAddActivity")}</SectionLabel>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: BORDER }}>
            <ActivityScorePicker value={activityScore} onChange={setActivityScore} />
          </View>

          {/* ── Strengths ── */}
          <SectionLabel>{t("reportAddStrengths")}</SectionLabel>
          <FieldInput
            value={strengths}
            onChangeText={setStrengths}
            placeholder={t("reportAddStrengthsHint")}
            multiline
            minHeight={80}
          />

          {/* ── Difficulties ── */}
          <SectionLabel>{t("reportAddDifficulties")}</SectionLabel>
          <FieldInput
            value={difficulties}
            onChangeText={setDifficulties}
            placeholder={t("reportAddDifficultiesHint")}
            multiline
            minHeight={80}
          />

          {/* ── Homework ── */}
          <SectionLabel>{t("lessonHomework")}</SectionLabel>
          <FieldInput
            value={homework}
            onChangeText={setHomework}
            placeholder={t("addLessonHWHint")}
            multiline
            minHeight={80}
          />

          {/* ── Next lesson plan ── */}
          <SectionLabel>{t("reportAddNextPlan")}</SectionLabel>
          <FieldInput
            value={nextLessonPlan}
            onChangeText={setNextLessonPlan}
            placeholder={t("reportAddNextPlanHint")}
            multiline
            minHeight={80}
          />

          {/* ── Comment ── */}
          <SectionLabel>{t("reportAddComment")}</SectionLabel>
          <FieldInput
            value={comment}
            onChangeText={setComment}
            placeholder={t("reportAddCommentHint")}
            multiline
            minHeight={80}
          />

          {/* Save button */}
          <PressableScale scaleTo={0.97} disabled={!canSave} onPress={handleSave} style={{ marginTop: 24, borderRadius: 16, overflow: "hidden" }}>
            <LinearGradient
              colors={canSave ? [BLUE, INDIGO] : ["#C7C7CC", "#C7C7CC"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                {isEdit ? t("addPaySaveEdit") : t("reportsCreateBtn")}
              </Text>
            </LinearGradient>
          </PressableScale>
        </View>

        <StudentPickerModal
          visible={showStudentPicker}
          onClose={() => setShowStudentPicker(false)}
          onSelect={setStudent}
          currentStudentId={student?.id}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
