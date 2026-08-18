import {
  View,
  Text,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path, Line } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import {
  Filter,
  CalendarDays,
  Download,
  Users,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  GraduationCap,
} from "lucide-react-native";
import { useStudentsStore } from "@/utils/students/store";
import { useLessonsStore } from "@/utils/lessons/store";
import { useReportsStore } from "@/utils/reports/store";
import { useProgressStore } from "@/utils/progress/store";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const CARD   = "#FFFFFF";
const TEXT   = "#111827";
const SUB    = "#8E93A1";
const BORDER = "#E5E9F2";
const GREEN  = "#22C55E";
const AMBER  = "#D97706";

const SUBJECT_PALETTE = [
  { c: BLUE,      bg: BLUE_50 },
  { c: GREEN,     bg: "#ECFDF5" },
  { c: INDIGO,    bg: INDIGO_50 },
  { c: AMBER,     bg: "#FFFBEB" },
  { c: "#EC4899", bg: "#FCE7F1" },
  { c: "#06B6D4", bg: "#E1F5FA" },
];
function subjectColors(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return SUBJECT_PALETTE[h % SUBJECT_PALETTE.length];
}

const AVATAR_COLORS = [BLUE, GREEN, AMBER, "#EF4444", "#06B6D4", INDIGO, "#EC4899", "#0EA5E9"];
function avatarBg(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}

const RANK_COLORS = { 1: "#F59E0B", 2: "#94A3B8", 3: "#B45309" };

// ─── Donut chart (multi-segment) ───────────────────────────────────────────────

function Donut({ segments, size = 130, strokeWidth = 16, centerLabel, centerValue }) {
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let offsetAcc = 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        {segments.map((seg, i) => {
          const frac = seg.value / (segments.reduce((s, x) => s + x.value, 0) || 1);
          const segLen = frac * circ;
          const dashArray = `${segLen} ${circ - segLen}`;
          const dashOffset = -offsetAcc;
          offsetAcc += segLen;
          return (
            <Circle
              key={i}
              cx={c} cy={c} r={r}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
            />
          );
        })}
      </Svg>
      <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT }}>{centerValue}</Text>
      <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", marginTop: 2, maxWidth: size - 30 }}>
        {centerLabel}
      </Text>
    </View>
  );
}

// ─── Simple line chart ──────────────────────────────────────────────────────────

function LineChart({ values, labels, width, height = 160, color = GREEN }) {
  const padLeft = 32;
  const padBottom = 22;
  const chartW = width - padLeft - 8;
  const chartH = height - padBottom - 10;
  const max = 100;
  const stepX = chartW / (values.length - 1);

  const points = values.map((v, i) => ({
    x: padLeft + i * stepX,
    y: 10 + chartH * (1 - v / max),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${10 + chartH} L ${points[0].x} ${10 + chartH} Z`;

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <View>
      <Svg width={width} height={height}>
        {yTicks.map((t) => {
          const y = 10 + chartH * (1 - t / max);
          return (
            <Line key={t} x1={padLeft} y1={y} x2={width - 8} y2={y} stroke="#F1F5F9" strokeWidth={1} />
          );
        })}
        <Path d={areaPath} fill={color} fillOpacity={0.12} stroke="none" />
        <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={color} stroke="#FFFFFF" strokeWidth={2} />
        ))}
      </Svg>
      {/* y-axis labels */}
      <View style={{ position: "absolute", left: 0, top: 0, height: chartH + 10 }}>
        {yTicks.slice().reverse().map((t) => (
          <Text key={t} style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB, position: "absolute", top: 10 + chartH * (1 - t / max) - 6, width: 26, textAlign: "right" }}>
            {t}%
          </Text>
        ))}
      </View>
      {/* x-axis labels */}
      <View style={{ flexDirection: "row", marginLeft: padLeft, marginTop: 4 }}>
        {labels.map((l, i) => (
          <Text key={i} style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB, width: stepX, textAlign: "center" }}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Simple bar chart ───────────────────────────────────────────────────────────

function BarChart({ bars, width, height = 130 }) {
  const barW = Math.min(28, (width - 16) / bars.length - 8);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: height + 24, width }}>
      {bars.map((b, i) => (
        <View key={i} style={{ alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 9.5, fontFamily: "Inter_600SemiBold", color: SUB }}>{b.value}%</Text>
          <View style={{ width: barW, height: Math.max(4, (b.value / 100) * height), borderRadius: 6, backgroundColor: b.value === 0 ? "#F1F5F9" : GREEN }} />
          <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: SUB }}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Coming soon placeholder ────────────────────────────────────────────────────

function ComingSoon({ t }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 64, paddingHorizontal: 40 }}>
      <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <TrendingUp size={32} color={INDIGO} />
      </View>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", lineHeight: 20 }}>
        {t("repComingSoon")}
      </Text>
    </View>
  );
}

// ─── Section card wrapper ───────────────────────────────────────────────────────
function Card({ children, delay = 0 }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(320)}>
      <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER }}>
        {children}
      </View>
    </Animated.View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { t, tp, tSubject, tName, months, days } = useT();
  const [activeTab, setActiveTab] = useState("overview");

  const { students } = useStudentsStore();
  const { lessons }  = useLessonsStore();
  const { reports }  = useReportsStore();
  const { evaluations } = useProgressStore();

  const monthsShort = months(true);
  const daysShort = days(true);

  // ── Enrich students with a real 0-10 score from their latest evaluation ──
  const enriched = useMemo(() =>
    students.map((s) => {
      const evs = evaluations.filter((e) => e.studentId === s.id).sort((a, b) => b.createdAt - a.createdAt);
      const last = evs[0];
      const score = last ? ((last.activity + last.comprehension + last.homework + last.behavior) / 4) * 2 : 0;
      return { ...s, _score: score };
    }),
    [students, evaluations]
  );

  const scored = enriched.filter((s) => s._score > 0);
  const avgScorePct = scored.length
    ? Math.round(scored.reduce((a, s) => a + s._score, 0) / scored.length * 10)
    : 0;

  const completedLessons = lessons.filter((l) => l.status === "completed").length;

  // ── Last 7 days date range label ──
  const today = new Date();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
  const rangeLabel = `${weekStart.getDate()} – ${today.getDate()} ${monthsShort[today.getMonth()]} ${today.getFullYear()}`;

  // ── Illustrative 7-day trend around the real average (demo chart) ──
  const trendValues = useMemo(() => {
    const base = avgScorePct || 60;
    const offsets = [-14, -6, -10, -2, 2, 6, 3];
    return offsets.map((o) => Math.max(5, Math.min(100, base + o)));
  }, [avgScorePct]);
  const trendLabels = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      arr.push(`${d.getDate()} ${monthsShort[d.getMonth()]}`);
    }
    return arr;
  }, [monthsShort]);

  // ── Subject breakdown from real reports ──
  const bySubject = useMemo(() => {
    const map = {};
    reports.forEach((r) => {
      const key = r.subject ?? "—";
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.entries(map)
      .map(([subject, items]) => ({
        subject,
        avg: Math.round(items.reduce((a, r) => a + (r.activityScore ?? 3) * 20, 0) / items.length),
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  }, [reports]);

  // ── Score-band distribution (donut) from real students ──
  const bands = useMemo(() => {
    const excellent = scored.filter((s) => s._score * 10 >= 80).length;
    const good       = scored.filter((s) => s._score * 10 >= 60 && s._score * 10 < 80).length;
    const okish      = scored.filter((s) => s._score * 10 >= 40 && s._score * 10 < 60).length;
    const needsWork  = scored.filter((s) => s._score * 10 < 40).length;
    return [
      { label: t("repBandExcellent"),    value: excellent, color: GREEN },
      { label: t("repBandGood"),         value: good,      color: BLUE },
      { label: t("repBandSatisfactory"), value: okish,     color: AMBER },
      { label: t("repBandNeedsWork"),    value: needsWork, color: INDIGO },
    ];
  }, [scored, t]);

  // ── Attendance (real average, illustrative per-weekday spread) ──
  const avgAttendance = students.length
    ? Math.round(students.reduce((a, s) => a + (s.attendance ?? 0), 0) / students.length)
    : 0;
  const attendanceBars = useMemo(() => {
    const base = avgAttendance || 85;
    const offsets = [4, 9, 6, 7, 3, -1, -85]; // last bar (Sun) intentionally near 0 — no weekend lessons
    return daysShort.map((label, i) => ({
      label,
      value: Math.max(0, Math.min(100, base + offsets[i])),
    }));
  }, [avgAttendance, daysShort]);

  // ── Top students by real score ──
  const topStudents = useMemo(() =>
    [...enriched].sort((a, b) => b._score - a._score).slice(0, 5),
    [enriched]
  );

  const TABS = [
    { id: "overview",    label: t("repOvTab") },
    { id: "performance", label: t("repPerfTab") },
    { id: "attendance",  label: t("repAttTab") },
    { id: "activity",    label: t("repActTab") },
  ];

  const STATS = [
    { icon: Users,         value: students.length,  label: t("repStatStudents"),  color: BLUE,   bg: BLUE_50 },
    { icon: BookOpen,      value: lessons.length,    label: t("repStatLessons"),   color: GREEN,  bg: "#ECFDF5" },
    { icon: CheckCircle2,  value: completedLessons,  label: t("repStatCompleted"), color: AMBER,  bg: "#FFFBEB" },
    { icon: TrendingUp,    value: `${avgScorePct}%`, label: t("repStatAvgScore"),  color: INDIGO, bg: INDIGO_50 },
  ];

  const chartWidth = 340;

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}>
              <GraduationCap size={18} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3, lineHeight: 19 }}>
                Jeff
              </Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB, letterSpacing: 0.3 }}>
                Colleges
              </Text>
            </View>
          </View>

          {/* title + buttons */}
          <Animated.View entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.5 }}>
              {t("reportsTitle")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}>
                <Filter size={17} color={BLUE} strokeWidth={2} />
                <View style={{ position: "absolute", top: 8, right: 9, width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE }} />
              </View>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}>
                <CalendarDays size={17} color={BLUE} strokeWidth={2} />
                <View style={{ position: "absolute", top: 8, right: 9, width: 6, height: 6, borderRadius: 3, backgroundColor: AMBER }} />
              </View>
            </View>
          </Animated.View>

          {/* tab toggle — segmented control */}
          <View style={{ flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 4, borderWidth: 1, borderColor: BORDER }}>
            {TABS.map(({ id, label }) => {
              const active = activeTab === id;
              return (
                <PressableScale
                  key={id}
                  onPress={() => setActiveTab(id)}
                  scaleTo={0.97}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
                    backgroundColor: active ? BLUE : "transparent",
                  }}
                >
                  <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? "#FFFFFF" : SUB }}>
                    {label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {/* date range + export row */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF", borderRadius: 13, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, height: 44 }}>
              <CalendarDays size={15} color={SUB} />
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontFamily: "Inter_500Medium", color: TEXT }}>
                {rangeLabel}
              </Text>
              <ChevronDown size={14} color={SUB} />
            </View>
            <PressableScale scaleTo={0.95} style={{ borderRadius: 13, overflow: "hidden" }}>
              <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, height: 44 }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("repExport")}</Text>
                <Download size={15} color="#FFFFFF" />
              </LinearGradient>
            </PressableScale>
          </View>
        </LinearGradient>

        {/* ── SECTION 2 — Content (white) ── */}
        <View style={{ paddingTop: 20 }}>
          {activeTab !== "overview" ? (
            <ComingSoon t={t} />
          ) : (
            <View style={{ paddingHorizontal: 20, gap: 16 }}>

              {/* ── Общая статистика ── */}
              <Card delay={0}>
                <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 16 }}>
                  {t("repGeneralStats")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
                  {STATS.map(({ icon: Icon, value, label, color, bg }, i) => (
                    <View key={i} style={{ width: "46%" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                          <Icon size={18} color={color} strokeWidth={2} />
                        </View>
                        <Text style={{ fontSize: 19, fontFamily: "Inter_700Bold", color: TEXT }}>{value}</Text>
                      </View>
                      <Text style={{ fontSize: 11.5, fontFamily: "Inter_400Regular", color: SUB, marginTop: 6 }}>{label}</Text>
                    </View>
                  ))}
                </View>
              </Card>

              {/* ── Динамика успеваемости ── */}
              <Card delay={60}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>{t("repDynamicsTitle")}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: BLUE_50, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: BLUE }}>{t("repWeekPeriod")}</Text>
                    <ChevronDown size={12} color={BLUE} />
                  </View>
                </View>
                <Text style={{ fontSize: 30, fontFamily: "Inter_700Bold", color: GREEN, marginTop: 8 }}>{avgScorePct}%</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 12 }}>{t("repStatAvgScore")}</Text>
                <LineChart values={trendValues} labels={trendLabels} width={chartWidth} />
              </Card>

              {/* ── Успеваемость по предметам ── */}
              {bySubject.length > 0 && (
                <Card delay={120}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>{t("repBySubjectTitle")}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Text style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: BLUE }}>{t("repAllSubjects")}</Text>
                      <ChevronRight size={13} color={BLUE} />
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 16 }}>
                    <View style={{ flex: 1, gap: 14 }}>
                      {bySubject.map(({ subject, avg }) => {
                        const sc = subjectColors(subject);
                        return (
                          <View key={subject} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: sc.bg, alignItems: "center", justifyContent: "center" }}>
                              <BookOpen size={15} color={sc.c} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 5 }}>
                                {tSubject(subject)}
                              </Text>
                              <View style={{ height: 5, backgroundColor: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                                <View style={{ width: `${avg}%`, height: 5, backgroundColor: sc.c, borderRadius: 3 }} />
                              </View>
                            </View>
                            <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: TEXT, width: 32, textAlign: "right" }}>{avg}%</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ alignItems: "center", marginTop: 18 }}>
                    <Donut segments={bands} centerValue={`${avgScorePct}%`} centerLabel={t("repStatAvgScore")} />
                    <View style={{ marginTop: 14, width: "100%", gap: 8 }}>
                      {bands.map((b) => (
                        <View key={b.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: b.color }} />
                          <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT }}>{b.label}</Text>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                            {b.value} {tp(b.value, "student")}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Card>
              )}

              {/* ── Посещаемость + Топ учеников ── */}
              <Card delay={180}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>{t("repAttendanceTitle")}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: BLUE_50, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: BLUE }}>{t("repWeekPeriod")}</Text>
                    <ChevronDown size={12} color={BLUE} />
                  </View>
                </View>
                <Text style={{ fontSize: 30, fontFamily: "Inter_700Bold", color: GREEN, marginTop: 8 }}>{avgAttendance}%</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 16 }}>{t("repAvgAttendance")}</Text>
                <BarChart bars={attendanceBars} width={chartWidth} />
              </Card>

              <Card delay={220}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>{t("repTopStudents")}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Text style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: BLUE }}>{t("repBySuccess")}</Text>
                    <ChevronRight size={13} color={BLUE} />
                  </View>
                </View>
                {topStudents.length === 0 ? (
                  <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", paddingVertical: 20 }}>
                    {t("studentsEmptyTitle")}
                  </Text>
                ) : (
                  topStudents.map((s, i) => {
                    const rank = i + 1;
                    const pct = Math.round(s._score * 10);
                    const displayName = tName(s.name);
                    return (
                      <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#F1F5F9" }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: RANK_COLORS[rank] ?? "#DCE3EC", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{rank}</Text>
                        </View>
                        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: avatarBg(s.name), alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" }}>{initials(displayName)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>{displayName}</Text>
                          {s.type ? (
                            <Text style={{ fontSize: 11.5, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>{tSubject(s.type)}</Text>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: pct > 0 ? GREEN : SUB }}>{pct}%</Text>
                        <ChevronRight size={15} color="#C6CBD5" />
                      </View>
                    );
                  })
                )}
              </Card>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
