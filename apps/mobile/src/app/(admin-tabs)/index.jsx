import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Svg, { Path } from "react-native-svg";
import {
  Bell, Settings, Users, GraduationCap, BookOpen, FileText, Wallet,
  TrendingUp, TrendingDown, Heart, UserPlus, BarChart2, ChevronRight,
  CreditCard, Banknote, ArrowLeftRight, UserPlus2,
} from "lucide-react-native";
import {
  getOrgAnalytics, getFinanceOverview, getTeacherWorkload, getOrgActivity, listManagedTeachers,
} from "@/utils/firebase/adminAccounts";
import { useMyRole } from "@/utils/auth/useMyRole";
import { canManageAccounts, ROLES } from "@/utils/auth/permissions";
import { auth } from "@/utils/firebase/config";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

const NAVY_GRAD = ["#22447A", "#152C51"];
const SHEET = "#F4F5F7";
const CARD  = "#FFFFFF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";

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
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// ─── Donut (SVG, reused pattern from teacher analytics) ─────────────────────
function Donut({ data, size = 118, strokeW = 18 }) {
  const r = (size - strokeW) / 2;
  const cx = size / 2, cy = size / 2;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const nonZero = data.filter((d) => d.value > 0);
  if (nonZero.length === 0) return null;
  const GAP = nonZero.length > 1 ? 0.06 : 0;
  let angle = -Math.PI / 2;
  const arcs = nonZero.map((item) => {
    const sweep = Math.max((item.value / total) * 2 * Math.PI - GAP, 0.01);
    const endA = angle + sweep;
    const x1 = (cx + r * Math.cos(angle)).toFixed(2);
    const y1 = (cy + r * Math.sin(angle)).toFixed(2);
    const x2 = (cx + r * Math.cos(endA)).toFixed(2);
    const y2 = (cy + r * Math.sin(endA)).toFixed(2);
    const large = sweep > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    angle = endA + GAP;
    return { ...item, path };
  });
  return (
    <Svg width={size} height={size}>
      {arcs.map((arc, i) => (
        <Path key={i} d={arc.path} stroke={arc.color} strokeWidth={strokeW} fill="none" strokeLinecap="round" />
      ))}
    </Svg>
  );
}

const METHOD_META = {
  card:     { icon: CreditCard,     color: "#2563EB", labelKey: "adminExportMethodCard" },
  cash:     { icon: Banknote,       color: "#22C55E", labelKey: "adminExportMethodCash" },
  transfer: { icon: ArrowLeftRight, color: "#8B5CF6", labelKey: "adminExportMethodTransfer" },
  other:    { icon: Wallet,         color: "#F59E0B", labelKey: "adminExportMethodOther" },
};

const EVENT_META = {
  student: { color: "#2563EB", bg: "#E8EEFB", icon: UserPlus2 },
  report:  { color: "#8B5CF6", bg: "#F0EAFC", icon: FileText },
  payment: { color: "#F59E0B", bg: "#FDF1DF", icon: Wallet },
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
  const onRefresh = () => { setRefreshing(true); load(); };

  const totals = analytics?.totals;
  const activeTeachers = teachers.filter((tc) => !tc.disabled).length;
  const displayName = auth?.currentUser?.displayName || t("adminTeacherFallback");
  const roleLabel = role === ROLES.ADMIN ? t("roleAdminTitle") : t("roleBossTitle");

  const go = (path) => router.push(path);

  // Header stat cards
  const STATS = [
    { icon: Users,    value: totals?.teachersCount ?? teachers.length, label: t("dashboardStatTeachers") },
    { icon: GraduationCap, value: totals?.studentsCount ?? 0, label: t("adminStatStudents") },
    { icon: BookOpen, value: totals?.lessonsCount ?? 0, label: t("adminStatLessons") },
    { icon: FileText, value: totals?.reportsCount ?? 0, label: t("adminStatReports") },
    ...(totals && "income" in totals
      ? [{ icon: Wallet, value: `${fmt(totals.income)} ₼`, label: t("adminStatIncome") }]
      : []),
  ];

  // Quick access tiles
  const TILES = [
    { icon: Users,     label: t("adminRosterTab"),    color: "#2563EB", bg: "#E8EEFB", route: "/(admin-tabs)/teachers" },
    { icon: BarChart2, label: t("adminAnalyticsTab"), color: "#22C55E", bg: "#E4F6EF", route: "/(admin-tabs)/analytics" },
    { icon: Bell,      label: t("adminActivityTab"),  color: "#8B5CF6", bg: "#F0EAFC", route: "/(admin-tabs)/activity" },
    { icon: Heart,     label: t("adminParentsTab"),   color: "#EC4899", bg: "#FCE9F3", route: "/(admin-tabs)/parents" },
    ...(canManageAccounts(role)
      ? [{ icon: UserPlus, label: t("adminCreateTab"), color: "#F59E0B", bg: "#FDF1DF", route: "/(admin-tabs)/create" }]
      : []),
    { icon: Settings,  label: t("tabProfile"),        color: "#64748B", bg: "#EEF1F5", route: "/(admin-tabs)/profile" },
  ];

  // Finance KPIs (boss only)
  let momPct = null;
  if (finance && finance.monthlyBreakdown.length >= 2) {
    const [latest, prev] = finance.monthlyBreakdown;
    if (prev.amount > 0) momPct = Math.round(((latest.amount - prev.amount) / prev.amount) * 100);
  }

  const donutData = finance
    ? finance.byMethod.map((m) => ({ value: m.amount, color: (METHOD_META[m.method] ?? METHOD_META.other).color, method: m.method }))
    : [];
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

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
    <View style={{ flex: 1, backgroundColor: SHEET }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NAVY_GRAD[1]} />}
      >
        <View style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: NAVY_GRAD[0] }} />

        {/* ── Navy header ─────────────────────────────────────────────── */}
        <LinearGradient
          colors={NAVY_GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 20 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
                <GraduationCap size={19} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.3, lineHeight: 19 }}>Jeff</Text>
                <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", letterSpacing: 0.3 }}>Colleges</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <PressableScale
                onPress={() => go("/(admin-tabs)/activity")}
                accessibilityRole="button"
                accessibilityLabel={t("adminActivityTab")}
                scaleTo={0.92}
                style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}
              >
                <Bell size={19} color="#FFFFFF" />
                {activity.length > 0 ? <View style={{ position: "absolute", top: 11, right: 12, width: 7, height: 7, borderRadius: 4, backgroundColor: "#38BDF8" }} /> : null}
              </PressableScale>
              <PressableScale
                onPress={() => go("/(admin-tabs)/profile")}
                accessibilityRole="button"
                accessibilityLabel={t("tabProfile")}
                scaleTo={0.92}
                style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}
              >
                <Settings size={19} color="#FFFFFF" />
              </PressableScale>
            </View>
          </View>

          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" }}>{t("dashboardWelcome")}</Text>
          <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.5, marginTop: 2 }}>{displayName}</Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{roleLabel}</Text>

          {/* Stat cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 18, paddingRight: 4 }} style={{ marginHorizontal: -2 }}>
            {STATS.map(({ icon: Icon, value, label }, i) => (
              <View key={i} style={{ width: 116, backgroundColor: "rgba(255,255,255,0.10)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 16, padding: 12 }}>
                <Icon size={18} color="#FFFFFF" strokeWidth={1.8} />
                <Text numberOfLines={1} style={{ fontSize: 19, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 8, letterSpacing: -0.4 }}>{value}</Text>
                <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 1, letterSpacing: 0.2 }}>{label}</Text>
              </View>
            ))}
          </ScrollView>
        </LinearGradient>

        {/* ── White sheet ─────────────────────────────────────────────── */}
        <View style={{ flex: 1, backgroundColor: SHEET, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -14, paddingTop: 22, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
          {loading ? (
            <ActivityIndicator color={NAVY_GRAD[1]} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Key finance metrics — boss only */}
              {finance ? (
                <>
                  <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 12, letterSpacing: -0.2 }}>{t("dashboardKeyMetrics")}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 26 }}>
                    {[
                      { icon: Wallet, color: "#2563EB", bg: "#E8EEFB", label: t("adminStatIncome"), value: `${fmt(finance.totalIncome)} ₼`, delta: momPct },
                      { icon: TrendingUp, color: "#22C55E", bg: "#E4F6EF", label: t("adminFinanceAvgCheck"), value: `${fmt(finance.avgCheck)} ₼` },
                      { icon: FileText, color: "#8B5CF6", bg: "#F0EAFC", label: t("adminFinanceDebtors"), value: finance.debtors.length, danger: finance.debtors.length > 0 },
                      { icon: Users, color: "#F59E0B", bg: "#FDF1DF", label: t("dashboardStatTeachers"), value: `${activeTeachers}/${teachers.length}` },
                    ].map((m, i) => (
                      <View key={i} style={{ flexBasis: "47%", flexGrow: 1, backgroundColor: CARD, borderRadius: 16, padding: 14, shadowColor: "#0B1B3A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: m.bg, alignItems: "center", justifyContent: "center" }}>
                            <m.icon size={16} color={m.color} />
                          </View>
                          {typeof m.delta === "number" ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                              {m.delta >= 0 ? <TrendingUp size={11} color="#22C55E" /> : <TrendingDown size={11} color="#EF4444" />}
                              <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: m.delta >= 0 ? "#22C55E" : "#EF4444" }}>{m.delta >= 0 ? "+" : ""}{m.delta}%</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text numberOfLines={1} style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: m.danger ? "#EF4444" : TEXT, marginTop: 10, letterSpacing: -0.4 }}>{m.value}</Text>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2, letterSpacing: 0.2 }}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {/* Quick access */}
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 12, letterSpacing: -0.2 }}>{t("dashboardQuickAccess")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 26 }}>
                {TILES.map((tile, i) => (
                  <PressableScale
                    key={i}
                    onPress={() => go(tile.route)}
                    accessibilityRole="button"
                    accessibilityLabel={tile.label}
                    style={{ flexBasis: "30.5%", flexGrow: 1, backgroundColor: CARD, borderRadius: 16, paddingVertical: 16, alignItems: "center", gap: 8, shadowColor: "#0B1B3A", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: tile.bg, alignItems: "center", justifyContent: "center" }}>
                      <tile.icon size={20} color={tile.color} />
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEXT }}>{tile.label}</Text>
                  </PressableScale>
                ))}
              </View>

              {/* Staff */}
              <SectionHeader title={t("dashboardStaff")} action={t("dashboardSeeAll")} onPress={() => go("/(admin-tabs)/teachers")} />
              <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", marginBottom: 26 }}>
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
                      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: i < staffPreview.length - 1 ? 1 : 0, borderBottomColor: "#F1F2F5" }}
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

              {/* Financial overview — donut by payment method, boss only */}
              {finance && donutTotal > 0 ? (
                <>
                  <SectionHeader title={t("dashboardFinanceOverview")} action={t("dashboardGoToFinance")} onPress={() => go("/(admin-tabs)/analytics")} />
                  <View style={{ backgroundColor: CARD, borderRadius: 18, padding: 16, marginBottom: 26, flexDirection: "row", alignItems: "center", gap: 16 }}>
                    <View
                      style={{ width: 118, height: 118, alignItems: "center", justifyContent: "center" }}
                      importantForAccessibility="no-hide-descendants"
                      accessibilityElementsHidden
                    >
                      <Donut data={donutData} />
                      <View style={{ position: "absolute", alignItems: "center", paddingHorizontal: 10 }}>
                        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT }}>
                          {fmt(finance.totalIncome)}
                        </Text>
                        <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB }}>₼</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, gap: 10 }}>
                      {finance.byMethod.map((m) => {
                        const meta = METHOD_META[m.method] ?? METHOD_META.other;
                        const pct = Math.round((m.amount / donutTotal) * 100);
                        return (
                          <View key={m.method} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: meta.color }} />
                            <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: TEXT }}>{t(meta.labelKey)}</Text>
                            <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: TEXT }}>{fmt(m.amount)} ₼</Text>
                            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, width: 34, textAlign: "right" }}>{pct}%</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </>
              ) : null}

              {/* Notifications */}
              <SectionHeader title={t("dashboardNotifications")} action={t("dashboardAllNotifications")} onPress={() => go("/(admin-tabs)/activity")} />
              <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", marginBottom: 26 }}>
                {activityPreview.length === 0 ? (
                  <Text style={{ padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>{t("adminEmptySection")}</Text>
                ) : activityPreview.map((e, i) => {
                  const meta = EVENT_META[e.type] ?? EVENT_META.student;
                  return (
                    <View key={`${e.type}-${e.at}-${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: i < activityPreview.length - 1 ? 1 : 0, borderBottomColor: "#F1F2F5" }}>
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: meta.bg, alignItems: "center", justifyContent: "center" }}>
                        <meta.icon size={16} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }}>{activityLabel(e)}</Text>
                        <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2, letterSpacing: 0.2 }}>{e.teacherName} · {timeAgo(e.at, t)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Teacher workload */}
              {workloadPreview.length > 0 ? (
                <>
                  <SectionHeader title={t("dashboardWorkload")} action={t("dashboardSeeAll")} onPress={() => go("/(admin-tabs)/analytics")} />
                  <View style={{ backgroundColor: CARD, borderRadius: 18, padding: 16, marginBottom: 8 }}>
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
                          <View style={{ height: 6, borderRadius: 3, backgroundColor: "#F1F2F5", overflow: "hidden" }}>
                            <View style={{ height: 6, borderRadius: 3, backgroundColor: NAVY_GRAD[1], width: `${Math.max((w.lessonsCount / workloadMax) * 100, 3)}%` }} />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, action, onPress }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>{title}</Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${action}`}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
        style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
      >
        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: NAVY_GRAD[1] }}>{action}</Text>
        <ChevronRight size={14} color={NAVY_GRAD[1]} />
      </TouchableOpacity>
    </View>
  );
}
