import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, CalendarDays, Clock, Users, Pencil, Trash2, Plus } from "lucide-react-native";
import { getManagedTeacherStores, adminDeleteTeacherSchedule, clearAdminCache } from "@/utils/firebase/adminAccounts";
import { DAYS_SHORT } from "@/utils/schedule/store";
import AdminScheduleModal from "@/components/AdminScheduleModal";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT   = "#111827";
const SUB    = "#8E93A1";
const BORDER = "#E5E9F2";
const GREEN  = "#22C55E";
const AMBER  = "#D97706";

const SUBJECT_COLOR = { IELTS: INDIGO, SAT: BLUE, General: GREEN, Английский: AMBER };
const SUBJECT_BG    = { IELTS: INDIGO_50, SAT: BLUE_50, General: "#ECFDF5", Английский: "#FFFBEB" };

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AdminTeacherSchedule() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { uid, name, create } = useLocalSearchParams();
  const { t, tSubject, tNameList } = useT();

  const [stores, setStores] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const load = useCallback(() => {
    return getManagedTeacherStores(uid)
      .then((s) => setStores(s))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Deep-linked straight into "create lesson" — e.g. the "+" on the org-wide
  // Расписание tab, which already knows which teacher was selected. Runs
  // once per navigation (not on every focus), so re-focusing this screen
  // after closing the modal doesn't reopen it.
  useEffect(() => {
    if (create === "1") {
      setEditingSchedule(null);
      setShowModal(true);
    }
  }, []);

  const onRefresh = () => { clearAdminCache(); setRefreshing(true); load(); };

  const students = stores?.students ?? [];
  const lessons  = stores?.lessons  ?? [];
  const schedules = stores?.schedules ?? [];
  const today = todayStr();

  const FREQ_LABEL = {
    weekly: t("scheduleWeekly"),
    biweekly: t("scheduleBiweekly"),
    monthly: t("scheduleMonthly"),
    odd: t("scheduleOddDays"),
    even: t("scheduleEvenDays"),
  };

  const handleDelete = (schedule) => {
    Alert.alert(
      t("scheduleTitle"),
      `${tSubject(schedule.subject)} — ${tNameList(schedule.studentNames)}`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await adminDeleteTeacherSchedule(uid, schedule.id);
              load();
            } catch (e) {
              Alert.alert(t("error"), e?.message ?? String(e));
            }
          },
        },
      ]
    );
  };

  const teacherName = name || t("adminTeacherFallback");

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Header */}
      <LinearGradient
        colors={[BLUE_50, INDIGO_50, "#FFFFFF"]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 16 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <PressableScale
            onPress={() => router.back()}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={t("back")}
            style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={20} color={TEXT} />
          </PressableScale>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }} numberOfLines={1}>
              {t("scheduleMy")}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }} numberOfLines={1}>
              {teacherName}
            </Text>
          </View>
          <PressableScale
            onPress={() => { setEditingSchedule(null); setShowModal(true); }}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={t("createSchedBtn")}
            style={{ width: 40, height: 40, borderRadius: 13, overflow: "hidden" }}
          >
            <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Plus size={20} color="#FFFFFF" />
            </LinearGradient>
          </PressableScale>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={BLUE} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        >
          {schedules.length === 0 && (
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 32, alignItems: "center", borderWidth: 1, borderColor: BORDER }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <CalendarDays size={32} color={BLUE} />
              </View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, textAlign: "center" }}>
                {t("scheduleEmptyTitle")}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginTop: 6, textAlign: "center", lineHeight: 20 }}>
                {t("scheduleEmptyHint")}
              </Text>
              <PressableScale onPress={() => { setEditingSchedule(null); setShowModal(true); }} scaleTo={0.96} style={{ marginTop: 20, borderRadius: 12, overflow: "hidden" }}>
                <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                    {t("createSchedBtn")}
                  </Text>
                </LinearGradient>
              </PressableScale>
            </View>
          )}

          {schedules.map((schedule) => {
            const upcomingCount = lessons.filter((l) => l.scheduleId === schedule.id && l.date >= today).length;
            const subColor = SUBJECT_COLOR[schedule.subject] ?? BLUE;
            const subBg = SUBJECT_BG[schedule.subject] ?? BLUE_50;

            return (
              <View key={schedule.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: subBg }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: subColor }}>
                        {tSubject(schedule.subject)}
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "#F1F5F9" }}>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#3C3C43" }}>
                        {FREQ_LABEL[schedule.frequency] ?? t("scheduleWeekly")}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <PressableScale
                      onPress={() => { setEditingSchedule(schedule); setShowModal(true); }}
                      scaleTo={0.9}
                      accessibilityRole="button"
                      accessibilityLabel={t("save")}
                      style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center" }}
                    >
                      <Pencil size={14} color={BLUE} />
                    </PressableScale>
                    <PressableScale
                      onPress={() => handleDelete(schedule)}
                      scaleTo={0.9}
                      accessibilityRole="button"
                      accessibilityLabel={t("delete")}
                      style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}
                    >
                      <Trash2 size={14} color="#EF4444" />
                    </PressableScale>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Users size={14} color={SUB} />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: TEXT, flex: 1 }} numberOfLines={1}>
                    {tNameList(schedule.studentNames)}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", gap: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <CalendarDays size={13} color={SUB} />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>
                        {schedule.dayOfWeek != null ? DAYS_SHORT[schedule.dayOfWeek] : FREQ_LABEL[schedule.frequency]}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Clock size={13} color={SUB} />
                      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>
                        {schedule.time} · {schedule.duration} {t("min_abbr")}
                      </Text>
                    </View>
                  </View>

                  {upcomingCount > 0 && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: BLUE_50 }}>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: BLUE }}>
                        {upcomingCount} {t("scheduleUpcoming")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <AdminScheduleModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditingSchedule(null); }}
        onSaved={load}
        teacherUid={uid}
        students={students}
        lessons={lessons}
        editSchedule={editingSchedule}
      />
    </View>
  );
}
