import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import {
  FileText,
  Bell,
  Menu,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
} from "lucide-react-native";
import { useParentData } from "../../utils/firebase/parentRealtime";
import { useT } from "../../utils/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const SUBJECT_COLORS = ["#6B5CF6", "#3B82F6", "#22C55E", "#F97316", "#EC4899", "#F59E0B", "#14B8A6", "#EF4444"];
function subjectColor(name) {
  let h = 0;
  for (const c of (name ?? "")) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return SUBJECT_COLORS[Math.abs(h) % SUBJECT_COLORS.length];
}

const PCT_COLORS = {
  100: "#22C55E", 80: "#3B82F6", 60: "#F59E0B", 40: "#F97316", 20: "#EF4444",
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const MAIN_TABS = ["all", "bySubject", "byType"];

export default function ParentReports() {
  const insets = useSafeAreaInsets();
  const { highlight } = useLocalSearchParams();
  const { t, tSubject, tName, months } = useT();
  const monthsShort = months(true);
  const monthsFull  = months(false);

  const { reports, students: children, loading } = useParentData();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);

  // ── Stats ────────────────────────────────────────────────────────────────
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

  // ── Date grouping ────────────────────────────────────────────────────────
  function dateHeader(dateStr) {
    if (!dateStr) return "—";
    const [, m, d] = dateStr.split("-").map(Number);
    const month = monthsFull[m - 1] ?? monthsShort[m - 1] ?? "";
    if (dateStr === today) return `${t("today")}, ${d} ${month}`;
    if (dateStr === yesterdayStr()) return `${t("yesterday") ?? "Вчера"}, ${d} ${month}`;
    return `${d} ${month}`;
  }

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

  // ── Subject grouping ─────────────────────────────────────────────────────
  function groupBySubject(list) {
    const map = {};
    list.forEach((r) => {
      const s = r.subject ?? "—";
      if (!map[s]) map[s] = [];
      map[s].push(r);
    });
    return Object.entries(map).map(([subject, items]) => ({ subject, items }));
  }

  // ── Report type ──────────────────────────────────────────────────────────
  function getReportType(r) {
    return r.homework ? t("reportTypeTopic") : t("reportTypeMain");
  }
  function getReportTypeColor(r) {
    return r.homework ? "#22C55E" : "#6B5CF6";
  }

  const tabLabels = {
    all:       t("reportsAllTab"),
    bySubject: t("reportsBySubject"),
    byType:    t("reportsByType"),
  };

  function getReportType(r) {
    return r.homework ? t("reportTypeTopic") : t("reportTypeMain");
  }
  function getReportTypeColor(r) {
    return r.homework ? "#22C55E" : "#6B5CF6";
  }

  // ── Detail view ──────────────────────────────────────────────────────────
  if (selectedReport) {
    const r = selectedReport;
    const pct = (r.activityScore ?? 3) * 20;
    const pctColor = PCT_COLORS[pct] ?? "#F59E0B";
    const color = subjectColor(r.subject);
    const sections = [
      { label: t("reportSectionStrengths"),   value: r.strengths,     color: "#22C55E" },
      { label: t("reportDifficulties"),        value: r.difficulties,  color: "#F59E0B" },
      { label: t("childHW"),                  value: r.homework,      color: "#6B5CF6" },
      { label: t("reportSectionNextPlan"),    value: r.nextLessonPlan, color: "#3B82F6" },
      { label: t("reportSectionComment"),     value: r.comment,        color: "#8E8E93" },
    ].filter((s) => s.value);

    return (
      <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
        <View style={{
          backgroundColor: "#FFFFFF",
          paddingTop: insets.top + 4,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}>
          <TouchableOpacity onPress={() => setSelectedReport(null)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <ChevronRight size={16} color="#6B5CF6" style={{ transform: [{ rotate: "180deg" }] }} />
            <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: "#6B5CF6" }}>{t("parentReportsBack")}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 15, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
                <FileText size={24} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{tSubject(r.subject)}</Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: getReportTypeColor(r) }}>{getReportType(r)}</Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: pctColor + "22", borderRadius: 10 }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: pctColor }}>{pct}%</Text>
              </View>
            </View>
            {r.topic && <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#1C1C1E", marginBottom: 8 }}>{r.topic}</Text>}
            {r.description && <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#3C3C43", lineHeight: 22 }}>{r.description}</Text>}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: "#F2F2F7" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <User size={12} color="#8E8E93" />
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{tName(r.studentName)}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Calendar size={12} color="#8E8E93" />
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{r.date}</Text>
              </View>
            </View>
          </View>

          {sections.map(({ label, value, color: sc }) => (
            <View key={label} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 10 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: sc, marginBottom: 8 }}>{label}</Text>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#3C3C43", lineHeight: 22 }}>{value}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      {/* ── Top bar ── */}
      <View style={{ backgroundColor: "#FFFFFF", paddingTop: insets.top + 4, paddingHorizontal: 20, paddingBottom: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
          <Menu size={18} color="#1C1C1E" />
        </View>
        <View style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
          <Bell size={22} color="#1C1C1E" />
          {reports.some((r) => !r.isRead) && (
            <View style={{ position: "absolute", top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: "#6B5CF6", borderWidth: 1.5, borderColor: "#FFFFFF" }} />
          )}
        </View>
      </View>

      {/* ── Title ── */}
      <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 0 }}>
        <Text style={{ fontSize: 30, fontFamily: "Inter_700Bold", color: "#1C1C1E", letterSpacing: -0.5, marginBottom: 16 }}>
          {t("reportsTitle")}
        </Text>

        {/* ── Main tabs ── */}
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F2F2F7" }}>
          {MAIN_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
              style={{ paddingHorizontal: 12, paddingBottom: 12, marginRight: 4 }}
            >
              <Text style={{ fontSize: 14, fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_400Regular", color: activeTab === tab ? "#6B5CF6" : "#8E8E93" }}>
                {tabLabels[tab]}
              </Text>
              {activeTab === tab && (
                <View style={{ position: "absolute", bottom: 0, left: 12, right: 12, height: 2, backgroundColor: "#6B5CF6", borderRadius: 1 }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Filter chips ── */}
      <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {[
          { icon: Calendar,          label: t("reportFilterAllTime") },
          { icon: SlidersHorizontal, label: t("reportFilterAllSubjects") },
          { icon: null,              label: t("reportFilterType") },
        ].map(({ icon: Icon, label }) => (
          <TouchableOpacity
            key={label}
            activeOpacity={0.8}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#E5E5EA", backgroundColor: "#FFFFFF" }}
          >
            {Icon && <Icon size={13} color="#8E8E93" />}
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#3C3C43" }}>{label}</Text>
            <ChevronDown size={13} color="#8E8E93" />
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#6B5CF6" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* ── Stats card ── */}
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
              <FileText size={22} color="#6B5CF6" />
            </View>
            <View style={{ flex: 1, flexDirection: "row" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{t("reportTotalCount")}</Text>
                <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{totalCount}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{t("reportThisMonth")}</Text>
                <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{monthCount}</Text>
              </View>
              <View style={{ flex: 1.4 }}>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{t("reportLastOne")}</Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }} numberOfLines={1}>{lastLabel}</Text>
              </View>
            </View>
          </View>

          {/* ── Report list ── */}
          {reports.length === 0 ? (
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 40, alignItems: "center" }}>
              <FileText size={32} color="#C7C7CC" />
              <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: "#8E8E93", marginTop: 14, textAlign: "center" }}>
                {t("parentReportsEmpty")}
              </Text>
            </View>
          ) : activeTab === "bySubject" ? (
            // ── By subject view ──────────────────────────────────────────────
            <View style={{ gap: 12 }}>
              {groupBySubject(reports).map(({ subject, items }) => {
                const color = subjectColor(subject);
                const avgPct = Math.round(items.reduce((a, r) => a + (r.activityScore ?? 3) * 20, 0) / items.length);
                const pctColor = PCT_COLORS[Math.round(avgPct / 20) * 20] ?? "#F59E0B";
                return (
                  <View key={subject} style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color }}>{tSubject(subject ?? "?")[0]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{tSubject(subject)}</Text>
                        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{items.length} {t("parentStatReports").toLowerCase()}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: pctColor + "22", borderRadius: 10 }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: pctColor }}>{avgPct}%</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            // ── All / By type view grouped by date ──────────────────────────
            <View style={{ gap: 4 }}>
              {groupReportsByDate(
                activeTab === "byType"
                  ? [...reports].sort((a, b) => (b.homework ? 1 : 0) - (a.homework ? 1 : 0))
                  : reports
              ).map(({ date, items }) => (
                <View key={date}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#8E8E93", marginTop: 12, marginBottom: 8 }}>
                    {dateHeader(date)}
                  </Text>
                  <View style={{ gap: 8 }}>
                    {items.map((r) => {
                      const color = subjectColor(r.subject);
                      const pct = (r.activityScore ?? 3) * 20;
                      const pctColor = PCT_COLORS[pct] ?? "#F59E0B";
                      const timeStr = r.createdAt
                        ? new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : null;

                      return (
                        <TouchableOpacity
                          key={r.id}
                          activeOpacity={0.82}
                          onPress={() => setSelectedReport(r)}
                          style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                            {/* Subject icon */}
                            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
                              <FileText size={22} color={color} />
                            </View>

                            {/* Content */}
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
                                {tSubject(r.subject)}
                              </Text>
                              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: getReportTypeColor(r) }}>
                                {getReportType(r)}
                              </Text>
                              {r.topic && (
                                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 2 }} numberOfLines={1}>
                                  {r.topic}
                                </Text>
                              )}
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                  <User size={11} color="#C7C7CC" />
                                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
                                    {tName(r.studentName)}
                                  </Text>
                                </View>
                                {timeStr && (
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                    <Clock size={11} color="#C7C7CC" />
                                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
                                      {timeStr}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>

                            {/* Right badge + chevron */}
                            <View style={{ alignItems: "center", gap: 6 }}>
                              <View style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: pctColor + "22", borderRadius: 10 }}>
                                <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: pctColor }}>{pct}%</Text>
                              </View>
                              <ChevronRight size={16} color="#C7C7CC" />
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );

}
