import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import { Heart, Settings, X, GraduationCap, Link2, Link2Off } from "lucide-react-native";
import { listManagedParents , clearAdminCache } from "@/utils/firebase/adminAccounts";
import { useMyRole } from "@/utils/auth/useMyRole";
import { canManageAccounts } from "@/utils/auth/permissions";
import AdminAccountActions from "@/components/AdminAccountActions";
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

const AVATAR_COLORS = [BLUE, "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", INDIGO, "#EC4899", "#0EA5E9"];
function avatarBg(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}

export default function AdminParents() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const myRole = useMyRole();
  const canManage = canManageAccounts(myRole);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeUid, setActiveUid] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await listManagedParents();
      setParents(list);
    } catch {
      // stays empty on failure — pull-to-refresh lets them retry
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { clearAdminCache(); setRefreshing(true); load(); };

  const activeParent = parents.find((p) => p.uid === activeUid);
  const linkedCount = parents.filter((p) => p.linkedTeachers.length > 0).length;
  const unlinkedCount = parents.length - linkedCount;

  const STATS = [
    { icon: Heart,    value: parents.length, label: t("adminParentsCount"),   color: BLUE,      bg: BLUE_50 },
    { icon: Link2,    value: linkedCount,     label: t("adminParentLinked"),   color: "#22C55E", bg: "#ECFDF5" },
    { icon: Link2Off, value: unlinkedCount,   label: t("adminParentUnlinked"), color: "#D97706", bg: "#FFFBEB" },
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
              <Heart size={18} color="#FFFFFF" strokeWidth={2} />
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
              {t("adminParentsTitle")}
            </Text>
            <Text style={{ fontSize: 13.5, fontFamily: "Inter_400Regular", color: SUB, marginTop: 4 }}>
              {parents.length} {t("adminParentsCount")}
            </Text>
          </Animated.View>

          {/* Stat cards */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
            {STATS.map((s, i) => (
              <Animated.View
                key={i}
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

        {/* ── SECTION 2 — Parents list (white) ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
          {loading ? (
            <ActivityIndicator color={BLUE} style={{ marginTop: 40 }} />
          ) : parents.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 50 }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Heart size={32} color={BLUE} />
              </View>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                {t("adminParentsEmpty")}
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
              {parents.map((p, i) => {
                const name = `${p.firstName} ${p.lastName}`.trim() || p.email;
                return (
                  <Animated.View key={p.uid} entering={FadeInDown.delay(30 + i * 35).duration(300)}>
                    <View
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                        borderTopWidth: i > 0 ? 1 : 0,
                        borderTopColor: "#F1F5F9",
                        opacity: p.disabled ? 0.55 : 1,
                      }}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: avatarBg(name), alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" }}>{initials(name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{name}</Text>
                          {p.disabled ? (
                            <View style={{ backgroundColor: "#FEF2F2", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                              <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: "#EF4444" }}>{t("adminDisabledBadge")}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>{p.email}</Text>
                        {p.linkedTeachers.length > 0 ? (
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                            {p.linkedTeachers.map((lt) => (
                              <View key={lt.uid} style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: BLUE_50, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
                                <GraduationCap size={10} color={BLUE} />
                                <Text numberOfLines={1} style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: BLUE }}>{lt.name}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#C7C7CC", marginTop: 4 }}>
                            {t("adminParentNoLinks")}
                          </Text>
                        )}
                      </View>
                      {canManage ? (
                        <PressableScale
                          onPress={() => setActiveUid(p.uid)}
                          scaleTo={0.9}
                          accessibilityRole="button"
                          accessibilityLabel={t("tabProfile")}
                          style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center" }}
                        >
                          <Settings size={16} color={BLUE} />
                        </PressableScale>
                      ) : null}
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Account management sheet — Boss only */}
      <Modal visible={!!activeParent} transparent animationType="fade" onRequestClose={() => setActiveUid(null)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setActiveUid(null)}
        >
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20 }}>
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text numberOfLines={1} style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, flex: 1 }}>
                {activeParent ? `${activeParent.firstName} ${activeParent.lastName}`.trim() || activeParent.email : ""}
              </Text>
              <TouchableOpacity onPress={() => setActiveUid(null)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
                <X size={16} color={SUB} />
              </TouchableOpacity>
            </View>
            {activeParent ? (
              <AdminAccountActions
                uid={activeParent.uid}
                disabled={!!activeParent.disabled}
                onDisabledChange={(next) => {
                  setParents((prev) => prev.map((p) => (p.uid === activeParent.uid ? { ...p, disabled: next } : p)));
                }}
                onDeleted={() => {
                  setParents((prev) => prev.filter((p) => p.uid !== activeParent.uid));
                  setActiveUid(null);
                }}
              />
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
