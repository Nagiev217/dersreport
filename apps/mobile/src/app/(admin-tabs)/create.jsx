import { useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GraduationCap, Users, BookOpen, ShieldCheck, ShieldAlert, Eye, EyeOff } from "lucide-react-native";
import { createManagedAccount } from "@/utils/firebase/adminAccounts";
import { useMyRole } from "@/utils/auth/useMyRole";
import { canManageAccounts } from "@/utils/auth/permissions";
import { useT } from "@/utils/i18n";

const NAVY = "#22447A";

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
      <View style={{ flex: 1, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <ShieldAlert size={40} color="#EF4444" />
        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#1C1C1E", marginTop: 14, textAlign: "center" }}>
          {t("adminNoAccess")}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F2F2F7" }}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 4 }}>
          {t("adminCreateTitle")}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", marginBottom: 24 }}>
          {t("adminCreateSubtitle")}
        </Text>

        {/* Role picker */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          {ROLE_OPTS.map(({ key, icon: Icon, labelKey }) => {
            const active = role === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setRole(key)}
                activeOpacity={0.8}
                style={{
                  flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 14,
                  backgroundColor: active ? NAVY : "#FFFFFF",
                  borderWidth: active ? 0 : 1, borderColor: "#E5E5EA",
                }}
              >
                <Icon size={18} color={active ? "#FFFFFF" : "#8E8E93"} />
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : "#1C1C1E" }}>
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {[
          { label: t("adminFieldFirstName"), value: firstName, onChangeText: setFirstName },
          { label: t("adminFieldLastName"),  value: lastName,  onChangeText: setLastName },
          { label: t("adminFieldEmail"),     value: email,     onChangeText: setEmail, keyboardType: "email-address", autoCapitalize: "none" },
        ].map((f, i) => (
          <View key={i} style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1C1C1E", marginBottom: 6 }}>{f.label}</Text>
            <TextInput
              value={f.value}
              onChangeText={f.onChangeText}
              keyboardType={f.keyboardType}
              autoCapitalize={f.autoCapitalize ?? "words"}
              placeholderTextColor="#C7C7CC"
              style={{
                height: 50, borderRadius: 14, backgroundColor: "#FFFFFF",
                borderWidth: 1.5, borderColor: "#E5E5EA", paddingHorizontal: 16,
                fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E",
              }}
            />
          </View>
        ))}

        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1C1C1E", marginBottom: 6 }}>
            {t("adminFieldPassword")}
          </Text>
          <View style={{
            flexDirection: "row", alignItems: "center", height: 50, borderRadius: 14,
            backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#E5E5EA", paddingHorizontal: 16,
          }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              style={{ flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E" }}
            />
            <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
              {showPass ? <EyeOff size={18} color="#8E8E93" /> : <Eye size={18} color="#8E8E93" />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleCreate}
          disabled={!canSubmit}
          activeOpacity={0.85}
          style={{ height: 52, borderRadius: 16, backgroundColor: canSubmit ? NAVY : "#C7C7CC", alignItems: "center", justifyContent: "center" }}
        >
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{t("adminCreateSubmit")}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
