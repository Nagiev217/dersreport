import { useCallback, useMemo, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Wallet, X, Users,
  CheckCircle2, AlertCircle, Banknote, CreditCard, ArrowRightLeft, Trash2,
} from "lucide-react-native";
import {
  getStudentPayments, addStudentPayment, deletePayment, clearAdminCache,
} from "@/utils/firebase/adminAccounts";
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
const GREEN = "#22C55E";
const AMBER = "#D97706";

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
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const AVATAR_COLORS = [BLUE, GREEN, AMBER, "#EF4444", "#06B6D4", INDIGO, "#EC4899", "#0EA5E9"];
function avatarBg(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}

export default function AdminPayments() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tName } = useT();

  const [period, setPeriod] = useState(thisPeriod());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [teacherFilter, setTeacherFilter] = useState(null); // null = all teachers
  const [statusFilter, setStatusFilter] = useState("all");  // all | unpaid | paid

  // Sheet state — one sheet serves both "record a payment" and "view/delete".
  const [sheetRow, setSheetRow] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // `showSpinner` is false when the list already answers the question being
  // asked (same period) — refetching in the background beats blanking the
  // screen, which read as "slow" even when the cache answered instantly.
  const load = useCallback((p, { showSpinner = true } = {}) => {
    if (showSpinner) setLoading(true);
    return getStudentPayments(p)
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useFocusEffect(useCallback(() => {
    load(period, { showSpinner: data?.period !== period });
  }, [load, period, data?.period]));

  const onRefresh = () => { clearAdminCache(); setRefreshing(true); load(period); };
  const goPeriod = (delta) => { const p = shiftPeriod(period, delta); setPeriod(p); load(p); };

  const rows = data?.rows ?? [];
  const totals = data?.totals ?? { collected: 0, paidCount: 0, unpaidCount: 0 };

  // Teacher chips built from the returned rows — no extra request needed.
  const teachers = useMemo(() => {
    const seen = new Map();
    rows.forEach((r) => {
      if (!seen.has(r.teacherUid)) seen.set(r.teacherUid, r.teacherName);
    });
    return Array.from(seen, ([uid, name]) => ({ uid, name }));
  }, [rows]);

  const visibleRows = rows.filter((r) => {
    if (teacherFilter && r.teacherUid !== teacherFilter) return false;
    if (statusFilter === "paid" && !r.paid) return false;
    if (statusFilter === "unpaid" && r.paid) return false;
    return true;
  });

  const METHOD_OPTIONS = [
    { value: "cash",     label: t("addPayCash"),     Icon: Banknote },
    { value: "card",     label: t("addPayCard"),     Icon: CreditCard },
    { value: "transfer", label: t("addPayTransfer"), Icon: ArrowRightLeft },
  ];

  function openSheet(row) {
    setSheetRow(row);
    if (row.paid) {
      setAmount(String(row.amount ?? ""));
      setMethod(row.method ?? "cash");
      setDate(row.date ?? todayStr());
      setNote(row.note ?? "");
    } else {
      // Prefill only for monthly students — for hourly/per-lesson the rate is
      // per unit, so a monthly total can't be derived without lesson counts.
      setAmount(row.paymentType === "Месячная" && row.rate > 0 ? String(row.rate) : "");
      setMethod("cash");
      setDate(todayStr());
      setNote("");
    }
  }
  const closeSheet = () => { setSheetRow(null); setSaving(false); };

  // Strict numeric match — parseFloat("12abc") would silently pass as 12.
  const parsedAmount = /^\d+(\.\d+)?$/.test(amount.trim()) ? parseFloat(amount) : 0;
  const canSave = parsedAmount > 0 && parsedAmount <= 100000 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  // Patch one row in place and recompute the header totals, instead of
  // re-running getStudentPayments. A mutation already costs one Cloud
  // Function round-trip; refetching everything doubled the wait for no new
  // information — the server has already accepted exactly these values.
  function patchRow(teacherUid, studentId, patch) {
    setData((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.map((r) =>
        r.teacherUid === teacherUid && r.studentId === studentId ? { ...r, ...patch } : r
      );
      const collected = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
      const paidCount = rows.filter((r) => r.paid).length;
      return { ...prev, rows, totals: { collected, paidCount, unpaidCount: rows.length - paidCount } };
    });
  }

  async function handleSave() {
    if (!sheetRow || !canSave || saving) return;
    setSaving(true);
    const target = sheetRow;
    try {
      const res = await addStudentPayment({
        teacherUid: target.teacherUid,
        studentId: target.studentId,
        amount: parsedAmount,
        date,
        period,
        method,
        note: note.trim(),
      });
      patchRow(target.teacherUid, target.studentId, {
        paid: true,
        paymentId: res?.paymentId ?? null,
        amount: parsedAmount,
        date,
        method,
        note: note.trim(),
      });
      closeSheet();
    } catch (e) {
      Alert.alert(t("error"), e?.message ?? t("errorGeneric"));
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!sheetRow?.paymentId) return;
    const target = sheetRow;
    Alert.alert(t("addPayDeleteTitle"), t("addPayDeleteMsg"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await deletePayment(target.teacherUid, target.paymentId);
            patchRow(target.teacherUid, target.studentId, {
              paid: false, paymentId: null, amount: null, date: null, method: null, note: null,
            });
            closeSheet();
          } catch (e) {
            Alert.alert(t("error"), e?.message ?? t("errorGeneric"));
            setSaving(false);
          }
        },
      },
    ]);
  }

  const STATUS_FILTERS = [
    { key: "all",    label: t("all") },
    { key: "unpaid", label: t("adminPaymentsUnpaid") },
    { key: "paid",   label: t("adminPaymentsPaid") },
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
              {t("adminPaymentsTitle")}
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
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              { icon: Wallet,        value: `${fmt(totals.collected)} ₼`, label: t("adminPaymentsCollected"), color: "#059669", bg: "#ECFDF5" },
              { icon: CheckCircle2,  value: totals.paidCount,             label: t("adminPaymentsPaid"),      color: GREEN,     bg: "#ECFDF5" },
              { icon: AlertCircle,   value: totals.unpaidCount,           label: t("adminPaymentsUnpaid"),    color: AMBER,     bg: "#FFFBEB" },
            ].map((s, i) => (
              <Animated.View
                key={s.label}
                entering={FadeInDown.delay(80 + i * 60).duration(380).easing(Easing.out(Easing.cubic))}
                style={{ flex: 1 }}
              >
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 13, borderWidth: 1, borderColor: BORDER, shadowColor: INDIGO, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: s.bg, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                    <s.icon size={15} color={s.color} />
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3 }}>{s.value}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 10.5, fontFamily: "Inter_500Medium", color: SUB, marginTop: 2 }}>{s.label}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </LinearGradient>

        {/* ── SECTION 2 — Filters + list (white) ── */}
        <View style={{ paddingTop: 20 }}>
          {/* Teacher filter chips */}
          {teachers.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 12 }}>
              <PressableScale
                onPress={() => setTeacherFilter(null)}
                scaleTo={0.95}
                accessibilityRole="button"
                accessibilityState={{ selected: teacherFilter === null }}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: teacherFilter === null ? BLUE : "#FFFFFF", borderWidth: 1, borderColor: teacherFilter === null ? BLUE : BORDER }}
              >
                <Users size={13} color={teacherFilter === null ? "#FFFFFF" : SUB} />
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: teacherFilter === null ? "#FFFFFF" : TEXT }}>
                  {t("adminScheduleAllTeachers")}
                </Text>
              </PressableScale>
              {teachers.map((tc) => {
                const active = teacherFilter === tc.uid;
                return (
                  <PressableScale
                    key={tc.uid}
                    onPress={() => setTeacherFilter(active ? null : tc.uid)}
                    scaleTo={0.95}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? BLUE : "#FFFFFF", borderWidth: 1, borderColor: active ? BLUE : BORDER }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : TEXT }}>
                      {tName(tc.name)}
                    </Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
          )}

          {/* Status filter — segmented */}
          <View style={{ flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 12, padding: 3, marginHorizontal: 20, marginBottom: 16 }}>
            {STATUS_FILTERS.map(({ key, label }) => {
              const active = statusFilter === key;
              return (
                <PressableScale
                  key={key}
                  onPress={() => setStatusFilter(key)}
                  scaleTo={0.97}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center", backgroundColor: active ? "#FFFFFF" : "transparent" }}
                >
                  <Text style={{ fontSize: 13, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? TEXT : SUB }}>
                    {label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {loading ? (
              <ActivityIndicator color={BLUE} style={{ marginTop: 30 }} />
            ) : visibleRows.length === 0 ? (
              <View style={{ alignItems: "center", paddingTop: 40, paddingHorizontal: 24 }}>
                <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Wallet size={30} color={BLUE} />
                </View>
                <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                  {t("adminPaymentsEmpty")}
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
                {visibleRows.map((r, i) => (
                  <Animated.View key={`${r.teacherUid}:${r.studentId}`} entering={FadeInDown.delay(Math.min(30 + i * 25, 400)).duration(300)}>
                    <PressableScale
                      onPress={() => openSheet(r)}
                      scaleTo={0.985}
                      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#F1F5F9" }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: avatarBg(r.studentName), alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" }}>{initials(r.studentName)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{tName(r.studentName)}</Text>
                        <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>{tName(r.teacherName)}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 5 }}>
                        <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, backgroundColor: r.paid ? "#ECFDF5" : "#FFFBEB" }}>
                          <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: r.paid ? GREEN : AMBER }}>
                            {r.paid ? t("adminPaymentsPaidBadge") : t("adminPaymentsUnpaidBadge")}
                          </Text>
                        </View>
                        {r.paid ? (
                          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT }}>{fmt(r.amount)} ₼</Text>
                        ) : null}
                      </View>
                    </PressableScale>
                  </Animated.View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Payment sheet — record (unpaid) or view/delete (paid) */}
      <Modal visible={!!sheetRow} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingBottom: insets.bottom + 16, paddingTop: 8 }}>
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT }}>
                  {sheetRow?.paid ? t("editPayTitle") : t("addPayTitle")}
                </Text>
                <TouchableOpacity onPress={closeSheet} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
                  <X size={16} color="#3C3C43" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 16 }}>
                {tName(sheetRow?.studentName ?? "")} · {period}
              </Text>

              {sheetRow?.paid ? (
                // ── Already paid: read-only summary + delete ──
                <>
                  <View style={{ backgroundColor: "#ECFDF5", borderRadius: 14, padding: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: GREEN }}>{fmt(sheetRow.amount)} ₼</Text>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginTop: 4 }}>
                      {sheetRow.date} · {METHOD_OPTIONS.find((m) => m.value === sheetRow.method)?.label ?? sheetRow.method}
                    </Text>
                    {sheetRow.note ? (
                      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT, marginTop: 6 }}>{sheetRow.note}</Text>
                    ) : null}
                  </View>
                  <PressableScale
                    onPress={handleDelete}
                    disabled={saving}
                    scaleTo={0.97}
                    style={{ height: 52, borderRadius: 14, backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: "#FECACA", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginBottom: 8 }}
                  >
                    {saving ? <ActivityIndicator color="#EF4444" /> : (
                      <>
                        <Trash2 size={17} color="#EF4444" />
                        <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#EF4444" }}>{t("delete")}</Text>
                      </>
                    )}
                  </PressableScale>
                </>
              ) : (
                // ── Unpaid: record a payment ──
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>{t("addPayAmount")}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <TextInput
                      value={amount}
                      onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#C7C7CC"
                      style={{ flex: 1, backgroundColor: "#F2F2F7", borderRadius: 12, paddingHorizontal: 14, height: 50, fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}
                    />
                    <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: SUB }}>₼</Text>
                  </View>

                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>{t("addPayMethod")}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                    {METHOD_OPTIONS.map(({ value, label, Icon }) => {
                      const active = method === value;
                      return (
                        <PressableScale
                          key={value}
                          onPress={() => setMethod(value)}
                          scaleTo={0.95}
                          style={{ flex: 1, alignItems: "center", gap: 5, paddingVertical: 11, borderRadius: 12, backgroundColor: active ? BLUE : "#F2F2F7", borderWidth: active ? 0 : 1, borderColor: BORDER }}
                        >
                          <Icon size={16} color={active ? "#FFFFFF" : SUB} />
                          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : "#3C3C43" }}>{label}</Text>
                        </PressableScale>
                      );
                    })}
                  </View>

                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>{t("addPayDate")}</Text>
                  <TextInput
                    value={date}
                    onChangeText={setDate}
                    placeholder={t("addPayDateFmt")}
                    placeholderTextColor="#C7C7CC"
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                    style={{ backgroundColor: "#F2F2F7", borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT, marginBottom: 16 }}
                  />

                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>{t("addPayNote")}</Text>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder={t("addPayNoteHint")}
                    placeholderTextColor="#C7C7CC"
                    maxLength={200}
                    style={{ backgroundColor: "#F2F2F7", borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT, marginBottom: 20 }}
                  />

                  <PressableScale onPress={handleSave} disabled={!canSave || saving} scaleTo={0.97} style={{ borderRadius: 14, overflow: "hidden", marginBottom: 8, opacity: canSave ? 1 : 0.5 }}>
                    <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 52, alignItems: "center", justifyContent: "center" }}>
                      {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                        <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                          {t("addPaySaveBtn")}{parsedAmount > 0 ? ` ${fmt(parsedAmount)} ₼` : ""}
                        </Text>
                      )}
                    </LinearGradient>
                  </PressableScale>
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
