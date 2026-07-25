import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Share, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { BarChart2, Users, BookOpen, FileText, Wallet, GraduationCap, TrendingUp, TrendingDown, AlertTriangle, Download, CalendarClock } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { getOrgAnalytics, listManagedTeachers, getFinanceOverview, getMonthlyPaymentsExport, getTeacherWorkload } from "@/utils/firebase/adminAccounts";
import { useT } from "@/utils/i18n";

const NAVY_GRAD = ["#22447A", "#152C51"];
const SHEET = "#F4F5F7";
const CARD  = "#FFFFFF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";

const METHOD_KEYS = { card: "adminExportMethodCard", cash: "adminExportMethodCash", transfer: "adminExportMethodTransfer" };

function escapeCsv(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
// Thousand separators — large sums are unreadable without them.
function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export default function AdminAnalytics() {
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
        getFinanceOverview().catch(() => null), // Boss-only — silently absent for Admin
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

  const onRefresh = () => { setRefreshing(true); load(); };

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
      // Haptics only on genuine commit/failure moments — firing on every tap
      // would train the user to ignore all of it.
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

  const teacherRows = teachers
    .map((tch) => ({
      ...tch,
      name: `${tch.firstName} ${tch.lastName}`.trim() || tch.email,
      stats: analytics?.perTeacher?.[tch.uid] ?? { studentsCount: 0, lessonsCount: 0, reportsCount: 0 },
    }))
    .sort((a, b) => (hasFinance ? (b.stats.income ?? 0) - (a.stats.income ?? 0) : b.stats.studentsCount - a.stats.studentsCount));

  return (
    <View style={{ flex: 1, backgroundColor: SHEET }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NAVY_GRAD[1]} />}
      >
        <View style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: NAVY_GRAD[0] }} />

        <LinearGradient
          colors={NAVY_GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 24 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
              <BarChart2 size={19} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.3, lineHeight: 19 }}>
                Jeff
              </Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", letterSpacing: 0.3 }}>
                Colleges
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.5 }}>
            {t("adminAnalyticsTitle")}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
            {totals ? `${totals.teachersCount} ${t("adminTeachersCount")}` : ""}
          </Text>
        </LinearGradient>

        <View style={{ flex: 1, backgroundColor: SHEET, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -14, paddingTop: 20, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
          {loading ? (
            <ActivityIndicator color={NAVY_GRAD[1]} style={{ marginTop: 40 }} />
          ) : !totals ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <BarChart2 size={32} color={NAVY_GRAD[1]} />
              </View>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                {t("adminEmptySection")}
              </Text>
            </View>
          ) : (
            <>
              {/* Totals grid */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                {[
                  { icon: Users,    value: totals.studentsCount, label: t("adminStatStudents"), color: "#2563EB", bg: "#E8EEFB" },
                  { icon: BookOpen, value: totals.lessonsCount,  label: t("adminStatLessons"),  color: "#22C55E", bg: "#E4F6EF" },
                  { icon: FileText, value: totals.reportsCount,  label: t("adminStatReports"),  color: "#8B5CF6", bg: "#F0EAFC" },
                  ...(hasFinance
                    ? [{ icon: Wallet, value: `${fmt(totals.income)} ₼`, label: t("adminStatIncome"), color: "#F59E0B", bg: "#FDF1DF" }]
                    : []),
                ].map(({ icon: Icon, value, label, color, bg }, i) => (
                  <View key={i} style={{ flexBasis: "47%", flexGrow: 1, backgroundColor: CARD, borderRadius: 16, padding: 14, shadowColor: "#0B1B3A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                      <Icon size={16} color={color} />
                    </View>
                    <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{value}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>{label}</Text>
                  </View>
                ))}
              </View>

              {/* Teacher workload — Boss/Admin */}
              {workload && workload.teachers.length > 0 ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <CalendarClock size={16} color={NAVY_GRAD[1]} />
                    <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>
                      {t("adminWorkloadTitle")}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", marginBottom: 24 }}>
                    {workload.teachers.map((w, i) => {
                      const overloaded = workload.avgLessons > 0 && w.lessonsCount > workload.avgLessons * 1.5;
                      const idle = w.lessonsCount === 0;
                      return (
                        <View
                          key={w.uid}
                          style={{
                            flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                            borderBottomWidth: i < workload.teachers.length - 1 ? 1 : 0,
                            borderBottomColor: "#F1F2F5",
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>{w.name}</Text>
                            <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>
                              {w.lessonsCount} {t("adminWorkloadLessons")} · {w.hours} {t("adminWorkloadHours")}
                            </Text>
                          </View>
                          {overloaded ? (
                            <View style={{ backgroundColor: "#FFFBEB", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                              <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#F59E0B" }}>{t("adminWorkloadOverloaded")}</Text>
                            </View>
                          ) : idle ? (
                            <View style={{ backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                              <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#EF4444" }}>{t("adminWorkloadIdle")}</Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {/* Finance — Boss only */}
              {finance ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <TrendingUp size={16} color={NAVY_GRAD[1]} />
                    <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>
                      {t("adminFinanceTitle")}
                    </Text>
                    {finance.monthlyBreakdown.length >= 2 ? (() => {
                      const [latest, prev] = finance.monthlyBreakdown;
                      if (prev.amount === 0) return null;
                      const pct = Math.round(((latest.amount - prev.amount) / prev.amount) * 100);
                      const up = pct >= 0;
                      return (
                        <View style={{
                          flexDirection: "row", alignItems: "center", gap: 3,
                          backgroundColor: up ? "#ECFDF5" : "#FEF2F2",
                          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                        }}>
                          {up ? <TrendingUp size={11} color="#22C55E" /> : <TrendingDown size={11} color="#EF4444" />}
                          <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: up ? "#22C55E" : "#EF4444" }}>
                            {up ? "+" : ""}{pct}% {t("adminFinanceVsPrevMonth")}
                          </Text>
                        </View>
                      );
                    })() : null}
                  </View>

                  <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                    <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 14 }}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>{t("adminFinanceAvgCheck")}</Text>
                      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT, marginTop: 4 }}>{fmt(finance.avgCheck)} ₼</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 14 }}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>{t("adminFinanceDebtors")}</Text>
                      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: finance.debtors.length > 0 ? "#EF4444" : TEXT, marginTop: 4 }}>
                        {finance.debtors.length}
                      </Text>
                    </View>
                  </View>

                  {/* Monthly breakdown — simple bar list */}
                  {finance.monthlyBreakdown.length > 0 ? (
                    <View style={{ backgroundColor: CARD, borderRadius: 18, padding: 16, marginBottom: 16 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 12 }}>
                        {t("adminFinanceMonthly")}
                      </Text>
                      {(() => {
                        const maxAmt = Math.max(...finance.monthlyBreakdown.map((m) => m.amount), 1);
                        return finance.monthlyBreakdown.map((m, idx) => {
                          const prev = finance.monthlyBreakdown[idx + 1];
                          const delta = prev && prev.amount > 0
                            ? Math.round(((m.amount - prev.amount) / prev.amount) * 100)
                            : null;
                          return (
                          <View key={m.period} style={{ marginBottom: 10 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
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
                                <TouchableOpacity
                                  onPress={() => handleExport(m.period)}
                                  disabled={exportingPeriod === m.period}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${t("adminExportCsv")} ${m.period}`}
                                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                  style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center" }}
                                >
                                  {exportingPeriod === m.period
                                    ? <ActivityIndicator size="small" color={NAVY_GRAD[1]} />
                                    : <Download size={12} color={NAVY_GRAD[1]} />
                                  }
                                </TouchableOpacity>
                              </View>
                            </View>
                            <View style={{ height: 6, borderRadius: 3, backgroundColor: "#F1F2F5", overflow: "hidden" }}>
                              <View style={{ height: 6, borderRadius: 3, backgroundColor: NAVY_GRAD[1], width: `${Math.max((m.amount / maxAmt) * 100, 4)}%` }} />
                            </View>
                          </View>
                          );
                        });
                      })()}
                    </View>
                  ) : null}

                  {/* Debtors */}
                  {finance.debtors.length > 0 ? (
                    <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", marginBottom: 24 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14, paddingBottom: 8 }}>
                        <AlertTriangle size={14} color="#EF4444" />
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }}>{t("adminFinanceDebtorsSection")}</Text>
                      </View>
                      {finance.debtors.map((d, i) => (
                        <View
                          key={`${d.teacherUid}-${d.studentId}`}
                          style={{
                            flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, paddingTop: 8,
                            borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#F1F2F5",
                          }}
                        >
                          <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, flex: 1 }}>{d.studentName}</Text>
                          <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>{d.teacherName}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}

              {/* Per-teacher breakdown */}
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 10 }}>
                {t("adminAnalyticsByTeacher")}
              </Text>
              <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", shadowColor: "#0B1B3A", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
                {teacherRows.length === 0 ? (
                  <Text style={{ padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                    {t("adminEmptySection")}
                  </Text>
                ) : teacherRows.map((tch, i) => (
                  <View
                    key={tch.uid}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                      borderBottomWidth: i < teacherRows.length - 1 ? 1 : 0,
                      borderBottomColor: "#F1F2F5",
                    }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center" }}>
                      <GraduationCap size={16} color={NAVY_GRAD[1]} />
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
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
