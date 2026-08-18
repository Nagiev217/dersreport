import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  CalendarDays,
  Clock,
  Users,
  GraduationCap,
} from "lucide-react-native";
import { useLessonsStore } from "@/utils/lessons/store";
import { useScheduleStore, DAYS_SHORT, DAYS_FULL } from "@/utils/schedule/store";
import CreateScheduleModal from "@/components/CreateScheduleModal";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";
import { auth } from "@/utils/firebase/config";
import { loadStore } from "@/utils/firebase/firestore";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const padN = (n) => String(n).padStart(2, "0");

function toDateStr(d) {
  return `${d.getFullYear()}-${padN(d.getMonth() + 1)}-${padN(d.getDate())}`;
}

function todayDateStr() {
  return toDateStr(new Date());
}

function getCalendarDays(year, month) {
  // Week starts Monday; convert JS getDay() (0=Sun) → mondayBased (0=Mon, 6=Sun)
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), currentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month, d), currentMonth: true });
  }
  while (days.length < 42) {
    const last = days[days.length - 1].date;
    days.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      currentMonth: false,
    });
  }
  return days;
}

// MONTHS_RU, MONTHS_GEN, WEEK_LABELS come from i18n

const SUBJECT_COLOR = {
  IELTS: INDIGO,
  SAT: BLUE,
  General: GREEN,
  Английский: AMBER,
};
const SUBJECT_BG = {
  IELTS: INDIGO_50,
  SAT: BLUE_50,
  General: "#ECFDF5",
  Английский: "#FFFBEB",
};

// STATUS_CFG and FREQ_LABEL built inside component (need t())

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ScheduleTab() {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const router = useRouter();
  const { t, tSubject, tName, tNameList, months, days } = useT();

  const { lessons, deleteByScheduleId } = useLessonsStore();
  const { schedules, deleteSchedule } = useScheduleStore();

  // schedules/lessons only sync from Firestore once, on login (see
  // _layout.jsx's useFirebaseSync) — there's no live listener for them like
  // reports has. An Admin can write a schedule for this teacher remotely
  // (adminCreateTeacherSchedule etc., functions/index.js), so without a way
  // to manually refetch, the teacher would only see it after a full app
  // restart or re-login. Pull-to-refresh closes that gap.
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    const uid = auth?.currentUser?.uid;
    if (!uid) return;
    setRefreshing(true);
    try {
      const [remoteSchedules, remoteLessons] = await Promise.all([
        loadStore(uid, "schedules"),
        loadStore(uid, "lessons"),
      ]);
      if (remoteSchedules !== null) useScheduleStore.setState({ schedules: remoteSchedules });
      if (remoteLessons !== null) useLessonsStore.setState({ lessons: remoteLessons });
    } finally {
      setRefreshing(false);
    }
  };

  const MONTHS_RU = months(false);
  const WEEK_LABELS = days();

  const STATUS_CFG = {
    planned:   { bg: INDIGO_50,    text: INDIGO, label: t("statusPlanned") },
    completed: { bg: "#ECFDF5",    text: GREEN,  label: t("statusCompleted") },
    cancelled: { bg: "#FEF2F2",    text: "#EF4444", label: t("statusCancelled") },
  };

  const FREQ_LABEL = {
    weekly:   t("scheduleWeekly"),
    biweekly: t("scheduleBiweekly"),
    monthly:  t("scheduleMonthly"),
  };

  const todayStr = todayDateStr();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // Calendar days for current month (42 cells)
  const calendarDays = useMemo(
    () => getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  // Map date string → lessons[]
  const lessonsByDate = useMemo(() => {
    const map = {};
    for (const l of lessons) {
      (map[l.date] = map[l.date] ?? []).push(l);
    }
    return map;
  }, [lessons]);

  // Lessons for the selected day, sorted by time
  const selectedDayLessons = useMemo(
    () =>
      (lessonsByDate[selectedDate] ?? [])
        .slice()
        .sort((a, b) => a.time.localeCompare(b.time)),
    [lessonsByDate, selectedDate]
  );

  const cellW = Math.floor((screenW - 32) / 7);

  const prevMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handleDeleteSchedule = (schedule) => {
    Alert.alert(
      t("scheduleTitle"),
      `${tSubject(schedule.subject)} — ${tNameList(schedule.studentNames)}`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            deleteByScheduleId(schedule.id);
            deleteSchedule(schedule.id);
          },
        },
      ]
    );
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingSchedule(null);
  };

  // Selected date label: "15 июня, воскресенье"
  const [sy, sm, sd] = selectedDate.split("-").map(Number);
  const selDow = new Date(sy, sm - 1, sd).getDay();
  const selDateLabel = `${sd} ${months(false)[sm - 1]}, ${DAYS_FULL[selDow].toLowerCase()}`;

  return (
    <>
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        {/* Fills the top overscroll/bounce gap with the hero color instead of white */}
        <View pointerEvents="none" style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: BLUE_50 }} />
        {/* ── SECTION 1 — Hero (gradient blue-50 → indigo-50 → white) ── */}
        <LinearGradient
          colors={[BLUE_50, INDIGO_50, "#FFFFFF"]}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 20 }}
        >
          {/* logo row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}>
              <GraduationCap size={18} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3, lineHeight: 19 }}>Jeff</Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB, letterSpacing: 0.3 }}>Colleges</Text>
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.5 }}>
              {t("scheduleTitle")}
            </Text>
            <PressableScale
              onPress={() => setShowModal(true)}
              scaleTo={0.9}
              accessibilityRole="button"
              accessibilityLabel={t("scheduleCreateBtn")}
              style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}
            >
              <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            </PressableScale>
          </Animated.View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        >
          {/* ── Calendar card ── */}
          <Animated.View entering={FadeInDown.duration(320)} style={{ marginHorizontal: 16, marginTop: 18 }}>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: BORDER }}>
              {/* Month navigation */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <PressableScale onPress={prevMonth} scaleTo={0.85} accessibilityLabel="−1" style={{ padding: 4 }}>
                  <ChevronLeft size={22} color={BLUE} />
                </PressableScale>
                <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>
                  {MONTHS_RU[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>
                <PressableScale onPress={nextMonth} scaleTo={0.85} accessibilityLabel="+1" style={{ padding: 4 }}>
                  <ChevronRight size={22} color={BLUE} />
                </PressableScale>
              </View>

              {/* Weekday headers */}
              <View style={{ flexDirection: "row", marginBottom: 6 }}>
                {WEEK_LABELS.map((label, i) => (
                  <View key={i} style={{ width: cellW, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: i >= 5 ? "#EF4444" : SUB }}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Grid */}
              {Array.from({ length: 6 }, (_, row) => (
                <View key={row} style={{ flexDirection: "row" }}>
                  {Array.from({ length: 7 }, (_, col) => {
                    const day = calendarDays[row * 7 + col];
                    const ds = toDateStr(day.date);
                    const dayLessons = lessonsByDate[ds] ?? [];
                    const isToday = ds === todayStr;
                    const isSelected = ds === selectedDate;
                    const isWknd = col >= 5;

                    return (
                      <TouchableOpacity
                        key={col}
                        onPress={() => setSelectedDate(ds)}
                        style={{ width: cellW, alignItems: "center", paddingVertical: 4 }}
                      >
                        <View
                          style={{
                            width: 32, height: 32, borderRadius: 16,
                            backgroundColor: isToday ? BLUE : isSelected ? INDIGO_50 : "transparent",
                            borderWidth: isSelected && !isToday ? 1.5 : 0,
                            borderColor: BLUE,
                            alignItems: "center", justifyContent: "center",
                            marginBottom: 3,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontFamily: isToday || isSelected ? "Inter_700Bold" : "Inter_400Regular",
                              color: isToday ? "#FFFFFF" : !day.currentMonth ? "#C7C7CC" : isWknd ? "#EF4444" : TEXT,
                            }}
                          >
                            {day.date.getDate()}
                          </Text>
                        </View>

                        {dayLessons.length > 0 && (
                          <View style={{ flexDirection: "row", gap: 2 }}>
                            {dayLessons.slice(0, 3).map((l, i) => (
                              <View
                                key={i}
                                style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: SUBJECT_COLOR[l.subject] ?? SUB }}
                              />
                            ))}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ── Selected day lessons ── */}
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>
                {selDateLabel}
              </Text>
              {selectedDayLessons.length === 0 && (
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>
                  {t("scheduleNoLessons")}
                </Text>
              )}
            </View>

            {selectedDayLessons.map((lesson, i) => {
              const sc = STATUS_CFG[lesson.status] ?? STATUS_CFG.planned;
              return (
                <Animated.View key={lesson.id} entering={FadeInDown.delay(i * 30).duration(280)}>
                  <PressableScale
                    onPress={() => router.push(`/lesson/${lesson.id}`)}
                    scaleTo={0.985}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      borderWidth: 1,
                      borderColor: BORDER,
                    }}
                  >
                    {/* Time column */}
                    <View style={{ alignItems: "center", width: 46 }}>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: BLUE }}>
                        {lesson.time}
                      </Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>
                        {lesson.duration}м
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                        {tSubject(lesson.subject)}
                      </Text>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>
                        {tNameList(lesson.studentNames)} · {lesson.format === "Офлайн" ? t("offline") : t("online")}
                      </Text>
                    </View>

                    {/* Status badge */}
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: sc.bg }}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: sc.text }}>
                        {sc.label}
                      </Text>
                    </View>
                  </PressableScale>
                </Animated.View>
              );
            })}
          </View>

          {/* ── Schedule templates ── */}
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>
                {t("scheduleMy")}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: SUB }}>
                {schedules.length}
              </Text>
            </View>

            {schedules.length === 0 && (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 32, alignItems: "center", borderWidth: 1, borderColor: BORDER }}>
                <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <CalendarDays size={32} color={BLUE} />
                </View>
                <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, textAlign: "center" }}>
                  {t("scheduleEmptyTitle")}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginTop: 6, textAlign: "center", lineHeight: 20 }}>
                  {t("scheduleEmptyHint")}
                </Text>
                <PressableScale onPress={() => setShowModal(true)} scaleTo={0.96} style={{ marginTop: 20, borderRadius: 12, overflow: "hidden" }}>
                  <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                      {t("scheduleCreateBtn")}
                    </Text>
                  </LinearGradient>
                </PressableScale>
              </View>
            )}

            {schedules.map((schedule, i) => {
              const upcomingCount = lessons.filter(
                (l) => l.scheduleId === schedule.id && l.date >= todayStr
              ).length;
              const subColor = SUBJECT_COLOR[schedule.subject] ?? BLUE;
              const subBg = SUBJECT_BG[schedule.subject] ?? BLUE_50;

              return (
                <Animated.View key={schedule.id} entering={FadeInDown.delay(i * 40).duration(300)}>
                  <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER }}>
                    {/* Row 1: tags + actions */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: subBg }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: subColor }}>
                            {tSubject(schedule.subject)}
                          </Text>
                        </View>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "#F1F5F9" }}>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#3C3C43" }}>
                            {FREQ_LABEL[schedule.frequency] ?? t("scheduleWeekly")}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <PressableScale
                          onPress={() => handleEdit(schedule)}
                          scaleTo={0.9}
                          accessibilityRole="button"
                          accessibilityLabel={t("save")}
                          style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center" }}
                        >
                          <Pencil size={14} color={BLUE} />
                        </PressableScale>
                        <PressableScale
                          onPress={() => handleDeleteSchedule(schedule)}
                          scaleTo={0.9}
                          accessibilityRole="button"
                          accessibilityLabel={t("delete")}
                          style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}
                        >
                          <Trash2 size={14} color="#EF4444" />
                        </PressableScale>
                      </View>
                    </View>

                    {/* Row 2: students */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <Users size={14} color={SUB} />
                      <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: TEXT, flex: 1 }} numberOfLines={1}>
                        {tNameList(schedule.studentNames)}
                      </Text>
                    </View>

                    {/* Row 3: day/time/duration + upcoming count */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", gap: 14 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <CalendarDays size={13} color={SUB} />
                          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>
                            {DAYS_SHORT[schedule.dayOfWeek]}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Clock size={13} color={SUB} />
                          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>
                            {schedule.time} · {schedule.duration} {t("min_abbr")}
                          </Text>
                        </View>
                      </View>

                      {upcomingCount > 0 && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: BLUE_50 }}>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: BLUE }}>
                            {upcomingCount} {t("scheduleUpcoming")}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <CreateScheduleModal
        visible={showModal}
        onClose={handleModalClose}
        editSchedule={editingSchedule}
      />
    </>
  );
}
