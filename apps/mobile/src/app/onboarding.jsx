import { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GraduationCap,
  Users,
  BookOpen,
  FileText,
  BarChart2,
  Star,
  CalendarDays,
  Bell,
  CheckCircle2,
  TrendingUp,
  UserCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useT } from "@/utils/i18n";

const { width: W, height: H } = Dimensions.get("window");
const ONBOARDING_KEY = "onboardingDone";

// SLIDES are built inside the component using useT()

// ─── Illustrations ────────────────────────────────────────────────────────────

function Slide1Illustration({ accent, light }) {
  const { t } = useT();
  return (
    <View style={styles.illContainer}>
      <View style={[styles.bigCircle, { backgroundColor: light }]}>
        <View style={[styles.iconCircle, { backgroundColor: accent }]}>
          <GraduationCap size={52} color="#FFFFFF" />
        </View>
      </View>
      {/* Floating cards */}
      <View style={[styles.floatCard, { top: 30, right: W * 0.08, backgroundColor: "#FFFFFF" }]}>
        <Users size={16} color={accent} />
        <Text style={[styles.floatText, { color: accent }]}>{t("obS1Students")}</Text>
      </View>
      <View style={[styles.floatCard, { bottom: 40, left: W * 0.06, backgroundColor: "#FFFFFF" }]}>
        <CheckCircle2 size={16} color="#22C55E" />
        <Text style={[styles.floatText, { color: "#22C55E" }]}>{t("obS1LessonDone")}</Text>
      </View>
      <View style={[styles.floatCard, { bottom: 60, right: W * 0.05, backgroundColor: "#FFFFFF" }]}>
        <Star size={16} color="#F59E0B" fill="#F59E0B" />
        <Text style={[styles.floatText, { color: "#F59E0B" }]}>{t("obGreat")}</Text>
      </View>
    </View>
  );
}

function Slide2Illustration({ accent, light }) {
  const { t } = useT();
  const cards = [
    { name: t("obS2Name1"), sub: t("obS2Sub1"), score: 90, color: accent },
    { name: t("obS2Name2"), sub: t("obS2Sub2"), score: 74, color: "#0EA5E9" },
    { name: t("obS2Name3"), sub: t("obS2Sub3"), score: 85, color: "#22C55E" },
  ];
  return (
    <View style={styles.illContainer}>
      <View style={{ gap: 10, width: W * 0.72 }}>
        {cards.map((c, i) => (
          <View
            key={c.name}
            style={styles.studentRow}
          >
            <View style={[styles.avatarSmall, { backgroundColor: c.color + "22" }]}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: c.color }}>
                {c.name[0]}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{c.name}</Text>
              <Text style={styles.cardSub}>{c.sub}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${c.score}%`, backgroundColor: c.color }]} />
              </View>
            </View>
            <Text style={[styles.scoreText, { color: c.color }]}>{c.score}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Slide3Illustration({ accent, light }) {
  const { t, days: getDays } = useT();
  const days = getDays(true).slice(0, 5);
  const lessons = [
    { day: 0, label: t("obS3AbbrEnglish"), color: accent },
    { day: 1, label: t("obS3AbbrMath"), color: "#22C55E" },
    { day: 1, label: t("obS3AbbrPhysics"), color: "#F59E0B" },
    { day: 2, label: t("obS3AbbrEnglish"), color: accent },
    { day: 3, label: t("obS3AbbrChemistry"), color: "#EF4444" },
    { day: 4, label: t("obS3AbbrMath"), color: "#22C55E" },
  ];
  return (
    <View style={styles.illContainer}>
      <View style={[styles.calCard, { backgroundColor: "#FFFFFF" }]}>
        <Text style={styles.calMonth}>{t("obS3Month")}</Text>
        <View style={styles.calGrid}>
          {days.map((d) => (
            <Text key={d} style={styles.calDayHead}>{d}</Text>
          ))}
        </View>
        <View style={styles.calGrid}>
          {days.map((d, i) => (
            <View key={i} style={styles.calCell}>
              <Text style={styles.calDate}>{14 + i}</Text>
              {lessons.filter((l) => l.day === i).map((l, j) => (
                <View key={j} style={[styles.lessonChip, { backgroundColor: l.color + "22" }]}>
                  <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: l.color }}>
                    {l.label}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.floatCard, { bottom: 20, right: W * 0.04, backgroundColor: "#FFFFFF" }]}>
        <Bell size={14} color={accent} />
        <Text style={[styles.floatText, { color: "#1C1C1E" }]}>{t("obS3Reminder")}</Text>
      </View>
    </View>
  );
}

function Slide4Illustration({ accent, light }) {
  const { t } = useT();
  return (
    <View style={styles.illContainer}>
      <View style={[styles.reportCard, { backgroundColor: "#FFFFFF" }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={styles.reportTitle}>{t("obS4Title")}</Text>
          <View style={[styles.badgeGreen]}>
            <Text style={styles.badgeText}>{t("obGreat")}</Text>
          </View>
        </View>
        <Text style={styles.reportStudent}>{t("obS4StudentLine", { name: t("obS2Name1") })}</Text>
        <Text style={styles.reportDate}>{t("obS4DateLine")}</Text>
        {[
          { label: t("obS4TopicLabel"), value: t("obS4TopicVal") },
          { label: t("obS4HwLabel"), value: t("obS4HwVal") },
        ].map((r) => (
          <View key={r.label} style={styles.reportRow}>
            <Text style={styles.reportRowLabel}>{r.label}</Text>
            <Text style={styles.reportRowValue}>{r.value}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} size={16} color="#F59E0B" fill="#F59E0B" />
          ))}
        </View>
      </View>
      <View style={[styles.notifBubble, { backgroundColor: accent }]}>
        <Bell size={13} color="#FFFFFF" />
        <Text style={styles.notifText}>{t("obS4Notif")}</Text>
      </View>
    </View>
  );
}

function Slide5Illustration({ accent, light }) {
  const { t, days: getDays } = useT();
  const bars = [60, 80, 55, 90, 70, 85, 95];
  const labels = getDays(true);
  return (
    <View style={styles.illContainer}>
      <View style={[styles.analyticsCard, { backgroundColor: "#FFFFFF" }]}>
        <Text style={styles.analyticsTitle}>{t("obS5Title")}</Text>
        <View style={styles.barsRow}>
          {bars.map((h, i) => (
            <View key={i} style={styles.barCol}>
              <View style={[styles.barItem, { height: h * 0.9, backgroundColor: i === 6 ? accent : light }]}>
                {i === 6 && <View style={[styles.barGlow, { backgroundColor: accent }]} />}
              </View>
              <Text style={styles.barLabel}>{labels[i]}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        {[
          { label: t("obS5Attendance"), val: "94%", color: "#22C55E" },
          { label: t("obS5AvgScore"), val: "4.7", color: accent },
        ].map((s) => (
          <View key={s.label} style={[styles.miniStat, { borderColor: s.color + "33" }]}>
            <Text style={[styles.miniStatVal, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.miniStatLabel}>{s.label}</Text>
          </View>
        ))}
        <View style={[styles.miniStat, { borderColor: "#F59E0B33" }]}>
          <TrendingUp size={18} color="#F59E0B" />
          <Text style={styles.miniStatLabel}>{t("obS5Growth")}</Text>
        </View>
      </View>
    </View>
  );
}

function Slide6Illustration({ accent, light }) {
  const { t } = useT();
  return (
    <View style={styles.illContainer}>
      <View style={[styles.parentCard, { backgroundColor: "#FFFFFF" }]}>
        <View style={styles.parentHeader}>
          <View style={[styles.avatarMed, { backgroundColor: accent + "22" }]}>
            <UserCircle size={22} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.parentName}>{t("obS6ParentLine", { name: t("obS6ParentName") })}</Text>
            <Text style={styles.parentSub}>{t("obS6ChildLine", { name: t("obS2Name1") })}</Text>
          </View>
          <View style={styles.activeDot} />
        </View>
        {[
          { icon: BookOpen, label: t("obS6NextLesson"), val: t("obS6NextLessonVal"), color: accent },
          { icon: FileText, label: t("obS6LastReport"), val: `${t("obGreat")} ★★★★★`, color: "#22C55E" },
          { icon: CheckCircle2, label: t("obS4HwLabel"), val: t("obS4HwVal"), color: "#F59E0B" },
        ].map(({ icon: Icon, label, val, color }) => (
          <View key={label} style={styles.parentRow}>
            <View style={[styles.parentRowIcon, { backgroundColor: color + "15" }]}>
              <Icon size={14} color={color} />
            </View>
            <View>
              <Text style={styles.parentRowLabel}>{label}</Text>
              <Text style={[styles.parentRowVal, { color }]}>{val}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function Slide7Illustration({ accent, light }) {
  const { t } = useT();
  return (
    <View style={styles.illContainer}>
      <View style={[styles.bigCircle, { backgroundColor: light }]}>
        <View style={[styles.iconCircle, { backgroundColor: accent }]}>
          <Sparkles size={52} color="#FFFFFF" />
        </View>
      </View>
      <View style={[styles.floatCard, { top: 24, left: W * 0.06, backgroundColor: "#FFFFFF" }]}>
        <GraduationCap size={14} color={accent} />
        <Text style={[styles.floatText, { color: accent }]}>{t("obS7Teacher")}</Text>
      </View>
      <View style={[styles.floatCard, { top: 24, right: W * 0.06, backgroundColor: "#FFFFFF" }]}>
        <Users size={14} color="#0EA5E9" />
        <Text style={[styles.floatText, { color: "#0EA5E9" }]}>{t("obS7Parent")}</Text>
      </View>
      <View style={[styles.floatCard, { bottom: 36, left: W * 0.08, backgroundColor: "#FFFFFF" }]}>
        <Star size={14} color="#F59E0B" fill="#F59E0B" />
        <Text style={[styles.floatText, { color: "#1C1C1E" }]}>Jeff</Text>
      </View>
    </View>
  );
}

const ILLUSTRATIONS = [
  Slide1Illustration,
  Slide2Illustration,
  Slide3Illustration,
  Slide4Illustration,
  Slide5Illustration,
  Slide6Illustration,
  Slide7Illustration,
];

// ─── Dot Indicator ────────────────────────────────────────────────────────────
function Dots({ count, activeIndex, accent }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === activeIndex ? 20 : 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: i === activeIndex ? accent : "#D1D1D6",
          }}
        />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const flatRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const SLIDES = [
    { key: "s1", accent: "#6B5CF6", light: "#EEF0FF", title: t("onboarding1Title"), description: t("onboarding1Desc") },
    { key: "s2", accent: "#6B5CF6", light: "#EEF0FF", title: t("onboarding2Title"), description: t("onboarding2Desc") },
    { key: "s3", accent: "#0EA5E9", light: "#E0F2FE", title: t("onboarding3Title"), description: t("onboarding3Desc") },
    { key: "s4", accent: "#22C55E", light: "#F0FDF4", title: t("onboarding4Title"), description: t("onboarding4Desc") },
    { key: "s5", accent: "#F59E0B", light: "#FFFBEB", title: t("onboarding5Title"), description: t("onboarding5Desc") },
    { key: "s6", accent: "#0EA5E9", light: "#E0F2FE", title: t("onboarding6Title"), description: t("onboarding6Desc") },
    { key: "s7", accent: "#6B5CF6", light: "#EEF0FF", title: t("onboarding7Title"), description: t("onboarding7Desc") },
  ];

  const current = SLIDES[activeIndex];
  const isLast = activeIndex === SLIDES.length - 1;

  const finish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/role-select");
  }, [router]);

  const animateTo = useCallback(
    (nextIndex) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        flatRef.current?.scrollToIndex({ index: nextIndex, animated: false });
        setActiveIndex(nextIndex);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    },
    [fadeAnim]
  );

  const handleNext = useCallback(() => {
    if (isLast) {
      finish();
    } else {
      animateTo(activeIndex + 1);
    }
  }, [isLast, activeIndex, animateTo, finish]);

  const handleSkip = useCallback(() => finish(), [finish]);

  const onMomentumScrollEnd = useCallback(
    (e) => {
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / W);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      }
    },
    [activeIndex, fadeAnim]
  );

  const IllComp = ILLUSTRATIONS[activeIndex];

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar barStyle="dark-content" />

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity
          onPress={handleSkip}
          style={[styles.skipBtn, { top: insets.top + 12 }]}
        >
          <Text style={styles.skipText}>{t("onboardingSkip")}</Text>
        </TouchableOpacity>
      )}

      {/* Slide list (swipeable) */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollBeginDrag={() =>
          Animated.timing(fadeAnim, { toValue: 0.6, duration: 80, useNativeDriver: true }).start()
        }
        getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
        renderItem={({ item, index }) => {
          const Ill = ILLUSTRATIONS[index];
          return (
            <View style={{ width: W, height: H }}>
              <Ill accent={item.accent} light={item.light} />
            </View>
          );
        }}
        style={{ flex: 1 }}
      />

      {/* Bottom panel (animated on slide change) */}
      <Animated.View
        style={[
          styles.bottomPanel,
          { paddingBottom: insets.bottom + 24, opacity: fadeAnim },
        ]}
      >
        <Dots count={SLIDES.length} activeIndex={activeIndex} accent={current.accent} />

        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.description}>{current.description}</Text>

        {isLast ? (
          <View style={{ gap: 10, width: "100%" }}>
            <TouchableOpacity
              onPress={finish}
              style={[styles.primaryBtn, { backgroundColor: current.accent }]}
            >
              <Text style={styles.primaryBtnText}>{t("onboardingStart")}</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleNext}
            style={[styles.primaryBtn, { backgroundColor: current.accent }]}
          >
            <Text style={styles.primaryBtnText}>{t("onboardingNext")}</Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  skipBtn: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#8E8E93",
  },

  // Bottom panel
  bottomPanel: {
    paddingHorizontal: 28,
    paddingTop: 20,
    backgroundColor: "#FFFFFF",
    gap: 12,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#1C1C1E",
    lineHeight: 33,
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 4,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },

  // Shared illustration
  illContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9F8FF",
    position: "relative",
    paddingBottom: 200,
  },
  bigCircle: {
    width: W * 0.62,
    height: W * 0.62,
    borderRadius: W * 0.31,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: W * 0.32,
    height: W * 0.32,
    borderRadius: W * 0.16,
    alignItems: "center",
    justifyContent: "center",
  },
  floatCard: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  floatText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  // Slide 2
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" },
  cardSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93", marginBottom: 4 },
  barBg: { height: 5, backgroundColor: "#F2F2F7", borderRadius: 3, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3 },
  scoreText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  // Slide 3
  calCard: {
    borderRadius: 20,
    padding: 16,
    width: W * 0.78,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  calMonth: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 10 },
  calGrid: { flexDirection: "row", justifyContent: "space-between" },
  calDayHead: { width: W * 0.78 / 5 - 4, textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#8E8E93", marginBottom: 6 },
  calCell: { width: W * 0.78 / 5 - 4, alignItems: "center", gap: 3, minHeight: 70 },
  calDate: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1C1C1E", marginBottom: 2 },
  lessonChip: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, alignItems: "center" },

  // Slide 4
  reportCard: {
    borderRadius: 20,
    padding: 18,
    width: W * 0.78,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  reportTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#1C1C1E" },
  reportStudent: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#3C3C43", marginTop: 2 },
  reportDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93", marginBottom: 10 },
  reportRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  reportRowLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#8E8E93", width: 28 },
  reportRowValue: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#1C1C1E", flex: 1 },
  badgeGreen: { backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#22C55E" },
  notifBubble: {
    position: "absolute",
    bottom: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  notifText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },

  // Slide 5
  analyticsCard: {
    borderRadius: 20,
    padding: 16,
    width: W * 0.78,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  analyticsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1C1C1E", marginBottom: 12 },
  barsRow: { flexDirection: "row", alignItems: "flex-end", gap: 5, height: 90 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barItem: { width: "100%", borderRadius: 6, overflow: "hidden" },
  barGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 4, opacity: 0.5 },
  barLabel: { fontSize: 9, fontFamily: "Inter_500Medium", color: "#8E8E93" },
  miniStat: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    elevation: 1,
  },
  miniStatVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  miniStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#8E8E93" },

  // Slide 6
  parentCard: {
    borderRadius: 20,
    padding: 16,
    width: W * 0.78,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    gap: 10,
  },
  parentHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  avatarMed: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  parentName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" },
  parentSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  parentRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  parentRowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  parentRowLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  parentRowVal: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
};
