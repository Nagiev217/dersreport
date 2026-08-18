import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import {
  BookOpen,
  Calendar,
  FileText,
  Bell,
  GraduationCap,
  LogOut,
  ChevronRight,
  Users,
  Trophy,
  MessageSquare,
  FilePlus,
  User,
} from "lucide-react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../utils/firebase/config";
import { useParentData } from "../../utils/firebase/parentRealtime";
import { clearCachedRole } from "../../utils/auth/roleCache";
import { getScoreColor } from "@/data/mockData";
import PressableScale from "@/components/PressableScale";
import { useT } from "../../utils/i18n";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";

const pad = (n) => String(n).padStart(2, "0");
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatDateShortLocal(s, monthsArr) {
  if (!s) return "";
  const today = todayStr();
  const [, m, d] = s.split("-").map(Number);
  return s === today ? "" : `${d} ${monthsArr[m - 1]}`;
}
function getGreeting(t) {
  const h = new Date().getHours();
  if (h < 12) return t("goodMorning");
  if (h < 17) return t("goodAfternoon");
  return t("goodEvening");
}
// Monday-first week containing today
function getCurrentWeek() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x;
  });
}

// ─── Circular progress ────────────────────────────────────────────────────────

function CircleProgress({ size = 56, progress = 87, color = BLUE, trackColor = "#E5E5EA", strokeWidth = 5 }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, progress)) / 100);
  const c = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={c} cy={c} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={c} cy={c} r={r}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color }}>{progress}%</Text>
    </View>
  );
}

// ─── Report row ───────────────────────────────────────────────────────────────

function ReportRow({ report, onPress, monthsShort, t, tSubject }) {
  const scoreColors = { 5: "#22C55E", 4: "#2563EB", 3: "#D97706", 2: "#F97316", 1: "#EF4444" };
  const scoreBgs   = { 5: "#ECFDF5", 4: BLUE_50, 3: "#FFFBEB", 2: "#FFF7ED", 1: "#FEF2F2" };
  const color = scoreColors[report.activityScore] ?? "#D97706";
  const bg    = scoreBgs[report.activityScore]   ?? "#FFFBEB";
  const pct   = (report.activityScore ?? 3) * 20;
  const dateStr = formatDateShortLocal(report.date, monthsShort) || (report.date === todayStr() ? t("today") : report.date);
  const timeStr = report.createdAt
    ? new Date(report.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 12 }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}>
        <FileText size={18} color={INDIGO} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }} numberOfLines={1}>
            {tSubject(report.subject)}
          </Text>
        </View>
        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>
          {dateStr}{timeStr ? `, ${timeStr}` : ""}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: bg, borderRadius: 10 }}>
        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color }}>{pct}%</Text>
      </View>
      <ChevronRight size={16} color="#C7C7CC" />
    </TouchableOpacity>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tSubject, tName, months, days } = useT();
  const monthsShort = months(true);
  const daysShort = days(true);

  const { reports: allReports, students: children, lessons: allLessons, loading } = useParentData();
  const displayName = auth?.currentUser?.displayName ?? t("roleParentTitle");

  const [activeChildId, setActiveChildId] = useState(null);

  // Auto-select first child (or keep current selection if it still exists)
  useEffect(() => {
    if (!children.length) return;
    setActiveChildId((prev) =>
      prev && children.some((c) => c.id === prev) ? prev : children[0].id
    );
  }, [children]);

  const activeChild = children.find((c) => c.id === activeChildId) ?? children[0] ?? null;

  const handleSignOut = () => {
    Alert.alert(
      t("profileSignOutTitle"),
      t("profileSignOutMsg"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("profileSignOutBtn"),
          style: "destructive",
          onPress: async () => {
            await clearCachedRole();
            signOut(auth)
              .then(() => router.replace("/role-select"))
              .catch(() => router.replace("/role-select"));
          },
        },
      ]
    );
  };

  const today = todayStr();
  const weekDates = getCurrentWeek();

  const todayLessonsCount = allLessons.filter(
    (l) => l.date === today && l.status === "planned" &&
      children.some((c) => (l.studentIds ?? []).includes(String(c.id)))
  ).length;

  const totalLessons = children.reduce((acc, c) => acc + (c.lessonsCompleted ?? 0), 0);

  const avgAttend = children.length
    ? Math.round(children.reduce((acc, c) => acc + (c.attendance ?? 0), 0) / children.length)
    : 0;

  const unreadCount = allReports.filter((r) => !r.isRead).length;

  // ── Data scoped to the selected child ──────────────────────────────────────
  const childIdStr = activeChild ? String(activeChild.id) : null;

  const childLessons = childIdStr
    ? allLessons.filter((l) => (l.studentIds ?? []).includes(childIdStr))
    : [];

  const childUpcoming = childLessons
    .filter((l) => l.date >= today && l.status === "planned")
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];

  const childUpcomingDateLabel = childUpcoming
    ? (childUpcoming.date === today ? t("today") : formatDateShortLocal(childUpcoming.date, monthsShort))
    : null;

  const childReports = childIdStr
    ? allReports.filter((r) => String(r.studentId) === childIdStr).slice(0, 3)
    : [];

  const weekCells = weekDates.map((d) => {
    const ds = toDateStr(d);
    const dayLessons = childLessons.filter((l) => l.date === ds);
    const status = dayLessons.some((l) => l.status === "completed")
      ? "completed"
      : dayLessons.some((l) => l.status === "planned")
      ? "planned"
      : dayLessons.some((l) => l.status === "cancelled")
      ? "cancelled"
      : null;
    return { date: d, ds, status, isToday: ds === today };
  });

  const quickActions = [
    { key: "report",   icon: FilePlus,      color: BLUE,      bg: BLUE_50,   label: t("quickNewReport"),   onPress: () => router.push("/(parent-tabs)/reports") },
    { key: "contact",  icon: MessageSquare, color: "#22C55E", bg: "#ECFDF5", label: t("quickContact"),     onPress: () => {} },
    { key: "schedule", icon: Calendar,      color: INDIGO,    bg: INDIGO_50, label: t("quickSchedule"),    onPress: () => router.push("/(parent-tabs)/child") },
    { key: "profile",  icon: User,          color: "#D97706", bg: "#FFFBEB", label: t("tabProfile"),       onPress: () => router.push("/(parent-tabs)/profile") },
  ];

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={BLUE} size="large" />
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, marginTop: 12 }}>
          {t("loadingData")}
        </Text>
      </View>
    );
  }

  const activeChildName = activeChild ? tName(activeChild.name) : "";
  const activeChildInitials = activeChildName
    ? activeChildName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?";
  const attend = activeChild?.attendance ?? 0;
  const attendColor = attend >= 90 ? "#22C55E" : attend >= 75 ? "#D97706" : "#EF4444";
  const scoreColor = activeChild ? getScoreColor(activeChild.score) : SUB;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
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
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}>
              <GraduationCap size={18} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3, lineHeight: 19 }}>Jeff</Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB, letterSpacing: 0.3 }}>Colleges</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t("parentRecentReports")} style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}>
              <Bell size={19} color={TEXT} />
              {unreadCount > 0 && (
                <View style={{ position: "absolute", top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE, borderWidth: 1.5, borderColor: "#FFFFFF" }} />
              )}
            </PressableScale>
            <PressableScale onPress={handleSignOut} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t("profileSignOut")} style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}>
              <LogOut size={18} color={SUB} />
            </PressableScale>
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB }}>
            {getGreeting(t)},
          </Text>
          <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.5, marginTop: 2 }}>
            {tName(displayName)}!
          </Text>
        </Animated.View>

        {/* ── Aggregate stat grid (all children) ── */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
          {[
            { Icon: BookOpen, value: todayLessonsCount, label: t("statsTodayLessons"), color: BLUE,      bg: BLUE_50 },
            { Icon: Users,    value: totalLessons,      label: t("statsTotalLessons"), color: INDIGO,    bg: INDIGO_50 },
            { Icon: Trophy,   value: `${avgAttend}%`,   label: t("statsAvgAttend"),    color: "#D97706", bg: "#FFFBEB" },
          ].map(({ Icon, value, label, color, bg }, i) => (
            <Animated.View
              key={label}
              entering={FadeInDown.delay(60 + i * 60).duration(360).easing(Easing.out(Easing.cubic))}
              style={{ flex: 1 }}
            >
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 13, borderWidth: 1, borderColor: BORDER, shadowColor: INDIGO, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
                <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 9 }}>
                  <Icon size={15} color={color} />
                </View>
                <Text numberOfLines={1} style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3 }}>{value}</Text>
                <Text numberOfLines={1} style={{ fontSize: 10.5, fontFamily: "Inter_500Medium", color: SUB, marginTop: 2 }}>{label}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* ── Child switcher — only when there's more than one ── */}
        {children.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 16 }}>
            {children.map((c) => {
              const active = c.id === activeChildId;
              const cName = tName(c.name);
              const cInitials = cName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
              return (
                <PressableScale
                  key={c.id}
                  onPress={() => setActiveChildId(c.id)}
                  scaleTo={0.95}
                  accessibilityRole="button"
                  accessibilityLabel={cName}
                  accessibilityState={{ selected: active }}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 8,
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: active ? BLUE : "#FFFFFF",
                    borderWidth: 1, borderColor: active ? BLUE : BORDER,
                  }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: active ? "rgba(255,255,255,0.25)" : (c.avatarColor ?? BLUE), alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFF" }}>{cInitials}</Text>
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium", color: active ? "#FFFFFF" : TEXT, maxWidth: 100 }}>
                    {cName}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        )}
      </LinearGradient>

      {/* ── SECTION 2 — Content (white) ── */}
      <View style={{ paddingTop: 20 }}>
        {/* ── Empty state ── */}
        {children.length === 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 32, alignItems: "center", borderWidth: 1, borderColor: BORDER }}>
            <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <GraduationCap size={32} color={BLUE} />
            </View>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 8 }}>
              {t("parentNoChildren")}
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", lineHeight: 20 }}>
              {t("parentNoChildrenHint")}
            </Text>
            <PressableScale onPress={() => router.push("/(parent-tabs)/profile")} scaleTo={0.96} style={{ marginTop: 16, borderRadius: 14, overflow: "hidden" }}>
              <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("parentMyID")}</Text>
              </LinearGradient>
            </PressableScale>
          </View>
        )}

        {/* ── Focus card — selected child ── */}
        {activeChild && (
          <Animated.View entering={FadeInDown.duration(320)} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <PressableScale
              onPress={() => router.push("/(parent-tabs)/child")}
              scaleTo={0.99}
              style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER }}
            >
              {/* Header row */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: activeChild.avatarColor ?? BLUE, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Text style={{ fontSize: 19, fontFamily: "Inter_700Bold", color: "#FFF" }}>{activeChildInitials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>{activeChildName}</Text>
                  <Text style={{ fontSize: 12.5, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>
                    {tSubject(activeChild.subject)} · {tSubject(activeChild.type)}
                  </Text>
                </View>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
                  <ChevronRight size={14} color={SUB} />
                </View>
              </View>

              {/* Stat trio */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 1, backgroundColor: INDIGO_50, borderRadius: 14, padding: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 10.5, fontFamily: "Inter_600SemiBold", color: SUB, marginBottom: 8 }}>
                    {t("parentAttendanceLabel")}
                  </Text>
                  <CircleProgress size={48} progress={attend} color={attendColor} strokeWidth={4.5} />
                </View>
                <View style={{ flex: 1, backgroundColor: BLUE_50, borderRadius: 14, padding: 12, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 10.5, fontFamily: "Inter_600SemiBold", color: SUB, marginBottom: 6 }}>
                    {t("studentStatScore")}
                  </Text>
                  <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: scoreColor }}>
                    {activeChild.score ?? 0}<Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: SUB }}>/{activeChild.maxScore ?? 10}</Text>
                  </Text>
                </View>
              </View>

              {/* Next lesson row */}
              <View style={{ backgroundColor: "#F8FAFC", borderRadius: 14, padding: 12 }}>
                <Text style={{ fontSize: 10.5, fontFamily: "Inter_600SemiBold", color: SUB, marginBottom: 6 }}>
                  {t("parentNextLesson")}
                </Text>
                {childUpcoming ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Calendar size={13} color={BLUE} />
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                      {childUpcomingDateLabel ? `${childUpcomingDateLabel}, ` : ""}{childUpcoming.time}
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>
                      · {tSubject(childUpcoming.subject ?? activeChild.subject)}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#C7C7CC" }}>—</Text>
                )}
              </View>
            </PressableScale>

            {/* Week strip */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: BORDER, paddingVertical: 12, paddingHorizontal: 6, marginTop: 10 }}>
              {weekCells.map((cell, i) => {
                const dotColor = cell.status === "completed" ? "#22C55E" : cell.status === "planned" ? BLUE : cell.status === "cancelled" ? "#EF4444" : "#E5E9F2";
                return (
                  <View key={i} style={{ alignItems: "center", width: 30 }}>
                    <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: SUB, marginBottom: 6 }}>
                      {daysShort[(cell.date.getDay() + 6) % 7]}
                    </Text>
                    <View style={{
                      width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center",
                      backgroundColor: cell.isToday ? BLUE_50 : "transparent",
                      borderWidth: cell.isToday ? 1 : 0, borderColor: BLUE,
                    }}>
                      <Text style={{ fontSize: 11, fontFamily: cell.isToday ? "Inter_700Bold" : "Inter_400Regular", color: cell.isToday ? BLUE : TEXT }}>
                        {cell.date.getDate()}
                      </Text>
                    </View>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: dotColor, marginTop: 4 }} />
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ── Recent activity for the selected child ── */}
        {activeChild && childReports.length > 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>
                {t("parentRecentReports")}
              </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/(parent-tabs)/reports?highlight=${activeChild.id}`)}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: BLUE }}>
                  {t("seeAll")}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER }}>
              {childReports.map((report, idx) => (
                <View key={report.id}>
                  <ReportRow
                    report={report}
                    monthsShort={monthsShort}
                    t={t}
                    tSubject={tSubject}
                    onPress={() => router.push(`/(parent-tabs)/reports?highlight=${activeChild.id}`)}
                  />
                  {idx < childReports.length - 1 && (
                    <View style={{ height: 1, backgroundColor: "#F1F5F9" }} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Quick actions ── */}
        <View style={{ marginHorizontal: 20, marginBottom: 8 }}>
          <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 12 }}>
            {t("quickActionsTitle")}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {quickActions.map(({ key, icon: Icon, color, bg, label, onPress }) => (
              <PressableScale
                key={key}
                onPress={onPress}
                scaleTo={0.95}
                style={{ flex: 1, alignItems: "center", gap: 8 }}
              >
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                  <Icon size={24} color={color} />
                </View>
                <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: TEXT, textAlign: "center", lineHeight: 15 }}>
                  {label}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
