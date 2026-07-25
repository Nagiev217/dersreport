import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { X, CalendarDays, Clock, Repeat } from "lucide-react-native";
import { useStudentsStore } from "@/utils/students/store";
import { useLessonsStore } from "@/utils/lessons/store";
import {
  useScheduleStore,
  generateLessonsForSchedule,
  findConflicts,
} from "@/utils/schedule/store";
import { useT } from "@/utils/i18n";

const SUBJECTS = ["IELTS", "SAT", "General", "Английский"];
const DURATION_PRESETS = [30, 45, 60, 90, 120];
const COUNT_PRESETS = [4, 8, 12, 24, 52];

async function scheduleNotifs(lessons, subject, studentNames, reminderTitles) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const now = Date.now();
    const upcoming = lessons
      .filter((l) => new Date(`${l.date}T${l.time}:00`).getTime() > now)
      .slice(0, 8);

    const body = `${subject} — ${studentNames.join(", ")}`;
    for (const lesson of upcoming) {
      const lt = new Date(`${lesson.date}T${lesson.time}:00`).getTime();
      const reminders = [
        [lt - 24 * 3600000, reminderTitles[0]],
        [lt - 3600000, reminderTitles[1]],
        [lt - 15 * 60000, reminderTitles[2]],
      ];
      for (const [triggerTime, title] of reminders) {
        if (triggerTime <= now) continue;
        await Notifications.scheduleNotificationAsync({
          content: { title, body, sound: true },
          trigger: { date: new Date(triggerTime) },
        });
      }
    }
  } catch (_) {}
}

function SectionLabel({ children }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontFamily: "Inter_600SemiBold",
        color: "#3C3C43",
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

function Chip({ label, selected, onPress, color, small }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: small ? 8 : 10,
        borderRadius: 10,
        backgroundColor: selected ? (color ?? "#6B5CF6") : "#F2F2F7",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: small ? 11 : 13,
          fontFamily: selected ? "Inter_700Bold" : "Inter_400Regular",
          color: selected ? "#FFFFFF" : "#8E8E93",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const pad = (n) => String(n).padStart(2, "0");
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CreateScheduleModal({ visible, onClose, editSchedule }) {
  const insets = useSafeAreaInsets();
  const { t, days, tName } = useT();
  const { students } = useStudentsStore();
  const { lessons, addLessons, deleteByScheduleId } = useLessonsStore();
  const { addSchedule, updateSchedule } = useScheduleStore();

  const daysArr = days();
  const WEEKDAY_BUTTONS = [
    { label: daysArr[0], value: 1 },
    { label: daysArr[1], value: 2 },
    { label: daysArr[2], value: 3 },
    { label: daysArr[3], value: 4 },
    { label: daysArr[4], value: 5 },
    { label: daysArr[5], value: 6 },
    { label: daysArr[6], value: 0 },
  ];
  const FREQ_OPTIONS = [
    { value: "weekly",   label: t("scheduleWeekly") },
    { value: "biweekly", label: t("scheduleBiweekly") },
    { value: "monthly",  label: t("scheduleMonthly") },
  ];
  const SUBJECT_LABELS = { "Английский": t("addLessonSubjectEnglish") };

  const isEdit = Boolean(editSchedule);

  const [studentIds, setStudentIds] = useState([]);
  const [subject, setSubject] = useState("IELTS");
  const [dayOfWeek, setDayOfWeek] = useState(null);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [format, setFormat] = useState("Онлайн");
  const [startDate, setStartDate] = useState(todayStr());
  const [endMode, setEndMode] = useState("count");
  const [endDate, setEndDate] = useState("");
  const [lessonsCount, setLessonsCount] = useState(12);
  const [frequency, setFrequency] = useState("weekly");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editSchedule) {
      setStudentIds(editSchedule.studentIds ?? []);
      setSubject(editSchedule.subject ?? "IELTS");
      setDayOfWeek(editSchedule.dayOfWeek ?? null);
      setTime(editSchedule.time ?? "");
      setDuration(editSchedule.duration ?? 60);
      setFormat(editSchedule.format ?? "Онлайн");
      setStartDate(editSchedule.startDate ?? todayStr());
      setEndMode(editSchedule.endDate ? "date" : "count");
      setEndDate(editSchedule.endDate ?? "");
      setLessonsCount(editSchedule.lessonsCount ?? 12);
      setFrequency(editSchedule.frequency ?? "weekly");
    } else {
      setStudentIds([]);
      setSubject("IELTS");
      setDayOfWeek(null);
      setTime("");
      setDuration(60);
      setFormat("Онлайн");
      setStartDate(todayStr());
      setEndMode("count");
      setEndDate("");
      setLessonsCount(12);
      setFrequency("weekly");
    }
  }, [visible, editSchedule]);

  const toggleStudent = (id) =>
    setStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const estimatedCount = () => {
    if (endMode === "count") return lessonsCount;
    if (!startDate || !endDate) return 0;
    const freqDays = frequency === "weekly" ? 7 : frequency === "biweekly" ? 14 : 28;
    const ms =
      new Date(endDate + "T12:00:00").getTime() -
      new Date(startDate + "T12:00:00").getTime();
    return ms <= 0 ? 0 : Math.floor(ms / (freqDays * 86400000)) + 1;
  };

  const canSave =
    studentIds.length > 0 &&
    dayOfWeek !== null &&
    /^\d{2}:\d{2}$/.test(time) &&
    /^\d{4}-\d{2}-\d{2}$/.test(startDate);

  const doSave = async (scheduleData, newLessons) => {
    setSaving(true);
    try {
      if (isEdit) {
        deleteByScheduleId(editSchedule.id);
        updateSchedule(editSchedule.id, scheduleData);
      } else {
        addSchedule(scheduleData);
      }
      addLessons(newLessons);
      await scheduleNotifs(newLessons, scheduleData.subject, scheduleData.studentNames, [
        t("createSchedReminderDay"),
        t("createSchedReminderHour"),
        t("createSchedReminderMin"),
      ]);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!canSave || saving) return;

    const selectedStudents = students.filter((s) => studentIds.includes(s.id));
    const scheduleData = {
      id: editSchedule?.id ?? `sch-${Date.now()}`,
      studentIds,
      studentNames: selectedStudents.map((s) => s.name),
      subject,
      dayOfWeek,
      time,
      duration,
      format,
      startDate,
      endDate: endMode === "date" ? endDate : null,
      lessonsCount: endMode === "count" ? lessonsCount : null,
      frequency,
      createdAt: editSchedule?.createdAt ?? Date.now(),
    };

    const newLessons = generateLessonsForSchedule(scheduleData);
    const existingForConflict = lessons.filter(
      (l) => !isEdit || l.scheduleId !== editSchedule.id
    );
    const conflicts = findConflicts(newLessons, existingForConflict);

    if (conflicts.length > 0) {
      Alert.alert(
        t("createSchedConflict"),
        t("createSchedConflictMsg", { n: conflicts.length }),
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("createSchedCancelAnyway"), onPress: () => doSave(scheduleData, newLessons) },
        ]
      );
    } else {
      await doSave(scheduleData, newLessons);
    }
  };

  const count = estimatedCount();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 26,
                borderTopRightRadius: 26,
                paddingHorizontal: 20,
                paddingBottom: insets.bottom + 16,
                paddingTop: 8,
                maxHeight: "94%",
              }}
            >
              {/* Handle */}
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
              </View>

              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: "#EEF0FF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Repeat size={18} color="#6B5CF6" />
                  </View>
                  <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
                    {isEdit ? t("editSchedTitle") : t("createSchedTitle")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#F2F2F7",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={16} color="#3C3C43" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Students */}
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel>{t("createSchedStudents")}</SectionLabel>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {students.map((s) => {
                      const sel = studentIds.includes(s.id);
                      return (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => toggleStudent(s.id)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 9,
                            borderRadius: 10,
                            backgroundColor: sel ? "#6B5CF6" : "#F2F2F7",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontFamily: sel ? "Inter_600SemiBold" : "Inter_400Regular",
                              color: sel ? "#FFFFFF" : "#3C3C43",
                            }}
                          >
                            {tName(s.name)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Subject */}
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel>{t("createSchedSubject")}</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {SUBJECTS.map((sub) => (
                      <Chip
                        key={sub}
                        label={SUBJECT_LABELS[sub] ?? sub}
                        selected={subject === sub}
                        onPress={() => setSubject(sub)}
                        small
                      />
                    ))}
                  </View>
                </View>

                {/* Day of week */}
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel>{t("createSchedDay")}</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 5 }}>
                    {WEEKDAY_BUTTONS.map(({ label, value }) => {
                      const sel = dayOfWeek === value;
                      const isWknd = value === 0 || value === 6;
                      return (
                        <TouchableOpacity
                          key={value}
                          onPress={() => setDayOfWeek(value)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: sel ? "#6B5CF6" : "#F2F2F7",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: sel ? "Inter_700Bold" : "Inter_500Medium",
                              color: sel ? "#FFFFFF" : isWknd ? "#EF4444" : "#3C3C43",
                            }}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Time + Format row */}
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                  <View style={{ flex: 1 }}>
                    <SectionLabel>{t("createSchedTime")}</SectionLabel>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: "#F2F2F7",
                        paddingHorizontal: 12,
                      }}
                    >
                      <Clock size={16} color="#8E8E93" />
                      <TextInput
                        value={time}
                        onChangeText={setTime}
                        placeholder="16:30"
                        placeholderTextColor="#C7C7CC"
                        keyboardType="numeric"
                        maxLength={5}
                        style={{
                          flex: 1,
                          fontSize: 16,
                          fontFamily: "Inter_600SemiBold",
                          color: "#1C1C1E",
                          letterSpacing: 1,
                        }}
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <SectionLabel>{t("createSchedFormat")}</SectionLabel>
                    <View style={{ flexDirection: "row", gap: 6, height: 48 }}>
                      {[
                        { val: "Онлайн", label: t("online") },
                        { val: "Офлайн", label: t("offline") },
                      ].map(({ val, label }) => (
                        <TouchableOpacity
                          key={val}
                          onPress={() => setFormat(val)}
                          style={{
                            flex: 1,
                            borderRadius: 12,
                            backgroundColor: format === val ? "#6B5CF6" : "#F2F2F7",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: format === val ? "Inter_700Bold" : "Inter_400Regular",
                              color: format === val ? "#FFFFFF" : "#8E8E93",
                            }}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Duration */}
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel>{t("createSchedDuration")}</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {DURATION_PRESETS.map((d) => (
                      <Chip
                        key={d}
                        label={`${d}${t("min_abbr")}`}
                        selected={duration === d}
                        onPress={() => setDuration(d)}
                        small
                      />
                    ))}
                  </View>
                </View>

                {/* Frequency */}
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel>{t("createSchedFreq")}</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {FREQ_OPTIONS.map(({ value, label }) => (
                      <Chip
                        key={value}
                        label={label}
                        selected={frequency === value}
                        onPress={() => setFrequency(value)}
                        small
                      />
                    ))}
                  </View>
                </View>

                {/* Start date */}
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel>{t("createSchedStart")}</SectionLabel>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: "#F2F2F7",
                      paddingHorizontal: 12,
                    }}
                  >
                    <CalendarDays size={16} color="#8E8E93" />
                    <TextInput
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder={t("addPayDateFmt")}
                      placeholderTextColor="#C7C7CC"
                      keyboardType="numeric"
                      maxLength={10}
                      style={{
                        flex: 1,
                        fontSize: 15,
                        fontFamily: "Inter_500Medium",
                        color: "#1C1C1E",
                      }}
                    />
                  </View>
                </View>

                {/* End condition */}
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel>{t("createSchedEnd")}</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                    {[
                      { value: "count", label: t("createSchedByCount") },
                      { value: "date", label: t("createSchedByDate") },
                    ].map(({ value, label }) => (
                      <Chip
                        key={value}
                        label={label}
                        selected={endMode === value}
                        onPress={() => setEndMode(value)}
                      />
                    ))}
                  </View>

                  {endMode === "count" ? (
                    <View>
                      <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                        {COUNT_PRESETS.map((n) => (
                          <Chip
                            key={n}
                            label={String(n)}
                            selected={lessonsCount === n}
                            onPress={() => setLessonsCount(n)}
                            small
                          />
                        ))}
                      </View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Inter_400Regular",
                          color: "#8E8E93",
                          textAlign: "center",
                        }}
                      >
                        {t("createSchedLessonCount")}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: "#F2F2F7",
                        paddingHorizontal: 12,
                      }}
                    >
                      <CalendarDays size={16} color="#8E8E93" />
                      <TextInput
                        value={endDate}
                        onChangeText={setEndDate}
                        placeholder={t("addPayDateFmt")}
                        placeholderTextColor="#C7C7CC"
                        keyboardType="numeric"
                        maxLength={10}
                        style={{
                          flex: 1,
                          fontSize: 15,
                          fontFamily: "Inter_500Medium",
                          color: "#1C1C1E",
                        }}
                      />
                    </View>
                  )}
                </View>

                {/* Preview card */}
                {canSave && count > 0 && (
                  <View
                    style={{
                      backgroundColor: "#EEF0FF",
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <CalendarDays size={22} color="#6B5CF6" />
                    <View>
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "Inter_500Medium",
                          color: "#6B5CF6",
                        }}
                      >
                        {t("createSchedWillCreate", { n: count })}
                      </Text>
                      {studentIds.length > 0 && (
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_400Regular",
                            color: "#8B6CF6",
                            marginTop: 2,
                          }}
                        >
                          {t("createSchedNotifHint")}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Save */}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!canSave || saving}
                  activeOpacity={0.85}
                  style={{
                    height: 52,
                    borderRadius: 14,
                    backgroundColor: canSave ? "#6B5CF6" : "#D1C9FF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                  >
                    {saving
                      ? t("createSchedCreating")
                      : isEdit
                      ? t("createSchedSaveBtn")
                      : t("createSchedBtn")}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
