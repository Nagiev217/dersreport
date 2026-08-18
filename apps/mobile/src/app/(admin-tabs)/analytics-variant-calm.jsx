import { useCallback, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Share, Alert, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Download } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { getOrgAnalytics, listManagedTeachers, getFinanceOverview, getMonthlyPaymentsExport, getTeacherWorkload , clearAdminCache } from "@/utils/firebase/adminAccounts";
import { useT } from "@/utils/i18n";

// ─── "Calm" variant — quiet, low-contrast, monochrome-first. Nothing fights
// for attention: no card borders/shadows, no colored badges, no gradients,
// no per-row icons, no entrance animation. Color is reserved for the two
// things that are genuinely actionable — the finance trend and debtor count.
const ACCENT = "#2563EB";
const INK    = "#111827";
const SUB    = "#6B7280";
const FAINT  = "#9CA3AF";
const LINE   = "#ECEDF0";
const DANGER  = "#DC2626";
const SUCCESS = "#16A34A";

const METHOD_KEYS = { card: "adminExportMethodCard", cash: "adminExportMethodCash", transfer: "adminExportMethodTransfer" };

function escapeCsv(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function Row({ label, value, valueColor = INK, first = false, sub }) {
  return (
    <View style={{ paddingVertical: 13, borderTopWidth: first ? 0 : 1, borderTopColor: LINE }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: INK, marginRight: 10 }}>{label}</Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: valueColor }}>{value}</Text>
      </View>
      {sub ? <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: FAINT, marginTop: 2 }}>{sub}</Text> : null}
    </View>
  );
}

function SectionLabel({ children }) {
  return (
    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: FAINT, letterSpacing: 0.6, marginBottom: 6, marginTop: 22 }}>
      {children.toUpperCase()}
    </Text>
  );
}

export default function AdminAnalyticsCalm() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const [analytics, setAnalytics] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [finance, setFinance] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPeriod, setExportingPeriod] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

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

  const teacherRows = teachers
    .map((tch) => ({
      ...tch,
      name: `${tch.firstName} ${tch.lastName}`.trim() || tch.email,
      stats: analytics?.perTeacher?.[tch.uid] ?? { studentsCount: 0, lessonsCount: 0, reportsCount: 0 },
    }))
    .sort((a, b) => (hasFinance ? (b.stats.income ?? 0) - (a.stats.income ?? 0) : b.stats.studentsCount - a.stats.studentsCount));

  const TABS = [
    { key: "overview", label: t("repOvTab") },
    ...(hasWorkload ? [{ key: "workload", label: t("adminWorkloadTitle") }] : []),
    ...(finance ? [{ key: "finance", label: t("adminFinanceTitle") }] : []),
    { key: "teachers", label: t("adminAnalyticsByTeacher") },
  ];
  const activeKey = TABS.some((tb) => tb.key === activeTab) ? activeTab : "overview";

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FAINT} />}
      >
        {/* ── Header — plain, quiet ── */}
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: FAINT, letterSpacing: 0.6, marginBottom: 6 }}>
            JEFF COLLEGES
          </Text>
          <Text style={{ fontSize: 22, fontFamily: "Inter_600SemiBold", color: INK, letterSpacing: -0.3 }}>
            {t("adminAnalyticsTitle")}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginTop: 3 }}>
            {totals ? `${totals.teachersCount} ${t("adminTeachersCount")}` : ""}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={FAINT} style={{ marginTop: 60 }} />
        ) : !totals ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
              {t("adminEmptySection")}
            </Text>
          </View>
        ) : (
          <>
            {/* ── Quiet text tabs — underline only, no fills ── */}
            <View style={{ flexDirection: "row", gap: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: LINE, marginTop: 6 }}>
              {TABS.map((tb) => {
                const active = tb.key === activeKey;
                return (
                  <TouchableOpacity
                    key={tb.key}
                    onPress={() => setActiveTab(tb.key)}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel={tb.label}
                    accessibilityState={{ selected: active }}
                    style={{ paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: active ? ACCENT : "transparent" }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular", color: active ? INK : FAINT }}>
                      {tb.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ paddingHorizontal: 20 }}>
              {/* ── OVERVIEW ── */}
              {activeKey === "overview" ? (
                <View>
                  <Row first label={t("adminStatStudents")} value={totals.studentsCount} />
                  <Row label={t("adminStatLessons")} value={totals.lessonsCount} />
                  <Row label={t("adminStatReports")} value={totals.reportsCount} />
                  {hasFinance ? <Row label={t("adminStatIncome")} value={`${fmt(totals.income)} ₼`} /> : null}
                </View>
              ) : null}

              {/* ── WORKLOAD ── */}
              {activeKey === "workload" && hasWorkload ? (
                <View>
                  {workload.teachers.map((w, i) => {
                    const overloaded = workload.avgLessons > 0 && w.lessonsCount > workload.avgLessons * 1.5;
                    const idle = w.lessonsCount === 0;
                    const status = overloaded ? t("adminWorkloadOverloaded") : idle ? t("adminWorkloadIdle") : null;
                    return (
                      <Row
                        key={w.uid}
                        first={i === 0}
                        label={w.name}
                        sub={`${w.lessonsCount} ${t("adminWorkloadLessons")} · ${w.hours} ${t("adminWorkloadHours")}`}
                        value={status ?? ""}
                        valueColor={overloaded ? SUB : idle ? DANGER : SUB}
                      />
                    );
                  })}
                </View>
              ) : null}

              {/* ── FINANCE ── */}
              {activeKey === "finance" && finance ? (
                <View>
                  {finance.monthlyBreakdown.length >= 2 ? (() => {
                    const [latest, prev] = finance.monthlyBreakdown;
                    if (prev.amount === 0) return null;
                    const pct = Math.round(((latest.amount - prev.amount) / prev.amount) * 100);
                    const up = pct >= 0;
                    return (
                      <Text style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: up ? SUCCESS : DANGER, marginTop: 4, marginBottom: 4 }}>
                        {up ? "+" : ""}{pct}% {t("adminFinanceVsPrevMonth")}
                      </Text>
                    );
                  })() : null}

                  <Row first label={t("adminFinanceAvgCheck")} value={`${fmt(finance.avgCheck)} ₼`} />
                  <Row
                    label={t("adminFinanceDebtors")}
                    value={finance.debtors.length}
                    valueColor={finance.debtors.length > 0 ? DANGER : INK}
                  />

                  {finance.monthlyBreakdown.length > 0 ? (
                    <>
                      <SectionLabel>{t("adminFinanceMonthly")}</SectionLabel>
                      {(() => {
                        const maxAmt = Math.max(...finance.monthlyBreakdown.map((m) => m.amount), 1);
                        return finance.monthlyBreakdown.map((m, idx) => {
                          const prev = finance.monthlyBreakdown[idx + 1];
                          const delta = prev && prev.amount > 0
                            ? Math.round(((m.amount - prev.amount) / prev.amount) * 100)
                            : null;
                          const pctWidth = Math.max((m.amount / maxAmt) * 100, 4);
                          return (
                            <View key={m.period} style={{ paddingVertical: 10, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: LINE }}>
                              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: INK }}>{m.period}</Text>
                                  {delta !== null ? (
                                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: delta >= 0 ? SUCCESS : DANGER }}>
                                      {delta >= 0 ? "+" : ""}{delta}%
                                    </Text>
                                  ) : null}
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: INK }}>{fmt(m.amount)} ₼</Text>
                                  <TouchableOpacity
                                    onPress={() => handleExport(m.period)}
                                    disabled={exportingPeriod === m.period}
                                    activeOpacity={0.6}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${t("adminExportCsv")} ${m.period}`}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                  >
                                    {exportingPeriod === m.period
                                      ? <ActivityIndicator size="small" color={FAINT} />
                                      : <Download size={14} color={FAINT} />
                                    }
                                  </TouchableOpacity>
                                </View>
                              </View>
                              <View style={{ height: 3, borderRadius: 2, backgroundColor: LINE, overflow: "hidden" }}>
                                <View style={{ height: 3, borderRadius: 2, width: `${pctWidth}%`, backgroundColor: FAINT }} />
                              </View>
                            </View>
                          );
                        });
                      })()}
                    </>
                  ) : null}

                  {finance.debtors.length > 0 ? (
                    <>
                      <SectionLabel>{t("adminFinanceDebtorsSection")}</SectionLabel>
                      {finance.debtors.map((d, i) => (
                        <Row
                          key={`${d.teacherUid}-${d.studentId}`}
                          first={i === 0}
                          label={d.studentName}
                          sub={d.teacherName}
                          value=""
                        />
                      ))}
                    </>
                  ) : null}
                </View>
              ) : null}

              {/* ── TEACHERS ── */}
              {activeKey === "teachers" ? (
                <View>
                  {teacherRows.length === 0 ? (
                    <Text style={{ paddingVertical: 20, fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                      {t("adminEmptySection")}
                    </Text>
                  ) : teacherRows.map((tch, i) => (
                    <Row
                      key={tch.uid}
                      first={i === 0}
                      label={tch.name}
                      sub={`${tch.stats.studentsCount} ${t("adminStatStudents").toLowerCase()} · ${tch.stats.lessonsCount} ${t("adminStatLessons").toLowerCase()} · ${tch.stats.reportsCount} ${t("adminStatReports").toLowerCase()}`}
                      value={hasFinance ? `${fmt(tch.stats.income ?? 0)} ₼` : ""}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
