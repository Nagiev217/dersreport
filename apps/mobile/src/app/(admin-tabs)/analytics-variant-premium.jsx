import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Share, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import Animated, {
  FadeInDown, Easing,
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
} from "react-native-reanimated";
import {
  BarChart2, Users, BookOpen, FileText, Wallet, GraduationCap,
  TrendingUp, TrendingDown, AlertTriangle, Download, CalendarClock, Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { getOrgAnalytics, listManagedTeachers, getFinanceOverview, getMonthlyPaymentsExport, getTeacherWorkload , clearAdminCache } from "@/utils/firebase/adminAccounts";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

// ─── "Premium" variant — the full JEFF Exams treatment: alternating
// blue-50 → indigo-50 → white sections, Lucide icons, cascading fade-in and
// a slow-breathing spotlight icon. Same data/logic as the live screen —
// visual language only.
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const CARD   = "#FFFFFF";
const TEXT   = "#111827";
const SUB    = "#8E93A1";
const BORDER = "#E5E9F2";

const METHOD_KEYS = { card: "adminExportMethodCard", cash: "adminExportMethodCash", transfer: "adminExportMethodTransfer" };
const AVATAR_COLORS = [BLUE, "#22C55E", "#D97706", "#EF4444", "#06B6D4", INDIGO, "#EC4899", "#0EA5E9"];

function avatarBg(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}
function escapeCsv(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Slow breathing scale — the one "bounce-slow" accent moment on the screen.
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

function SectionHeader({ icon: Icon, title, accent }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <Icon size={16} color={accent ?? BLUE} />
      <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3 }}>{title}</Text>
    </View>
  );
}

export default function AdminAnalyticsPremium() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const [analytics, setAnalytics] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [finance, setFinance] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPeriod, setExportingPeriod] = useState(null);

  const load = useCallback(async () => {
    try {
      const [stats, list, fin, wl] = await Promise.all([
        getOrgAnalytics(),
        listManagedTeachers(),
        getFinanceOverview().catch(() => null),
        getTeacherWorkload().catch(() => null),
      ]);
      setAnalytics(stats);
      setTeachers(list);
      setFinance(fin);
      setWorkload(wl);
    } catch {
      // stays empty on failure — pull-to-refresh lets them retry
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { clearAdminCache(); setRefreshing(true); load(); };

  const handleExport = async (period) => {
    setExportingPeriod(period);
    try {
      const { rows } = await getMonthlyPaymentsExport(period);
      const header = [
        t("adminExportColDate"), t("adminExportColTeacher"), t("adminExportColStudent"),
        t("adminExportColAmount"), t("adminExportColMethod"), t("adminExportColNote"),
      ];
      const lines = [header.map(escapeCsv).join(",")];
      rows.forEach((r) => {
        const methodLabel = METHOD_KEYS[r.method] ? t(METHOD_KEYS[r.method]) : r.method;
        lines.push([r.date, r.teacherName, r.studentName, r.amount, methodLabel, r.note].map(escapeCsv).join(","));
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await Share.share({ title: `${t("adminFinanceTitle")} ${period}`, message: lines.join("\n") });
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert(t("error"), e?.message ?? t("errorGeneric"));
    } finally {
      setExportingPeriod(null);
    }
  };

  const totals = analytics?.totals;
  const hasFinance = !!totals && "income" in totals;
  const hasWorkload = !!workload && workload.teachers.length > 0;

  let momPct = null;
  if (finance && finance.monthlyBreakdown.length >= 2) {
    const [latest, prev] = finance.monthlyBreakdown;
    if (prev.amount > 0) momPct = Math.round(((latest.amount - prev.amount) / prev.amount) * 100);
  }

  const teacherRows = teachers
    .map((tch) => ({
      ...tch,
      name: `${tch.firstName} ${tch.lastName}`.trim() || tch.email,
      stats: analytics?.perTeacher?.[tch.uid] ?? { studentsCount: 0, lessonsCount: 0, reportsCount: 0 },
    }))
    .sort((a, b) => (hasFinance ? (b.stats.income ?? 0) - (a.stats.income ?? 0) : b.stats.studentsCount - a.stats.studentsCount));

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
      >
        {/* ── SECTION 1 — Hero (gradient blue-50 → indigo-50 → white) ── */}
        <LinearGradient
          colors={[BLUE_50, INDIGO_50, "#FFFFFF"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 24 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}>
              <BarChart2 size={18} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3, lineHeight: 19 }}>Jeff</Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB, letterSpacing: 0.3 }}>Colleges</Text>
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(380).easing(Easing.out(Easing.cubic))}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: "rgba(37,99,235,0.1)", flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Sparkles size={12} color={BLUE} />
                <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: BLUE, letterSpacing: 0.2 }}>JEFF EXAMS</Text>
              </View>
            </View>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.5 }}>
              {t("adminAnalyticsTitle")}
            </Text>
            <Text style={{ fontSize: 13.5, fontFamily: "Inter_400Regular", color: SUB, marginTop: 4 }}>
              {totals ? `${totals.teachersCount} ${t("adminTeachersCount")}` : ""}
            </Text>
          </Animated.View>

          {totals ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
              {[
                { icon: Users,    value: totals.studentsCount, label: t("adminStatStudents"), color: BLUE,      bg: BLUE_50 },
                { icon: BookOpen, value: totals.lessonsCount,  label: t("adminStatLessons"),  color: "#22C55E", bg: "#ECFDF5" },
                { icon: FileText, value: totals.reportsCount,  label: t("adminStatReports"),  color: INDIGO,    bg: INDIGO_50 },
                ...(hasFinance
                  ? [{ icon: Wallet, value: `${fmt(totals.income)} ₼`, label: t("adminStatIncome"), color: "#D97706", bg: "#FFFBEB" }]
                  : []),
              ].map(({ icon: Icon, value, label, color, bg }, i) => (
                <Animated.View
                  key={label}
                  entering={FadeInDown.delay(80 + i * 60).duration(380).easing(Easing.out(Easing.cubic))}
                  style={{ flexBasis: "47%", flexGrow: 1 }}
                >
                  <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: BORDER, shadowColor: INDIGO, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                      <Icon size={17} color={color} />
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.4 }}>{value}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 11.5, fontFamily: "Inter_500Medium", color: SUB, marginTop: 3 }}>{label}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          ) : null}
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color={BLUE} style={{ marginTop: 60 }} />
        ) : !totals ? (
          <View style={{ alignItems: "center", paddingTop: 50 }}>
            <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <BarChart2 size={32} color={BLUE} />
            </View>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
              {t("adminEmptySection")}
            </Text>
          </View>
        ) : (
          <>
            {/* ── SECTION 2 — Teacher workload (white) ── */}
            {hasWorkload ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
                <SectionHeader icon={CalendarClock} title={t("adminWorkloadTitle")} />
                <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
                  {workload.teachers.map((w, i) => {
                    const overloaded = workload.avgLessons > 0 && w.lessonsCount > workload.avgLessons * 1.5;
                    const idle = w.lessonsCount === 0;
                    return (
                      <Animated.View key={w.uid} entering={FadeInDown.delay(30 + i * 35).duration(300)}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#F1F5F9" }}>
                          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: avatarBg(w.name), alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#FFF" }}>{initials(w.name)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>{w.name}</Text>
                            <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>
                              {w.lessonsCount} {t("adminWorkloadLessons")} · {w.hours} {t("adminWorkloadHours")}
                            </Text>
                          </View>
                          {overloaded ? (
                            <View style={{ backgroundColor: "#FFFBEB", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                              <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#D97706" }}>{t("adminWorkloadOverloaded")}</Text>
                            </View>
                          ) : idle ? (
                            <View style={{ backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                              <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#EF4444" }}>{t("adminWorkloadIdle")}</Text>
                            </View>
                          ) : null}
                        </View>
                      </Animated.View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* ── SECTION 3 — Finance spotlight banner (gradient blue → indigo, boss only) ── */}
            {finance ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
                <Animated.View entering={FadeInDown.duration(360)}>
                  <View style={{ borderRadius: 22, overflow: "hidden" }}>
                    <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, flexDirection: "row", alignItems: "center", gap: 16 }}>
                      <PulseIcon>
                        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
                          <TrendingUp size={24} color="#FFFFFF" />
                        </View>
                      </PulseIcon>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{fmt(finance.avgCheck)} ₼</Text>
                        <Text style={{ fontSize: 12.5, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.82)", marginTop: 3, lineHeight: 17 }}>
                          {t("adminFinanceAvgCheck")}
                        </Text>
                      </View>
                      {typeof momPct === "number" ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(255,255,255,0.16)", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 }}>
                          {momPct >= 0 ? <TrendingUp size={12} color="#FFFFFF" /> : <TrendingDown size={12} color="#FFFFFF" />}
                          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{momPct >= 0 ? "+" : ""}{momPct}%</Text>
                        </View>
                      ) : null}
                    </LinearGradient>
                  </View>
                </Animated.View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER }}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: SUB }}>{t("adminFinanceDebtors")}</Text>
                    <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: finance.debtors.length > 0 ? "#EF4444" : TEXT, marginTop: 4 }}>
                      {finance.debtors.length}
                    </Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER }}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: SUB }}>{t("adminStatIncome")}</Text>
                    <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT, marginTop: 4 }}>
                      {fmt(totals?.income ?? 0)} ₼
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* ── SECTION 4 — Monthly breakdown + debtors (gradient blue-50 → indigo-50) ── */}
            {finance && (finance.monthlyBreakdown.length > 0 || finance.debtors.length > 0) ? (
              <LinearGradient colors={[BLUE_50, INDIGO_50]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ marginTop: 28, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 4 }}>
                {finance.monthlyBreakdown.length > 0 ? (
                  <>
                    <SectionHeader icon={TrendingUp} title={t("adminFinanceMonthly")} />
                    <Animated.View entering={FadeInDown.duration(340)}>
                      <View style={{ backgroundColor: CARD, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: BORDER }}>
                        {(() => {
                          const maxAmt = Math.max(...finance.monthlyBreakdown.map((m) => m.amount), 1);
                          return finance.monthlyBreakdown.map((m, idx) => {
                            const prev = finance.monthlyBreakdown[idx + 1];
                            const delta = prev && prev.amount > 0
                              ? Math.round(((m.amount - prev.amount) / prev.amount) * 100)
                              : null;
                            return (
                              <View key={m.period} style={{ marginBottom: idx < finance.monthlyBreakdown.length - 1 ? 14 : 0 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                    <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: SUB }}>{m.period}</Text>
                                    {delta !== null ? (
                                      <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: delta >= 0 ? "#22C55E" : "#EF4444" }}>
                                        {delta >= 0 ? "+" : ""}{delta}%
                                      </Text>
                                    ) : null}
                                  </View>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: TEXT }}>{fmt(m.amount)} ₼</Text>
                                    <PressableScale
                                      onPress={() => handleExport(m.period)}
                                      scaleTo={0.9}
                                      accessibilityRole="button"
                                      accessibilityLabel={`${t("adminExportCsv")} ${m.period}`}
                                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                      style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center" }}
                                    >
                                      {exportingPeriod === m.period
                                        ? <ActivityIndicator size="small" color={BLUE} />
                                        : <Download size={12} color={BLUE} />
                                      }
                                    </PressableScale>
                                  </View>
                                </View>
                                <View style={{ height: 6, borderRadius: 3, backgroundColor: "#F1F5F9", overflow: "hidden" }}>
                                  <LinearGradient
                                    colors={[BLUE, INDIGO]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={{ height: 6, borderRadius: 3, width: `${Math.max((m.amount / maxAmt) * 100, 4)}%` }}
                                  />
                                </View>
                              </View>
                            );
                          });
                        })()}
                      </View>
                    </Animated.View>
                  </>
                ) : null}

                {finance.debtors.length > 0 ? (
                  <>
                    <SectionHeader icon={AlertTriangle} title={t("adminFinanceDebtorsSection")} accent="#EF4444" />
                    <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", marginBottom: 4, borderWidth: 1, borderColor: BORDER }}>
                      {finance.debtors.map((d, i) => (
                        <Animated.View key={`${d.teacherUid}-${d.studentId}`} entering={FadeInDown.delay(i * 35).duration(280)}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#F1F5F9" }}>
                            <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, flex: 1 }}>{d.studentName}</Text>
                            <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>{d.teacherName}</Text>
                          </View>
                        </Animated.View>
                      ))}
                    </View>
                  </>
                ) : null}
              </LinearGradient>
            ) : null}

            {/* ── SECTION 5 — Per-teacher breakdown (white) ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
              <SectionHeader icon={GraduationCap} title={t("adminAnalyticsByTeacher")} />
              <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
                {teacherRows.length === 0 ? (
                  <Text style={{ padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                    {t("adminEmptySection")}
                  </Text>
                ) : teacherRows.map((tch, i) => (
                  <Animated.View key={tch.uid} entering={FadeInDown.delay(i * 35).duration(300)}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#F1F5F9" }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: avatarBg(tch.name), alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" }}>{initials(tch.name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>{tch.name}</Text>
                        <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>
                          {tch.stats.studentsCount} {t("adminStatStudents").toLowerCase()} · {tch.stats.lessonsCount} {t("adminStatLessons").toLowerCase()} · {tch.stats.reportsCount} {t("adminStatReports").toLowerCase()}
                        </Text>
                      </View>
                      {hasFinance ? (
                        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#22C55E" }}>
                          {fmt(tch.stats.income ?? 0)} ₼
                        </Text>
                      ) : null}
                    </View>
                  </Animated.View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
