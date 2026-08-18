import { useState } from "react";
import {
  View, Text, ScrollView, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import { GraduationCap, Users, BookOpen, ShieldCheck, ShieldAlert, Eye, EyeOff, UserPlus } from "lucide-react-native";
import { createManagedAccount } from "@/utils/firebase/adminAccounts";
import { useMyRole } from "@/utils/auth/useMyRole";
import { canManageAccounts } from "@/utils/auth/permissions";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";

const ROLE_OPTS = [
  { key: "teacher", icon: GraduationCap, labelKey: "roleTeacherTitle" },
  { key: "parent",  icon: Users,         labelKey: "roleParentTitle" },
  { key: "student", icon: BookOpen,      labelKey: "roleStudentTitle" },
  { key: "admin",   icon: ShieldCheck,   labelKey: "roleAdminTitle" },
];

export default function CreateAccountScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const myRole = useMyRole();

  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [role,      setRole]      = useState("teacher");
  const [loading,   setLoading]   = useState(false);

  const canSubmit = firstName.trim() && lastName.trim() && email.trim().length > 3 && password.length >= 6 && !loading;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await createManagedAccount({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        role,
      });
      Alert.alert(t("adminCreateSuccessTitle"), t("adminCreateSuccessMsg"));
      setFirstName(""); setLastName(""); setEmail(""); setPassword(""); setRole("teacher");
    } catch (e) {
      Alert.alert(t("error"), e?.message ?? t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  // Defense in depth — the tab is already hidden for non-Boss roles, but the
  // real gate is server-side (functions/index.js requireStaffCaller(['boss'])).
  if (myRole !== null && !canManageAccounts(myRole)) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <ShieldAlert size={40} color="#EF4444" />
        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT, marginTop: 14, textAlign: "center" }}>
          {t("adminNoAccess")}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#FFFFFF" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Fills the top overscroll/bounce gap with the hero color instead of white */}
        <View pointerEvents="none" style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: BLUE_50 }} />
        {/* ── SECTION 1 — Hero (gradient blue-50 → indigo-50 → white) ── */}
        <LinearGradient
          colors={[BLUE_50, INDIGO_50, "#FFFFFF"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 20 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}>
              <UserPlus size={18} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3, lineHeight: 19 }}>Jeff</Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB, letterSpacing: 0.3 }}>Colleges</Text>
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(380).easing(Easing.out(Easing.cubic))}>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.5 }}>
              {t("adminCreateTitle")}
            </Text>
            <Text style={{ fontSize: 13.5, fontFamily: "Inter_400Regular", color: SUB, marginTop: 4 }}>
              {t("adminCreateSubtitle")}
            </Text>
          </Animated.View>
        </LinearGradient>

        {/* ── SECTION 2 — Form (white) ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          {/* Role picker */}
          <Animated.View entering={FadeInDown.delay(40).duration(320)}>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {ROLE_OPTS.map(({ key, icon: Icon, labelKey }) => {
                const active = role === key;
                return (
                  <PressableScale
                    key={key}
                    onPress={() => setRole(key)}
                    scaleTo={0.95}
                    accessibilityRole="button"
                    accessibilityLabel={t(labelKey)}
                    accessibilityState={{ selected: active }}
                    style={{
                      flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 14,
                      backgroundColor: active ? BLUE : "#FFFFFF",
                      borderWidth: 1, borderColor: active ? BLUE : BORDER,
                    }}
                  >
                    <Icon size={18} color={active ? "#FFFFFF" : SUB} />
                    <Text numberOfLines={1} style={{ fontSize: 11.5, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : TEXT }}>
                      {t(labelKey)}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </Animated.View>

          {[
            { label: t("adminFieldFirstName"), value: firstName, onChangeText: setFirstName },
            { label: t("adminFieldLastName"),  value: lastName,  onChangeText: setLastName },
            { label: t("adminFieldEmail"),     value: email,     onChangeText: setEmail, keyboardType: "email-address", autoCapitalize: "none" },
          ].map((f, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(80 + i * 40).duration(320)} style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>{f.label}</Text>
              <TextInput
                value={f.value}
                onChangeText={f.onChangeText}
                keyboardType={f.keyboardType}
                autoCapitalize={f.autoCapitalize ?? "words"}
                placeholderTextColor="#C7C7CC"
                style={{
                  height: 50, borderRadius: 14, backgroundColor: "#FFFFFF",
                  borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 16,
                  fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT,
                }}
              />
            </Animated.View>
          ))}

          <Animated.View entering={FadeInDown.delay(200).duration(320)} style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>
              {t("adminFieldPassword")}
            </Text>
            <View style={{
              flexDirection: "row", alignItems: "center", height: 50, borderRadius: 14,
              backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 16,
            }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                style={{ flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT }}
              />
              <PressableScale onPress={() => setShowPass((v) => !v)} scaleTo={0.85} accessibilityRole="button" accessibilityLabel={t("adminFieldPassword")}>
                {showPass ? <EyeOff size={18} color={SUB} /> : <Eye size={18} color={SUB} />}
              </PressableScale>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).duration(320)}>
            <PressableScale
              onPress={handleCreate}
              disabled={!canSubmit}
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={t("adminCreateSubmit")}
              style={{ borderRadius: 16, overflow: "hidden" }}
            >
              <LinearGradient
                colors={canSubmit ? [BLUE, INDIGO] : ["#C7C7CC", "#C7C7CC"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ height: 52, alignItems: "center", justifyContent: "center" }}
              >
                {loading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{t("adminCreateSubmit")}</Text>
                }
              </LinearGradient>
            </PressableScale>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
