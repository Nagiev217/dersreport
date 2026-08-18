import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import RNAnimated, { FadeInDown, Easing } from "react-native-reanimated";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGrad,
  Stop,
  G,
  Text as SvgText,
  Line,
  Circle,
} from "react-native-svg";
import {
  BarChart2,
  Users,
  BookOpen,
  FileText,
  Award,
  CheckCircle,
  XCircle,
  Calendar,
  GraduationCap,
} from "lucide-react-native";
import { useStudentsStore } from "@/utils/students/store";
import { useLessonsStore } from "@/utils/lessons/store";
import { useReportsStore } from "@/utils/reports/store";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";
import {
  PERIODS,
  getPeriodBounds,
  getLessonMetrics,
  getMonthlyLessonData,
  getStudentRanking,
  getAttendanceDistribution,
  formatAZN,
} from "@/utils/analyticsUtils";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";
const GREEN = "#22C55E";
const AMBER = "#D97706";

// ─── Chart helpers ─────────────────────────────────────────────────────────────

function smoothPath(xs, ys) {
  if (xs.length < 2) return "";
  let d = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const cpx = ((xs[i] + xs[i + 1]) / 2).toFixed(1);
    d += ` C ${cpx} ${ys[i].toFixed(1)} ${cpx} ${ys[i + 1].toFixed(1)} ${xs[
      i + 1
    ].toFixed(1)} ${ys[i + 1].toFixed(1)}`;
  }
  return d;
}

// ─── LineChart (SVG) ──────────────────────────────────────────────────────────

const LineChart = ({ data, color, gradId, width, height = 180 }) => {
  const PL = 44;
  const PR = 12;
  const PT = 16;
  const PB = 28;
  const cW = width - PL - PR;
  const cH = height - PT - PB;

  const vals = data.map((d) => d.value);
  const maxV = Math.max(...vals, 1);
  const minV = 0;

  const toX = (i) => PL + (i / Math.max(data.length - 1, 1)) * cW;
  const toY = (v) => PT + (1 - (v - minV) / (maxV - minV)) * cH;

  const xs = data.map((_, i) => toX(i));
  const ys = data.map((d) => toY(d.value));
  const line = smoothPath(xs, ys);
  const area = line
    ? `${line} L ${xs[xs.length - 1].toFixed(1)} ${(PT + cH).toFixed(
        1
      )} L ${xs[0].toFixed(1)} ${(PT + cH).toFixed(1)} Z`
    : "";

  const gridPcts = [0, 0.5, 1];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGrad id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.22" />
          <Stop offset="1" stopColor={color} stopOpacity="0.01" />
        </SvgGrad>
      </Defs>

      {gridPcts.map((pct, i) => {
        const y = toY(minV + pct * (maxV - minV));
        return (
          <G key={i}>
            <Line
              x1={PL}
              y1={y.toFixed(1)}
              x2={(PL + cW).toFixed(1)}
              y2={y.toFixed(1)}
              stroke="#F1F5F9"
              strokeWidth="1"
              strokeDasharray={pct === 0 ? undefined : "3 4"}
            />
            <SvgText
              x={(PL - 6).toFixed(1)}
              y={(y + 4).toFixed(1)}
              textAnchor="end"
              fontSize="10"
              fill={SUB}
            >
              {formatAZN(minV + pct * (maxV - minV))}
            </SvgText>
          </G>
        );
      })}

      {area ? <Path d={area} fill={`url(#${gradId})`} /> : null}

      {line ? (
        <Path
          d={line}
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {data.map((_, i) => (
        <G key={i}>
          <Circle
            cx={xs[i].toFixed(1)}
            cy={ys[i].toFixed(1)}
            r="5"
            fill={color}
          />
          <Circle
            cx={xs[i].toFixed(1)}
            cy={ys[i].toFixed(1)}
            r="2.8"
            fill="#FFFFFF"
          />
        </G>
      ))}

      {data.map((d, i) => (
        <SvgText
          key={i}
          x={xs[i].toFixed(1)}
          y={height - 7}
          textAnchor="middle"
          fontSize="10"
          fill={SUB}
        >
          {d.label}
        </SvgText>
      ))}
    </Svg>
  );
};

// ─── DonutChart (SVG) ─────────────────────────────────────────────────────────

const DonutChart = ({ data, size = 120, strokeW = 16 }) => {
  const r = (size - strokeW) / 2;
  const cx = size / 2;
  const cy = size / 2;
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
        <Path
          key={i}
          d={arc.path}
          stroke={arc.color}
          strokeWidth={strokeW}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
};

// ─── UI primitives ────────────────────────────────────────────────────────────

const Card = ({ children, style }) => (
  <View
    style={[
      {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: BORDER,
      },
      style,
    ]}
  >
    {children}
  </View>
);

const SectionHeader = ({ title, subtitle }) => (
  <View style={{ marginBottom: 14 }}>
    <Text
      style={{
        fontSize: 18,
        fontFamily: "Inter_700Bold",
        color: TEXT,
        letterSpacing: -0.3,
      }}
    >
      {title}
    </Text>
    {subtitle ? (
      <Text
        style={{
          fontSize: 13,
          fontFamily: "Inter_400Regular",
          color: SUB,
          marginTop: 2,
        }}
      >
        {subtitle}
      </Text>
    ) : null}
  </View>
);

const StatPair = ({ left, right }) => (
  <View style={{ flexDirection: "row", gap: 16 }}>
    <View style={{ flex: 1 }}>{left}</View>
    <View
      style={{
        width: 1,
        backgroundColor: "#F1F5F9",
        marginVertical: 4,
      }}
    />
    <View style={{ flex: 1 }}>{right}</View>
  </View>
);

const StatItem = ({ Icon, iconColor, iconBg, label, value, sub }) => (
  <View style={{ gap: 8 }}>
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: iconBg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={17} color={iconColor} />
    </View>
    <View>
      <Text
        style={{
          fontSize: 22,
          fontFamily: "Inter_700Bold",
          color: TEXT,
          letterSpacing: -0.4,
        }}
      >
        {value}
      </Text>
      {sub ? (
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Inter_500Medium",
            color: SUB,
            marginTop: 1,
          }}
        >
          {sub}
        </Text>
      ) : null}
      <Text
        style={{
          fontSize: 12,
          fontFamily: "Inter_400Regular",
          color: SUB,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  </View>
);

const Divider = () => (
  <View
    style={{
      height: 1,
      backgroundColor: "#F1F5F9",
      marginHorizontal: -16,
      marginVertical: 16,
    }}
  />
);

const SmallCard = ({ label, value, unit, accent }) => (
  <View
    style={{
      flex: 1,
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: BORDER,
    }}
  >
    <View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: accent,
        marginBottom: 10,
      }}
    />
    <Text
      style={{
        fontSize: 20,
        fontFamily: "Inter_700Bold",
        color: TEXT,
        letterSpacing: -0.3,
      }}
    >
      {value}
      {unit ? (
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Inter_400Regular",
            color: SUB,
          }}
        >
          {" "}
          {unit}
        </Text>
      ) : null}
    </Text>
    <Text
      style={{
        fontSize: 11,
        fontFamily: "Inter_400Regular",
        color: SUB,
        marginTop: 4,
      }}
    >
      {label}
    </Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { t, tp, tSubject, tName } = useT();
  const [period, setPeriod] = useState("Месяц"); // fixed Russian key for getPeriodBounds

  const PERIOD_LABELS = {
    "Сегодня":  t("today"),
    "Неделя":   t("analyticsWeek"),
    "Месяц":    t("analyticsMonth"),
    "Год":      t("analyticsYear"),
    "Всё время":t("analyticsAllTimeLabel"),
  };
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const { students } = useStudentsStore();
  const { lessons } = useLessonsStore();
  const { reports } = useReportsStore();

  const bounds = useMemo(() => getPeriodBounds(period), [period]);

  const lessonMetrics = useMemo(
    () => getLessonMetrics(lessons, bounds),
    [lessons, bounds]
  );

  // Monthly chart data (always 6 months regardless of period filter)
  const lessonChartData = useMemo(
    () => getMonthlyLessonData(students, lessons, 6),
    [students, lessons]
  );

  // Student rankings
  const topByLessons = useMemo(
    () => getStudentRanking(students, "lessonsCompleted", 5),
    [students]
  );
  const maxLessons = useMemo(
    () => Math.max(...students.map((s) => s.lessonsCompleted ?? 0), 1),
    [students]
  );

  // Attendance distribution
  const attendanceDist = useMemo(
    () => getAttendanceDistribution(students),
    [students]
  );
  const avgAttendance = students.length
    ? Math.round(
        students.reduce((s, st) => s + (st.attendance ?? 0), 0) /
          students.length
      )
    : 0;

  // Summary stats
  const totalStudents = students.length;
  const activeStudents = students.filter(
    (s) => (s.lessonsRemaining ?? 0) > 0
  ).length;
  const totalCompleted = students.reduce(
    (s, st) => s + (st.lessonsCompleted ?? 0),
    0
  );
  const upcomingCount = lessons.filter((l) => l.status === "planned").length;

  const switchPeriod = (p) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.55,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
    setPeriod(p);
  };

  // chart width = screen - 20px outer pad x2 - 16px card pad x2
  const CHART_W = screenW - 72;

  const RANK_COLORS = ["#F59E0B", "#94A3B8", "#B45309", INDIGO, INDIGO];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
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
            <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3, lineHeight: 19 }}>Jeff</Text>
            <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB, letterSpacing: 0.3 }}>Colleges</Text>
          </View>
        </View>

        <RNAnimated.View entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <BarChart2 size={22} color={BLUE} />
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.5 }}>
              {t("analyticsTitle")}
            </Text>
          </View>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 18 }}>
            {totalStudents} {tp(totalStudents, "student")} · {totalCompleted} {tp(totalCompleted, "lesson")} {t("analyticsCompleted").toLowerCase()}
          </Text>
        </RNAnimated.View>

        {/* Period chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}>
            {PERIODS.map((p) => {
              const active = p === period;
              return (
                <PressableScale
                  key={p}
                  onPress={() => switchPeriod(p)}
                  scaleTo={0.95}
                  accessibilityRole="button"
                  accessibilityLabel={PERIOD_LABELS[p] ?? p}
                  accessibilityState={{ selected: active }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: active ? BLUE : "#FFFFFF",
                    borderWidth: 1,
                    borderColor: active ? BLUE : BORDER,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                      color: active ? "#FFFFFF" : TEXT,
                    }}
                  >
                    {PERIOD_LABELS[p] ?? p}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>

      <Animated.View style={{ opacity: fadeAnim }}>
        {/* ── Summary Grid ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22, marginBottom: 22 }}>
          <Card style={{ padding: 20, gap: 0 }}>
            <StatPair
              left={
                <StatItem
                  Icon={Users}
                  iconColor={BLUE}
                  iconBg={BLUE_50}
                  label={t("analyticsTotalStudents")}
                  value={totalStudents}
                  sub={`${activeStudents} ${t("analyticsActive")}`}
                />
              }
              right={
                <StatItem
                  Icon={Award}
                  iconColor={AMBER}
                  iconBg="#FFFBEB"
                  label={t("analyticsAvgAttend")}
                  value={`${avgAttendance}%`}
                />
              }
            />
            <Divider />
            <StatPair
              left={
                <StatItem
                  Icon={CheckCircle}
                  iconColor={GREEN}
                  iconBg="#ECFDF5"
                  label={`${t("analyticsLessons")} (${(PERIOD_LABELS[period] ?? period).toLowerCase()})`}
                  value={lessonMetrics.completed}
                  sub={`${lessonMetrics.planned} ${t("analyticsPlanned")}`}
                />
              }
              right={
                <StatItem
                  Icon={XCircle}
                  iconColor="#EF4444"
                  iconBg="#FEF2F2"
                  label={t("analyticsCancelled")}
                  value={lessonMetrics.cancelled}
                  sub={`${t("analyticsOutOf")} ${lessonMetrics.total}`}
                />
              }
            />
            <Divider />
            <StatPair
              left={
                <StatItem
                  Icon={FileText}
                  iconColor={INDIGO}
                  iconBg={INDIGO_50}
                  label={t("analyticsReports")}
                  value={reports.length}
                />
              }
              right={
                <StatItem
                  Icon={Calendar}
                  iconColor="#EC4899"
                  iconBg="#FDF2F8"
                  label={t("analyticsUpcoming")}
                  value={upcomingCount}
                />
              }
            />
          </Card>
        </View>

        {/* ── Lessons Section ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 22 }}>
          <SectionHeader
            title={t("analyticsLessons")}
            subtitle={`${t("analyticsPeriod")}${(PERIOD_LABELS[period] ?? period).toLowerCase()}`}
          />

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            {[
              {
                label: t("analyticsCompleted"),
                value: lessonMetrics.completed,
                color: GREEN,
                bg: "#ECFDF5",
              },
              {
                label: t("statusPlanned"),
                value: lessonMetrics.planned,
                color: INDIGO,
                bg: INDIGO_50,
              },
              {
                label: t("analyticsAvgDur"),
                value: lessonMetrics.avgDuration
                  ? `${lessonMetrics.avgDuration}${t("min_abbr")}`
                  : "—",
                color: AMBER,
                bg: "#FFFBEB",
              },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 14,
                  padding: 12,
                  alignItems: "center",
                  gap: 6,
                  borderWidth: 1,
                  borderColor: BORDER,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: item.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: item.color }}>
                    {item.value}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          <Card>
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 4 }}>
              {t("analyticsByMonth")}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 16 }}>
              {t("analyticsLast6").split(" · ")[0]}
            </Text>
            <LineChart
              data={lessonChartData}
              color={GREEN}
              gradId="lessonGrad"
              width={CHART_W}
              height={160}
            />
          </Card>
        </View>

        {/* ── Students Section ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 22 }}>
          <SectionHeader title={t("analyticsStudents")} subtitle={t("analyticsTopStudents")} />
          <Card>
            {topByLessons.map((student, i) => {
              const pct = maxLessons > 0 ? (student.lessonsCompleted ?? 0) / maxLessons : 0;
              return (
                <View
                  key={student.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: i < topByLessons.length - 1 ? 16 : 0,
                  }}
                >
                  {/* Rank */}
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: RANK_COLORS[i] ?? SUB, width: 18, textAlign: "center" }}>
                    {i + 1}
                  </Text>

                  {/* Avatar */}
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: student.avatarColor ?? BLUE,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                      {tName(student.name)?.[0]}
                    </Text>
                  </View>

                  {/* Bar + info */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                        {tName(student.name)}
                      </Text>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: BLUE }}>
                        {student.lessonsCompleted ?? 0} {t("analyticsLrAbbr")}
                      </Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                      <View style={{ height: 6, width: `${Math.round(pct * 100)}%`, backgroundColor: student.avatarColor ?? BLUE, borderRadius: 3 }} />
                    </View>
                    <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: SUB, marginTop: 4 }}>
                      {tSubject(student.type)} · {student.attendance ?? 0}% {t("analyticsAttAbbr")}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>

        {/* ── Attendance Distribution ── */}
        <View style={{ paddingHorizontal: 20 }}>
          <SectionHeader title={t("analyticsAttendance")} subtitle={t("analyticsDistrib")} />
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
              {/* Donut */}
              <View style={{ width: 124, height: 124 }}>
                <DonutChart data={attendanceDist} size={124} strokeW={17} />
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 21, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.4 }}>
                    {avgAttendance}%
                  </Text>
                  <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB }}>
                    {t("analyticsAvg")}
                  </Text>
                </View>
              </View>

              {/* Legend */}
              <View style={{ flex: 1, gap: 14 }}>
                {attendanceDist.map((seg, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: seg.color }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: TEXT }}>
                        {seg.label}
                      </Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>
                        {seg.value} {tp(seg.value, "student")}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: seg.color }}>
                      {students.length > 0 ? Math.round((seg.value / students.length) * 100) : 0}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        </View>
      </Animated.View>
    </ScrollView>
  );
}
