import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  FileText,
  ArrowLeft,
  Calendar,
  ChevronRight,
  User,
  Clock,
  FlaskConical,
} from "lucide-react-native";
import { useParentData } from "../../utils/firebase/parentRealtime";
import { useT } from "../../utils/i18n";
import PressableScale from "@/components/PressableScale";

// ─── Design tokens — Blue + Indigo + White, matching the parent home screen ──
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT   = "#111827";
const SUB    = "#8E93A1";
const BORDER = "#E5E9F2";
const GREEN  = "#22C55E";
const AMBER  = "#D97706";

// ─── Helpers (identical to reports.jsx — data layer untouched) ──────────────

const pad = (n) => String(n).padStart(2, "0");

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function currentMonthPrefix() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

const SUBJECT_COLORS = [BLUE, INDIGO, GREEN, "#F97316", "#EC4899", AMBER, "#14B8A6", "#EF4444"];
function subjectColor(name) {
  let h = 0;
  for (const c of (name ?? "")) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return SUBJECT_COLORS[Math.abs(h) % SUBJECT_COLORS.length];
}

const PCT_COLORS = { 100: GREEN, 80: BLUE, 60: AMBER, 40: "#F97316", 20: "#EF4444" };

function groupReportsByDate(list) {
  const groups = [];
  const seen = {};
  list.forEach((r) => {
    const key = r.date ?? "—";
    if (!seen[key]) { seen[key] = []; groups.push({ date: key, items: seen[key] }); }
    seen[key].push(r);
  });
  return groups;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
// Test variant: "timeline" — replaces the All/BySubject/ByType tab switcher
// with a single continuous chronological timeline (reusing the visual
// language of the "lesson history" timeline already used elsewhere in the
// app) plus a horizontal subject-filter chip row above it. Data derivation
// is identical to reports.jsx — this file only restructures presentation.

export default function ParentReportsVariantTimeline() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tSubject, tName, months } = useT();
  const monthsShort = months(true);
  const monthsFull  = months(false);

  const { reports, loading } = useParentData();
  const [subjectFilter, setSubjectFilter] = useState(null); // null = all subjects
  const [selectedReport, setSelectedReport] = useState(null);

  const today = todayStr();
  const thisMonth = currentMonthPrefix();
  const totalCount = reports.length;
  const monthCount = reports.filter((r) => (r.date ?? "").startsWith(thisMonth)).length;
  const lastReport = reports[0];
  const lastTime = lastReport?.createdAt
    ? new Date(lastReport.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;
  const lastLabel = lastReport
    ? (lastReport.date === today ? `${t("today")}, ${lastTime}` : lastReport.date)
    : "—";

  function dateHeader(dateStr) {
    if (!dateStr) return "—";
    const [, m, d] = dateStr.split("-").map(Number);
    const month = monthsFull[m - 1] ?? monthsShort[m - 1] ?? "";
    if (dateStr === today) return `${t("today")}, ${d} ${month}`;
    if (dateStr === yesterdayStr()) return `${t("yesterday") ?? "Вчера"}, ${d} ${month}`;
    return `${d} ${month}`;
  }

  function getReportType(r) {
    return r.homework ? t("reportTypeTopic") : t("reportTypeMain");
  }
  function getReportTypeColor(r) {
    return r.homework ? GREEN : INDIGO;
  }

  // Subjects present across all reports (for the filter chip row) — computed
  // from the full unfiltered set so a chosen filter never makes other chips
  // disappear.
  const subjects = useMemo(() => {
    const set = new Set();
    reports.forEach((r) => { if (r.subject) set.add(r.subject); });
    return Array.from(set);
  }, [reports]);

  const filteredReports = subjectFilter
    ? reports.filter((r) => r.subject === subjectFilter)
    : reports;

  const dateGroups = groupReportsByDate(filteredReports);

  // ── Detail view ────────────────────────────────────────────────────────
  if (selectedReport) {
    const r = selectedReport;
    const pct = (r.activityScore ?? 3) * 20;
    const pctColor = PCT_COLORS[pct] ?? AMBER;
    const color = subjectColor(r.subject);
    const sections = [
      { label: t("reportSectionStrengths"), value: r.strengths,      color: GREEN },
      { label: t("reportDifficulties"),     value: r.difficulties,   color: AMBER },
      { label: t("childHW"),                value: r.homework,       color: INDIGO },
      { label: t("reportSectionNextPlan"),  value: r.nextLessonPlan, color: BLUE },
      { label: t("reportSectionComment"),   value: r.comment,        color: SUB },
    ].filter((s) => s.value);

    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <View style={{
          backgroundColor: "#FFFFFF",
          paddingTop: insets.top + 4,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}>
          <PressableScale
            onPress={() => setSelectedReport(null)}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={t("parentReportsBack")}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={20} color={TEXT} />
          </PressableScale>
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{t("reportsTitle")}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: BORDER }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 15, backgroundColor: color + "1F", alignItems: "center", justifyContent: "center" }}>
                <FileText size={24} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{tSubject(r.subject)}</Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: getReportTypeColor(r) }}>{getReportType(r)}</Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: pctColor + "1F", borderRadius: 10 }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: pctColor }}>{pct}%</Text>
              </View>
            </View>
            {r.topic && <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 8 }}>{r.topic}</Text>}
            {r.description && <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#3C3C43", lineHeight: 22 }}>{r.description}</Text>}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <User size={12} color={SUB} />
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>{tName(r.studentName)}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Calendar size={12} color={SUB} />
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>{r.date}</Text>
              </View>
            </View>
          </View>

          {sections.map(({ label, value, color: sc }) => (
            <View key={label} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: BORDER }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: sc, marginBottom: 8 }}>{label}</Text>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#3C3C43", lineHeight: 22 }}>{value}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── Timeline view ──────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* ── Nav bar ── */}
      <View style={{
        backgroundColor: "#FFFFFF",
        paddingTop: insets.top + 4,
        paddingHorizontal: 16,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <PressableScale
          onPress={() => router.push("/(parent-tabs)/")}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
        >
          <ArrowLeft size={20} color={TEXT} />
        </PressableScale>
        <Text style={{ fontSize: 17, fontFamily: "Inter_600SemiBold", color: TEXT }}>
          {t("reportsTitle")}
        </Text>
        {/* Temporary — jumps back to the current tabbed version for
            side-by-side comparison. Remove once a version is picked. */}
        <PressableScale
          onPress={() => router.push("/(parent-tabs)/reports")}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Текущая версия"
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}
        >
          <FlaskConical size={18} color={INDIGO} />
        </PressableScale>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={BLUE} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* ── Stats card ── */}
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: BORDER }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center", marginRight: 16 }}>
              <FileText size={22} color={INDIGO} />
            </View>
            <View style={{ flex: 1, flexDirection: "row" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>{t("reportTotalCount")}</Text>
                <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT }}>{totalCount}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>{t("reportThisMonth")}</Text>
                <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT }}>{monthCount}</Text>
              </View>
              <View style={{ flex: 1.4 }}>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>{t("reportLastOne")}</Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }} numberOfLines={1}>{lastLabel}</Text>
              </View>
            </View>
          </View>

          {/* ── Subject filter chips ── */}
          {subjects.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setSubjectFilter(null)}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: subjectFilter === null ? BLUE : "#FFFFFF",
                  borderWidth: 1, borderColor: subjectFilter === null ? BLUE : BORDER,
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: subjectFilter === null ? "#FFFFFF" : TEXT }}>
                  {t("reportFilterAllSubjects")}
                </Text>
              </TouchableOpacity>
              {subjects.map((s) => {
                const active = subjectFilter === s;
                const color = subjectColor(s);
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setSubjectFilter(active ? null : s)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 6,
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: active ? color : "#FFFFFF",
                      borderWidth: 1, borderColor: active ? color : BORDER,
                    }}
                  >
                    <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: active ? "#FFFFFF" : color }} />
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : TEXT }}>
                      {tSubject(s)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* ── Timeline ── */}
          {filteredReports.length === 0 ? (
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 40, alignItems: "center", borderWidth: 1, borderColor: BORDER }}>
              <FileText size={32} color="#C7C7CC" />
              <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: SUB, marginTop: 14, textAlign: "center" }}>
                {t("parentReportsEmpty")}
              </Text>
            </View>
          ) : (
            dateGroups.map(({ date, items }, gIdx) => (
              <View key={date} style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: SUB, marginBottom: 10, marginTop: gIdx === 0 ? 0 : 8 }}>
                  {dateHeader(date)}
                </Text>
                {items.map((r, idx) => {
                  const color = subjectColor(r.subject);
                  const pct = (r.activityScore ?? 3) * 20;
                  const pctColor = PCT_COLORS[pct] ?? AMBER;
                  const timeStr = r.createdAt
                    ? new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : null;
                  const isLast = idx === items.length - 1;

                  return (
                    <TouchableOpacity
                      key={r.id}
                      activeOpacity={0.85}
                      onPress={() => setSelectedReport(r)}
                      style={{ flexDirection: "row", gap: 12 }}
                    >
                      {/* Timeline rail */}
                      <View style={{ alignItems: "center", width: 16 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginTop: 6 }} />
                        {!isLast && <View style={{ width: 1.5, flex: 1, backgroundColor: BORDER, marginTop: 4, minHeight: 40 }} />}
                      </View>

                      {/* Card */}
                      <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: BORDER }}>
                        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT }}>
                              {tSubject(r.subject)}
                            </Text>
                            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: getReportTypeColor(r) }}>
                              {getReportType(r)}
                            </Text>
                            {r.topic && (
                              <Text style={{ fontSize: 12.5, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }} numberOfLines={1}>
                                {r.topic}
                              </Text>
                            )}
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <User size={11} color="#C7C7CC" />
                                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>
                                  {tName(r.studentName)}
                                </Text>
                              </View>
                              {timeStr && (
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                  <Clock size={11} color="#C7C7CC" />
                                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>
                                    {timeStr}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>

                          <View style={{ alignItems: "center", gap: 6 }}>
                            <View style={{ paddingHorizontal: 9, paddingVertical: 4, backgroundColor: pctColor + "1F", borderRadius: 9 }}>
                              <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: pctColor }}>{pct}%</Text>
                            </View>
                            <ChevronRight size={15} color="#C7C7CC" />
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
