import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Calendar, FileText, ChevronRight, Users } from "lucide-react-native";
import { useParentData } from "@/utils/firebase/parentRealtime";
import { getScoreColor } from "@/data/mockData";
import PressableScale from "@/components/PressableScale";
import VariantSwitcher from "@/components/VariantSwitcher";

// ─── Design tokens — Blue + Indigo + White (PROJECT.md). ───────────────────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT   = "#111827";
const SUB    = "#8E93A1";
const BORDER = "#E5E9F2";

const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

function initials(name) {
  return (name ?? "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

// Same recipe as (parent-tabs)/index.jsx's CircleProgress — reused, not reinvented.
function CircleProgress({ size = 120, progress = 0, color = BLUE, trackColor = "#E5E9F2", strokeWidth = 9 }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, progress)) / 100);
  const c = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={c} cy={c} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={c} cy={c} r={r}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT }}>{progress}%</Text>
      <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: SUB }}>посещаемость</Text>
    </View>
  );
}

// One timeline dot in the mixed chronological feed below.
function TimelineItem({ color, title, subtitle, meta, badge, badgeColor, onPress, isLast }) {
  return (
    <PressableScale onPress={onPress} style={{ flexDirection: "row", gap: S.md }}>
      <View style={{ alignItems: "center", width: 14 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginTop: 4 }} />
        {!isLast && <View style={{ flex: 1, width: 2, backgroundColor: BORDER, marginTop: 4 }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: S.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>{title}</Text>
          {badge != null && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: badgeColor + "1A" }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: badgeColor }}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: SUB, marginTop: 2 }}>{subtitle}</Text>
        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: SUB, marginTop: 1 }}>{meta}</Text>
      </View>
    </PressableScale>
  );
}

export default function ParentHomeVariantHero() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { students, lessons, reports } = useParentData();

  const child = students[0];
  const childIdStr = child ? String(child.id) : null;
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const childLessons = childIdStr ? lessons.filter((l) => (l.studentIds ?? []).map(String).includes(childIdStr)) : [];
  const childReports = childIdStr ? reports.filter((r) => String(r.studentId) === childIdStr) : [];

  const completed = childLessons.filter((l) => l.status === "completed");
  const attendance = childLessons.length ? Math.round((completed.length / childLessons.length) * 100) : 0;

  const upcoming = childLessons
    .filter((l) => l.date >= today && l.status === "planned")
    .sort((a, b) => `${a.date}T${a.time ?? ""}`.localeCompare(`${b.date}T${b.time ?? ""}`))
    .slice(0, 2);
  const recentReports = childReports.slice(0, 2);

  // Merge into one chronological feed instead of two separate boxed sections —
  // a genuinely different composition from index-test.jsx (per taste-skill:
  // don't repeat the same layout family across variants of the same screen).
  const feed = [
    ...upcoming.map((l) => ({
      kind: "lesson", date: l.date,
      title: l.subject ?? "Урок",
      subtitle: l.date === today ? "Сегодня" : l.date === tomorrow ? "Завтра" : l.date,
      meta: l.time ?? "",
      color: BLUE,
    })),
    ...recentReports.map((r) => ({
      kind: "report", date: r.date,
      title: r.topic ?? "Отчёт об уроке",
      subtitle: r.subject ?? "",
      meta: r.date,
      color: INDIGO,
      badge: r.activityScore != null ? `${r.activityScore}/10` : null,
      badgeColor: r.activityScore != null ? getScoreColor(r.activityScore) : INDIGO,
    })),
  ].sort((a, b) => (a.kind === "lesson" ? a.date : "z" + a.date).localeCompare(b.kind === "lesson" ? b.date : "z" + b.date));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#FAFAFC" }}
      contentContainerStyle={{ paddingTop: insets.top + S.lg, paddingBottom: 40, paddingHorizontal: S.xl }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.springify().damping(18).stiffness(180)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.4 }}>Главная</Text>
        <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingHorizontal: S.sm, paddingVertical: 3 }}>
          <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: SUB, letterSpacing: 0.3 }}>ВАРИАНТ 2</Text>
        </View>
      </Animated.View>
      <VariantSwitcher activeKey="index-variant-hero" />

      {/* Hero — attendance ring is the focal point, not a stat row. */}
      {child && (
        <Animated.View
          entering={FadeInDown.delay(60).springify().damping(18).stiffness(180)}
          style={{ marginTop: S.xl, backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: BORDER, padding: S.xl, alignItems: "center" }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: S.sm }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: BLUE }}>{initials(child.name)}</Text>
          </View>
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>{child.name}</Text>
          <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: SUB, marginTop: 1, marginBottom: S.lg }}>
            {[child.type, child.subject].filter(Boolean).join(" · ") || "Ученик"}
          </Text>
          <CircleProgress progress={attendance} />
          <View style={{ flexDirection: "row", gap: S.xl, marginTop: S.lg }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>{childLessons.length}</Text>
              <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: SUB }}>уроков</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>{childReports.length}</Text>
              <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: SUB }}>отчётов</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Chronological feed — upcoming lesson and latest report interleaved,
          instead of separate "Ближайшие уроки" / "Последний отчёт" cards. */}
      {feed.length > 0 && (
        <Animated.View entering={FadeInDown.delay(120).springify().damping(18).stiffness(180)} style={{ marginTop: S.xl }}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: S.md }}>Что дальше</Text>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: S.lg }}>
            {feed.map((item, i) => (
              <TimelineItem
                key={`${item.kind}-${i}`}
                color={item.color}
                title={item.title}
                subtitle={item.subtitle}
                meta={item.meta}
                badge={item.badge}
                badgeColor={item.badgeColor}
                isLast={i === feed.length - 1}
                onPress={() => router.push(item.kind === "lesson" ? "/(parent-tabs)/lessons" : "/(parent-tabs)/reports")}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {students.length > 1 && (
        <Animated.View entering={FadeInDown.delay(160).springify().damping(18).stiffness(180)} style={{ marginTop: S.xl }}>
          <PressableScale
            onPress={() => router.push("/(parent-tabs)/child")}
            style={{ flexDirection: "row", alignItems: "center", gap: S.sm, justifyContent: "center", paddingVertical: S.md }}
          >
            <Users size={15} color={BLUE} />
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: BLUE }}>Все дети ({students.length})</Text>
            <ChevronRight size={14} color={BLUE} />
          </PressableScale>
        </Animated.View>
      )}
    </ScrollView>
  );
}
