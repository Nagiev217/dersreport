import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import { Bell, UserPlus, FileText, Wallet } from "lucide-react-native";
import { getOrgActivity , clearAdminCache } from "@/utils/firebase/adminAccounts";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const CARD  = "#FFFFFF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";

const EVENT_CONFIG = {
  student: { Icon: UserPlus, color: BLUE,      bg: BLUE_50 },
  report:  { Icon: FileText, color: INDIGO,    bg: INDIGO_50 },
  payment: { Icon: Wallet,   color: "#D97706", bg: "#FFFBEB" },
};

const FILTER_KEYS = ["all", "student", "report", "payment"];

function timeAgo(ts, t) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("adminActivityJustNow");
  if (min < 60) return `${min} ${t("adminActivityMinAgo")}`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ${t("adminActivityHourAgo")}`;
  const days = Math.floor(hrs / 24);
  return `${days} ${t("adminActivityDayAgo")}`;
}

export default function AdminActivity() {
  const insets = useSafeAreaInsets();
  const { t, tName } = useT();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const list = await getOrgActivity();
      setEvents(list);
    } catch {
      // stays empty on failure — pull-to-refresh lets them retry
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { clearAdminCache(); setRefreshing(true); load(); };

  const filterLabels = {
    all:     t("adminActivityFilterAll"),
    student: t("adminActivityFilterStudents"),
    report:  t("adminActivityFilterReports"),
    payment: t("adminActivityFilterPayments"),
  };

  const filteredEvents = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.type === filter)),
    [events, filter]
  );

  const eventLabel = (e) => {
    if (e.type === "student") return `${t("adminActivityNewStudent")} — ${tName(e.title)}`;
    if (e.type === "report")  return `${t("adminActivityNewReport")} — ${tName(e.title)}`;
    if (e.type === "payment") return `${t("adminActivityNewPayment")} — ${tName(e.title)} (${e.amount} ₼)`;
    return e.title;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
      >
        {/* Fills the top overscroll/bounce gap with the hero color instead of white */}
        <View pointerEvents="none" style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: BLUE_50 }} />
        {/* ── SECTION 1 — Hero (gradient blue-50 → indigo-50 → white) ── */}
        <LinearGradient
          colors={[BLUE_50, INDIGO_50, "#FFFFFF"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 20 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}>
              <Bell size={18} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3, lineHeight: 19 }}>Jeff</Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB, letterSpacing: 0.3 }}>Colleges</Text>
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(380).easing(Easing.out(Easing.cubic))}>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.5 }}>
              {t("adminActivityTitle")}
            </Text>
            <Text style={{ fontSize: 13.5, fontFamily: "Inter_400Regular", color: SUB, marginTop: 4 }}>
              {events.length} {t("adminActivityFilterAll").toLowerCase()}
            </Text>
          </Animated.View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          {loading ? (
            <ActivityIndicator color={BLUE} style={{ marginTop: 40 }} />
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}
                style={{ flexGrow: 0, marginBottom: 18 }}
              >
                {FILTER_KEYS.map((key) => {
                  const isSelected = filter === key;
                  return (
                    <PressableScale
                      key={key}
                      onPress={() => setFilter(key)}
                      scaleTo={0.95}
                      accessibilityRole="button"
                      accessibilityLabel={filterLabels[key]}
                      accessibilityState={{ selected: isSelected }}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: isSelected ? BLUE : "#FFFFFF",
                        borderWidth: 1, borderColor: isSelected ? BLUE : BORDER,
                      }}
                    >
                      <Text style={{
                        fontSize: 13,
                        fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular",
                        color: isSelected ? "#FFFFFF" : "#6B7280",
                      }}>
                        {filterLabels[key]}
                      </Text>
                    </PressableScale>
                  );
                })}
              </ScrollView>

              {filteredEvents.length === 0 ? (
                <View style={{ alignItems: "center", paddingTop: 50 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Bell size={32} color={BLUE} />
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                    {t("adminEmptySection")}
                  </Text>
                </View>
              ) : (
                <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
                  {filteredEvents.map((e, i) => {
                    const cfg = EVENT_CONFIG[e.type] ?? EVENT_CONFIG.student;
                    const Icon = cfg.Icon;
                    return (
                      <Animated.View key={`${e.type}-${e.teacherUid}-${e.at}-${i}`} entering={FadeInDown.delay(30 + i * 30).duration(280)}>
                        <View
                          style={{
                            flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                            borderTopWidth: i > 0 ? 1 : 0,
                            borderTopColor: "#F1F5F9",
                          }}
                        >
                          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center" }}>
                            <Icon size={16} color={cfg.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                              {eventLabel(e)}
                            </Text>
                            <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>
                              {e.teacherName} · {timeAgo(e.at, t)}
                            </Text>
                          </View>
                        </View>
                      </Animated.View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
