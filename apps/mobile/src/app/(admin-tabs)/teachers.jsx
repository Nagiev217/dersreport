import { useCallback, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import { GraduationCap, ChevronRight, Users, UserCheck, UserX } from "lucide-react-native";
import { listManagedTeachers, getOrgAnalytics , clearAdminCache } from "@/utils/firebase/adminAccounts";
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

const AVATAR_COLORS = ["#2563EB", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#8B5CF6", "#EC4899", "#0EA5E9"];
function avatarBg(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}

export default function AdminTeachers() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const [teachers, setTeachers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, stats] = await Promise.all([
        listManagedTeachers(),
        getOrgAnalytics().catch(() => null),
      ]);
      setTeachers(list);
      setAnalytics(stats);
    } catch {
      // roster stays empty on failure — pull-to-refresh lets them retry
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { clearAdminCache(); setRefreshing(true); load(); };

  const activeCount = teachers.filter((tc) => !tc.disabled).length;
  const disabledCount = teachers.length - activeCount;

  const STATS = [
    { icon: Users,     value: teachers.length, label: t("dashboardStatTeachers"), color: BLUE,      bg: BLUE_50 },
    { icon: UserCheck, value: activeCount,      label: t("dashboardStatusActive"), color: "#22C55E", bg: "#ECFDF5" },
    { icon: UserX,     value: disabledCount,    label: t("adminDisabledBadge"),   color: "#EF4444", bg: "#FEF2F2" },
  ];

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
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 24 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
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

          <Animated.View entering={FadeInDown.duration(380).easing(Easing.out(Easing.cubic))}>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.5 }}>
              {t("adminRosterTitle")}
            </Text>
            <Text style={{ fontSize: 13.5, fontFamily: "Inter_400Regular", color: SUB, marginTop: 4 }}>
              {teachers.length} {t("adminTeachersCount")}
            </Text>
          </Animated.View>

          {/* Stat cards */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
            {STATS.map((s, i) => (
              <Animated.View
                key={s.label}
                entering={FadeInDown.delay(80 + i * 60).duration(380).easing(Easing.out(Easing.cubic))}
                style={{ flex: 1 }}
              >
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 13, borderWidth: 1, borderColor: BORDER, shadowColor: INDIGO, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: s.bg, alignItems: "center", justifyContent: "center", marginBottom: 9 }}>
                    <s.icon size={15} color={s.color} />
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3 }}>{s.value}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 10.5, fontFamily: "Inter_500Medium", color: SUB, marginTop: 2 }}>{s.label}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </LinearGradient>

        {/* ── SECTION 2 — Roster (white) ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
          {loading ? (
            <ActivityIndicator color={BLUE} style={{ marginTop: 40 }} />
          ) : teachers.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 50 }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Users size={32} color={BLUE} />
              </View>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                {t("adminRosterEmpty")}
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
              {teachers.map((tch, i) => {
                const name = `${tch.firstName} ${tch.lastName}`.trim() || tch.email;
                const stats = analytics?.perTeacher?.[tch.uid];
                return (
                  <Animated.View key={tch.uid} entering={FadeInDown.delay(30 + i * 35).duration(300)}>
                    <PressableScale
                      onPress={() => router.push({ pathname: `/(admin-tabs)/teacher/${tch.uid}`, params: { name, email: tch.email, disabled: String(!!tch.disabled) } })}
                      scaleTo={0.985}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                        borderTopWidth: i > 0 ? 1 : 0,
                        borderTopColor: "#F1F5F9",
                        opacity: tch.disabled ? 0.55 : 1,
                      }}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: avatarBg(name), alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" }}>{initials(name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{name}</Text>
                          {tch.disabled ? (
                            <View style={{ backgroundColor: "#FEF2F2", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                              <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: "#EF4444" }}>{t("adminDisabledBadge")}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>{tch.email}</Text>
                      </View>
                      {stats ? (
                        <View style={{ alignItems: "flex-end", marginRight: 4 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT }}>{stats.studentsCount}</Text>
                          <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: SUB }}>{t("adminStatStudents")}</Text>
                        </View>
                      ) : null}
                      <ChevronRight size={17} color="#C6CBD5" />
                    </PressableScale>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
