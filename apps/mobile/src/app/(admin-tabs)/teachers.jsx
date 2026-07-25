import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { GraduationCap, ChevronRight, Users } from "lucide-react-native";
import { listManagedTeachers, getOrgAnalytics } from "@/utils/firebase/adminAccounts";
import { useT } from "@/utils/i18n";

const NAVY_GRAD = ["#22447A", "#152C51"];
const SHEET = "#F4F5F7";
const CARD  = "#FFFFFF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";

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

  const onRefresh = () => { setRefreshing(true); load(); };

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
              <GraduationCap size={19} color="#FFFFFF" strokeWidth={2} />
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
            {t("adminRosterTitle")}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
            {teachers.length} {t("adminTeachersCount")}
          </Text>
        </LinearGradient>

        <View style={{ flex: 1, backgroundColor: SHEET, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -14, paddingTop: 20, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
          {loading ? (
            <ActivityIndicator color={NAVY_GRAD[1]} style={{ marginTop: 40 }} />
          ) : teachers.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Users size={32} color={NAVY_GRAD[1]} />
              </View>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                {t("adminRosterEmpty")}
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", shadowColor: "#0B1B3A", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
              {teachers.map((tch, i) => {
                const name = `${tch.firstName} ${tch.lastName}`.trim() || tch.email;
                const stats = analytics?.perTeacher?.[tch.uid];
                return (
                  <TouchableOpacity
                    key={tch.uid}
                    onPress={() => router.push({ pathname: `/(admin-tabs)/teacher/${tch.uid}`, params: { name, email: tch.email, disabled: String(!!tch.disabled) } })}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                      borderBottomWidth: i < teachers.length - 1 ? 1 : 0,
                      borderBottomColor: "#F1F2F5",
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
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
