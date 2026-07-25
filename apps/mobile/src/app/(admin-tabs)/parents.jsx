import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Heart, Settings, X, GraduationCap } from "lucide-react-native";
import { listManagedParents } from "@/utils/firebase/adminAccounts";
import { useMyRole } from "@/utils/auth/useMyRole";
import { canManageAccounts } from "@/utils/auth/permissions";
import AdminAccountActions from "@/components/AdminAccountActions";
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

  const onRefresh = () => { setRefreshing(true); load(); };

  const activeParent = parents.find((p) => p.uid === activeUid);

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
              <Heart size={19} color="#FFFFFF" strokeWidth={2} />
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
            {t("adminParentsTitle")}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
            {parents.length} {t("adminParentsCount")}
          </Text>
        </LinearGradient>

        <View style={{ flex: 1, backgroundColor: SHEET, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -14, paddingTop: 20, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
          {loading ? (
            <ActivityIndicator color={NAVY_GRAD[1]} style={{ marginTop: 40 }} />
          ) : parents.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Heart size={32} color={NAVY_GRAD[1]} />
              </View>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                {t("adminParentsEmpty")}
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", shadowColor: "#0B1B3A", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
              {parents.map((p, i) => {
                const name = `${p.firstName} ${p.lastName}`.trim() || p.email;
                return (
                  <View
                    key={p.uid}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                      borderBottomWidth: i < parents.length - 1 ? 1 : 0,
                      borderBottomColor: "#F1F2F5",
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
                            <View key={lt.uid} style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#EEF0FF", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
                              <GraduationCap size={10} color={NAVY_GRAD[1]} />
                              <Text numberOfLines={1} style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: NAVY_GRAD[1] }}>{lt.name}</Text>
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
                      <TouchableOpacity
                        onPress={() => setActiveUid(p.uid)}
                        style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}
                      >
                        <Settings size={16} color={SUB} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Account management sheet — Boss only */}
      <Modal visible={!!activeParent} transparent animationType="fade" onRequestClose={() => setActiveUid(null)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setActiveUid(null)}
        >
          <View style={{ backgroundColor: SHEET, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text numberOfLines={1} style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, flex: 1 }}>
                {activeParent ? `${activeParent.firstName} ${activeParent.lastName}`.trim() || activeParent.email : ""}
              </Text>
              <TouchableOpacity onPress={() => setActiveUid(null)}>
                <X size={20} color={SUB} />
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
