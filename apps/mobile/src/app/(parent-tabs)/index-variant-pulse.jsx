import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Bell, CheckCircle2, Star, TrendingUp, ChevronRight, FileText, GraduationCap } from "lucide-react-native";
import { useParentData } from "@/utils/firebase/parentRealtime";
import { getScoreColor } from "@/data/mockData";
import PressableScale from "@/components/PressableScale";
import VariantSwitcher from "@/components/VariantSwitcher";

// ─── "Learning Pulse" — a standalone design system for this one comparison
// variant only (per the brief: "a distinctive design system rather than
// copying a typical dashboard"). Deliberately NOT the app's Blue/Indigo
// tokens — this is an experiment, not a replacement for real Home. ────────
const NAVY      = "#101B3D";
const ELECTRIC  = "#3867FF";
const LAVENDER  = "#EEF0FF";
const BG        = "#F5F8FF";
const GREEN     = "#22C55E";
const SUB       = "#6B7290";
const BORDER    = "#E7EAF7";

const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function initials(name) {
  return (name ?? "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Доброе утро";
  if (h < 17) return "Добрый день";
  return "Добрый вечер";
}

// Big hero ring — glow via a soft shadow on the arc's own View wrapper
// (RN can't blur an SVG stroke directly, so the glow is approximated with
// a shadow behind the whole ring).
function PulseRing({ size = 168, progress = 0, strokeWidth = 14 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, progress)) / 100);
  const c = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{
        position: "absolute", width: size, height: size, borderRadius: size / 2,
        shadowColor: ELECTRIC, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 6,
      }} />
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke="rgba(56,103,255,0.12)" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={c} cy={c} r={r}
          stroke={ELECTRIC} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ fontSize: 40, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -1 }}>{progress}%</Text>
        <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.75)", marginTop: -2 }}>learning health</Text>
      </View>
    </View>
  );
}

function Metric({ icon: Icon, label }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Icon size={13} color="rgba(255,255,255,0.85)" />
      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.9)" }}>{label}</Text>
    </View>
  );
}

export default function ParentHomeVariantPulse() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { students, lessons, reports } = useParentData();

  const parentName = "родитель";
  const child = students[0];
  const childIdStr = child ? String(child.id) : null;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

  const childLessons = childIdStr ? lessons.filter((l) => (l.studentIds ?? []).map(String).includes(childIdStr)) : [];
  const childReports = childIdStr ? reports.filter((r) => String(r.studentId) === childIdStr) : [];

  const completedAll = childLessons.filter((l) => l.status === "completed");
  const attendance = childLessons.length ? Math.round((completedAll.length / childLessons.length) * 100) : 0;
  const avgScore = childReports.length
    ? childReports.reduce((sum, r) => sum + (r.activityScore ?? 0), 0) / childReports.length
    : 0;
  const health = Math.round((attendance + avgScore * 10) / 2);

  // Monday-first current week, dot per day: filled = has a completed lesson.
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const weekDone = weekDates.filter((ds) => childLessons.some((l) => l.date === ds && l.status === "completed")).length;
  const todayIdx = weekDates.indexOf(today);

  const upcoming = childLessons
    .filter((l) => l.date >= today && l.status === "planned")
    .sort((a, b) => `${a.date}T${a.time ?? ""}`.localeCompare(`${b.date}T${b.time ?? ""}`))
    .slice(0, 3);

  const latestReport = childReports[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ paddingTop: insets.top + S.md, paddingBottom: 40, paddingHorizontal: S.xl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header — compact, no big greeting bar */}
      <Animated.View entering={FadeInDown.springify().damping(18).stiffness(180)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: ELECTRIC, alignItems: "center", justifyContent: "center" }}>
            <GraduationCap size={16} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: NAVY }}>Lesson Report</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}>
            <Bell size={16} color={NAVY} />
            <View style={{ position: "absolute", top: 9, right: 9, width: 6, height: 6, borderRadius: 3, backgroundColor: ELECTRIC }} />
          </View>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: LAVENDER, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: ELECTRIC }}>{initials(parentName)}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Greeting — small, not a hero headline */}
      <Animated.View entering={FadeInDown.delay(40).springify().damping(18).stiffness(180)} style={{ marginTop: S.lg }}>
        <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: SUB }}>
          {greeting()}
        </Text>
        <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: SUB, marginTop: 1 }}>
          Пульс обучения {child?.name ?? "ребёнка"} за сегодня
        </Text>
        <VariantSwitcher activeKey="index-variant-pulse" activeColor={ELECTRIC} activeBg={LAVENDER} />
      </Animated.View>

      {/* Hero — the centerpiece */}
      {child && (
        <Animated.View
          entering={FadeInDown.delay(80).springify().damping(18).stiffness(180)}
          style={{ marginTop: S.lg, backgroundColor: NAVY, borderRadius: 28, padding: S.xl, alignItems: "center" }}
        >
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{child.name}</Text>
          <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)", marginTop: 2, marginBottom: S.lg }}>
            {[child.type, child.subject].filter(Boolean).join(" · ") || "Ученик"}
          </Text>

          <PulseRing progress={health} />

          <View style={{ flexDirection: "row", gap: S.lg, marginTop: S.lg }}>
            <Metric icon={CheckCircle2} label={`Посещаемость ${attendance}%`} />
            <Metric icon={Star} label={`Оценка ${avgScore.toFixed(1)}`} />
            <Metric icon={TrendingUp} label="Рост" />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: S.lg, backgroundColor: "rgba(34,197,94,0.15)", paddingHorizontal: S.md, paddingVertical: 6, borderRadius: 12 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN }} />
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: GREEN }}>Отличный месяц</Text>
          </View>
        </Animated.View>
      )}

      {/* This week */}
      <Animated.View entering={FadeInDown.delay(120).springify().damping(18).stiffness(180)} style={{ marginTop: S.xl }}>
        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: NAVY, marginBottom: S.md }}>На этой неделе</Text>
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: S.lg }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {weekDates.map((ds, i) => {
              const done = childLessons.some((l) => l.date === ds && l.status === "completed");
              const isToday = i === todayIdx;
              return (
                <View key={ds} style={{ alignItems: "center", gap: 6 }}>
                  <View style={{
                    width: 8, height: done ? 28 : 8, borderRadius: 4,
                    backgroundColor: isToday ? ELECTRIC : done ? LAVENDER : "#EEF1FA",
                  }} />
                  <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: isToday ? ELECTRIC : SUB }}>{WEEKDAYS[i]}</Text>
                </View>
              );
            })}
          </View>
          <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: SUB, marginTop: S.md, textAlign: "center" }}>
            {weekDone} из {childLessons.filter((l) => weekDates.includes(l.date)).length || weekDone} уроков пройдено
          </Text>
        </View>
      </Animated.View>

      {/* Next up — vertical timeline */}
      {upcoming.length > 0 && (
        <Animated.View entering={FadeInDown.delay(160).springify().damping(18).stiffness(180)} style={{ marginTop: S.xl }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: NAVY, marginBottom: S.md }}>Дальше</Text>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: S.lg }}>
            {upcoming.map((l, i) => (
              <PressableScale key={l.id ?? i} onPress={() => router.push("/(parent-tabs)/lessons")} style={{ flexDirection: "row", gap: S.md }}>
                <View style={{ alignItems: "center", width: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ELECTRIC, marginTop: 4 }} />
                  {i < upcoming.length - 1 && <View style={{ flex: 1, width: 1.5, backgroundColor: BORDER, marginTop: 4 }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: S.lg }}>
                  <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: ELECTRIC, letterSpacing: 0.4 }}>
                    {l.date === today ? "СЕГОДНЯ" : l.date === tomorrow ? "ЗАВТРА" : l.date.toUpperCase()}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: NAVY }}>{l.time ?? ""}  {l.subject ?? "Урок"}</Text>
                    <ChevronRight size={14} color={SUB} />
                  </View>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: SUB, marginTop: 1 }}>{child?.name}</Text>
                </View>
              </PressableScale>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Latest insight — document-style preview */}
      {latestReport && (
        <Animated.View entering={FadeInDown.delay(200).springify().damping(18).stiffness(180)} style={{ marginTop: S.xl }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: NAVY, marginBottom: S.md }}>Последний отзыв</Text>
          <PressableScale
            onPress={() => router.push("/(parent-tabs)/reports")}
            style={{ backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: S.lg }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                {!!latestReport.subject && (
                  <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: ELECTRIC }}>{latestReport.subject} · {latestReport.date}</Text>
                )}
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: NAVY, marginTop: 3 }}>
                  {latestReport.topic ?? "Отчёт об уроке"}
                </Text>
              </View>
              {latestReport.activityScore != null && (
                <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: getScoreColor(latestReport.activityScore) + "1A" }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: getScoreColor(latestReport.activityScore) }}>{latestReport.activityScore}/10</Text>
                </View>
              )}
            </View>
            {!!latestReport.comment && (
              <Text numberOfLines={3} style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginTop: S.sm, lineHeight: 19 }}>
                {latestReport.comment}
              </Text>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: S.md }}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: ELECTRIC }}>Открыть отчёт</Text>
              <ChevronRight size={13} color={ELECTRIC} />
            </View>
          </PressableScale>
        </Animated.View>
      )}

      {/* Quick action */}
      <Animated.View entering={FadeInDown.delay(240).springify().damping(18).stiffness(180)} style={{ marginTop: S.xl, alignItems: "center" }}>
        <PressableScale
          onPress={() => router.push("/(parent-tabs)/reports")}
          style={{ flexDirection: "row", alignItems: "center", gap: S.sm, backgroundColor: NAVY, paddingHorizontal: S.xl, paddingVertical: S.md, borderRadius: 100 }}
        >
          <FileText size={15} color="#FFFFFF" />
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>Все отчёты</Text>
        </PressableScale>
      </Animated.View>
    </ScrollView>
  );
}
