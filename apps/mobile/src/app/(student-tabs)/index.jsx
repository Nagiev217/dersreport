import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  BookOpen, Calendar, FileText, Bell, Shield, LogOut, ChevronRight, Trophy,
} from "lucide-react-native";
import { signOut } from "firebase/auth";
import { auth } from "@/utils/firebase/config";
import { useStudentData } from "@/utils/firebase/studentRealtime";
import { clearCachedRole } from "@/utils/auth/roleCache";
import { useT } from "@/utils/i18n";

const pad = (n) => String(n).padStart(2, "0");
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatDateShortLocal(s, monthsArr) {
  if (!s) return "";
  const [, m, d] = s.split("-").map(Number);
  return `${d} ${monthsArr[m - 1]}`;
}
function getGreeting(t) {
  const h = new Date().getHours();
  if (h < 12) return t("goodMorning");
  if (h < 17) return t("goodAfternoon");
  return t("goodEvening");
}

function CircleProgress({ size = 56, progress = 0, color = "#10B981", trackColor = "#E5E5EA", strokeWidth = 5 }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, progress)) / 100);
  const c = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={c} cy={c} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={c} cy={c} r={r} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color }}>{progress}%</Text>
    </View>
  );
}

export default function StudentDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tSubject, tName, months } = useT();
  const monthsShort = months(true);

  const { student, reports, lessons, loading } = useStudentData();
  const displayName = auth?.currentUser?.displayName ?? t("roleStudentTitle");

  const handleSignOut = () => {
    Alert.alert(t("profileSignOutTitle"), t("profileSignOutMsg"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("profileSignOutBtn"),
        style: "destructive",
        onPress: async () => {
          await clearCachedRole();
          signOut(auth).then(() => router.replace("/role-select")).catch(() => router.replace("/role-select"));
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#10B981" size="large" />
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 12 }}>
          {t("loadingData")}
        </Text>
      </View>
    );
  }

  const today = todayStr();
  const upcoming = lessons
    .filter((l) => l.date >= today && l.status === "planned")
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
  const todayLessonsCount = lessons.filter((l) => l.date === today && l.status === "planned").length;
  const attend = student?.attendance ?? 0;
  const attendColor = attend >= 90 ? "#22C55E" : attend >= 75 ? "#F59E0B" : "#EF4444";
  const unreadCount = reports.filter((r) => !r.isRead).length;
  const recentReports = reports.slice(0, 3);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F2F2F7" }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      {/* Top bar */}
      <View style={{ backgroundColor: "#FFFFFF", paddingTop: insets.top + 4, paddingHorizontal: 20, paddingBottom: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
          <Shield size={18} color="#10B981" />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity activeOpacity={0.7} style={{ position: "relative", width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
            <Bell size={22} color="#1C1C1E" />
            {unreadCount > 0 && (
              <View style={{ position: "absolute", top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: "#10B981", borderWidth: 1.5, borderColor: "#FFFFFF" }} />
            )}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={handleSignOut} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
            <LogOut size={18} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting */}
      <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}>
        <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{getGreeting(t)},</Text>
        <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: "#1C1C1E", letterSpacing: -0.5, marginTop: 2 }}>
          {tName(displayName)}!
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 4 }}>
          {t("studentDashboardBadge")}
        </Text>
      </View>

      <View style={{ height: 12 }} />

      {/* Stats card */}
      <LinearGradient
        colors={["#10B981", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ marginHorizontal: 20, borderRadius: 22, padding: 20, marginBottom: 16 }}
      >
        <View style={{ flexDirection: "row" }}>
          {[
            { Icon: BookOpen, value: todayLessonsCount,                label: t("studentStatTodayLessons") },
            { Icon: Trophy,   value: student ? `${student.score ?? 0}` : "—", label: t("studentStatScore") },
            { Icon: Calendar, value: `${attend}%`,                     label: t("studentStatAttend") },
          ].map(({ Icon, value, label }, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <Icon size={20} color="rgba(255,255,255,0.75)" />
              <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 6 }}>{value}</Text>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 3 }}>{label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Empty state — not linked to any teacher yet */}
      {!student && (
        <View style={{ margin: 20, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 32, alignItems: "center" }}>
          <Shield size={40} color="#C7C7CC" />
          <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginTop: 16, marginBottom: 8 }}>
            {t("studentNotLinkedYet")}
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center", lineHeight: 20 }}>
            {t("studentNoTeachersHint")}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(student-tabs)/profile")}
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#10B981", borderRadius: 14 }}
          >
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("studentProfileIDLabel")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Next lesson + attendance card */}
      {student && (
        <View style={{
          backgroundColor: "#FFFFFF", borderRadius: 20, marginHorizontal: 20, marginBottom: 16, padding: 16,
          shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
        }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: "#F8F8FB", borderRadius: 14, padding: 12 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#8E8E93", marginBottom: 8 }}>
                {t("studentNextLesson")}
              </Text>
              {upcoming ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <Calendar size={12} color="#10B981" />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}>
                      {formatDateShortLocal(upcoming.date, monthsShort)}, {upcoming.time}
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
            <View style={{ flex: 1, backgroundColor: "#F8F8FB", borderRadius: 14, padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#8E8E93", marginBottom: 8, alignSelf: "flex-start" }}>
                {t("studentStatAttend")}
              </Text>
              <CircleProgress size={56} progress={attend} color={attendColor} strokeWidth={5} />
            </View>
          </View>
        </View>
      )}

      {/* Recent reports */}
      {reports.length > 0 && (
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{t("studentRecentReports")}</Text>
            {reports.length > 3 && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/(student-tabs)/reports")}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#8E8E93" }}>{t("seeAll")}</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
            {recentReports.map((report, idx) => {
              const scoreColors = { 5: "#22C55E", 4: "#3B82F6", 3: "#F59E0B", 2: "#F97316", 1: "#EF4444" };
              const color = scoreColors[report.activityScore] ?? "#F59E0B";
              const pct = (report.activityScore ?? 3) * 20;
              return (
                <TouchableOpacity
                  key={report.id}
                  activeOpacity={0.8}
                  onPress={() => router.push("/(student-tabs)/reports")}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 12, borderTopWidth: idx > 0 ? 0.5 : 0, borderTopColor: "#F2F2F7" }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" }}>
                    <FileText size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }} numberOfLines={1}>
                      {tSubject(report.subject)}
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 2 }}>
                      {report.date}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: color + "22", borderRadius: 10 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color }}>{pct}%</Text>
                  </View>
                  <ChevronRight size={16} color="#C7C7CC" />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
