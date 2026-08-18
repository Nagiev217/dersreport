import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Users,
  X,
} from "lucide-react-native";
import { useLessonsStore } from "@/utils/lessons/store";
import { useStudentsStore } from "@/utils/students/store";
import { useGroupsStore } from "@/utils/groups/store";
import PressableScale from "@/components/PressableScale";
import {
  getNextDays,
  getTimeSlots,
  toDateStr,
  formatDayNum,
} from "@/utils/dateUtils";
import { useT } from "@/utils/i18n";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";

// ─── Static option sets ────────────────────────────────────────────────────────
const SUBJECTS  = ["IELTS", "SAT", "General", "Английский"];
const DURATIONS = [30, 45, 60, 90, 120];
// FORMATS and STATUSES built inside component (need t())

const DAYS       = getNextDays(14);
const TIME_SLOTS = getTimeSlots(6, 22);

// ─── Sub-components ────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <Text
    style={{
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: SUB,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 20,
    }}
  >
    {children}
  </Text>
);

const Chip = ({ label, selected, onPress, color = BLUE }) => (
  <PressableScale
    scaleTo={0.95}
    onPress={onPress}
    style={{
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: selected ? color : "#FFFFFF",
      borderWidth: 1.5,
      borderColor: selected ? color : BORDER,
      marginRight: 8,
      marginBottom: 8,
    }}
  >
    <Text
      style={{
        fontSize: 14,
        fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
        color: selected ? "#FFFFFF" : "#3C3C43",
      }}
    >
      {label}
    </Text>
  </PressableScale>
);

const DayCell = ({ date, selected, onPress }) => {
  const { days, months } = useT();
  const dayName    = days()[(date.getDay() + 6) % 7];
  const dayNum     = formatDayNum(date);
  const monthShort = months(true)[date.getMonth()];
  const isToday    = toDateStr(date) === toDateStr(new Date());
  return (
    <PressableScale
      scaleTo={0.94}
      onPress={onPress}
      style={{
        width: 56, height: 70, borderRadius: 14,
        backgroundColor: selected ? BLUE : "#FFFFFF",
        borderWidth: selected ? 0 : 1.5,
        borderColor: isToday && !selected ? BLUE : BORDER,
        alignItems: "center", justifyContent: "center",
        marginRight: 8,
      }}
    >
      <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: selected ? "rgba(255,255,255,0.8)" : SUB, marginBottom: 2 }}>{dayName}</Text>
      <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: selected ? "#FFFFFF" : isToday ? BLUE : TEXT, lineHeight: 28 }}>{dayNum}</Text>
      <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: selected ? "rgba(255,255,255,0.7)" : SUB, marginTop: 1 }}>{monthShort}</Text>
    </PressableScale>
  );
};

const TimeCell = ({ slot, selected, onPress }) => (
  <PressableScale
    scaleTo={0.94}
    onPress={onPress}
    style={{
      paddingHorizontal: 14, height: 40, borderRadius: 12,
      backgroundColor: selected ? BLUE : "#FFFFFF",
      borderWidth: selected ? 0 : 1.5,
      borderColor: BORDER,
      alignItems: "center", justifyContent: "center", marginRight: 8,
    }}
  >
    <Text style={{ fontSize: 14, fontFamily: selected ? "Inter_700Bold" : "Inter_400Regular", color: selected ? "#FFFFFF" : TEXT }}>
      {slot}
    </Text>
  </PressableScale>
);

// ─── Student Picker Modal ─────────────────────────────────────────────────────
const StudentPickerModal = ({ visible, selected, onClose, onConfirm }) => {
  const { students } = useStudentsStore();
  const { t, tSubject, tName } = useT();
  const [local, setLocal] = useState(selected);

  useEffect(() => { if (visible) setLocal(selected); }, [visible]);

  const toggle = (student) =>
    setLocal((prev) =>
      prev.find((s) => s.id === student.id)
        ? prev.filter((s) => s.id !== student.id)
        : [...prev, student]
    );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 32, maxHeight: "70%" }}>
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 14 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{t("addLessonSelectModal")}</Text>
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
              const checked = local.some((s) => s.id === item.id);
              const displayName = tName(item.name);
              return (
                <TouchableOpacity activeOpacity={0.7} onPress={() => toggle(item)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.avatarColor ?? BLUE, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" }}>{displayName?.[0] ?? "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{displayName}</Text>
                    {item.subject && <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>{tSubject(item.subject)}</Text>}
                  </View>
                  <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: checked ? BLUE : "#D1D1D6", backgroundColor: checked ? BLUE : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {checked && <Check size={14} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
          <PressableScale scaleTo={0.97} onPress={() => onConfirm(local)} style={{ marginTop: 16, borderRadius: 14, overflow: "hidden" }}>
            <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("addLessonApply")} ({local.length})</Text>
            </LinearGradient>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
};

// ─── Group Picker Modal ───────────────────────────────────────────────────────
const GroupPickerModal = ({ visible, onClose, onSelect }) => {
  const { groups }   = useGroupsStore();
  const { students } = useStudentsStore();
  const { t, tp } = useT();

  const activeGroups = useMemo(
    () => groups.filter((g) => g.category !== "archived"),
    [groups],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 32, maxHeight: "65%" }}>
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 14 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{t("addLessonSelectGroup")}</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={SUB} />
            </TouchableOpacity>
          </View>

          {activeGroups.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                {t("addLessonNoGroups")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={activeGroups}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#F1F5F9" }} />}
              renderItem={({ item }) => {
                const count = students.filter((s) => item.studentIds.includes(s.id)).length;
                return (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => onSelect(item, students)}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 14 }}
                  >
                    {/* Emoji circle */}
                    <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: item.emojiColor, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                    </View>
                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{item.name}</Text>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>
                        {count} {tp(count, "student")}
                      </Text>
                    </View>
                    <ChevronDown size={16} color={SUB} style={{ transform: [{ rotate: "-90deg" }] }} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddLessonScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tp, tName } = useT();
  const { id: editId } = useLocalSearchParams();
  const { lessons, addLesson, updateLesson } = useLessonsStore();
  const { students } = useStudentsStore();

  const FORMATS = ["Онлайн", "Офлайн"]; // stored as-is; display mapped below
  const FORMAT_LABELS = { "Онлайн": t("online"), "Офлайн": t("offline") };
  const STATUSES = [
    { value: "planned",   label: t("statusPlanned") },
    { value: "completed", label: t("statusCompleted") },
    { value: "cancelled", label: t("statusCancelled") },
  ];
  const SUBJECT_LABELS = {
    "IELTS": "IELTS",
    "SAT": "SAT",
    "General": "General",
    "Английский": t("addLessonSubjectEnglish"),
  };

  const isEdit         = Boolean(editId);
  const existingLesson = isEdit ? lessons.find((l) => l.id === editId) : null;

  // ─ Form state ───────────────────────────────────────────────────────────────
  const [selectedDate,     setSelectedDate]     = useState(() => existingLesson?.date ?? toDateStr(new Date()));
  const [selectedTime,     setSelectedTime]     = useState(existingLesson?.time ?? "10:00");
  const [duration,         setDuration]         = useState(existingLesson?.duration ?? 60);
  const [subject,          setSubject]          = useState(existingLesson?.subject ?? "IELTS");
  const [format,           setFormat]           = useState(existingLesson?.format ?? "Онлайн");
  const [status,           setStatus]           = useState(existingLesson?.status ?? "planned");
  const [notes,            setNotes]            = useState(existingLesson?.notes ?? "");
  const [homework,         setHomework]         = useState(existingLesson?.homework ?? "");

  // Participant mode: "students" | "group"
  const [participantMode,     setParticipantMode]     = useState(existingLesson?.groupId ? "group" : "students");
  const [selectedStudents,    setSelectedStudents]    = useState(() => {
    if (existingLesson?.studentIds?.length) {
      return existingLesson.studentIds.map((id, i) => ({
        id,
        name: existingLesson.studentNames?.[i] ?? id,
      }));
    }
    return [];
  });
  const [selectedGroup,       setSelectedGroup]       = useState(null);
  const [pickerVisible,       setPickerVisible]       = useState(false);
  const [groupPickerVisible,  setGroupPickerVisible]  = useState(false);

  const canSave = selectedStudents.length > 0;

  // When switching mode, clear selections
  function switchMode(mode) {
    if (mode === participantMode) return;
    setParticipantMode(mode);
    setSelectedStudents([]);
    setSelectedGroup(null);
  }

  // When a group is selected → auto-populate students
  function handleGroupSelect(group, allStudents) {
    const members = allStudents
      .filter((s) => group.studentIds.includes(s.id))
      .map((s) => ({ id: s.id, name: s.name }));
    setSelectedGroup(group);
    setSelectedStudents(members);
    setGroupPickerVisible(false);
  }

  const handleSave = useCallback(() => {
    if (!canSave) {
      Alert.alert(t("addLessonSelectModal"), t("addLessonPickStudents").replace("…", ""));
      return;
    }

    const payload = {
      subject,
      studentIds:   selectedStudents.map((s) => s.id),
      studentNames: selectedStudents.map((s) => s.name),
      groupId:      participantMode === "group" ? (selectedGroup?.id ?? null) : null,
      groupName:    participantMode === "group" ? (selectedGroup?.name ?? null) : null,
      date:         selectedDate,
      time:         selectedTime,
      duration,
      format,
      status,
      notes,
      homework,
    };

    if (isEdit && editId) {
      updateLesson(editId, { ...payload, updatedAt: Date.now() });
    } else {
      addLesson({ id: `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now(), ...payload });
    }

    router.back();
  }, [canSave, subject, selectedStudents, selectedDate, selectedTime, duration, format, status, notes, homework, participantMode, selectedGroup, isEdit, editId, addLesson, updateLesson, router]);

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
            <PressableScale scaleTo={0.9} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("back")} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}>
              <ArrowLeft size={20} color={TEXT} />
            </PressableScale>
            <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>
              {isEdit ? t("editLessonTitle") : t("addLessonTitle")}
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
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("save")}</Text>
              </LinearGradient>
            </PressableScale>
          </Animated.View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20 }}>
          {/* ── Date ── */}
          <SectionLabel>{t("addLessonDate")}</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DAYS.map((d) => {
              const str = toDateStr(d);
              return <DayCell key={str} date={d} selected={str === selectedDate} onPress={() => setSelectedDate(str)} />;
            })}
          </ScrollView>

          {/* ── Time ── */}
          <SectionLabel>{t("addLessonTime")}</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TIME_SLOTS.map((slot) => (
              <TimeCell key={slot} slot={slot} selected={slot === selectedTime} onPress={() => setSelectedTime(slot)} />
            ))}
          </ScrollView>

          {/* ── Duration ── */}
          <SectionLabel>{t("addLessonDuration")}</SectionLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {DURATIONS.map((d) => <Chip key={d} label={`${d} ${t("min_abbr")}`} selected={d === duration} onPress={() => setDuration(d)} />)}
          </View>

          {/* ── Subject ── */}
          <SectionLabel>{t("addLessonSubject")}</SectionLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {SUBJECTS.map((s) => <Chip key={s} label={SUBJECT_LABELS[s] ?? s} selected={s === subject} onPress={() => setSubject(s)} />)}
          </View>

          {/* ── Format ── */}
          <SectionLabel>{t("addLessonFormat")}</SectionLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {FORMATS.map((f) => <Chip key={f} label={FORMAT_LABELS[f] ?? f} selected={f === format} onPress={() => setFormat(f)} />)}
          </View>

          {/* ── Status ── */}
          <SectionLabel>{t("addLessonStatus")}</SectionLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {STATUSES.map((s) => (
              <Chip key={s.value} label={s.label} selected={s.value === status} color={s.value === "completed" ? "#22C55E" : s.value === "cancelled" ? "#EF4444" : BLUE} onPress={() => setStatus(s.value)} />
            ))}
          </View>

          {/* ── Participants ─────────────────────────────────────── */}
          <SectionLabel>{t("addLessonParticipants")}</SectionLabel>

          {/* Mode toggle: Ученики | Группа */}
          <View style={{ flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 12, padding: 3, marginBottom: 12 }}>
            {[
              { id: "students", label: t("addLessonModeStudents") },
              { id: "group",    label: t("addLessonModeGroup") },
            ].map(({ id, label }) => {
              const active = participantMode === id;
              return (
                <PressableScale
                  key={id}
                  onPress={() => switchMode(id)}
                  scaleTo={0.97}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: active ? "#FFFFFF" : "transparent", alignItems: "center" }}
                >
                  <Text style={{ fontSize: 14, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular", color: active ? TEXT : SUB }}>
                    {label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {/* Students picker button */}
          {participantMode === "students" && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setPickerVisible(true)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: selectedStudents.length ? BLUE : BORDER }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <Users size={18} color={selectedStudents.length ? BLUE : SUB} />
                <Text style={{ fontSize: 15, fontFamily: selectedStudents.length ? "Inter_500Medium" : "Inter_400Regular", color: selectedStudents.length ? TEXT : SUB, flex: 1 }} numberOfLines={1}>
                  {selectedStudents.length ? selectedStudents.map((s) => tName(s.name)).join(", ") : t("addLessonPickStudents")}
                </Text>
              </View>
              <ChevronDown size={16} color={SUB} />
            </TouchableOpacity>
          )}

          {/* Group picker button */}
          {participantMode === "group" && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setGroupPickerVisible(true)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: selectedGroup ? BLUE : BORDER }}
            >
              {selectedGroup ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: selectedGroup.emojiColor, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 16 }}>{selectedGroup.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{selectedGroup.name}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>
                      {selectedStudents.length} {tp(selectedStudents.length, "student")}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Users size={18} color={SUB} />
                  <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: SUB }}>{t("addLessonPickGroup")}</Text>
                </View>
              )}
              <ChevronDown size={16} color={SUB} />
            </TouchableOpacity>
          )}

          {/* Show student names when group is selected */}
          {participantMode === "group" && selectedGroup && selectedStudents.length > 0 && (
            <View style={{ marginTop: 8, backgroundColor: INDIGO_50, borderRadius: 12, padding: 12, gap: 6 }}>
              {selectedStudents.map((s) => (
                <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: INDIGO }} />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#3C3C43" }}>{tName(s.name)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Notes ── */}
          <SectionLabel>{t("addLessonNotes")}</SectionLabel>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t("addLessonNotesHint")}
            placeholderTextColor="#C7C7CC"
            multiline
            numberOfLines={3}
            style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT, minHeight: 80, textAlignVertical: "top", borderWidth: 1.5, borderColor: BORDER }}
          />

          {/* ── Homework ── */}
          <SectionLabel>{t("addLessonHW")}</SectionLabel>
          <TextInput
            value={homework}
            onChangeText={setHomework}
            placeholder={t("addLessonHWHint")}
            placeholderTextColor="#C7C7CC"
            multiline
            numberOfLines={3}
            style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT, minHeight: 80, textAlignVertical: "top", borderWidth: 1.5, borderColor: BORDER }}
          />
        </View>

        {/* Student picker modal */}
        <StudentPickerModal
          visible={pickerVisible}
          selected={selectedStudents}
          onClose={() => setPickerVisible(false)}
          onConfirm={(list) => { setSelectedStudents(list); setPickerVisible(false); }}
        />

        {/* Group picker modal */}
        <GroupPickerModal
          visible={groupPickerVisible}
          onClose={() => setGroupPickerVisible(false)}
          onSelect={handleGroupSelect}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
