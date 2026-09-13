import {
  View, Text, ScrollView, TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import {
  Bell, MessageSquare, GraduationCap, ChevronRight,
  Users, BookOpen, ClipboardList, CalendarClock,
  UserPlus, FilePlus, BarChart3, CalendarPlus, PenLine, ArrowLeft, FileCheck2, ShieldCheck,
} from "lucide-react-native";
import { auth } from "@/utils/firebase/config";
import { useStudentsStore } from "@/utils/students/store";
import { useLessonsStore } from "@/utils/lessons/store";
import { useReportsStore } from "@/utils/reports/store";
import { useGroupsStore } from "@/utils/groups/store";
import { useVipStore, FREE_LIMIT } from "@/utils/vip/store";
import { useMyRole } from "@/utils/auth/useMyRole";
import { isStaffRole } from "@/utils/auth/permissions";
import AddStudentModal from "@/components/AddStudentModal";
import VipPaywallModal from "@/components/VipPaywallModal";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const CARD   = "#FFFFFF";
const TEXT   = "#111827";
const SUB    = "#8E93A1";
const BORDER = "#E5E9F2";
const GREEN  = "#10B981";
const PURPLE = "#8B5CF6";
const ORANGE = "#F59E0B";

// subject colour palette (chip text + light bg)
const SUBJECT_PALETTE = [
  { c: BLUE,        bg: BLUE_50 },
  { c: GREEN,        bg: "#E4F6EF" },
  { c: PURPLE,       bg: INDIGO_50 },
  { c: ORANGE,       bg: "#FDF1DF" },
  { c: "#EC4899",    bg: "#FCE7F1" },
  { c: "#06B6D4",    bg: "#E1F5FA" },
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
  const myRole = useMyRole();
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
    { icon: Users,         value: students.length,  label: t("homeStatStudents"),     color: BLUE,   bg: BLUE_50 },
    { icon: BookOpen,      value: todayCount,        label: t("homeStatTodayLessons"), color: INDIGO, bg: INDIGO_50 },
    { icon: ClipboardList, value: reports.length,    label: t("homeStatReports"),      color: GREEN,  bg: "#ECFDF5" },
    { icon: CalendarClock, value: upcomingCount,     label: t("homeStatUpcoming"),     color: ORANGE, bg: "#FFFBEB" },
  ];

  const QUICK = [
    { icon: CalendarPlus,  color: BLUE,      bg: BLUE_50,    label: t("homeAddLesson"),    onPress: () => router.push("/lesson/add") },
    { icon: UserPlus,      color: GREEN,     bg: "#ECFDF5",  label: t("homeAddStudent"),   onPress: () => { if (students.length >= FREE_LIMIT && !isVip) setShowPaywall(true); else setShowAdd(true); } },
    { icon: FilePlus,      color: PURPLE,    bg: INDIGO_50,  label: t("homeCreateReport"), onPress: () => router.push("/report/add") },
    { icon: ClipboardList, color: "#0EA5E9", bg: "#E0F2FE",  label: t("homeHomework"),     onPress: () => router.push("/homework") },
    { icon: PenLine,       color: "#EC4899", bg: "#FCE7F1",  label: t("homeWriting"),      onPress: () => router.push("/writing") },
    { icon: FileCheck2,    color: INDIGO,    bg: INDIGO_50,  label: t("examsTitle"),       onPress: () => router.push("/exams") },
    { icon: BarChart3,     color: ORANGE,    bg: "#FFFBEB",  label: t("homeStatistics"),   onPress: () => router.navigate("/(tabs)/analytics") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Fills the top overscroll/bounce gap with the hero color instead of white */}
        <View pointerEvents="none" style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: BLUE_50 }} />
        {/* ── SECTION 1 — Hero (gradient blue-50 → indigo-50 → white) ── */}
        <LinearGradient
          colors={[BLUE_50, INDIGO_50, "#FFFFFF"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 24 }}
        >
          {/* top row: logo + actions */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}>
                <GraduationCap size={18} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3, lineHeight: 19 }}>
                  Jeff
                </Text>
                <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB, letterSpacing: 0.3 }}>
                  Colleges
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {isStaffRole(myRole) && (
                <PressableScale
                  onPress={() => router.replace("/(admin-tabs)")}
                  accessibilityRole="button"
                  accessibilityLabel={t("backToAdmin")}
                  scaleTo={0.94}
                  style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 40, paddingHorizontal: 12, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER }}
                >
                  <ArrowLeft size={15} color={TEXT} />
                  <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: TEXT }}>{t("backToAdmin")}</Text>
                </PressableScale>
              )}
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t("homeStatUpcoming")}
                scaleTo={0.92}
                style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
              >
                <Bell size={18} color={TEXT} strokeWidth={1.9} />
                <View style={{ position: "absolute", top: 10, right: 11, width: 7, height: 7, borderRadius: 4, backgroundColor: BLUE }} />
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Messages"
                scaleTo={0.92}
                style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
              >
                <MessageSquare size={18} color={TEXT} strokeWidth={1.9} />
              </PressableScale>
            </View>
          </View>

          {/* greeting */}
          <Animated.View entering={FadeInDown.duration(380).easing(Easing.out(Easing.cubic))}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: "rgba(37,99,235,0.1)", flexDirection: "row", alignItems: "center", gap: 5 }}>
                <ShieldCheck size={12} color={BLUE} />
                <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: BLUE, letterSpacing: 0.2 }}>{t("profileTeacher").toUpperCase()}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB }}>
              {t(getGreetingKey())}
            </Text>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.5, marginTop: 2 }}>
              {tName(fullName)}
            </Text>
          </Animated.View>

          {/* stat cards — wrapping grid, same rhythm as the Boss dashboard */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
            {STATS.map((s, i) => (
              <Animated.View
                key={s.label}
                entering={FadeInDown.delay(80 + i * 60).duration(380).easing(Easing.out(Easing.cubic))}
                style={{ flexBasis: "47%", flexGrow: 1 }}
              >
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: BORDER, shadowColor: INDIGO, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: s.bg, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                    <s.icon size={17} color={s.color} strokeWidth={2} />
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.4 }}>{s.value}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: SUB, marginTop: 3 }}>{s.label}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </LinearGradient>

        {/* ── SECTION 2 — Today's timeline (white) ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 28, marginBottom: 26 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3 }}>{t("today")}</Text>
            <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: BLUE }}>{dateHeader}</Text>
          </View>

          {todayLessons.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(340)}>
              <View style={{ backgroundColor: CARD, borderRadius: 18, paddingHorizontal: 13, position: "relative", borderWidth: 1, borderColor: BORDER }}>
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
                      backgroundColor: "#E5E9F2",
                    }}
                  />
                )}

                {todayLessons.map((l, i) => {
                  const sc = subjectColors(l.subject ?? "");
                  const isFirst = i === 0;
                  const isLast  = i === todayLessons.length - 1;
                  const dotColor = isFirst ? BLUE : "#D8DBE2";
                  return (
                    <PressableScale
                      key={l.id}
                      onPress={() => router.push(`/lesson/${l.id}`)}
                      scaleTo={0.985}
                      onLayout={(e) => handleRowLayout(i, e)}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 9,
                        paddingVertical: 11,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: "#F1F5F9",
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
                    </PressableScale>
                  );
                })}
              </View>
            </Animated.View>
          ) : (
            <View style={{ backgroundColor: CARD, borderRadius: 18, padding: 18, alignItems: "center", borderWidth: 1, borderColor: BORDER }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>
                {t("homeNoLessonsToday")}
              </Text>
            </View>
          )}
        </View>

        {/* ── SECTION 3 — Groups (white) ── */}
        {activeGroups.length > 0 && (
          <View style={{ marginBottom: 26 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3 }}>{t("homeGroupsTitle")}</Text>
              <TouchableOpacity onPress={() => router.navigate("/(tabs)/students")} activeOpacity={0.7}>
                <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: BLUE }}>{t("homeAllGroups")}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            >
              {activeGroups.map((g, i) => {
                const sc = subjectColors(g.name ?? "");
                return (
                  <Animated.View key={g.id} entering={FadeInDown.delay(40 + i * 40).duration(300)}>
                    <PressableScale
                      onPress={() => router.push(`/group/${g.id}`)}
                      scaleTo={0.97}
                      style={{
                        width: 132, minHeight: 130, backgroundColor: CARD, borderRadius: 16,
                        padding: 12, justifyContent: "space-between",
                        borderWidth: 1, borderColor: BORDER,
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
                    </PressableScale>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── SECTION 4 — Recent reports (white) ── */}
        {recentRpts.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 26 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3 }}>{t("homeRecentReports")}</Text>
              <TouchableOpacity onPress={() => router.navigate("/(tabs)/reports")} activeOpacity={0.7}>
                <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: BLUE }}>{t("homeViewAll")}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
              {recentRpts.map((r, i) => {
                const score10 = (r.activityScore ?? 0) * 2;
                const badgeColor = score10 >= 8 ? GREEN : score10 >= 6 ? BLUE : score10 >= 4 ? ORANGE : "#EF4444";
                const badgeBg    = score10 >= 8 ? "#ECFDF5" : score10 >= 6 ? BLUE_50 : score10 >= 4 ? "#FFFBEB" : "#FEF2F2";
                const [, mn, dy] = (r.date ?? "").split("-").map(Number);
                const d = new Date(r.createdAt);
                const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
                const dateStr = mn ? `${dy} ${shortMonths[mn - 1]}, ${timeStr}` : timeStr;
                return (
                  <PressableScale
                    key={r.id}
                    onPress={() => router.push(`/report/${r.id}`)}
                    scaleTo={0.985}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: "#F1F5F9",
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
                  </PressableScale>
                );
              })}
            </View>
          </View>
        )}

        {/* ── SECTION 5 — Quick actions (white) ── */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 14, letterSpacing: -0.3 }}>
            {t("homeQuickActions")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {QUICK.map((q, i) => (
              <Animated.View key={i} entering={FadeInDown.delay(40 + i * 40).duration(300)} style={{ flexBasis: "22%", flexGrow: 1 }}>
                <PressableScale
                  onPress={q.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={q.label}
                  style={{ alignItems: "center", gap: 8, paddingVertical: 6 }}
                >
                  <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: q.bg, alignItems: "center", justifyContent: "center" }}>
                    <q.icon size={22} color={q.color} strokeWidth={2} />
                  </View>
                  <Text numberOfLines={2} style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT, textAlign: "center", lineHeight: 14 }}>
                    {q.label}
                  </Text>
                </PressableScale>
              </Animated.View>
            ))}
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
