import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import {
  Bell, Settings, Users, GraduationCap, BookOpen, FileText, Wallet,
  TrendingUp, TrendingDown, Heart, UserPlus, BarChart2, ChevronRight,
  UserPlus2, ShieldCheck, Clock, ArrowUpRight, CalendarDays,
} from "lucide-react-native";
import {
  getOrgAnalytics, getFinanceOverview, getTeacherWorkload, getOrgActivity, listManagedTeachers, clearAdminCache,
} from "@/utils/firebase/adminAccounts";
import { useMyRole } from "@/utils/auth/useMyRole";
import { canManageAccounts, canViewFinance, canViewPayments, ROLES } from "@/utils/auth/permissions";
import { auth } from "@/utils/firebase/config";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

// ─── Design tokens — Blue + Indigo + White, matching the approved preview ───
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const BRAND_GRAD = [BLUE, INDIGO];
const CARD  = "#FFFFFF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";

const AVATAR_COLORS = ["#2563EB", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#8B5CF6", "#EC4899", "#0EA5E9"];
function avatarBg(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}
// Thousand separators — large sums (e.g. 676769296) are unreadable without them.
function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Subtle breathing scale on the banner icon — draws the eye without being loud.
function PulseIcon({ children }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const EVENT_META = {
  student: { color: BLUE,   bg: BLUE_50,   icon: UserPlus2 },
  report:  { color: INDIGO, bg: INDIGO_50, icon: FileText },
  payment: { color: "#F59E0B", bg: "#FFFBEB", icon: Wallet },
};

function timeAgo(ts, t) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("adminActivityJustNow");
  if (min < 60) return `${min} ${t("adminActivityMinAgo")}`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ${t("adminActivityHourAgo")}`;
  return `${Math.floor(hrs / 24)} ${t("adminActivityDayAgo")}`;
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tName } = useT();
  const role = useMyRole();

  const [analytics, setAnalytics] = useState(null);
  const [finance, setFinance] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [activity, setActivity] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [stats, fin, wl, act, list] = await Promise.all([
        getOrgAnalytics().catch(() => null),
        getFinanceOverview().catch(() => null),   // boss-only, null for admin
        getTeacherWorkload().catch(() => null),
        getOrgActivity().catch(() => []),
        listManagedTeachers().catch(() => []),
      ]);
      setAnalytics(stats);
      setFinance(fin);
      setWorkload(wl);
      setActivity(act ?? []);
      setTeachers(list ?? []);
    } catch {
      // pull-to-refresh lets them retry
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { clearAdminCache(); setRefreshing(true); load(); };

  const totals = analytics?.totals;
  const activeTeachers = teachers.filter((tc) => !tc.disabled).length;
  const displayName = auth?.currentUser?.displayName || t("adminTeacherFallback");
  const roleLabel = role === ROLES.ADMIN ? t("roleAdminTitle") : t("roleBossTitle");

  const go = (path) => router.push(path);

  // Header stat cards
  const STATS = [
    { icon: Users,    value: totals?.teachersCount ?? teachers.length, label: t("dashboardStatTeachers"), color: BLUE,      bg: BLUE_50 },
    { icon: GraduationCap, value: totals?.studentsCount ?? 0, label: t("adminStatStudents"), color: INDIGO,    bg: INDIGO_50 },
    { icon: BookOpen, value: totals?.lessonsCount ?? 0, label: t("adminStatLessons"), color: "#22C55E", bg: "#ECFDF5" },
    { icon: FileText, value: totals?.reportsCount ?? 0, label: t("adminStatReports"), color: "#D97706", bg: "#FFFBEB" },
    ...(totals && "income" in totals
      ? [{ icon: Wallet, value: `${fmt(totals.income)} ₼`, label: t("adminStatIncome"), color: "#059669", bg: "#ECFDF5" }]
      : []),
  ];

  // Quick access tiles
  const TILES = [
    { icon: GraduationCap, label: t("adminTeachingTab"), color: INDIGO, bg: INDIGO_50, route: "/(tabs)" },
    { icon: Users,     label: t("adminRosterTab"),    color: BLUE,      bg: BLUE_50,  route: "/(admin-tabs)/teachers" },
    role === ROLES.ADMIN
      ? { icon: CalendarDays, label: t("adminScheduleTab"), color: "#22C55E", bg: "#ECFDF5", route: "/(admin-tabs)/schedule" }
      : { icon: BarChart2, label: t("adminAnalyticsTab"), color: "#22C55E", bg: "#ECFDF5", route: "/(admin-tabs)/analytics" },
    { icon: Bell,      label: t("adminActivityTab"),  color: "#8B5CF6", bg: "#F3F0FF", route: "/(admin-tabs)/activity" },
    { icon: Heart,     label: t("adminParentsTab"),   color: "#EC4899", bg: "#FCE9F3", route: "/(admin-tabs)/parents" },
    ...(canViewPayments(role)
      ? [{ icon: Wallet, label: t("adminPaymentsTitle"), color: "#059669", bg: "#ECFDF5", route: "/(admin-tabs)/payments" }]
      : []),
    ...(canViewFinance(role)
      ? [{ icon: Wallet, label: t("salariesTitle"), color: "#D97706", bg: "#FFFBEB", route: "/(admin-tabs)/salaries" }]
      : []),
    ...(canManageAccounts(role)
      ? [{ icon: UserPlus, label: t("adminCreateTab"), color: "#F97316", bg: "#FFEDD5", route: "/(admin-tabs)/create" }]
      : []),
    { icon: Settings,  label: t("tabProfile"),        color: "#64748B", bg: "#F1F5F9", route: "/(admin-tabs)/profile" },
  ];

  // Finance KPIs (boss only)
  let momPct = null;
  if (finance && finance.monthlyBreakdown.length >= 2) {
    const [latest, prev] = finance.monthlyBreakdown;
    if (prev.amount > 0) momPct = Math.round(((latest.amount - prev.amount) / prev.amount) * 100);
  }

  const staffPreview = teachers.slice(0, 4);
  const workloadPreview = (workload?.teachers ?? []).slice(0, 4);
  const workloadMax = Math.max(...(workload?.teachers ?? []).map((w) => w.lessonsCount), 1);
  const activityPreview = activity.slice(0, 3);

  const activityLabel = (e) => {
    if (e.type === "student") return `${t("adminActivityNewStudent")} — ${tName(e.title)}`;
    if (e.type === "report")  return `${t("adminActivityNewReport")} — ${tName(e.title)}`;
    if (e.type === "payment") return `${t("adminActivityNewPayment")} — ${tName(e.title)} (${fmt(e.amount)} ₼)`;
    return e.title;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}>
                <GraduationCap size={18} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3, lineHeight: 19 }}>Jeff</Text>
                <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB, letterSpacing: 0.3 }}>Colleges</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <PressableScale
                onPress={() => go("/(admin-tabs)/activity")}
                accessibilityRole="button"
                accessibilityLabel={t("adminActivityTab")}
                scaleTo={0.92}
                style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
              >
                <Bell size={19} color={TEXT} />
                {activity.length > 0 ? <View style={{ position: "absolute", top: 11, right: 12, width: 7, height: 7, borderRadius: 4, backgroundColor: BLUE }} /> : null}
              </PressableScale>
              <PressableScale
                onPress={() => go("/(admin-tabs)/profile")}
                accessibilityRole="button"
                accessibilityLabel={t("tabProfile")}
                scaleTo={0.92}
                style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
              >
                <Settings size={19} color={TEXT} />
              </PressableScale>
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(380).easing(Easing.out(Easing.cubic))}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: "rgba(37,99,235,0.1)", flexDirection: "row", alignItems: "center", gap: 5 }}>
                <ShieldCheck size={12} color={BLUE} />
                <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: BLUE, letterSpacing: 0.2 }}>{roleLabel.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB }}>{t("dashboardWelcome")}</Text>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.5, marginTop: 2 }}>{displayName}</Text>
          </Animated.View>

          {/* Stat cards — wrapping grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
            {STATS.map((s, i) => (
              <Animated.View
                key={s.label}
                entering={FadeInDown.delay(80 + i * 60).duration(380).easing(Easing.out(Easing.cubic))}
                style={{ flexBasis: "47%", flexGrow: 1 }}
              >
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: BORDER, shadowColor: INDIGO, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: s.bg, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                    <s.icon size={17} color={s.color} />
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.4 }}>{s.value}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 11.5, fontFamily: "Inter_500Medium", color: SUB, marginTop: 3 }}>{s.label}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color={BLUE} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* ── SECTION 2 — Quick actions (white) ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
              <Animated.View entering={FadeInDown.duration(320)}>
                <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 14, letterSpacing: -0.3 }}>
                  {t("dashboardQuickAccess")}
                </Text>
              </Animated.View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {TILES.map((tile, i) => (
                  <Animated.View key={i} entering={FadeInDown.delay(50 + i * 40).duration(320)} style={{ flexBasis: "22%", flexGrow: 1 }}>
                    <PressableScale
                      onPress={() => go(tile.route)}
                      accessibilityRole="button"
                      accessibilityLabel={tile.label}
                      style={{ alignItems: "center", gap: 8, paddingVertical: 6 }}
                    >
                      <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: tile.bg, alignItems: "center", justifyContent: "center" }}>
                        <tile.icon size={22} color={tile.color} />
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: 11.5, fontFamily: "Inter_600SemiBold", color: TEXT, textAlign: "center" }}>{tile.label}</Text>
                    </PressableScale>
                  </Animated.View>
                ))}
              </View>
            </View>

            {/* ── SECTION 3 — Finance spotlight banner (gradient blue → indigo, boss only) ── */}
            {finance ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
                <Animated.View entering={FadeInDown.duration(360)}>
                  <PressableScale onPress={() => go("/(admin-tabs)/analytics")} style={{ borderRadius: 22, overflow: "hidden" }}>
                    <LinearGradient colors={BRAND_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, flexDirection: "row", alignItems: "center", gap: 16 }}>
                      <PulseIcon>
                        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
                          <TrendingUp size={24} color="#FFFFFF" />
                        </View>
                      </PulseIcon>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{fmt(finance.totalIncome)} ₼</Text>
                        <Text style={{ fontSize: 12.5, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.82)", marginTop: 3, lineHeight: 17 }}>
                          {t("adminStatIncome")}
                        </Text>
                      </View>
                      {typeof momPct === "number" ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(255,255,255,0.16)", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 }}>
                          {momPct >= 0 ? <ArrowUpRight size={12} color="#FFFFFF" /> : <TrendingDown size={12} color="#FFFFFF" />}
                          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{momPct >= 0 ? "+" : ""}{momPct}%</Text>
                        </View>
                      ) : (
                        <ChevronRight size={20} color="rgba(255,255,255,0.9)" />
                      )}
                    </LinearGradient>
                  </PressableScale>
                </Animated.View>

                {/* Secondary finance KPIs */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                  {[
                    { icon: TrendingUp, color: "#22C55E", bg: "#ECFDF5", label: t("adminFinanceAvgCheck"), value: `${fmt(finance.avgCheck)} ₼` },
                    { icon: FileText, color: INDIGO, bg: INDIGO_50, label: t("adminFinanceDebtors"), value: finance.debtors.length, danger: finance.debtors.length > 0 },
                    { icon: Users, color: "#D97706", bg: "#FFFBEB", label: t("dashboardStatTeachers"), value: `${activeTeachers}/${teachers.length}` },
                  ].map((m, i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(60 + i * 50).duration(320)} style={{ flexBasis: "31%", flexGrow: 1 }}>
                      <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 13, borderWidth: 1, borderColor: BORDER }}>
                        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: m.bg, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                          <m.icon size={14} color={m.color} />
                        </View>
                        <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: m.danger ? "#EF4444" : TEXT }}>{m.value}</Text>
                        <Text numberOfLines={1} style={{ fontSize: 10.5, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>{m.label}</Text>
                      </View>
                    </Animated.View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* ── SECTION 4 — Staff (white) ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
              <SectionHeader title={t("dashboardStaff")} action={t("dashboardSeeAll")} onPress={() => go("/(admin-tabs)/teachers")} />
              <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
                {staffPreview.length === 0 ? (
                  <Text style={{ padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>{t("adminRosterEmpty")}</Text>
                ) : staffPreview.map((tc, i) => {
                  const name = `${tc.firstName} ${tc.lastName}`.trim() || tc.email;
                  return (
                    <PressableScale
                      key={tc.uid}
                      scaleTo={0.985}
                      accessibilityRole="button"
                      accessibilityLabel={name}
                      onPress={() => router.push({ pathname: `/(admin-tabs)/teacher/${tc.uid}`, params: { name, email: tc.email, disabled: String(!!tc.disabled) } })}
                      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#F1F5F9" }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: avatarBg(name), alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" }}>{initials(name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>{name}</Text>
                        <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>{tc.email}</Text>
                      </View>
                      <View style={{ backgroundColor: tc.disabled ? "#FEF2F2" : "#ECFDF5", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: tc.disabled ? "#EF4444" : "#22C55E" }}>
                          {tc.disabled ? t("adminDisabledBadge") : t("dashboardStatusActive")}
                        </Text>
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            </View>

            {/* ── SECTION 6 — Notifications (white) ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
              <SectionHeader title={t("dashboardNotifications")} action={t("dashboardAllNotifications")} onPress={() => go("/(admin-tabs)/activity")} />
              <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
                {activityPreview.length === 0 ? (
                  <Text style={{ padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>{t("adminEmptySection")}</Text>
                ) : activityPreview.map((e, i) => {
                  const meta = EVENT_META[e.type] ?? EVENT_META.student;
                  return (
                    <View key={`${e.type}-${e.at}-${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#F1F5F9" }}>
                      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: meta.bg, alignItems: "center", justifyContent: "center" }}>
                        <meta.icon size={17} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }}>{activityLabel(e)}</Text>
                        <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>{e.teacherName}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Clock size={11} color="#94A3B8" />
                        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: "#94A3B8" }}>{timeAgo(e.at, t)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── SECTION 7 — Teacher workload (white) ── */}
            {workloadPreview.length > 0 ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
                <SectionHeader title={t("dashboardWorkload")} action={t("dashboardSeeAll")} onPress={() => go(role === ROLES.ADMIN ? "/(admin-tabs)/schedule" : "/(admin-tabs)/analytics")} />
                <View style={{ backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: BORDER }}>
                  {workloadPreview.map((w, i) => (
                    <View key={w.uid} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: i < workloadPreview.length - 1 ? 14 : 0 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: avatarBg(w.name), alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#FFF" }}>{initials(w.name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                          <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, flex: 1 }}>{w.name}</Text>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: SUB }}>{w.lessonsCount} {t("adminWorkloadLessonsShort")}</Text>
                        </View>
                        <View style={{ height: 6, borderRadius: 3, backgroundColor: "#F1F5F9", overflow: "hidden" }}>
                          <LinearGradient
                            colors={BRAND_GRAD}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={{ height: 6, borderRadius: 3, width: `${Math.max((w.lessonsCount / workloadMax) * 100, 3)}%` }}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, action, onPress }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3 }}>{title}</Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${action}`}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
        style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
      >
        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: BLUE }}>{action}</Text>
        <ChevronRight size={14} color={BLUE} />
      </TouchableOpacity>
    </View>
  );
}
