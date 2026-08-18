import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGrad,
  Stop,
  G,
  Text as SvgText,
  Circle,
  Line,
} from "react-native-svg";
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Star,
  CheckCircle,
  BookOpen,
  BarChart2,
  Edit3,
  Trash2,
  Clock,
  Calendar,
} from "lucide-react-native";
import { useStudentsStore } from "@/utils/students/store";
import { useProgressStore } from "@/utils/progress/store";
import { useReportsStore } from "@/utils/reports/store";
import { useLessonsStore } from "@/utils/lessons/store";
import AddEvaluationModal from "@/components/AddEvaluationModal";
import AddGoalModal from "@/components/AddGoalModal";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";
const GREEN  = "#22C55E";
const AMBER  = "#D97706";
const RED    = "#EF4444";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, "0"); }

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function avgScores(evals) {
  if (!evals.length) return { activity: 0, comprehension: 0, homework: 0, behavior: 0, overall: 0 };
  const n = evals.length;
  const activity      = evals.reduce((s, e) => s + e.activity, 0)      / n;
  const comprehension = evals.reduce((s, e) => s + e.comprehension, 0) / n;
  const homework      = evals.reduce((s, e) => s + e.homework, 0)      / n;
  const behavior      = evals.reduce((s, e) => s + e.behavior, 0)      / n;
  const overall = (activity + comprehension + homework + behavior) / 4;
  return { activity, comprehension, homework, behavior, overall };
}

function progressIndex(evals) {
  if (!evals.length) return 0;
  return Math.round((avgScores(evals).overall / 5) * 100);
}

function monthBounds(monthsBack, monthsArr) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const start = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
  const end = monthsBack === 0 ? todayISO() : (() => {
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`;
  })();
  return { start, end, label: (monthsArr ?? [])[d.getMonth()] ?? "" };
}

function hwRate(evals) {
  if (!evals.length) return 0;
  const done = evals.filter((e) => e.homework >= 4).length;
  return Math.round((done / evals.length) * 100);
}

function trendLabel(delta) {
  if (delta > 3)  return { icon: TrendingUp,   color: GREEN, text: `+${delta}%` };
  if (delta < -3) return { icon: TrendingDown,  color: RED,   text: `${delta}%` };
  return               { icon: Minus,           color: AMBER, text: "~0%" };
}

function formatDeadline(str, monthsArr) {
  if (!str) return "";
  try {
    const d = new Date(str);
    return `${d.getDate()} ${(monthsArr ?? [])[d.getMonth()] ?? ""} ${d.getFullYear()}`;
  } catch { return str; }
}

function daysLeft(deadline) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  return diff;
}

// ─── Smooth path ──────────────────────────────────────────────────────────────

function smoothPath(xs, ys) {
  if (xs.length < 2) return xs.length === 1 ? `M ${xs[0]} ${ys[0]}` : "";
  let d = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const cpx = ((xs[i] + xs[i + 1]) / 2).toFixed(1);
    d += ` C ${cpx} ${ys[i].toFixed(1)} ${cpx} ${ys[i + 1].toFixed(1)} ${xs[i + 1].toFixed(1)} ${ys[i + 1].toFixed(1)}`;
  }
  return d;
}

// ─── Progress Ring (SVG) ──────────────────────────────────────────────────────

const ProgressRing = ({ pct, size = 140, strokeW = 14, color = BLUE }) => {
  const r   = (size - strokeW) / 2;
  const cx  = size / 2;
  const cy  = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke="#F1F5F9" strokeWidth={strokeW} fill="none" />
      {pct > 0 && (
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={strokeW}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90, ${cx}, ${cy})`}
        />
      )}
    </Svg>
  );
};

// ─── Mini Line Chart (SVG) ────────────────────────────────────────────────────

const MiniLineChart = ({ data, color, gradId, width, height = 140 }) => {
  const PL = 36; const PR = 12; const PT = 12; const PB = 24;
  const cW = width - PL - PR;
  const cH = height - PT - PB;

  const vals = data.map((d) => d.y);
  const maxV = Math.max(...vals, 5);
  const minV = Math.min(...vals, 1);
  const range = maxV - minV || 1;

  const toX = (i) => PL + (i / Math.max(data.length - 1, 1)) * cW;
  const toY = (v) => PT + (1 - (v - minV) / range) * cH;

  const xs = data.map((_, i) => toX(i));
  const ys = data.map((d) => toY(d.y));
  const line = smoothPath(xs, ys);
  const area = line
    ? `${line} L ${xs[xs.length - 1].toFixed(1)} ${(PT + cH).toFixed(1)} L ${xs[0].toFixed(1)} ${(PT + cH).toFixed(1)} Z`
    : "";

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGrad id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.2" />
          <Stop offset="1" stopColor={color} stopOpacity="0.01" />
        </SvgGrad>
      </Defs>

      {/* Grid */}
      {[minV + range * 0.5, maxV].map((v, i) => {
        const y = toY(v);
        return (
          <G key={i}>
            <Line x1={PL} y1={y.toFixed(1)} x2={(PL + cW).toFixed(1)} y2={y.toFixed(1)} stroke="#F1F5F9" strokeWidth="1" />
            <SvgText x={(PL - 4).toFixed(1)} y={(y + 4).toFixed(1)} textAnchor="end" fontSize="9" fill={SUB}>
              {v.toFixed(1)}
            </SvgText>
          </G>
        );
      })}

      {area ? <Path d={area} fill={`url(#${gradId})`} /> : null}
      {line ? <Path d={line} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}

      {data.map((d, i) => (
        <G key={i}>
          <Circle cx={xs[i].toFixed(1)} cy={ys[i].toFixed(1)} r="4" fill={color} />
          <Circle cx={xs[i].toFixed(1)} cy={ys[i].toFixed(1)} r="2" fill="#FFF" />
          <SvgText x={xs[i].toFixed(1)} y={height - 6} textAnchor="middle" fontSize="9" fill={SUB}>
            {d.label}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
};

// ─── UI primitives ────────────────────────────────────────────────────────────

const Card = ({ children, style }) => (
  <View style={[{ backgroundColor: "#FFF", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER }, style]}>
    {children}
  </View>
);

const SectionTitle = ({ title, action, onAction }) => (
  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
    <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{title}</Text>
    {action ? (
      <PressableScale onPress={onAction} scaleTo={0.95} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: BLUE_50, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
        <Plus size={13} color={BLUE} />
        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: BLUE }}>{action}</Text>
      </PressableScale>
    ) : null}
  </View>
);

const MetricBadge = ({ label, value, color, bg }) => (
  <View style={{ flex: 1, backgroundColor: bg, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 10, alignItems: "center", gap: 4 }}>
    <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color, letterSpacing: -0.4 }}>{value}</Text>
    <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: SUB, textAlign: "center", lineHeight: 13 }}>{label}</Text>
  </View>
);

const BarRow = ({ label, value, max = 5, color, icon: Icon }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {Icon ? <Icon size={13} color={color} /> : null}
          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43" }}>{label}</Text>
        </View>
        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color }}>{value.toFixed(1)} / {max}</Text>
      </View>
      <View style={{ height: 7, backgroundColor: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
        <View style={{ height: 7, width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
};

// ─── Goal Card ────────────────────────────────────────────────────────────────

const GOAL_COLORS = [BLUE, INDIGO, GREEN, AMBER];

const GoalCard = ({ goal, index, isParent, onEdit, onDelete }) => {
  const { t, months } = useT();
  const monthsShort = months(true);
  const STATUS_CFG = {
    active:    { label: t("goalStatusActive"), color: GREEN, bg: "#ECFDF5" },
    paused:    { label: t("goalStatusPaused"), color: AMBER, bg: "#FFFBEB" },
    completed: { label: t("goalStatusDone"),   color: BLUE,  bg: BLUE_50 },
  };
  const st = STATUS_CFG[goal.status] ?? STATUS_CFG.active;
  const goalColor = GOAL_COLORS[index % GOAL_COLORS.length];
  const days = daysLeft(goal.deadline);

  return (
    <View style={{ backgroundColor: "#FAFBFC", borderRadius: 16, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: goalColor }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT, flex: 1 }} numberOfLines={2}>
              {goal.title}
            </Text>
          </View>
          {goal.description ? (
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280", lineHeight: 17 }} numberOfLines={2}>
              {goal.description}
            </Text>
          ) : null}
        </View>
        {!isParent && (
          <View style={{ flexDirection: "row", gap: 6, marginLeft: 10 }}>
            <PressableScale onPress={() => onEdit(goal)} scaleTo={0.9} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center" }}>
              <Edit3 size={13} color={BLUE} />
            </PressableScale>
            <PressableScale onPress={() => onDelete(goal.id)} scaleTo={0.9} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={13} color={RED} />
            </PressableScale>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={{ height: 8, backgroundColor: "#EBEBEB", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
        <View style={{ height: 8, width: `${goal.progress}%`, backgroundColor: goalColor, borderRadius: 4 }} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: st.bg, borderRadius: 8 }}>
            <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: st.color }}>{st.label}</Text>
          </View>
          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: goalColor }}>{goal.progress}%</Text>
        </View>
        {goal.deadline && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Calendar size={11} color={SUB} />
            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: days < 30 ? RED : SUB }}>
              {days !== null && days >= 0 ? (days === 0 ? t("today") : `${days}${t("day_abbr")}`) : t("progressOverdue")} · {formatDeadline(goal.deadline, monthsShort)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Evaluation history row ───────────────────────────────────────────────────

const EvalRow = ({ ev, index, isParent, onDelete }) => {
  const { t } = useT();
  const avg = ((ev.activity + ev.comprehension + ev.homework + ev.behavior) / 4).toFixed(1);
  const color = avg >= 4 ? GREEN : avg >= 3 ? AMBER : RED;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: "#F1F5F9" }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + "18", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color }}>{avg}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }}>
          {ev.date}
        </Text>
        {ev.notes ? (
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }} numberOfLines={1}>{ev.notes}</Text>
        ) : (
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#AEAEB2" }}>
            {`${t("progressEvalActAbbr")} ${ev.activity} · ${t("progressEvalCompAbbr")} ${ev.comprehension} · ${t("progressEvalHWAbbr")} ${ev.homework} · ${t("progressEvalBehAbbr")} ${ev.behavior}`}
          </Text>
        )}
      </View>
      {!isParent && (
        <PressableScale onPress={() => onDelete(ev.id)} scaleTo={0.9} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}>
          <Trash2 size={12} color={RED} />
        </PressableScale>
      )}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { studentId, mode } = useLocalSearchParams();
  const isParent = mode === "parent";

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tName, months } = useT();
  const monthsShort = months(true);
  const { width: screenW } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [showAllEvals, setShowAllEvals] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const { students } = useStudentsStore();
  const { evaluations, goals, deleteEvaluation, deleteGoal } = useProgressStore();
  const { reports } = useReportsStore();
  const { lessons } = useLessonsStore();

  const student = students.find((s) => String(s.id) === String(studentId));

  const myEvals = useMemo(
    () => evaluations.filter((e) => String(e.studentId) === String(studentId)).sort((a, b) => a.date.localeCompare(b.date)),
    [evaluations, studentId]
  );

  const myGoals = useMemo(
    () => goals.filter((g) => String(g.studentId) === String(studentId)),
    [goals, studentId]
  );

  const myReports = useMemo(
    () => reports.filter((r) => String(r.studentId) === String(studentId)),
    [reports, studentId]
  );

  const myLessons = useMemo(
    () => lessons.filter((l) => (l.studentIds ?? []).map(String).includes(String(studentId))),
    [lessons, studentId]
  );

  // ── Period slicing ──────────────────────────────────────────────────────────
  const now = new Date();
  const thisMonthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const prevMonthStart = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
  })();

  const thisMonthEvals = myEvals.filter((e) => e.date >= thisMonthStart);
  const prevMonthEvals = myEvals.filter((e) => e.date >= prevMonthStart && e.date < thisMonthStart);

  // ── Key metrics ─────────────────────────────────────────────────────────────
  const pIdx   = progressIndex(myEvals);
  const thisPIdx = progressIndex(thisMonthEvals);
  const prevPIdx = progressIndex(prevMonthEvals);
  const delta  = thisPIdx - prevPIdx;
  const trend  = trendLabel(delta);

  const allAvg    = avgScores(myEvals);
  const hwRatePct = hwRate(myEvals);
  const completedLessons = (student?.lessonsCompleted ?? 0);
  const attendancePct    = student?.attendance ?? 0;

  const lastEvalDate = myEvals.length ? myEvals[myEvals.length - 1].date : null;
  const lastActivity = lastEvalDate ?? (myReports.length ? myReports[0].date : null);

  // ── Chart data (last 6 evaluations for activity line) ──────────────────────
  const activityChartData = useMemo(() => {
    const last6 = myEvals.slice(-6);
    return last6.map((e) => ({
      y: parseFloat(((e.activity + e.comprehension + e.homework + e.behavior) / 4).toFixed(2)),
      label: e.date.slice(5), // MM-DD
    }));
  }, [myEvals]);

  // ── Monthly progress bars (last 5 months) ──────────────────────────────────
  const monthlyData = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const b = monthBounds(4 - i, monthsShort);
      const evs = myEvals.filter((e) => e.date >= b.start && e.date <= b.end);
      return { label: b.label, value: progressIndex(evs), count: evs.length };
    });
  }, [myEvals, monthsShort]);

  const maxMonthly = Math.max(...monthlyData.map((d) => d.value), 1);

  // ── Delete handlers ─────────────────────────────────────────────────────────
  const handleDeleteEval = (id) => {
    Alert.alert(t("progressDeleteEvalTitle"), t("confirmIrreversible"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => deleteEvaluation(id) },
    ]);
  };

  const handleDeleteGoal = (id) => {
    Alert.alert(t("progressDeleteGoalTitle"), t("confirmIrreversible"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => deleteGoal(id) },
    ]);
  };

  const CHART_W = screenW - 40 - 36; // screen - padding - card padding

  if (!student) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{t("studentNotFound")}</Text>
        <PressableScale onPress={() => router.back()} scaleTo={0.96} style={{ marginTop: 16, borderRadius: 12, overflow: "hidden" }}>
          <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{t("back")}</Text>
          </LinearGradient>
        </PressableScale>
      </View>
    );
  }

  const displayedEvals = showAllEvals ? [...myEvals].reverse() : [...myEvals].reverse().slice(0, 5);

  return (
    <>
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
          style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 16 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <PressableScale onPress={() => router.back()} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t("back")} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}>
              <ArrowLeft size={20} color={TEXT} />
            </PressableScale>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>{t("progressTitle")}</Text>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>{tName(student.name)}</Text>
            </View>
            {!isParent ? (
              <PressableScale onPress={() => setShowEvalModal(true)} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t("progressGoalBtn")} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}>
                <Plus size={20} color="#FFFFFF" />
              </PressableScale>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>
        </LinearGradient>

        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>

            {/* ── Hero: Progress Ring ── */}
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                {/* Ring */}
                <View style={{ width: 140, height: 140 }}>
                  <ProgressRing pct={pIdx} size={140} strokeW={14} color={BLUE} />
                  <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -1 }}>{pIdx}%</Text>
                    <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB }}>{t("progressIndexLabel")}</Text>
                  </View>
                </View>

                {/* Right stats */}
                <View style={{ flex: 1, gap: 10 }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT }}>{t("progressOverallTitle")}</Text>

                  {/* Trend */}
                  {myEvals.length >= 2 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: trend.color + "15", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignSelf: "flex-start" }}>
                      <trend.icon size={14} color={trend.color} />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: trend.color }}>{trend.text}</Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: trend.color + "CC" }}>{t("progressForMonth")}</Text>
                    </View>
                  )}

                  {lastActivity && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Clock size={12} color={SUB} />
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>
                        {t("progressLastActivity")}{lastActivity}
                      </Text>
                    </View>
                  )}

                  {student.joinDate && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Calendar size={12} color={SUB} />
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>
                        {t("studentJoinDate")}{student.joinDate}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Card>

            {/* ── Key Metrics (4 badges) ── */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <MetricBadge label={t("progressAttend")} value={`${attendancePct}%`} color={attendancePct >= 90 ? GREEN : attendancePct >= 75 ? BLUE : AMBER} bg={attendancePct >= 90 ? "#ECFDF5" : attendancePct >= 75 ? BLUE_50 : "#FFFBEB"} />
              <MetricBadge label={t("progressActivity")} value={myEvals.length ? allAvg.activity.toFixed(1) : "—"} color={BLUE} bg={BLUE_50} />
              <MetricBadge label={t("progressHWDone")} value={`${hwRatePct}%`} color={hwRatePct >= 80 ? GREEN : hwRatePct >= 60 ? AMBER : RED} bg={hwRatePct >= 80 ? "#ECFDF5" : hwRatePct >= 60 ? "#FFFBEB" : "#FEF2F2"} />
              <MetricBadge label={t("progressLessons")} value={completedLessons} color={INDIGO} bg={INDIGO_50} />
            </View>

            {/* ── Second row of metrics ── */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <MetricBadge label={t("progressComprehension")} value={myEvals.length ? allAvg.comprehension.toFixed(1) : "—"} color={INDIGO} bg={INDIGO_50} />
              <MetricBadge label={t("progressBehavior")} value={myEvals.length ? allAvg.behavior.toFixed(1) : "—"} color={GREEN} bg="#ECFDF5" />
              <MetricBadge label={t("progressReports")} value={myReports.length} color="#EC4899" bg="#FDF2F8" />
              <MetricBadge label={t("progressEvals")} value={myEvals.length} color={AMBER} bg="#FFFBEB" />
            </View>

            {/* ── Detailed skill bars ── */}
            {myEvals.length > 0 && (
              <Card>
                <SectionTitle title={t("progressDetailedStats")} />
                <BarRow label={t("progressActivity")} value={allAvg.activity} color={BLUE} icon={Star} />
                <BarRow label={t("progressComprehension")} value={allAvg.comprehension} color={INDIGO} icon={BookOpen} />
                <BarRow label={t("progressHWDone")} value={allAvg.homework} color={GREEN} icon={CheckCircle} />
                <BarRow label={t("progressBehavior")} value={allAvg.behavior} color={AMBER} icon={BarChart2} />
              </Card>
            )}

            {/* ── Activity Chart ── */}
            {activityChartData.length >= 2 && (
              <Card>
                <SectionTitle title={t("progressActivityDynamic")} />
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 12 }}>
                  {t("progressAvgScaleHint", { n: activityChartData.length })}
                </Text>
                <MiniLineChart
                  data={activityChartData}
                  color={BLUE}
                  gradId="actGrad"
                  width={CHART_W}
                  height={150}
                />
              </Card>
            )}

            {/* ── Monthly Progress Bars ── */}
            <Card>
              <SectionTitle title={t("progressByMonth")} />
              {monthlyData.map((item, i) => {
                const pct = maxMonthly > 0 ? (item.value / maxMonthly) * 100 : 0;
                const barColor = item.value >= 75 ? GREEN : item.value >= 50 ? BLUE : item.value >= 25 ? AMBER : RED;
                return (
                  <View key={i} style={{ marginBottom: i < monthlyData.length - 1 ? 12 : 0 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43" }}>
                        {item.label}
                        {item.count > 0 ? (
                          <Text style={{ fontFamily: "Inter_400Regular", color: SUB }}> · {item.count} {t("progressEvalAbbr")}</Text>
                        ) : null}
                      </Text>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: barColor }}>
                        {item.value > 0 ? `${item.value}%` : "—"}
                      </Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                      <View style={{ height: 8, width: `${pct}%`, backgroundColor: barColor, borderRadius: 4 }} />
                    </View>
                  </View>
                );
              })}
            </Card>

            {/* ── Homework chart (last 6 months) ── */}
            {myEvals.length > 0 && (() => {
              const hwData = Array.from({ length: 5 }, (_, i) => {
                const b = monthBounds(4 - i, monthsShort);
                const evs = myEvals.filter((e) => e.date >= b.start && e.date <= b.end);
                return { label: b.label, value: hwRate(evs) };
              });
              const hasData = hwData.some((d) => d.value > 0);
              return hasData ? (
                <Card>
                  <SectionTitle title={t("progressHWTitle")} />
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 14 }}>
                    {t("progressHWChartHint")}
                  </Text>
                  {hwData.map((item, i) => {
                    const clr = item.value >= 80 ? GREEN : item.value >= 60 ? AMBER : RED;
                    return (
                      <View key={i} style={{ marginBottom: i < hwData.length - 1 ? 12 : 0 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43" }}>{item.label}</Text>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: item.value > 0 ? clr : "#C7C7CC" }}>
                            {item.value > 0 ? `${item.value}%` : "—"}
                          </Text>
                        </View>
                        <View style={{ height: 7, backgroundColor: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                          <View style={{ height: 7, width: `${item.value}%`, backgroundColor: clr, borderRadius: 4 }} />
                        </View>
                      </View>
                    );
                  })}
                </Card>
              ) : null;
            })()}

            {/* ── Goals ── */}
            <Card>
              <SectionTitle
                title={t("progressGoalsTitle")}
                action={!isParent ? t("progressGoalBtn") : undefined}
                onAction={() => { setEditGoal(null); setShowGoalModal(true); }}
              />
              {myGoals.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Target size={32} color="#C7C7CC" />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: SUB, marginTop: 10, textAlign: "center" }}>
                    {isParent ? t("progressNoGoals") : t("progressNoGoalsTeacher")}
                  </Text>
                </View>
              ) : (
                myGoals.map((goal, i) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    index={i}
                    isParent={isParent}
                    onEdit={(g) => { setEditGoal(g); setShowGoalModal(true); }}
                    onDelete={handleDeleteGoal}
                  />
                ))
              )}
            </Card>

            {/* ── Evaluation History ── */}
            <Card>
              <SectionTitle
                title={t("progressEvalHistory")}
                action={!isParent && !showAllEvals && myEvals.length > 5 ? t("progressShowAll", { n: myEvals.length }) : undefined}
                onAction={() => setShowAllEvals(true)}
              />
              {myEvals.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Star size={32} color="#C7C7CC" />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: SUB, marginTop: 10, textAlign: "center" }}>
                    {isParent ? t("progressNoEvals") : t("progressNoEvalsTeacher")}
                  </Text>
                </View>
              ) : (
                <>
                  {displayedEvals.map((ev, i) => (
                    <EvalRow
                      key={ev.id}
                      ev={ev}
                      index={i}
                      isParent={isParent}
                      onDelete={handleDeleteEval}
                    />
                  ))}
                  {!showAllEvals && myEvals.length > 5 && (
                    <TouchableOpacity onPress={() => setShowAllEvals(true)} style={{ paddingTop: 12, alignItems: "center" }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: BLUE }}>
                        {t("progressShowAll", { n: myEvals.length })}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </Card>

          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Modals ── */}
      {!isParent && (
        <>
          <AddEvaluationModal
            visible={showEvalModal}
            onClose={() => setShowEvalModal(false)}
            studentId={String(studentId)}
            studentName={student.name}
          />
          <AddGoalModal
            visible={showGoalModal}
            onClose={() => { setShowGoalModal(false); setEditGoal(null); }}
            studentId={String(studentId)}
            editGoal={editGoal}
          />
        </>
      )}
    </>
  );
}
