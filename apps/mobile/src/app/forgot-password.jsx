import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Mail, ArrowLeft, CheckCircle, GraduationCap, Users } from "lucide-react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, IS_FIREBASE_READY } from "@/utils/firebase/config";
import { useT } from "@/utils/i18n";

const ROLE_GRADIENT = {
  teacher: ["#4F46E5", "#6B5CF6"],
  parent:  ["#0EA5E9", "#6366F1"],
};
const ROLE_COLOR = { teacher: "#6B5CF6", parent: "#0EA5E9" };

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { role } = useLocalSearchParams();
  const effectiveRole = role === "parent" ? "parent" : "teacher";
  const { t } = useT();

  const gradient = ROLE_GRADIENT[effectiveRole];
  const roleColor = ROLE_COLOR[effectiveRole];

  const ERRORS = {
    "auth/user-not-found":         t("emailErrUserNotFound"),
    "auth/invalid-email":          t("emailErrInvalidEmail"),
    "auth/too-many-requests":      t("forgotErrTooMany"),
    "auth/network-request-failed": t("emailErrNetwork"),
  };

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const canSubmit = email.trim().length > 3 && !loading;

  const handleReset = async () => {
    if (!canSubmit) return;
    if (!IS_FIREBASE_READY) { setError(t("errorGeneric")); return; }
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setSent(true);
    } catch (e) {
      setError(ERRORS[e.code] ?? t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{
          flex: 1, justifyContent: "center",
          paddingHorizontal: 28,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
        }}>
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 40, opacity: 0.8 }}
          >
            <ArrowLeft size={16} color="#FFFFFF" />
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#FFFFFF" }}>{t("back")}</Text>
          </TouchableOpacity>

          {sent ? (
            /* ── Success state ─────────────────────────────────────────── */
            <View style={{ alignItems: "center" }}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center", justifyContent: "center",
                marginBottom: 24,
              }}>
                <CheckCircle size={40} color="#FFFFFF" />
              </View>
              <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 12, textAlign: "center" }}>
                {t("forgotSentTitle")}
              </Text>
              <Text style={{
                fontSize: 15, fontFamily: "Inter_400Regular",
                color: "rgba(255,255,255,0.75)",
                textAlign: "center", lineHeight: 22, marginBottom: 40,
              }}>
                {t("forgotSentMsg1")}{"\n"}
                <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{email.trim()}</Text>
                {"\n\n"}{t("forgotSentMsg2")}
              </Text>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  width: "100%", height: 56, borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.95)",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: roleColor }}>
                  {t("forgotBackToLogin")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Form state ────────────────────────────────────────────── */
            <>
              {/* Icon */}
              <View style={{
                width: 72, height: 72, borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center", justifyContent: "center",
                marginBottom: 24, borderWidth: 1.5,
                borderColor: "rgba(255,255,255,0.35)",
              }}>
                <Mail size={32} color="#FFFFFF" />
              </View>

              <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 8 }}>
                {t("forgotTitle")}
              </Text>
              <Text style={{
                fontSize: 15, fontFamily: "Inter_400Regular",
                color: "rgba(255,255,255,0.7)",
                lineHeight: 22, marginBottom: 32,
              }}>
                {t("forgotSubtitle")}
              </Text>

              {/* Email field */}
              <View style={{
                flexDirection: "row", alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14,
                paddingHorizontal: 16, height: 54, gap: 12,
                borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
                marginBottom: 16,
              }}>
                <Mail size={18} color="rgba(255,255,255,0.7)" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                  style={{ flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#FFFFFF" }}
                />
              </View>

              {/* Error */}
              {!!error && (
                <View style={{
                  backgroundColor: "rgba(239,68,68,0.2)", borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
                  borderWidth: 1, borderColor: "rgba(239,68,68,0.4)",
                }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#FCA5A5", textAlign: "center" }}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity
                onPress={handleReset}
                disabled={!canSubmit}
                activeOpacity={0.85}
                style={{
                  height: 56, borderRadius: 16,
                  backgroundColor: canSubmit ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.3)",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                {loading
                  ? <ActivityIndicator color={roleColor} />
                  : <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: roleColor }}>
                      {t("forgotSendBtn")}
                    </Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
