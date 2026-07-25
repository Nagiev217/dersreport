import { useState } from "react";
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
import {
  BookOpen,
  Calendar,
  FileText,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Users,
  Trophy,
  MessageSquare,
  FilePlus,
  LayoutGrid,
  User,
} from "lucide-react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../utils/firebase/config";
import { useParentData } from "../../utils/firebase/parentRealtime";
import { clearCachedRole } from "../../utils/auth/roleCache";
import { useT } from "../../utils/i18n";

const pad = (n) => String(n).padStart(2, "0");
function todayStr() {
  const d = new Date();
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

// ─── Circular progress ────────────────────────────────────────────────────────

function CircleProgress({ size = 56, progress = 87, color = "#6B5CF6", trackColor = "#E5E5EA", strokeWidth = 5 }) {
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

// ─── Child card ───────────────────────────────────────────────────────────────

function ChildCard({ student, reports, lessons, onPress, monthsShort, t, tSubject, tName }) {
  const today = todayStr();
  const upcoming = lessons
    .filter((l) =>
      (l.studentIds ?? []).includes(String(student.id)) &&
      l.date >= today &&
      l.status === "planned"
    )
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];

  const attend = student.attendance ?? 87;
  const attendColor = attend >= 90 ? "#22C55E" : attend >= 75 ? "#F59E0B" : "#EF4444";

  const displayName = tName(student.name);
  const initials = displayName
    ? displayName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?";

  const dateLabel = upcoming
    ? (upcoming.date === today ? t("today") : formatDateShortLocal(upcoming.date, monthsShort))
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        <View style={{
          width: 48, height: 48, borderRadius: 24,
          backgroundColor: student.avatarColor ?? "#6B5CF6",
          alignItems: "center", justifyContent: "center", marginRight: 12,
        }}>
          <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFF" }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{displayName}</Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
            {tSubject(student.subject)} · {tSubject(student.type)}
          </Text>
        </View>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
          <ChevronRight size={14} color="#8E8E93" />
        </View>
      </View>

      {/* Two sub-boxes */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {/* Next lesson */}
        <View style={{ flex: 1, backgroundColor: "#F8F8FB", borderRadius: 14, padding: 12 }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#8E8E93", marginBottom: 8 }}>
            {t("parentNextLesson")}
          </Text>
          {upcoming ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 }}>
                <Calendar size={12} color="#6B5CF6" />
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}>
                  {dateLabel ? `${dateLabel}, ` : ""}{upcoming.time}
                </Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
                {tSubject(upcoming.subject ?? student.subject)}
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#C7C7CC" }}>—</Text>
          )}
        </View>

        {/* Attendance */}
        <View style={{ flex: 1, backgroundColor: "#F8F8FB", borderRadius: 14, padding: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#8E8E93", marginBottom: 8, alignSelf: "flex-start" }}>
            {t("parentAttendanceLabel")}
          </Text>
          <CircleProgress size={56} progress={attend} color={attendColor} strokeWidth={5} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#22C55E", marginTop: 6 }}>
            {t("parentWeeklyGain", { n: 5 })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Report row ───────────────────────────────────────────────────────────────

function ReportRow({ report, onPress, monthsShort, t, tSubject }) {
  const scoreColors = { 5: "#22C55E", 4: "#3B82F6", 3: "#F59E0B", 2: "#F97316", 1: "#EF4444" };
  const scoreBgs   = { 5: "#F0FDF4", 4: "#EFF6FF", 3: "#FFFBEB", 2: "#FFF7ED", 1: "#FEF2F2" };
  const color = scoreColors[report.activityScore] ?? "#F59E0B";
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
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center" }}>
        <FileText size={18} color="#6B5CF6" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }} numberOfLines={1}>
            {tSubject(report.subject)}
          </Text>
        </View>
        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 2 }}>
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
  const { t, tSubject, tName, months } = useT();
  const monthsShort = months(true);

  const { reports: allReports, students: children, lessons: allLessons, loading } = useParentData();
  const displayName = auth?.currentUser?.displayName ?? t("roleParentTitle");

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

  const todayLessonsCount = allLessons.filter(
    (l) => l.date === today && l.status === "planned" &&
      children.some((c) => (l.studentIds ?? []).includes(String(c.id)))
  ).length;

  const totalLessons = children.reduce((acc, c) => acc + (c.lessonsCompleted ?? 0), 0);

  const avgAttend = children.length
    ? Math.round(children.reduce((acc, c) => acc + (c.attendance ?? 0), 0) / children.length)
    : 0;

  const unreadCount = allReports.filter((r) => !r.isRead).length;
  const recentReports = allReports.slice(0, 3);

  const quickActions = [
    { key: "report",   icon: FilePlus,      color: "#3B82F6", bg: "#EFF6FF", label: t("quickNewReport"),   onPress: () => router.push("/(parent-tabs)/reports") },
    { key: "contact",  icon: MessageSquare, color: "#22C55E", bg: "#F0FDF4", label: t("quickContact"),     onPress: () => {} },
    { key: "schedule", icon: Calendar,      color: "#6B5CF6", bg: "#EEF0FF", label: t("quickSchedule"),    onPress: () => router.push("/(parent-tabs)/child") },
    { key: "profile",  icon: User,          color: "#F59E0B", bg: "#FFFBEB", label: t("tabProfile"),       onPress: () => router.push("/(parent-tabs)/profile") },
  ];

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#6B5CF6" size="large" />
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 12 }}>
          {t("loadingData")}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F2F2F7" }}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Top bar ── */}
      <View style={{
        backgroundColor: "#FFFFFF",
        paddingTop: insets.top + 4,
        paddingHorizontal: 20,
        paddingBottom: 4,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
          <Shield size={18} color="#6B5CF6" />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={{ position: "relative", width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
          >
            <Bell size={22} color="#1C1C1E" />
            {unreadCount > 0 && (
              <View style={{ position: "absolute", top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: "#6B5CF6", borderWidth: 1.5, borderColor: "#FFFFFF" }} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSignOut}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}
          >
            <LogOut size={18} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Greeting ── */}
      <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}>
        <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
          {getGreeting(t)},
        </Text>
        <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: "#1C1C1E", letterSpacing: -0.5, marginTop: 2 }}>
          {tName(displayName)}!
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 4 }}>
          {t("parentSubtitle")}
        </Text>
      </View>

      <View style={{ height: 12 }} />

      {/* ── Stats card ── */}
      <LinearGradient
        colors={["#7C6AF5", "#5A4CD6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ marginHorizontal: 20, borderRadius: 22, padding: 20, marginBottom: 16 }}
      >
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginBottom: 16 }}>
          {t("parentMyChildren")}
        </Text>
        <View style={{ flexDirection: "row" }}>
          {[
            { Icon: BookOpen, value: todayLessonsCount, label: t("statsTodayLessons") },
            { Icon: Users,    value: totalLessons,      label: t("statsTotalLessons") },
            { Icon: Trophy,   value: `${avgAttend}%`,   label: t("statsAvgAttend") },
          ].map(({ Icon, value, label }, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <Icon size={20} color="rgba(255,255,255,0.75)" />
              <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 6 }}>
                {value}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 3 }}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── Empty state ── */}
      {children.length === 0 && (
        <View style={{ margin: 20, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 32, alignItems: "center" }}>
          <Shield size={40} color="#C7C7CC" />
          <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginTop: 16, marginBottom: 8 }}>
            {t("parentNoChildren")}
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center", lineHeight: 20 }}>
            {t("parentNoChildrenHint")}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(parent-tabs)/profile")}
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#6B5CF6", borderRadius: 14 }}
          >
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("parentMyID")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Children ── */}
      {children.map((student) => (
        <ChildCard
          key={student.id}
          student={student}
          reports={allReports}
          lessons={allLessons}
          monthsShort={monthsShort}
          t={t}
          tSubject={tSubject}
          tName={tName}
          onPress={() => router.push(`/(parent-tabs)/reports?highlight=${student.id}`)}
        />
      ))}

      {/* ── Recent reports ── */}
      {allReports.length > 0 && (
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
              {t("parentRecentReports")}
            </Text>
            {allReports.length > 3 && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/(parent-tabs)/reports")}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#8E8E93" }}>
                  {t("seeAll")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
            {recentReports.map((report, idx) => (
              <View key={report.id}>
                <ReportRow
                  report={report}
                  monthsShort={monthsShort}
                  t={t}
                  tSubject={tSubject}
                  onPress={() => router.push("/(parent-tabs)/reports")}
                />
                {idx < recentReports.length - 1 && (
                  <View style={{ height: 0.5, backgroundColor: "#F2F2F7" }} />
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Quick actions ── */}
      <View style={{ marginHorizontal: 20, marginBottom: 8 }}>
        <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 12 }}>
          {t("quickActionsTitle")}
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {quickActions.map(({ key, icon: Icon, color, bg, label, onPress }) => (
            <TouchableOpacity
              key={key}
              activeOpacity={0.85}
              onPress={onPress}
              style={{ flex: 1, alignItems: "center", gap: 8 }}
            >
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                <Icon size={24} color={color} />
              </View>
              <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: "#1C1C1E", textAlign: "center", lineHeight: 15 }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
