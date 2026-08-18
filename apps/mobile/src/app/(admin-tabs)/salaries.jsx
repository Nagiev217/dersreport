import { useCallback, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import { ArrowLeft, ChevronLeft, ChevronRight, Wallet, X, GraduationCap, Users } from "lucide-react-native";
import { getPayroll, setTeacherSalary, clearAdminCache } from "@/utils/firebase/adminAccounts";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const CARD = "#FFFFFF";
const TEXT = "#111827";
const SUB  = "#8E93A1";
const BORDER = "#E5E9F2";

const pad = (n) => String(n).padStart(2, "0");
function thisPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function shiftPeriod(period, delta) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const TYPE_META = {
  per_lesson: { color: BLUE,       bg: BLUE_50 },
  hourly:     { color: INDIGO,     bg: INDIGO_50 },
  fixed:      { color: "#22C55E",  bg: "#ECFDF5" },
  none:       { color: "#8E8E93",  bg: "#F1F5F9" },
};

export default function AdminSalaries() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tName } = useT();

  const [period, setPeriod] = useState(thisPeriod());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editRow, setEditRow] = useState(null);
  const [editType, setEditType] = useState("none");
  const [editRate, setEditRate] = useState("0");
  const [saving, setSaving] = useState(false);

  const load = useCallback((p) => {
    setLoading(true);
    return getPayroll(p)
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useFocusEffect(useCallback(() => { load(period); }, [load, period]));

  const onRefresh = () => { clearAdminCache(); setRefreshing(true); load(period); };
  const goPeriod = (delta) => { const p = shiftPeriod(period, delta); setPeriod(p); load(p); };

  const openEdit = (row) => {
    setEditRow(row);
    setEditType(row.salaryType || "none");
    setEditRate(String(row.rate || 0));
  };
  const closeEdit = () => setEditRow(null);

  const saveEdit = async () => {
    if (!editRow) return;
    setSaving(true);
    try {
      await setTeacherSalary(editRow.uid, editType, editType === "none" ? 0 : Number(editRate) || 0);
      closeEdit();
      await load(period);
    } catch (e) {
      Alert.alert(t("error"), e?.message ?? t("errorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  const rows = data?.rows ?? [];
  const configuredCount = rows.filter((r) => r.salaryType && r.salaryType !== "none").length;

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <PressableScale
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t("back")}
              scaleTo={0.92}
              style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
            >
              <ArrowLeft size={18} color={TEXT} />
            </PressableScale>
            <Animated.Text
              entering={FadeInDown.duration(340).easing(Easing.out(Easing.cubic))}
              style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.4 }}
            >
              {t("salariesTitle")}
            </Animated.Text>
          </View>

          {/* Month selector */}
          <Animated.View entering={FadeInDown.delay(40).duration(340).easing(Easing.out(Easing.cubic))}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 6, borderWidth: 1, borderColor: BORDER, marginBottom: 20 }}>
              <PressableScale onPress={() => goPeriod(-1)} accessibilityLabel="−1" scaleTo={0.9} style={{ width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
                <ChevronLeft size={20} color={TEXT} />
              </PressableScale>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT }}>{period}</Text>
              <PressableScale onPress={() => goPeriod(1)} accessibilityLabel="+1" scaleTo={0.9} style={{ width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
                <ChevronRight size={20} color={TEXT} />
              </PressableScale>
            </View>
          </Animated.View>

          {/* Stat cards */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[
              { icon: Wallet, value: `${fmt(data?.total ?? 0)} ₼`, label: t("salariesTotal"), color: "#D97706", bg: "#FFFBEB" },
              { icon: Users,  value: configuredCount,               label: t("dashboardStatTeachers"), color: BLUE, bg: BLUE_50 },
            ].map((s, i) => (
              <Animated.View
                key={s.label}
                entering={FadeInDown.delay(80 + i * 60).duration(380).easing(Easing.out(Easing.cubic))}
                style={{ flex: 1 }}
              >
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER, shadowColor: INDIGO, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: s.bg, alignItems: "center", justifyContent: "center", marginBottom: 9 }}>
                    <s.icon size={16} color={s.color} />
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3 }}>{s.value}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: SUB, marginTop: 2 }}>{s.label}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </LinearGradient>

        {/* ── SECTION 2 — Payroll list (white) ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
          {loading ? (
            <ActivityIndicator color={BLUE} style={{ marginTop: 30 }} />
          ) : rows.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB }}>{t("adminRosterEmpty")}</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
              {rows.map((r, i) => {
                const meta = TYPE_META[r.salaryType] ?? TYPE_META.none;
                return (
                  <Animated.View key={r.uid} entering={FadeInDown.delay(30 + i * 35).duration(300)}>
                    <PressableScale
                      onPress={() => openEdit(r)}
                      scaleTo={0.985}
                      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#F1F5F9" }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center" }}>
                        <GraduationCap size={18} color={BLUE} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{tName(r.name)}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: meta.bg }}>
                            <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: meta.color }}>{t(`salaryType_${r.salaryType}`)}</Text>
                          </View>
                          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB }}>
                            {r.salaryType === "fixed" ? `${fmt(r.rate)} ₼/${t("salaryMonthShort")}`
                              : r.salaryType === "hourly" ? `${fmt(r.rate)} ₼/${t("salaryHourShort")} · ${r.hours} ${t("salaryHourShort")}`
                              : r.salaryType === "per_lesson" ? `${fmt(r.rate)} ₼ × ${r.lessonCount}`
                              : t("salaryNotSet")}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: r.amount > 0 ? "#22C55E" : "#C7C7CC" }}>{fmt(r.amount)} ₼</Text>
                    </PressableScale>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit salary modal */}
      <Modal visible={!!editRow} transparent animationType="slide" onRequestClose={closeEdit}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingBottom: insets.bottom + 16, paddingTop: 8 }}>
              <View style={{ alignItems: "center", marginBottom: 12 }}><View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} /></View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT }}>{t("salaryEditTitle")}</Text>
                <TouchableOpacity onPress={closeEdit} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
                  <X size={16} color="#3C3C43" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 16 }}>{tName(editRow?.name ?? "")}</Text>

              {/* Type */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {["per_lesson", "hourly", "fixed", "none"].map((tp) => {
                  const active = editType === tp;
                  return (
                    <PressableScale key={tp} onPress={() => setEditType(tp)} scaleTo={0.95}
                      style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: active ? BLUE : "#F2F2F7", borderWidth: active ? 0 : 1, borderColor: BORDER }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : "#3C3C43" }}>{t(`salaryType_${tp}`)}</Text>
                    </PressableScale>
                  );
                })}
              </View>

              {/* Rate */}
              {editType !== "none" && (
                <>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>
                    {editType === "per_lesson" ? t("salaryRatePerLesson") : editType === "hourly" ? t("salaryRatePerHour") : t("salaryRateMonthly")}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <TextInput value={editRate} onChangeText={(v) => setEditRate(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad"
                      style={{ flex: 1, backgroundColor: "#F2F2F7", borderRadius: 12, paddingHorizontal: 14, height: 50, fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }} />
                    <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: SUB }}>₼</Text>
                  </View>
                </>
              )}

              <PressableScale onPress={saveEdit} disabled={saving} scaleTo={0.97} style={{ borderRadius: 14, overflow: "hidden", marginBottom: 8 }}>
                <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 52, alignItems: "center", justifyContent: "center" }}>
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("salarySaveBtn")}</Text>}
                </LinearGradient>
              </PressableScale>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
