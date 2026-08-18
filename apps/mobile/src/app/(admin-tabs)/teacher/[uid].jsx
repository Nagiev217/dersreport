import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import { ArrowLeft, Users, BookOpen, FileText, Wallet, Hash, Globe, GraduationCap, Clock, CalendarDays, ChevronRight } from "lucide-react-native";
import { getManagedTeacherStores , clearAdminCache } from "@/utils/firebase/adminAccounts";
import { useMyRole } from "@/utils/auth/useMyRole";
import { canManageAccounts, canManageSchedules } from "@/utils/auth/permissions";
import AdminAccountActions from "@/components/AdminAccountActions";
import PressableScale from "@/components/PressableScale";
import { useT, useDateLocale } from "@/utils/i18n";
import { formatDateShort, todayStr } from "@/utils/dateUtils";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";

const SUBJECT_CONFIG = {
  IELTS:      { Icon: BookOpen,      color: INDIGO,    bg: INDIGO_50 },
  SAT:        { Icon: Hash,          color: BLUE,      bg: BLUE_50 },
  General:    { Icon: Globe,         color: "#22C55E", bg: "#ECFDF5" },
  Английский: { Icon: GraduationCap, color: "#D97706", bg: "#FFFBEB" },
};
const DEFAULT_SUBJECT = { Icon: BookOpen, color: "#8E93A1", bg: "#F1F5F9" };

const AVATAR_COLORS = [BLUE, "#22C55E", "#D97706", "#EF4444", "#06B6D4", INDIGO, "#EC4899", "#0EA5E9"];
function avatarBg(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}

export default function TeacherDrillDown() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { uid, name, email, disabled: disabledParam } = useLocalSearchParams();
  const { t, tName, tSubject } = useT();
  const dateLocale = useDateLocale();
  const myRole = useMyRole();
  const [stores, setStores] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disabled, setDisabled] = useState(disabledParam === "true");
  const [deleted, setDeleted] = useState(false);

  const load = useCallback(() => {
    return getManagedTeacherStores(uid)
      .then((s) => setStores(s))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { clearAdminCache(); setRefreshing(true); load(); };

  useEffect(() => {
    if (deleted) router.back();
  }, [deleted]);

  const students = stores?.students ?? [];
  const lessons  = stores?.lessons  ?? [];
  const reports  = stores?.reports  ?? [];
  // stores.reports is capped server-side (MANAGED_REPORTS_LIMIT) for display —
  // reportsCount is a separate uncapped aggregation, the true total.
  const reportsCount = stores?.reportsCount ?? reports.length;
  // "payments" key is stripped server-side for admin callers — its presence,
  // not just its content, is how we know whether finance is visible at all.
  const hasFinance = !!stores && "payments" in stores;
  const payments = stores?.payments ?? [];
  const totalIncome = payments.reduce((a, p) => a + (p.amount ?? 0), 0);

  const recentReports = [...reports].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 10);

  const today = todayStr();
  const upcomingLessons = [...lessons]
    .filter((l) => l.status === "planned" && l.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 15);

  const teacherName = name || t("adminTeacherFallback");

  const STATS = [
    { icon: Users,    value: students.length, label: t("adminStatStudents"), color: BLUE,      bg: BLUE_50 },
    { icon: BookOpen, value: lessons.length,   label: t("adminStatLessons"), color: "#22C55E", bg: "#ECFDF5" },
    { icon: FileText, value: reportsCount,     label: t("adminStatReports"), color: INDIGO,    bg: INDIGO_50 },
    ...(hasFinance ? [{ icon: Wallet, value: `${totalIncome} ₼`, label: t("adminStatIncome"), color: "#D97706", bg: "#FFFBEB" }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <PressableScale
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t("back")}
              scaleTo={0.92}
              style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
            >
              <ArrowLeft size={18} color={TEXT} />
            </PressableScale>
          </View>

          <Animated.View entering={FadeInDown.duration(380).easing(Easing.out(Easing.cubic))} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: avatarBg(teacherName), alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFF" }}>{initials(teacherName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text numberOfLines={1} style={{ fontSize: 19, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3 }}>
                  {teacherName}
                </Text>
                {disabled ? (
                  <View style={{ backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#EF4444" }}>{t("adminDisabledBadge")}</Text>
                  </View>
                ) : null}
              </View>
              {email ? (
                <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>{email}</Text>
              ) : null}
            </View>
          </Animated.View>

          {/* Stat cards */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
            {STATS.map(({ icon: Icon, value, label, color, bg }, i) => (
              <Animated.View
                key={label}
                entering={FadeInDown.delay(80 + i * 60).duration(380).easing(Easing.out(Easing.cubic))}
                style={{ flexBasis: "47%", flexGrow: 1 }}
              >
                <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: BORDER, shadowColor: INDIGO, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                    <Icon size={17} color={color} />
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.4 }}>{value}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 11.5, fontFamily: "Inter_500Medium", color: SUB, marginTop: 3 }}>{label}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color={BLUE} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Account controls — Boss only; server also enforces this */}
            {canManageAccounts(myRole) ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
                <AdminAccountActions
                  uid={uid}
                  disabled={disabled}
                  onDisabledChange={setDisabled}
                  onDeleted={() => setDeleted(true)}
                />
              </View>
            ) : null}

            {/* Schedule management — Admin only; server also enforces this
                (deliberately excludes Boss, see permissions.js:canManageSchedules) */}
            {canManageSchedules(myRole) ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
                <PressableScale
                  onPress={() => router.push({ pathname: "/(admin-tabs)/teacher/schedule", params: { uid, name: teacherName } })}
                  scaleTo={0.98}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}>
                    <CalendarDays size={18} color={INDIGO} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                    {t("adminScheduleManage")}
                  </Text>
                  <ChevronRight size={17} color="#C6CBD5" />
                </PressableScale>
              </View>
            ) : null}

            {/* ── SECTION 2 — Upcoming lessons (white) ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 12, letterSpacing: -0.3 }}>
                {t("adminLessonsSection")}
              </Text>
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
                {upcomingLessons.length === 0 ? (
                  <Text style={{ padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                    {t("adminEmptySection")}
                  </Text>
                ) : upcomingLessons.map((l, i) => {
                  const cfg = SUBJECT_CONFIG[l.subject] ?? DEFAULT_SUBJECT;
                  const Icon = cfg.Icon;
                  return (
                    <Animated.View key={l.id} entering={FadeInDown.delay(30 + i * 30).duration(280)}>
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
                          <Text numberOfLines={1} style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                            {(l.studentNames ?? []).map((n) => tName(n)).join(", ") || t("adminTeacherFallback")}
                          </Text>
                          <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>
                            {tSubject(l.subject)} · {formatDateShort(l.date, dateLocale)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Clock size={12} color={SUB} />
                          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: SUB }}>{l.time}</Text>
                        </View>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            </View>

            {/* ── SECTION 3 — Students (white) ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 12, letterSpacing: -0.3 }}>
                {t("adminStudentsSection")}
              </Text>
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
                {students.length === 0 ? (
                  <Text style={{ padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                    {t("adminEmptySection")}
                  </Text>
                ) : students.map((s, i) => {
                  const sName = tName(s.name);
                  return (
                    <Animated.View key={s.id} entering={FadeInDown.delay(30 + i * 30).duration(280)}>
                      <View
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                          borderTopWidth: i > 0 ? 1 : 0,
                          borderTopColor: "#F1F5F9",
                        }}
                      >
                        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: avatarBg(sName), alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#FFF" }}>{initials(sName)}</Text>
                        </View>
                        <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                          {sName}
                        </Text>
                        {s.type ? (
                          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>{tSubject(s.type)}</Text>
                        ) : null}
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            </View>

            {/* ── SECTION 4 — Recent reports (white) ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 12, letterSpacing: -0.3 }}>
                {t("adminReportsSection")}
              </Text>
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
                {recentReports.length === 0 ? (
                  <Text style={{ padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                    {t("adminEmptySection")}
                  </Text>
                ) : recentReports.map((r, i) => {
                  const pct = (r.activityScore ?? 0) * 20;
                  const pctColor = pct >= 80 ? "#22C55E" : pct >= 60 ? BLUE : pct >= 40 ? "#D97706" : "#EF4444";
                  return (
                    <Animated.View key={r.id} entering={FadeInDown.delay(30 + i * 30).duration(280)}>
                      <View
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                          borderTopWidth: i > 0 ? 1 : 0,
                          borderTopColor: "#F1F5F9",
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                            {tName(r.studentName)}
                          </Text>
                          <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>
                            {tSubject(r.subject)} · {r.date}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: pctColor }}>
                          {pct}%
                        </Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
