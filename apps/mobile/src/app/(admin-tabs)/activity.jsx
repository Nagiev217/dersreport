import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Bell, UserPlus, FileText, Wallet } from "lucide-react-native";
import { getOrgActivity } from "@/utils/firebase/adminAccounts";
import { useT } from "@/utils/i18n";

const NAVY_GRAD = ["#22447A", "#152C51"];
const SHEET = "#F4F5F7";
const CARD  = "#FFFFFF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";

const EVENT_CONFIG = {
  student: { Icon: UserPlus, color: "#2563EB", bg: "#E8EEFB" },
  report:  { Icon: FileText, color: "#8B5CF6", bg: "#F0EAFC" },
  payment: { Icon: Wallet,   color: "#F59E0B", bg: "#FDF1DF" },
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

  const onRefresh = () => { setRefreshing(true); load(); };

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
    <View style={{ flex: 1, backgroundColor: SHEET }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NAVY_GRAD[1]} />}
      >
        <View style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: NAVY_GRAD[0] }} />

        <LinearGradient
          colors={NAVY_GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 24 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
              <Bell size={19} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.3, lineHeight: 19 }}>
                Jeff
              </Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", letterSpacing: 0.3 }}>
                Colleges
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.5 }}>
            {t("adminActivityTitle")}
          </Text>
        </LinearGradient>

        <View style={{ flex: 1, backgroundColor: SHEET, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -14, paddingTop: 20, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
          {loading ? (
            <ActivityIndicator color={NAVY_GRAD[1]} style={{ marginTop: 40 }} />
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}
                style={{ flexGrow: 0, marginBottom: 16 }}
              >
                {FILTER_KEYS.map((key) => {
                  const isSelected = filter === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setFilter(key)}
                      activeOpacity={0.75}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: isSelected ? NAVY_GRAD[1] : CARD,
                        borderWidth: isSelected ? 0 : 1, borderColor: "#E5E7EB",
                      }}
                    >
                      <Text style={{
                        fontSize: 13,
                        fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular",
                        color: isSelected ? "#FFFFFF" : "#6B7280",
                      }}>
                        {filterLabels[key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {filteredEvents.length === 0 ? (
                <View style={{ alignItems: "center", paddingTop: 60 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Bell size={32} color={NAVY_GRAD[1]} />
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                    {t("adminEmptySection")}
                  </Text>
                </View>
              ) : (
                <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden" }}>
                  {filteredEvents.map((e, i) => {
                    const cfg = EVENT_CONFIG[e.type] ?? EVENT_CONFIG.student;
                    const Icon = cfg.Icon;
                    return (
                      <View
                        key={`${e.type}-${e.teacherUid}-${e.at}-${i}`}
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                          borderBottomWidth: i < filteredEvents.length - 1 ? 1 : 0,
                          borderBottomColor: "#F1F2F5",
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
