import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ArrowLeft, Users, BookOpen, FileText, Wallet, Hash, Globe, GraduationCap, Clock } from "lucide-react-native";
import { getManagedTeacherStores } from "@/utils/firebase/adminAccounts";
import { useMyRole } from "@/utils/auth/useMyRole";
import { canManageAccounts } from "@/utils/auth/permissions";
import AdminAccountActions from "@/components/AdminAccountActions";
import { useT, useDateLocale } from "@/utils/i18n";
import { formatDateShort, todayStr } from "@/utils/dateUtils";

const TEXT = "#111827";
const SUB  = "#8E93A1";
const BLUE = "#2563EB";

const SUBJECT_CONFIG = {
  IELTS:      { Icon: BookOpen,      color: "#6B5CF6", bg: "#EEF0FF" },
  SAT:        { Icon: Hash,          color: "#3B82F6", bg: "#EFF6FF" },
  General:    { Icon: Globe,         color: "#10B981", bg: "#ECFDF5" },
  Английский: { Icon: GraduationCap, color: "#F59E0B", bg: "#FFFBEB" },
};
const DEFAULT_SUBJECT = { Icon: BookOpen, color: "#8E93A1", bg: "#F1F2F5" };

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

  const onRefresh = () => { setRefreshing(true); load(); };

  useEffect(() => {
    if (deleted) router.back();
  }, [deleted]);

  const students = stores?.students ?? [];
  const lessons  = stores?.lessons  ?? [];
  const reports  = stores?.reports  ?? [];
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

  const STATS = [
    { icon: Users,    value: students.length, label: t("adminStatStudents"), color: BLUE,      bg: "#E8EEFB" },
    { icon: BookOpen, value: lessons.length,   label: t("adminStatLessons"), color: "#22C55E", bg: "#E4F6EF" },
    { icon: FileText, value: reports.length,   label: t("adminStatReports"), color: "#8B5CF6", bg: "#F0EAFC" },
    ...(hasFinance ? [{ icon: Wallet, value: `${totalIncome} ₼`, label: t("adminStatIncome"), color: "#F59E0B", bg: "#FDF1DF" }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF" }}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}
        >
          <ArrowLeft size={19} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text numberOfLines={1} style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>
              {name || t("adminTeacherFallback")}
            </Text>
            {disabled ? (
              <View style={{ backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#EF4444" }}>{t("adminDisabledBadge")}</Text>
              </View>
            ) : null}
          </View>
          {email ? (
            <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>{email}</Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={BLUE} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        >
          {/* Account controls — Boss only; server also enforces this */}
          {canManageAccounts(myRole) ? (
            <AdminAccountActions
              uid={uid}
              disabled={disabled}
              onDisabledChange={setDisabled}
              onDeleted={() => setDeleted(true)}
            />
          ) : null}

          {/* Stats row */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
            {STATS.map(({ icon: Icon, value, label, color, bg }, i) => (
              <View key={i} style={{ flexBasis: "47%", flexGrow: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  <Icon size={16} color={color} />
                </View>
                <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{value}</Text>
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Upcoming lessons */}
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 10 }}>
            {t("adminLessonsSection")}
          </Text>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, marginBottom: 20, overflow: "hidden" }}>
            {upcomingLessons.length === 0 ? (
              <Text style={{ padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                {t("adminEmptySection")}
              </Text>
            ) : upcomingLessons.map((l, i) => {
              const cfg = SUBJECT_CONFIG[l.subject] ?? DEFAULT_SUBJECT;
              const Icon = cfg.Icon;
              return (
                <View
                  key={l.id}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                    borderBottomWidth: i < upcomingLessons.length - 1 ? 1 : 0,
                    borderBottomColor: "#F1F2F5",
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
              );
            })}
          </View>

          {/* Students */}
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 10 }}>
            {t("adminStudentsSection")}
          </Text>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, marginBottom: 20, overflow: "hidden" }}>
            {students.length === 0 ? (
              <Text style={{ padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                {t("adminEmptySection")}
              </Text>
            ) : students.map((s, i) => (
              <View
                key={s.id}
                style={{
                  flexDirection: "row", alignItems: "center", padding: 14,
                  borderBottomWidth: i < students.length - 1 ? 1 : 0,
                  borderBottomColor: "#F1F2F5",
                }}
              >
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT }}>
                  {tName(s.name)}
                </Text>
                {s.type ? (
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>{tSubject(s.type)}</Text>
                ) : null}
              </View>
            ))}
          </View>

          {/* Recent reports */}
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 10 }}>
            {t("adminReportsSection")}
          </Text>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden" }}>
            {recentReports.length === 0 ? (
              <Text style={{ padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                {t("adminEmptySection")}
              </Text>
            ) : recentReports.map((r, i) => (
              <View
                key={r.id}
                style={{
                  flexDirection: "row", alignItems: "center", padding: 14,
                  borderBottomWidth: i < recentReports.length - 1 ? 1 : 0,
                  borderBottomColor: "#F1F2F5",
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
                <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#22C55E" }}>
                  {(r.activityScore ?? 0) * 20}%
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
