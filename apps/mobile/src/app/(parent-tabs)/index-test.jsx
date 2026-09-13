import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { BookOpen, Bell, Calendar, CheckCircle2, Star, FileText, ChevronRight } from "lucide-react-native";
import { auth } from "@/utils/firebase/config";
import { useParentData } from "@/utils/firebase/parentRealtime";
import PressableScale from "@/components/PressableScale";
import VariantSwitcher from "@/components/VariantSwitcher";

// ─── Design tokens — Blue + Indigo + White, matching the rest of the app
// (PROJECT.md "Дизайн-система"). ──────────────────────────────────────────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT   = "#111827";
const SUB    = "#8E93A1";
const BORDER = "#E5E9F2";
const GREEN    = "#16A34A";
const GREEN_50 = "#ECFDF5";
const AMBER    = "#D97706";
const AMBER_50 = "#FFFBEB";
const PURPLE_DOT = "#8B5CF6";

const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

const DOT_COLORS = [BLUE, GREEN, PURPLE_DOT, AMBER];

function initials(name) {
  return (name ?? "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

function letterGrade(score) {
  if (score == null) return null;
  if (score >= 9)   return "A";
  if (score >= 8)   return "A-";
  if (score >= 7)   return "B+";
  if (score >= 6)   return "B";
  if (score >= 5)   return "C+";
  return "C";
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Доброе утро";
  if (h < 17) return "Добрый день";
  return "Добрый вечер";
}

function formatDate(dateStr, today, tomorrow) {
  if (dateStr === today) return "Сегодня";
  if (dateStr === tomorrow) return "Завтра";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function StatTile({ icon: Icon, iconColor, iconBg, value, label }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 13, borderWidth: 1, borderColor: BORDER }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", marginBottom: S.sm }}>
        <Icon size={16} color={iconColor} />
      </View>
      <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3 }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: SUB, marginTop: 2, lineHeight: 13 }}>{label}</Text>
    </View>
  );
}

function CardHeader({ icon: Icon, title, onSeeAll }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: S.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
        <Icon size={18} color={TEXT} strokeWidth={1.8} />
        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT }}>{title}</Text>
      </View>
      {onSeeAll && (
        <PressableScale onPress={onSeeAll} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: BLUE }}>Все</Text>
          <ChevronRight size={14} color={BLUE} />
        </PressableScale>
      )}
    </View>
  );
}

export default function ParentHomeTest() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { students, lessons, reports } = useParentData();

  const parentName = auth?.currentUser?.displayName ?? "родитель";
  const child = students[0];
  const childIdStr = child ? String(child.id) : null;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const monthKey = today.slice(0, 7);

  const childLessons = childIdStr
    ? lessons.filter((l) => (l.studentIds ?? []).map(String).includes(childIdStr))
    : [];
  const childReports = childIdStr
    ? reports.filter((r) => String(r.studentId) === childIdStr)
    : [];

  const lessonsThisMonth   = childLessons.filter((l) => (l.date ?? "").startsWith(monthKey));
  const attendedThisMonth  = lessonsThisMonth.filter((l) => l.status === "completed");
  const reportsThisMonth   = childReports.filter((r) => (r.date ?? "").startsWith(monthKey));
  const avgGrade = reportsThisMonth.length
    ? (reportsThisMonth.reduce((sum, r) => sum + (r.activityScore ?? 0), 0) / reportsThisMonth.length).toFixed(1)
    : "—";

  const upcomingLessons = childLessons
    .filter((l) => l.date >= today && l.status === "planned")
    .sort((a, b) => `${a.date}T${a.time ?? ""}`.localeCompare(`${b.date}T${b.time ?? ""}`))
    .slice(0, 3);

  const latestReport = childReports[0];

  const HEADER_H = 64;

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFC" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + HEADER_H + S.sm, paddingBottom: 40, paddingHorizontal: S.xl }}
        showsVerticalScrollIndicator={false}
      >
      {/* Greeting */}
      <Animated.View entering={FadeInDown.delay(40).springify().damping(18).stiffness(180)} style={{ marginTop: S.xl }}>
        <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.5 }}>
          {greeting()}, {parentName} 👋
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: SUB, marginTop: 4 }}>
          Вот как дела у вашего ребёнка сегодня
        </Text>
        <VariantSwitcher activeKey="index-test" />
      </Animated.View>

      {/* Active child banner */}
      {child && (
        <Animated.View entering={FadeInDown.delay(80).springify().damping(18).stiffness(180)} style={{ marginTop: S.xl }}>
          <PressableScale
            onPress={() => router.push({ pathname: "/(parent-tabs)/child", params: { id: childIdStr } })}
            style={{ flexDirection: "row", alignItems: "center", backgroundColor: BLUE_50, borderRadius: 22, padding: S.lg, gap: S.md }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: BLUE }}>{initials(child.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>{child.name}</Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: SUB, marginTop: 2 }}>
                {[child.type, child.subject].filter(Boolean).join(" · ") || "Ученик"}
              </Text>
            </View>
            <ChevronRight size={18} color={SUB} />
          </PressableScale>
        </Animated.View>
      )}

      {/* Stats */}
      <Animated.View entering={FadeInDown.delay(120).springify().damping(18).stiffness(180)} style={{ flexDirection: "row", gap: S.sm, marginTop: S.xl }}>
        <StatTile icon={Calendar}     iconColor={GREEN}  iconBg={GREEN_50}  value={lessonsThisMonth.length}  label={"Уроков\nв месяце"} />
        <StatTile icon={CheckCircle2} iconColor={BLUE}   iconBg={BLUE_50}   value={attendedThisMonth.length} label={"Посещено"} />
        <StatTile icon={Star}         iconColor={AMBER}  iconBg={AMBER_50}  value={avgGrade}                 label={"Средняя\nоценка"} />
        <StatTile icon={FileText}     iconColor={INDIGO} iconBg={INDIGO_50} value={reportsThisMonth.length}  label={"Отчётов\nв месяце"} />
      </Animated.View>

      {/* Upcoming lessons */}
      <Animated.View entering={FadeInDown.delay(160).springify().damping(18).stiffness(180)} style={{ marginTop: S.xl }}>
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: S.lg }}>
          <CardHeader icon={Calendar} title="Ближайшие уроки" onSeeAll={() => router.push("/(parent-tabs)/lessons")} />
          {upcomingLessons.length === 0 ? (
            <Text style={{ fontSize: 13, color: SUB, fontFamily: "Inter_500Medium" }}>Нет запланированных уроков</Text>
          ) : (
            upcomingLessons.map((l, i) => (
              <PressableScale
                key={l.id ?? i}
                onPress={() => router.push("/(parent-tabs)/lessons")}
                style={{
                  flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.sm + 2,
                  borderTopWidth: i === 0 ? 0 : 1, borderTopColor: BORDER,
                }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT_COLORS[i % DOT_COLORS.length] }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>{l.subject ?? "Урок"}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: SUB, marginTop: 1 }}>{child?.name}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }}>{formatDate(l.date, today, tomorrow)}</Text>
                  {l.time && <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: SUB, marginTop: 1 }}>{l.time}</Text>}
                </View>
                <ChevronRight size={15} color={SUB} />
              </PressableScale>
            ))
          )}
        </View>
      </Animated.View>

      {/* Latest report */}
      {latestReport && (
        <Animated.View entering={FadeInDown.delay(200).springify().damping(18).stiffness(180)} style={{ marginTop: S.xl }}>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: S.lg }}>
            <CardHeader icon={FileText} title="Последний отчёт" onSeeAll={() => router.push("/(parent-tabs)/reports")} />
            <PressableScale
              onPress={() => router.push("/(parent-tabs)/reports")}
              style={{ flexDirection: "row", alignItems: "flex-start", gap: S.md }}
            >
              <View style={{ flex: 1 }}>
                {!!latestReport.subject && (
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: BLUE, marginBottom: 3 }}>{latestReport.subject}</Text>
                )}
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                  {latestReport.topic ?? "Отчёт об уроке"}
                </Text>
                {!!latestReport.comment && (
                  <Text numberOfLines={2} style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginTop: 4, lineHeight: 18 }}>
                    {latestReport.comment}
                  </Text>
                )}
              </View>
              {letterGrade(latestReport.activityScore) && (
                <View style={{ paddingHorizontal: S.sm + 1, paddingVertical: 5, borderRadius: 10, backgroundColor: GREEN_50 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: GREEN }}>{letterGrade(latestReport.activityScore)}</Text>
                </View>
              )}
            </PressableScale>
            <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: SUB, marginTop: S.sm, textAlign: "right" }}>{latestReport.date}</Text>
          </View>
        </Animated.View>
      )}
      </ScrollView>

      {/* Floating translucent header — content scrolls underneath, per Apple's
          materials guidance (blur + hairline top edge, not an opaque bar). */}
      <BlurView
        intensity={80}
        tint="light"
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: insets.top + HEADER_H,
          paddingTop: insets.top,
          paddingHorizontal: S.xl,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderBottomWidth: 1, borderBottomColor: "rgba(17,24,39,0.06)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={18} color={BLUE} />
          </View>
          <View>
            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT }}>DərsReport</Text>
            <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: SUB }}>Тестовый дизайн</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Уведомления"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
          >
            <Bell size={17} color={TEXT} />
            <View style={{ position: "absolute", top: 11, right: 11, width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444" }} />
          </PressableScale>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: INDIGO }}>{initials(parentName)}</Text>
          </View>
        </View>
      </BlurView>
    </View>
  );
}
