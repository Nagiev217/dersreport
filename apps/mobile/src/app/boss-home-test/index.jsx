import { useRef, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft, GraduationCap, Users, TrendingUp, Wallet, FileCheck2,
  Bell, ChevronRight, Sparkles, ShieldCheck, BarChart3, Clock, ArrowUpRight,
} from "lucide-react-native";

// ─────────────────────────────────────────────────────────────────────────
// TEST SCREEN — visual concept only, not wired into any tab bar or nav flow.
// Reachable at /boss-home-test for design review. Does not touch the real
// (admin-tabs)/index.jsx dashboard.
//
// Design direction: modern/professional education platform (JEFF Exams).
// Blue + Indigo + White. Minimalist with accent moments. Alternating white
// and blue-50→indigo-50 gradient sections. Lucide icons. Mobile-first.
// ─────────────────────────────────────────────────────────────────────────

const BLUE = "#2563EB";
const INDIGO = "#4F46E5";
const BLUE_50 = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const INK = "#0F172A";
const SUB = "#64748B";
const BORDER = "#E2E8F0";

const STATS = [
  { icon: Users, label: "Учителей", value: "18", trend: "+2", color: BLUE, bg: BLUE_50 },
  { icon: GraduationCap, label: "Учеников", value: "246", trend: "+14", color: INDIGO, bg: INDIGO_50 },
  { icon: Wallet, label: "Доход, мес.", value: "12 400 ₼", trend: "+8%", color: "#059669", bg: "#ECFDF5" },
  { icon: FileCheck2, label: "Экзаменов", value: "37", trend: "+5", color: "#D97706", bg: "#FFFBEB" },
];

const QUICK_ACTIONS = [
  { icon: Users, label: "Учителя", color: BLUE, bg: BLUE_50 },
  { icon: BarChart3, label: "Аналитика", color: INDIGO, bg: INDIGO_50 },
  { icon: Wallet, label: "Зарплаты", color: "#059669", bg: "#ECFDF5" },
  { icon: FileCheck2, label: "Экзамены", color: "#D97706", bg: "#FFFBEB" },
];

const ACTIVITY = [
  { icon: Sparkles, title: "Новый отчёт создан", sub: "Алиев Э. · Английский", time: "5 мин", color: BLUE },
  { icon: GraduationCap, title: "Ученик добавлен", sub: "Гасанова Л.", time: "22 мин", color: INDIGO },
  { icon: Wallet, title: "Зарплата рассчитана", sub: "Июль 2026 · 9 учителей", time: "1 ч", color: "#059669" },
  { icon: FileCheck2, title: "Экзамен назначен", sub: "IELTS Reading Mock 3", time: "3 ч", color: "#D97706" },
];

function FadeInUp({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

function BounceIcon({ children }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

function PressableCard({ children, style, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function BossHomeTest() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* ── SECTION 1 — Hero (gradient blue-50 → indigo-50 → white) ── */}
        <LinearGradient
          colors={[BLUE_50, INDIGO_50, "#FFFFFF"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 28 }}
        >
          {/* Top bar */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Назад"
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER }}
            >
              <ArrowLeft size={18} color={INK} />
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}>
                <GraduationCap size={16} color="#FFFFFF" />
              </View>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.2 }}>JEFF Exams</Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Уведомления"
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER }}
            >
              <Bell size={17} color={INK} />
              <View style={{ position: "absolute", top: 9, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: BLUE }} />
            </TouchableOpacity>
          </View>

          {/* Greeting + badge */}
          <FadeInUp delay={0}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: "rgba(37,99,235,0.1)", flexDirection: "row", alignItems: "center", gap: 5 }}>
                <ShieldCheck size={12} color={BLUE} />
                <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: BLUE, letterSpacing: 0.2 }}>BOSS ACCESS</Text>
              </View>
            </View>
            <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.6, lineHeight: 34 }}>
              Добрый день, Джавид
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, marginTop: 4 }}>
              Вот как дела в вашем центре сегодня
            </Text>
          </FadeInUp>

          {/* Stat cards — 2x2 grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
            {STATS.map((s, i) => (
              <FadeInUp key={s.label} delay={80 + i * 60} style={{ flexBasis: "47%", flexGrow: 1 }}>
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: BORDER, shadowColor: INDIGO, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: s.bg, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <s.icon size={18} color={s.color} />
                  </View>
                  <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.4 }}>{s.value}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: SUB }}>{s.label}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
                      <ArrowUpRight size={11} color="#059669" />
                      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#059669" }}>{s.trend}</Text>
                    </View>
                  </View>
                </View>
              </FadeInUp>
            ))}
          </View>
        </LinearGradient>

        {/* ── SECTION 2 — Quick actions (white) ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8 }}>
          <FadeInUp delay={0}>
            <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: INK, marginBottom: 14, letterSpacing: -0.3 }}>
              Быстрые действия
            </Text>
          </FadeInUp>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {QUICK_ACTIONS.map((a, i) => (
              <FadeInUp key={a.label} delay={60 + i * 50} style={{ flexBasis: "22%", flexGrow: 1 }}>
                <PressableCard>
                  <View style={{ alignItems: "center", gap: 8, paddingVertical: 6 }}>
                    <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: a.bg, alignItems: "center", justifyContent: "center" }}>
                      <a.icon size={22} color={a.color} />
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 11.5, fontFamily: "Inter_600SemiBold", color: INK, textAlign: "center" }}>{a.label}</Text>
                  </View>
                </PressableCard>
              </FadeInUp>
            ))}
          </View>
        </View>

        {/* ── SECTION 3 — Spotlight banner (gradient blue → indigo) ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <FadeInUp delay={0}>
            <PressableCard style={{ borderRadius: 22, overflow: "hidden" }}>
              <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, flexDirection: "row", alignItems: "center", gap: 16 }}>
                <BounceIcon>
                  <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
                    <TrendingUp size={24} color="#FFFFFF" />
                  </View>
                </BounceIcon>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>Финансовый отчёт готов</Text>
                  <Text style={{ fontSize: 12.5, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.82)", marginTop: 3, lineHeight: 17 }}>
                    Доход вырос на 8% за июль — посмотрите разбивку по филиалам
                  </Text>
                </View>
                <ChevronRight size={20} color="rgba(255,255,255,0.9)" />
              </LinearGradient>
            </PressableCard>
          </FadeInUp>
        </View>

        {/* ── SECTION 4 — Recent activity (gradient blue-50 → indigo-50) ── */}
        <LinearGradient
          colors={[BLUE_50, INDIGO_50]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ marginTop: 28, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28 }}
        >
          <FadeInUp delay={0}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.3 }}>Недавняя активность</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: BLUE }}>Все</Text>
              </TouchableOpacity>
            </View>
          </FadeInUp>

          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
            {ACTIVITY.map((a, i) => (
              <FadeInUp key={a.title} delay={60 + i * 50}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#F1F5F9" }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${a.color}14`, alignItems: "center", justifyContent: "center" }}>
                    <a.icon size={18} color={a.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: INK }}>{a.title}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>{a.sub}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Clock size={11} color="#94A3B8" />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: "#94A3B8" }}>{a.time}</Text>
                  </View>
                </View>
              </FadeInUp>
            ))}
          </View>
        </LinearGradient>

        {/* ── SECTION 5 — Footer note (white) ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, alignItems: "center" }}>
          <Text style={{ fontSize: 11.5, fontFamily: "Inter_400Regular", color: "#94A3B8", textAlign: "center" }}>
            Тестовый экран · не влияет на рабочий дашборд Boss
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
