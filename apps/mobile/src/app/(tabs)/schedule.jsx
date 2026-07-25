import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  CalendarDays,
  Clock,
  Users,
} from "lucide-react-native";
import { useLessonsStore } from "@/utils/lessons/store";
import { useScheduleStore, DAYS_SHORT, DAYS_FULL } from "@/utils/schedule/store";
import CreateScheduleModal from "@/components/CreateScheduleModal";
import { useT } from "@/utils/i18n";

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
  IELTS: "#6B5CF6",
  SAT: "#3B82F6",
  General: "#10B981",
  Английский: "#F59E0B",
};
const SUBJECT_BG = {
  IELTS: "#EEF0FF",
  SAT: "#EFF6FF",
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

  const MONTHS_RU = months(false);
  const WEEK_LABELS = days();

  const STATUS_CFG = {
    planned:   { bg: "#EEF0FF", text: "#6B5CF6",  label: t("statusPlanned") },
    completed: { bg: "#ECFDF5", text: "#10B981",  label: t("statusCompleted") },
    cancelled: { bg: "#FEF2F2", text: "#EF4444",  label: t("statusCancelled") },
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
      <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
        {/* Header */}
        <LinearGradient
          colors={["#6B5CF6", "#8B6CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}
            >
              {t("scheduleTitle")}
            </Text>
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.25)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Calendar card ── */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              marginHorizontal: 16,
              marginTop: 16,
              borderRadius: 20,
              padding: 16,
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            }}
          >
            {/* Month navigation */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <TouchableOpacity onPress={prevMonth} style={{ padding: 4 }}>
                <ChevronLeft size={22} color="#6B5CF6" />
              </TouchableOpacity>
              <Text
                style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}
              >
                {MONTHS_RU[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={{ padding: 4 }}>
                <ChevronRight size={22} color="#6B5CF6" />
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              {WEEK_LABELS.map((label, i) => (
                <View key={i} style={{ width: cellW, alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_600SemiBold",
                      color: i >= 5 ? "#EF4444" : "#8E8E93",
                    }}
                  >
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
                      style={{
                        width: cellW,
                        alignItems: "center",
                        paddingVertical: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: isToday
                            ? "#6B5CF6"
                            : isSelected
                            ? "#EEF0FF"
                            : "transparent",
                          borderWidth: isSelected && !isToday ? 1.5 : 0,
                          borderColor: "#6B5CF6",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: 3,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontFamily:
                              isToday || isSelected
                                ? "Inter_700Bold"
                                : "Inter_400Regular",
                            color: isToday
                              ? "#FFFFFF"
                              : !day.currentMonth
                              ? "#C7C7CC"
                              : isWknd
                              ? "#EF4444"
                              : "#1C1C1E",
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
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 2.5,
                                backgroundColor:
                                  SUBJECT_COLOR[l.subject] ?? "#8E8E93",
                              }}
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

          {/* ── Selected day lessons ── */}
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text
                style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}
              >
                {selDateLabel}
              </Text>
              {selectedDayLessons.length === 0 && (
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: "#8E8E93",
                  }}
                >
                  {t("scheduleNoLessons")}
                </Text>
              )}
            </View>

            {selectedDayLessons.map((lesson) => {
              const sc = STATUS_CFG[lesson.status] ?? STATUS_CFG.planned;
              return (
                <TouchableOpacity
                  key={lesson.id}
                  onPress={() => router.push(`/lesson/${lesson.id}`)}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    shadowColor: "#000",
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                  }}
                >
                  {/* Time column */}
                  <View style={{ alignItems: "center", width: 46 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontFamily: "Inter_700Bold",
                        color: "#6B5CF6",
                      }}
                    >
                      {lesson.time}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter_400Regular",
                        color: "#8E8E93",
                        marginTop: 1,
                      }}
                    >
                      {lesson.duration}м
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontFamily: "Inter_600SemiBold",
                        color: "#1C1C1E",
                      }}
                    >
                      {tSubject(lesson.subject)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "Inter_400Regular",
                        color: "#8E8E93",
                        marginTop: 2,
                      }}
                    >
                      {tNameList(lesson.studentNames)} · {lesson.format === "Офлайн" ? t("offline") : t("online")}
                    </Text>
                  </View>

                  {/* Status badge */}
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: sc.bg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Inter_600SemiBold",
                        color: sc.text,
                      }}
                    >
                      {sc.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Schedule templates ── */}
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text
                style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}
              >
                {t("scheduleMy")}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_500Medium",
                  color: "#8E8E93",
                }}
              >
                {schedules.length}
              </Text>
            </View>

            {schedules.length === 0 && (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  padding: 32,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <CalendarDays size={44} color="#C7C7CC" />
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Inter_700Bold",
                    color: "#8E8E93",
                    marginTop: 14,
                    textAlign: "center",
                  }}
                >
                  {t("scheduleEmptyTitle")}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Inter_400Regular",
                    color: "#C7C7CC",
                    marginTop: 6,
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  {t("scheduleEmptyHint")}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowModal(true)}
                  style={{
                    marginTop: 20,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    backgroundColor: "#6B5CF6",
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                    }}
                  >
                    {t("scheduleCreateBtn")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {schedules.map((schedule) => {
              const upcomingCount = lessons.filter(
                (l) => l.scheduleId === schedule.id && l.date >= todayStr
              ).length;
              const subColor = SUBJECT_COLOR[schedule.subject] ?? "#6B5CF6";
              const subBg = SUBJECT_BG[schedule.subject] ?? "#EEF0FF";

              return (
                <View
                  key={schedule.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 3,
                  }}
                >
                  {/* Row 1: tags + actions */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                          backgroundColor: subBg,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontFamily: "Inter_700Bold",
                            color: subColor,
                          }}
                        >
                          {tSubject(schedule.subject)}
                        </Text>
                      </View>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          backgroundColor: "#F2F2F7",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_500Medium",
                            color: "#3C3C43",
                          }}
                        >
                          {FREQ_LABEL[schedule.frequency] ?? t("scheduleWeekly")}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleEdit(schedule)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: "#EEF0FF",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Pencil size={14} color="#6B5CF6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteSchedule(schedule)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: "#FEF2F2",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Row 2: students */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    <Users size={14} color="#8E8E93" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Inter_500Medium",
                        color: "#1C1C1E",
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {tNameList(schedule.studentNames)}
                    </Text>
                  </View>

                  {/* Row 3: day/time/duration + upcoming count */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flexDirection: "row", gap: 14 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <CalendarDays size={13} color="#8E8E93" />
                        <Text
                          style={{
                            fontSize: 13,
                            fontFamily: "Inter_400Regular",
                            color: "#8E8E93",
                          }}
                        >
                          {DAYS_SHORT[schedule.dayOfWeek]}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Clock size={13} color="#8E8E93" />
                        <Text
                          style={{
                            fontSize: 13,
                            fontFamily: "Inter_400Regular",
                            color: "#8E8E93",
                          }}
                        >
                          {schedule.time} · {schedule.duration} {t("min_abbr")}
                        </Text>
                      </View>
                    </View>

                    {upcomingCount > 0 && (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                          backgroundColor: "#EEF0FF",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "Inter_600SemiBold",
                            color: "#6B5CF6",
                          }}
                        >
                          {upcomingCount} {t("scheduleUpcoming")}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
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
