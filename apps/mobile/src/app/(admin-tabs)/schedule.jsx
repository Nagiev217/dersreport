import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  BookOpen, Hash, Globe, GraduationCap, Clock, CalendarDays,
  ChevronRight, Plus, Users,
} from "lucide-react-native";
import { getOrgSchedule, clearAdminCache } from "@/utils/firebase/adminAccounts";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT   = "#111827";
const SUB    = "#8E93A1";
const BORDER = "#E5E9F2";
const GREEN  = "#22C55E";
const AMBER  = "#D97706";

const SUBJECT_CONFIG = {
  IELTS:      { Icon: BookOpen,      color: INDIGO, bg: INDIGO_50 },
  SAT:        { Icon: Hash,          color: BLUE,   bg: BLUE_50 },
  General:    { Icon: Globe,         color: GREEN,  bg: "#ECFDF5" },
  Английский: { Icon: GraduationCap, color: AMBER,  bg: "#FFFBEB" },
};
const DEFAULT_SUBJECT = { Icon: BookOpen, color: SUB, bg: "#F1F5F9" };

const STATUS_CFG = {
  planned:   { color: BLUE,  bg: BLUE_50 },
  completed: { color: GREEN, bg: "#ECFDF5" },
  cancelled: { color: "#EF4444", bg: "#FEF2F2" },
};

const AVATAR_COLORS = [BLUE, GREEN, AMBER, "#EF4444", "#06B6D4", INDIGO, "#EC4899", "#0EA5E9"];
function avatarBg(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}

const pad = (n) => String(n).padStart(2, "0");
function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function todayStr() {
  return toDateStr(new Date());
}
// Monday-first week containing `anchor`
function weekOf(anchor) {
  const dow = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
function addMinutes(time, minutes) {
  const [h, m] = (time ?? "00:00").split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  const mm = ((total % 60) + 60) % 60;
  return `${pad(hh)}:${pad(mm)}`;
}

export default function AdminSchedule() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tSubject, tNameList, days } = useT();

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [weekAnchor] = useState(new Date());
  const [selectedTeacher, setSelectedTeacher] = useState(null); // null = all teachers
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const weekDates = useMemo(() => weekOf(weekAnchor), [weekAnchor]);
  const daysShort = days(true);
  const today = todayStr();

  const load = useCallback(() => {
    return getOrgSchedule(selectedDate)
      .then((d) => setData(d))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [selectedDate]);

  // Only blank the list for a spinner when what's on screen doesn't answer the
  // question being asked — i.e. nothing loaded yet, or a different day. Coming
  // back to this tab used to blank it every time, which read as "slow" even
  // when the 60s cache was about to answer instantly.
  useFocusEffect(useCallback(() => {
    if (data?.date !== selectedDate) setLoading(true);
    load();
  }, [load, data?.date, selectedDate]));

  const onRefresh = () => { clearAdminCache(); setRefreshing(true); load(); };

  const teachers = data?.teachers ?? [];
  const events = data?.events ?? [];
  const visibleEvents = selectedTeacher
    ? events.filter((e) => e.teacherUid === selectedTeacher)
    : events;

  const selectedTeacherName = teachers.find((tc) => tc.teacherUid === selectedTeacher)?.teacherName;

  function openTeacherSchedule(teacherUid, teacherName, { create } = {}) {
    router.push({
      pathname: "/(admin-tabs)/teacher/schedule",
      params: create ? { uid: teacherUid, name: teacherName, create: "1" } : { uid: teacherUid, name: teacherName },
    });
  }

  function handleAdd() {
    if (selectedTeacher) {
      openTeacherSchedule(selectedTeacher, selectedTeacherName, { create: true });
    } else if (teachers.length === 1) {
      // Only one teacher in the org — no ambiguity, skip the picker prompt.
      openTeacherSchedule(teachers[0].teacherUid, teachers[0].teacherName, { create: true });
    } else {
      Alert.alert(t("adminScheduleTitle"), t("adminSchedulePickTeacherHint"));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
      >
        {/* Fills the top overscroll/bounce gap with the hero color instead of white */}
        <View pointerEvents="none" style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: BLUE_50 }} />
        {/* ── SECTION 1 — Hero (gradient blue-50 → indigo-50 → white) ── */}
        <LinearGradient
          colors={[BLUE_50, INDIGO_50, "#FFFFFF"]}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 18 }}
        >
          <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.5, marginBottom: 16 }}>
            {t("adminScheduleTitle")}
          </Text>

          {/* ── Teacher filter row ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
            <PressableScale
              onPress={() => setSelectedTeacher(null)}
              scaleTo={0.95}
              accessibilityRole="button"
              accessibilityLabel={t("adminScheduleAllTeachers")}
              accessibilityState={{ selected: selectedTeacher === null }}
              style={{
                alignItems: "center", gap: 6, width: 68, paddingVertical: 8, borderRadius: 16,
                backgroundColor: "#FFFFFF", borderWidth: selectedTeacher === null ? 1.5 : 1, borderColor: selectedTeacher === null ? BLUE : BORDER,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: selectedTeacher === null ? BLUE : "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
                <Users size={18} color={selectedTeacher === null ? "#FFFFFF" : SUB} />
              </View>
              <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: selectedTeacher === null ? "Inter_700Bold" : "Inter_500Medium", color: selectedTeacher === null ? BLUE : SUB, textAlign: "center" }}>
                {t("adminScheduleAllTeachers")}
              </Text>
            </PressableScale>

            {teachers.map((tc) => {
              const active = selectedTeacher === tc.teacherUid;
              return (
                <PressableScale
                  key={tc.teacherUid}
                  onPress={() => setSelectedTeacher(active ? null : tc.teacherUid)}
                  scaleTo={0.95}
                  accessibilityRole="button"
                  accessibilityLabel={tc.teacherName}
                  accessibilityState={{ selected: active }}
                  style={{
                    alignItems: "center", gap: 6, width: 68, paddingVertical: 8, borderRadius: 16,
                    backgroundColor: "#FFFFFF", borderWidth: active ? 1.5 : 1, borderColor: active ? BLUE : BORDER,
                  }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: avatarBg(tc.teacherName), alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" }}>{initials(tc.teacherName)}</Text>
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? BLUE : TEXT, textAlign: "center" }}>
                    {tc.teacherName}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>

          {/* ── Day strip ── */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: BORDER, paddingVertical: 12, paddingHorizontal: 4, marginTop: 14 }}>
            {weekDates.map((d) => {
              const ds = toDateStr(d);
              const selected = ds === selectedDate;
              return (
                <PressableScale
                  key={ds}
                  onPress={() => setSelectedDate(ds)}
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={ds}
                  accessibilityState={{ selected }}
                  style={{ alignItems: "center", width: 34 }}
                >
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: SUB, marginBottom: 8 }}>
                    {daysShort[(d.getDay() + 6) % 7]}
                  </Text>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: selected ? BLUE : "transparent", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: selected ? "#FFFFFF" : TEXT }}>
                      {d.getDate()}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </LinearGradient>

        {/* ── SECTION 2 — Lesson list (white) ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {loading ? (
            <ActivityIndicator color={BLUE} style={{ marginTop: 40 }} />
          ) : visibleEvents.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 40, paddingHorizontal: 24 }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <CalendarDays size={32} color={BLUE} />
              </View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 6, textAlign: "center" }}>
                {t("adminScheduleEmptyTitle")}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", lineHeight: 19 }}>
                {t("adminScheduleEmptyHint")}
              </Text>
            </View>
          ) : (
            visibleEvents.map((ev) => {
              const cfg = SUBJECT_CONFIG[ev.subject] ?? DEFAULT_SUBJECT;
              const Icon = cfg.Icon;
              const statusCfg = STATUS_CFG[ev.status] ?? STATUS_CFG.planned;
              const statusLabel =
                ev.status === "completed" ? t("statusCompleted")
                : ev.status === "cancelled" ? t("statusCancelled")
                : t("statusPlanned");
              const names = Array.isArray(ev.studentNames) && ev.studentNames.length
                ? tNameList(ev.studentNames)
                : ev.groupName ?? "";

              return (
                <TouchableOpacity
                  key={`${ev.teacherUid}:${ev.id}`}
                  activeOpacity={0.8}
                  onPress={() => openTeacherSchedule(ev.teacherUid, ev.teacherName)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10 }}
                >
                  {/* Time */}
                  <View style={{ width: 52 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT }}>{ev.time}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>
                      – {addMinutes(ev.time, ev.duration ?? 60)}
                    </Text>
                  </View>

                  {/* Subject icon */}
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center" }}>
                    <Icon size={18} color={cfg.color} />
                  </View>

                  {/* Subject + topic */}
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14.5, fontFamily: "Inter_700Bold", color: TEXT }}>
                      {tSubject(ev.subject)}
                    </Text>
                    <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>
                      {ev.topic || names || "—"}
                    </Text>
                  </View>

                  {/* Teacher + class, status */}
                  <View style={{ alignItems: "flex-end", gap: 6, maxWidth: 120 }}>
                    <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                      {ev.teacherName}
                    </Text>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: statusCfg.bg }}>
                      <Text style={{ fontSize: 10.5, fontFamily: "Inter_600SemiBold", color: statusCfg.color }}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>

                  <ChevronRight size={16} color="#C6CBD5" strokeWidth={2} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Hint bar */}
      <View style={{ position: "absolute", left: 20, right: 92, bottom: insets.bottom + 16, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12 }}>
        <Clock size={15} color={SUB} />
        <Text style={{ flex: 1, fontSize: 11.5, fontFamily: "Inter_400Regular", color: SUB, lineHeight: 16 }}>
          {t("adminScheduleHint")}
        </Text>
      </View>

      {/* FAB */}
      <PressableScale
        onPress={handleAdd}
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel={t("createSchedBtn")}
        style={{ position: "absolute", right: 20, bottom: insets.bottom + 16, width: 56, height: 56, borderRadius: 18, overflow: "hidden" }}
      >
        <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
        </LinearGradient>
      </PressableScale>
    </View>
  );
}
