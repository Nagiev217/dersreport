import { useEffect, useMemo, useState } from "react";
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
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, CalendarDays, Clock, Repeat, Check } from "lucide-react-native";
import {
  adminCreateTeacherSchedule,
  adminUpdateTeacherSchedule,
} from "@/utils/firebase/adminAccounts";
import { getTimeSlots } from "@/utils/dateUtils";
import { useT } from "@/utils/i18n";

const TIME_SLOTS = getTimeSlots(6, 22);

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

// ─── Design tokens — Blue + Indigo + White, matching the Boss/Admin UI ──────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT   = "#111827";
const SUB    = "#8E93A1";
const BORDER = "#E5E9F2";

const SUBJECTS = ["IELTS", "SAT", "General", "Английский"];
const DURATION_PRESETS = [30, 45, 60, 90, 120];
const COUNT_PRESETS = [4, 8, 12, 24, 52];

function SectionLabel({ children }) {
  return (
    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 10 }}>
      {children}
    </Text>
  );
}

function Chip({ label, selected, onPress, small }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: small ? 8 : 10,
        borderRadius: 10,
        backgroundColor: selected ? INDIGO : "#F1F5F9",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: small ? 11 : 13, fontFamily: selected ? "Inter_700Bold" : "Inter_400Regular", color: selected ? "#FFFFFF" : SUB }}>
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

// Admin-only variant of CreateScheduleModal.jsx: instead of writing straight
// to local zustand stores, it calls the adminCreateTeacherSchedule /
// adminUpdateTeacherSchedule Cloud Functions for a specific teacherUid — that
// teacher's own device picks the change up on next login (same one-shot
// whole-array sync every other store uses). `students` comes from the
// caller (already fetched via getManagedTeacherStores), not useStudentsStore,
// since this is another teacher's roster.
//
// Create mode supports picking MULTIPLE weekdays at once (e.g. Mon/Wed/Fri in
// one submission) — the teacher's own modal only supports one day per save;
// this is a deliberate admin-side upgrade, not backported there.
export default function AdminScheduleModal({ visible, onClose, onSaved, teacherUid, students, lessons, editSchedule }) {
  const insets = useSafeAreaInsets();
  const { t, days, tName } = useT();

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
    { value: "odd",      label: t("scheduleOddDays") },
    { value: "even",     label: t("scheduleEvenDays") },
  ];
  const SUBJECT_LABELS = { "Английский": t("addLessonSubjectEnglish") };

  const isEdit = Boolean(editSchedule);

  const [studentIds, setStudentIds] = useState([]);
  const [subject, setSubject] = useState("IELTS");
  const [daysOfWeek, setDaysOfWeek] = useState([]); // create mode: multi-select
  const [dayOfWeek, setDayOfWeek] = useState(null);  // edit mode: single-select
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
      setDaysOfWeek([]);
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
      setDaysOfWeek([]);
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
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleDay = (value) =>
    setDaysOfWeek((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));

  const isParity = frequency === "odd" || frequency === "even";
  const hasDaySelection = isParity || (isEdit ? dayOfWeek !== null : daysOfWeek.length > 0);

  // Days this schedule would actually land on, for the busy-slot check below.
  // Parity (odd/even) schedules cycle through every weekday over time, so we
  // conservatively check against all 7 rather than pick one.
  const relevantDaysKey = isParity ? "0,1,2,3,4,5,6" : isEdit ? (dayOfWeek !== null ? String(dayOfWeek) : "") : daysOfWeek.join(",");
  const relevantDays = relevantDaysKey === "" ? [] : relevantDaysKey.split(",").map(Number);

  // Existing (non-cancelled, upcoming) lessons that fall on one of the
  // relevant weekdays — this is what makes a time slot "busy". Excludes
  // lessons that belong to the schedule currently being edited, so editing
  // a schedule doesn't flag itself as a conflict.
  const busyLessons = useMemo(() => {
    const today = todayStr();
    return (lessons ?? []).filter((l) => {
      if (l.status === "cancelled") return false;
      if (l.date < today) return false;
      if (isEdit && l.scheduleId === editSchedule?.id) return false;
      const day = new Date(l.date + "T12:00:00").getDay();
      return relevantDays.includes(day);
    });
  }, [lessons, relevantDaysKey, isEdit, editSchedule?.id]);

  const isSlotBusy = (slot) => {
    if (relevantDays.length === 0) return false;
    const slotStart = timeToMinutes(slot);
    const slotEnd = slotStart + duration;
    return busyLessons.some((l) => {
      const lStart = timeToMinutes(l.time);
      const lEnd = lStart + (l.duration ?? 60);
      return slotStart < lEnd && slotEnd > lStart;
    });
  };

  // If a day/duration change makes the currently picked time newly busy,
  // drop the selection instead of silently leaving an invalid time chosen.
  useEffect(() => {
    if (time && isSlotBusy(time)) setTime("");
  }, [relevantDaysKey, duration]);

  const estimatedCount = () => {
    if (endMode === "count") return lessonsCount;
    if (!startDate || !endDate) return 0;
    const freqDays = isParity ? 2 : frequency === "weekly" ? 7 : frequency === "biweekly" ? 14 : 28;
    const ms = new Date(endDate + "T12:00:00").getTime() - new Date(startDate + "T12:00:00").getTime();
    return ms <= 0 ? 0 : Math.floor(ms / (freqDays * 86400000)) + 1;
  };

  const canSave =
    studentIds.length > 0 &&
    hasDaySelection &&
    /^\d{2}:\d{2}$/.test(time) &&
    /^\d{4}-\d{2}-\d{2}$/.test(startDate);

  const buildPayload = (force) => {
    const selectedStudents = students.filter((s) => studentIds.includes(s.id));
    const base = {
      teacherUid,
      studentIds,
      studentNames: selectedStudents.map((s) => s.name),
      subject,
      time,
      duration,
      format,
      startDate,
      endDate: endMode === "date" ? endDate : null,
      lessonsCount: endMode === "count" ? lessonsCount : null,
      frequency,
      force,
    };
    return isEdit
      ? { ...base, scheduleId: editSchedule.id, dayOfWeek: isParity ? null : dayOfWeek }
      : { ...base, daysOfWeek: isParity ? [] : daysOfWeek };
  };

  const submit = async (force = false) => {
    setSaving(true);
    try {
      const payload = buildPayload(force);
      const result = isEdit
        ? await adminUpdateTeacherSchedule(payload)
        : await adminCreateTeacherSchedule(payload);

      if (result?.conflicts?.length) {
        Alert.alert(
          t("createSchedConflict"),
          t("createSchedConflictMsg", { n: result.conflicts.length }),
          [
            { text: t("cancel"), style: "cancel" },
            { text: t("createSchedCancelAnyway"), onPress: () => submit(true) },
          ]
        );
        return;
      }

      onSaved?.();
      onClose();
    } catch (e) {
      Alert.alert(t("error"), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const count = estimatedCount();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(17,24,39,0.45)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingBottom: insets.bottom + 16, paddingTop: 8, maxHeight: "94%" }}>
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER }} />
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}>
                    <Repeat size={18} color={INDIGO} />
                  </View>
                  <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT }}>
                    {isEdit ? t("editSchedTitle") : t("createSchedTitle")}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
                  <X size={16} color={SUB} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                          style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: sel ? INDIGO : "#F1F5F9" }}
                        >
                          <Text style={{ fontSize: 14, fontFamily: sel ? "Inter_600SemiBold" : "Inter_400Regular", color: sel ? "#FFFFFF" : TEXT }}>
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
                      <Chip key={sub} label={SUBJECT_LABELS[sub] ?? sub} selected={subject === sub} onPress={() => setSubject(sub)} small />
                    ))}
                  </View>
                </View>

                {/* Day(s) of week — hidden for parity (odd/even) schedules.
                    Create mode: multi-select checkboxes. Edit mode: single-select,
                    matching the underlying one-day-per-schedule data model. */}
                {!isParity && (
                  <View style={{ marginBottom: 20 }}>
                    <SectionLabel>{t("createSchedDay")}</SectionLabel>
                    <View style={{ flexDirection: "row", gap: 5 }}>
                      {WEEKDAY_BUTTONS.map(({ label, value }) => {
                        const sel = isEdit ? dayOfWeek === value : daysOfWeek.includes(value);
                        const isWknd = value === 0 || value === 6;
                        return (
                          <TouchableOpacity
                            key={value}
                            onPress={() => (isEdit ? setDayOfWeek(value) : toggleDay(value))}
                            style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: sel ? INDIGO : "#F1F5F9", alignItems: "center", gap: 3 }}
                          >
                            {!isEdit && sel && <Check size={10} color="#FFFFFF" />}
                            <Text style={{ fontSize: 13, fontFamily: sel ? "Inter_700Bold" : "Inter_500Medium", color: sel ? "#FFFFFF" : isWknd ? "#EF4444" : TEXT }}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Time — picked from a slot grid instead of typed, so a slot
                    where the teacher already has a lesson on the relevant
                    weekday(s) can't be selected at all. */}
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Clock size={13} color={SUB} />
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }}>{t("createSchedTime")}</Text>
                    {relevantDays.length > 0 && (
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>· {t("scheduleBusySlotsHint")}</Text>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {TIME_SLOTS.map((slot) => {
                      const busy = isSlotBusy(slot);
                      const selected = slot === time;
                      return (
                        <TouchableOpacity
                          key={slot}
                          disabled={busy}
                          onPress={() => setTime(slot)}
                          style={{
                            paddingHorizontal: 12, height: 38, borderRadius: 10,
                            backgroundColor: busy ? "#F1F5F9" : selected ? INDIGO : "#FFFFFF",
                            borderWidth: busy || selected ? 0 : 1.5,
                            borderColor: BORDER,
                            alignItems: "center", justifyContent: "center",
                            opacity: busy ? 0.5 : 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: selected ? "Inter_700Bold" : "Inter_400Regular",
                              color: busy ? "#C7C7CC" : selected ? "#FFFFFF" : TEXT,
                              textDecorationLine: busy ? "line-through" : "none",
                            }}
                          >
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Format */}
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel>{t("createSchedFormat")}</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[{ val: "Онлайн", label: t("online") }, { val: "Офлайн", label: t("offline") }].map(({ val, label }) => (
                      <TouchableOpacity
                        key={val}
                        onPress={() => setFormat(val)}
                        style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: format === val ? INDIGO : "#F1F5F9", alignItems: "center", justifyContent: "center" }}
                      >
                        <Text style={{ fontSize: 13, fontFamily: format === val ? "Inter_700Bold" : "Inter_400Regular", color: format === val ? "#FFFFFF" : SUB }}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Duration */}
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel>{t("createSchedDuration")}</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {DURATION_PRESETS.map((d) => (
                      <Chip key={d} label={`${d}${t("min_abbr")}`} selected={duration === d} onPress={() => setDuration(d)} small />
                    ))}
                  </View>
                </View>

                {/* Frequency */}
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel>{t("createSchedFreq")}</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {FREQ_OPTIONS.map(({ value, label }) => (
                      <Chip key={value} label={label} selected={frequency === value} onPress={() => setFrequency(value)} small />
                    ))}
                  </View>
                </View>

                {/* Start date */}
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel>{t("createSchedStart")}</SectionLabel>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 48, borderRadius: 12, backgroundColor: "#F1F5F9", paddingHorizontal: 12 }}>
                    <CalendarDays size={16} color={SUB} />
                    <TextInput
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder={t("addPayDateFmt")}
                      placeholderTextColor="#C7C7CC"
                      keyboardType="numeric"
                      maxLength={10}
                      style={{ flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT }}
                    />
                  </View>
                </View>

                {/* End condition */}
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel>{t("createSchedEnd")}</SectionLabel>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                    {[{ value: "count", label: t("createSchedByCount") }, { value: "date", label: t("createSchedByDate") }].map(({ value, label }) => (
                      <Chip key={value} label={label} selected={endMode === value} onPress={() => setEndMode(value)} />
                    ))}
                  </View>

                  {endMode === "count" ? (
                    <View>
                      <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                        {COUNT_PRESETS.map((n) => (
                          <Chip key={n} label={String(n)} selected={lessonsCount === n} onPress={() => setLessonsCount(n)} small />
                        ))}
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                        {t("createSchedLessonCount")}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 48, borderRadius: 12, backgroundColor: "#F1F5F9", paddingHorizontal: 12 }}>
                      <CalendarDays size={16} color={SUB} />
                      <TextInput
                        value={endDate}
                        onChangeText={setEndDate}
                        placeholder={t("addPayDateFmt")}
                        placeholderTextColor="#C7C7CC"
                        keyboardType="numeric"
                        maxLength={10}
                        style={{ flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT }}
                      />
                    </View>
                  )}
                </View>

                {/* Preview card */}
                {canSave && count > 0 && (
                  <View style={{ backgroundColor: INDIGO_50, borderRadius: 14, padding: 16, marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <CalendarDays size={22} color={INDIGO} />
                    <View>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: INDIGO }}>
                        {t("createSchedWillCreate", { n: isEdit ? count : count * Math.max(daysOfWeek.length, 1) })}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Save */}
                <TouchableOpacity
                  onPress={() => submit(false)}
                  disabled={!canSave || saving}
                  activeOpacity={0.85}
                  style={{ height: 52, borderRadius: 14, backgroundColor: canSave ? INDIGO : "#C7CBEF", alignItems: "center", justifyContent: "center", marginBottom: 8, flexDirection: "row", gap: 8 }}
                >
                  {saving && <ActivityIndicator color="#FFFFFF" size="small" />}
                  <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                    {saving ? t("createSchedCreating") : isEdit ? t("createSchedSaveBtn") : t("createSchedBtn")}
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
