import {
  View, Text, ScrollView, TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  Bell, MessageSquare, GraduationCap, ChevronRight,
  Users, BookOpen, ClipboardList, CalendarClock,
  UserPlus, FilePlus, BarChart3, CalendarPlus,
} from "lucide-react-native";
import { auth } from "@/utils/firebase/config";
import { useStudentsStore } from "@/utils/students/store";
import { useLessonsStore } from "@/utils/lessons/store";
import { useReportsStore } from "@/utils/reports/store";
import { useGroupsStore } from "@/utils/groups/store";
import { useVipStore, FREE_LIMIT } from "@/utils/vip/store";
import AddStudentModal from "@/components/AddStudentModal";
import VipPaywallModal from "@/components/VipPaywallModal";
import { useT } from "@/utils/i18n";

// ─── palette ─────────────────────────────────────────────────────────────────
const NAVY_GRAD = ["#22447A", "#152C51"];   // header gradient
const SHEET  = "#F4F5F7";                    // light sheet under header
const CARD   = "#FFFFFF";
const TEXT   = "#111827";
const SUB    = "#8E93A1";
const BLUE   = "#2563EB";                     // accent / links / primary action
const GREEN  = "#10B981";
const PURPLE = "#8B5CF6";
const ORANGE = "#F59E0B";

// subject colour palette (chip text + light bg)
const SUBJECT_PALETTE = [
  { c: "#2563EB", bg: "#E8EEFB" },
  { c: "#10B981", bg: "#E4F6EF" },
  { c: "#8B5CF6", bg: "#F0EAFC" },
  { c: "#F59E0B", bg: "#FDF1DF" },
  { c: "#EC4899", bg: "#FCE7F1" },
  { c: "#06B6D4", bg: "#E1F5FA" },
];
function subjectColors(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return SUBJECT_PALETTE[h % SUBJECT_PALETTE.length];
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getGreetingKey() {
  const h = new Date().getHours();
  if (h < 6)  return "greetingNight";
  if (h < 12) return "greetingMorning";
  if (h < 18) return "greetingDay";
  return "greetingEvening";
}

const AVATAR_COLORS = [BLUE, GREEN, ORANGE, "#EF4444", "#06B6D4", PURPLE, "#EC4899", "#0EA5E9"];
function avatarBg(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tSubject, tName, tNameList, months, days } = useT();
  const [showAdd,     setShowAdd]     = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isVip } = useVipStore();

  const { students } = useStudentsStore();
  const { lessons }  = useLessonsStore();
  const { reports }  = useReportsStore();
  const { groups }   = useGroupsStore();

  const user      = auth?.currentUser;
  const fullName  = user?.displayName ?? t("profileTeacher");
  const today     = todayStr();
  const shortMonths = months(true);

  // stats
  const todayCount = useMemo(
    () => lessons.filter(l => l.date === today && l.status !== "cancelled").length,
    [lessons, today]
  );
  const upcomingCount = useMemo(
    () => lessons.filter(l => l.date >= today && l.status !== "cancelled" && l.status !== "completed").length,
    [lessons, today]
  );

  // today's timeline
  const todayLessons = useMemo(
    () => lessons
      .filter(l => l.date === today && l.status !== "cancelled")
      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
    [lessons, today]
  );

  // measured row positions, used to draw one continuous timeline line
  const [rowLayouts, setRowLayouts] = useState({});
  const handleRowLayout = useCallback((index, e) => {
    const { y, height } = e.nativeEvent.layout;
    setRowLayouts((prev) => {
      const cur = prev[index];
      if (cur && cur.y === y && cur.height === height) return prev;
      return { ...prev, [index]: { y, height } };
    });
  }, []);
  const timelineGeometry = useMemo(() => {
    if (todayLessons.length < 2) return null;
    const first = rowLayouts[0];
    const last  = rowLayouts[todayLessons.length - 1];
    if (!first || !last) return null;
    const firstCenter = first.y + first.height / 2;
    const lastCenter  = last.y + last.height / 2;
    return { top: firstCenter, height: lastCenter - firstCenter };
  }, [rowLayouts, todayLessons.length]);

  // recent reports
  const recentRpts = useMemo(
    () => [...reports].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3),
    [reports]
  );

  // active groups
  const activeGroups = useMemo(
    () => groups.filter(g => g.category !== "archived"),
    [groups]
  );

  // date header "7 мая, вторник"
  const now = new Date();
  const dateHeader = `${now.getDate()} ${shortMonths[now.getMonth()]}, ${days(false)[(now.getDay() + 6) % 7]}`;

  const STATS = [
    { icon: Users,         value: students.length,  label: t("homeStatStudents") },
    { icon: BookOpen,      value: todayCount,        label: t("homeStatTodayLessons") },
    { icon: ClipboardList, value: reports.length,    label: t("homeStatReports") },
    { icon: CalendarClock, value: upcomingCount,     label: t("homeStatUpcoming") },
  ];

  const QUICK = [
    { icon: CalendarPlus, color: BLUE,   bg: "#E8EEFB", label: t("homeAddLesson"),    onPress: () => router.push("/lesson/add") },
    { icon: UserPlus,     color: GREEN,  bg: "#E4F6EF", label: t("homeAddStudent"),   onPress: () => { if (students.length >= FREE_LIMIT && !isVip) setShowPaywall(true); else setShowAdd(true); } },
    { icon: FilePlus,     color: PURPLE, bg: "#F0EAFC", label: t("homeCreateReport"), onPress: () => router.push("/report/add") },
    { icon: BarChart3,    color: ORANGE, bg: "#FDF1DF", label: t("homeStatistics"),   onPress: () => router.navigate("/(tabs)/analytics") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: SHEET }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Fills the top overscroll/bounce gap with navy instead of the sheet's white */}
        <View style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: NAVY_GRAD[0] }} />

        {/* ══ NAVY HEADER ══════════════════════════════════════════════════ */}
        <LinearGradient
          colors={NAVY_GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 30 }}
        >
          {/* top row: logo + actions */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
                <GraduationCap size={21} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View>
                <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.3, lineHeight: 20 }}>
                  Jeff
                </Text>
                <Text style={{ fontSize: 9.5, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", letterSpacing: 0.3 }}>
                  Colleges
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity activeOpacity={0.7} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Bell size={19} color="#FFFFFF" strokeWidth={1.9} />
                <View style={{ position: "absolute", top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: "#4C8DFF", borderWidth: 1.5, borderColor: "#1D3560" }} />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                <MessageSquare size={19} color="#FFFFFF" strokeWidth={1.9} />
              </TouchableOpacity>
            </View>
          </View>

          {/* greeting */}
          <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.72)" }}>
            {t(getGreetingKey())}
          </Text>
          <Text style={{ fontSize: 27, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.4, marginTop: 3 }}>
            {tName(fullName)}
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 3 }}>
            {t("profileTeacher")}
          </Text>

          {/* stats card */}
          <View style={{ flexDirection: "row", marginTop: 22, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", paddingVertical: 16 }}>
            {STATS.map((s, i) => {
              const Icon = s.icon;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1, alignItems: "center", paddingHorizontal: 4,
                    borderLeftWidth: i === 0 ? 0 : 1,
                    borderLeftColor: "rgba(255,255,255,0.1)",
                  }}
                >
                  <Icon size={19} color="rgba(255,255,255,0.72)" strokeWidth={1.9} />
                  <Text style={{ fontSize: 21, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 7 }}>
                    {s.value}
                  </Text>
                  <Text style={{ fontSize: 10.5, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.62)", textAlign: "center", marginTop: 3, lineHeight: 13 }}>
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </LinearGradient>

        {/* ══ WHITE SHEET ══════════════════════════════════════════════════ */}
        <View style={{ flex: 1, backgroundColor: SHEET, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -14, paddingTop: 22, paddingBottom: insets.bottom + 24 }}>

          {/* ── Сегодня ─────────────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 26 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>{t("today")}</Text>
              <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: BLUE }}>{dateHeader}</Text>
            </View>

            {todayLessons.length > 0 ? (
              <View style={{ backgroundColor: CARD, borderRadius: 16, paddingHorizontal: 13, position: "relative", shadowColor: "#0B1B3A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
                {/* single continuous timeline line — drawn first (bottom layer) so dots sit on top of it */}
                {timelineGeometry && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: 152,
                      top: timelineGeometry.top,
                      height: timelineGeometry.height,
                      width: 2,
                      backgroundColor: "#D5D9E0",
                    }}
                  />
                )}

                {todayLessons.map((l, i) => {
                  const sc = subjectColors(l.subject ?? "");
                  const isFirst = i === 0;
                  const isLast  = i === todayLessons.length - 1;
                  const dotColor = isFirst ? BLUE : "#D8DBE2";
                  return (
                    <TouchableOpacity
                      key={l.id}
                      onPress={() => router.push(`/lesson/${l.id}`)}
                      activeOpacity={0.7}
                      onLayout={(e) => handleRowLayout(i, e)}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 9,
                        paddingVertical: 11,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: "#EEF0F3",
                      }}
                    >
                      {/* time */}
                      <Text style={{ width: 38, fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT }}>
                        {l.time}
                      </Text>

                      {/* subject chip */}
                      <View style={{ backgroundColor: sc.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, width: 78 }}>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: sc.c, lineHeight: 13.5 }}>
                          {l.subject ? tSubject(l.subject) : t("homeLesson")}
                        </Text>
                      </View>

                      {/* timeline dot */}
                      <View style={{ width: 12, alignItems: "center", justifyContent: "center" }}>
                        <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: dotColor }} />
                      </View>

                      {/* name + format */}
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={2} style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: TEXT, lineHeight: 17 }}>
                          {l.studentNames?.length ? tNameList(l.studentNames) : "—"}
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 11.5, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>
                          {l.format === "Офлайн" ? t("offline") : l.format === "Онлайн" ? t("online") : t("homeLesson")}
                        </Text>
                      </View>

                      <ChevronRight size={16} color="#C6CBD5" strokeWidth={2} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16, alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>
                  {t("homeNoLessonsToday")}
                </Text>
              </View>
            )}
          </View>

          {/* ── Группы ──────────────────────────────────────────────────── */}
          {activeGroups.length > 0 && (
            <View style={{ marginBottom: 26 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: 20 }}>
                <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{t("homeGroupsTitle")}</Text>
                <TouchableOpacity onPress={() => router.navigate("/(tabs)/students")} activeOpacity={0.7}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: BLUE }}>{t("homeAllGroups")}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              >
                {activeGroups.map((g) => {
                  const sc = subjectColors(g.name ?? "");
                  return (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => router.push(`/group/${g.id}`)}
                      activeOpacity={0.85}
                      style={{
                        width: 132, minHeight: 130, backgroundColor: CARD, borderRadius: 15,
                        padding: 12, justifyContent: "space-between",
                        shadowColor: "#0B1B3A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
                      }}
                    >
                      <View>
                        <Text numberOfLines={2} style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT, lineHeight: 17 }}>
                          {g.name}
                        </Text>
                        <Text style={{ fontSize: 11.5, fontFamily: "Inter_400Regular", color: SUB, marginTop: 3 }}>
                          {t("homeStudentsCount", { n: g.studentIds?.length ?? 0 })}
                        </Text>
                      </View>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: sc.bg, alignItems: "center", justifyContent: "center" }}>
                        <Users size={18} color={sc.c} strokeWidth={2} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Недавние отчёты ─────────────────────────────────────────── */}
          {recentRpts.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 26 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{t("homeRecentReports")}</Text>
                <TouchableOpacity onPress={() => router.navigate("/(tabs)/reports")} activeOpacity={0.7}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: BLUE }}>{t("homeViewAll")}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", shadowColor: "#0B1B3A", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                {recentRpts.map((r, i) => {
                  const score10 = (r.activityScore ?? 0) * 2;
                  const badgeColor = score10 >= 8 ? GREEN : score10 >= 6 ? BLUE : score10 >= 4 ? ORANGE : "#EF4444";
                  const badgeBg    = score10 >= 8 ? "#E4F6EF" : score10 >= 6 ? "#E8EEFB" : score10 >= 4 ? "#FDF1DF" : "#FDE8E8";
                  const [, mn, dy] = (r.date ?? "").split("-").map(Number);
                  const d = new Date(r.createdAt);
                  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
                  const dateStr = mn ? `${dy} ${shortMonths[mn - 1]}, ${timeStr}` : timeStr;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => router.push(`/report/${r.id}`)}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                        borderBottomWidth: i < recentRpts.length - 1 ? 1 : 0,
                        borderBottomColor: "#F1F2F5",
                      }}
                    >
                      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: avatarBg(r.studentName ?? ""), alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" }}>
                          {initials(tName(r.studentName) ?? "?")}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 14.5, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 2 }}>
                          {tName(r.studentName) ?? "—"}
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>
                          {r.subject ? `${tSubject(r.subject)} • ${dateStr}` : dateStr}
                        </Text>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: badgeBg }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: badgeColor }}>
                          {score10}/10
                        </Text>
                      </View>
                      <ChevronRight size={17} color="#C6CBD5" strokeWidth={2} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Быстрые действия ────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 12 }}>
              {t("homeQuickActions")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {QUICK.map((q, i) => {
                const Icon = q.icon;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={q.onPress}
                    activeOpacity={0.85}
                    style={{ flex: 1, backgroundColor: CARD, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6, alignItems: "center", gap: 9, shadowColor: "#0B1B3A", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}
                  >
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: q.bg, alignItems: "center", justifyContent: "center" }}>
                      <Icon size={22} color={q.color} strokeWidth={2} />
                    </View>
                    <Text style={{ fontSize: 11.5, fontFamily: "Inter_500Medium", color: TEXT, textAlign: "center", lineHeight: 14 }}>
                      {q.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

        </View>
      </ScrollView>

      <AddStudentModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <VipPaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgraded={() => setShowPaywall(false)}
      />
    </View>
  );
}
