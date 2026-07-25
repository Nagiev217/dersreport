import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, StatusBar, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Mail, Lock, Eye, EyeOff, GraduationCap, Users, BookOpen, ArrowLeft } from "lucide-react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { auth, IS_FIREBASE_READY } from "@/utils/firebase/config";
import { getUserDoc } from "@/utils/firebase/users";
import { isStaffRole } from "@/utils/auth/permissions";
import {
  signInWithGoogleToken,
  signInWithAppleToken,
  resolveOAuthUser,
  getOAuthError,
  GOOGLE_CONFIG,
  OAUTH_CONFIGURED,
} from "@/utils/firebase/oauth";
import { registerPushToken } from "@/utils/firebase/notifications";
import { getMyRoleRemote } from "@/utils/firebase/adminAccounts";
import { setCachedRole } from "@/utils/auth/roleCache";
import { useT } from "@/utils/i18n";

WebBrowser.maybeCompleteAuthSession();

const ROLE_GRADIENT = {
  teacher: ["#4F46E5", "#6B5CF6"],
  parent:  ["#0EA5E9", "#6366F1"],
  student: ["#10B981", "#059669"],
};
const ROLE_ICON = {
  teacher: GraduationCap,
  parent:  Users,
  student: BookOpen,
};
const ROLE_COLOR = {
  teacher: "#6B5CF6",
  parent:  "#0EA5E9",
  student: "#10B981",
};

// ─── Google "G" logo ──────────────────────────────────────────────────────────
function GoogleIcon({ size = 20 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: size * 0.68, fontFamily: "Inter_700Bold", color: "#4285F4", lineHeight: size * 0.85 }}>G</Text>
      </View>
    </View>
  );
}

// ─── OAuth button ─────────────────────────────────────────────────────────────
function OAuthButton({ onPress, loading, disabled, children, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[{
        height: 52, borderRadius: 14,
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 10, opacity: disabled ? 0.6 : 1,
      }, style]}
    >
      {loading ? <ActivityIndicator color="#1C1C1E" size="small" /> : children}
    </TouchableOpacity>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function OrDivider({ text }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 16 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
      <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.55)" }}>{text}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
    </View>
  );
}

// ─── Email field ──────────────────────────────────────────────────────────────
function Field({ icon: Icon, placeholder, value, onChangeText, secure, right, keyboardType }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14,
      paddingHorizontal: 16, height: 54, gap: 12,
      borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    }}>
      <Icon size={18} color="rgba(255,255,255,0.7)" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.5)"
        secureTextEntry={secure}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#FFFFFF" }}
      />
      {right}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { role } = useLocalSearchParams();
  const effectiveRole = role === "parent" ? "parent" : role === "student" ? "student" : "teacher";
  const { t } = useT();

  const gradient = ROLE_GRADIENT[effectiveRole];
  const RoleIcon = ROLE_ICON[effectiveRole];
  const roleColor = ROLE_COLOR[effectiveRole];
  const subtitle = effectiveRole === "parent" ? t("loginParentSubtitle")
    : effectiveRole === "student" ? t("loginStudentSubtitle")
    : t("loginTeacherSubtitle");

  const EMAIL_ERRORS = {
    "auth/user-not-found":         t("emailErrUserNotFound"),
    "auth/wrong-password":         t("emailErrInvalidCred"),
    "auth/invalid-credential":     t("emailErrInvalidCred"),
    "auth/invalid-email":          t("emailErrInvalidEmail"),
    "auth/too-many-requests":      t("emailErrTooMany"),
    "auth/network-request-failed": t("emailErrNetwork"),
    "auth/user-disabled":          t("emailErrDisabled"),
  };

  // Email state
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError]           = useState("");

  // OAuth state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading]   = useState(false);

  const anyLoading = emailLoading || googleLoading || appleLoading;

  // ── Google setup ────────────────────────────────────────────────────────────
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId:     GOOGLE_CONFIG.webClientId,
    iosClientId:     GOOGLE_CONFIG.iosClientId,
    androidClientId: GOOGLE_CONFIG.androidClientId,
    selectAccount: true,
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.params?.id_token;
      if (idToken) handleGoogleToken(idToken);
    } else if (googleResponse?.type === "error") {
      const msg = getOAuthError(googleResponse.error);
      if (msg) setError(msg);
      setGoogleLoading(false);
    } else if (googleResponse?.type === "dismiss" || googleResponse?.type === "cancel") {
      setGoogleLoading(false);
    }
  }, [googleResponse]);

  // ── OAuth helpers ────────────────────────────────────────────────────────────
  async function routeOAuthUser(uid, role) {
    const result = await resolveOAuthUser(uid);
    if (result.needsRole) {
      router.replace("/oauth-role-select");
    } else {
      await setCachedRole(uid, result.role);
      router.replace(
        result.role === "parent" ? "/(parent-tabs)"
          : result.role === "student" ? "/(student-tabs)"
          : isStaffRole(result.role) ? "/(admin-tabs)" : "/(tabs)"
      );
    }
  }

  async function handleGoogleToken(idToken) {
    setGoogleLoading(true);
    setError("");
    try {
      const { user, isNew } = await signInWithGoogleToken(idToken);
      registerPushToken(user.uid, "unknown").catch(() => {});
      await routeOAuthUser(user.uid);
    } catch (e) {
      const msg = getOAuthError(e);
      if (msg) setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  }

  const handleGooglePress = async () => {
    if (!OAUTH_CONFIGURED) {
      setError("Google Sign-In not configured. Add Client IDs in oauth.js");
      return;
    }
    setError("");
    setGoogleLoading(true);
    try {
      await promptGoogleAsync();
    } catch (e) {
      setGoogleLoading(false);
      const msg = getOAuthError(e);
      if (msg) setError(msg);
    }
  };

  const handleApplePress = async () => {
    setError("");
    setAppleLoading(true);
    try {
      const nonce = Math.random().toString(36).substring(2, 18);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256, nonce
      );
      const appleResult = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      const { user } = await signInWithAppleToken(appleResult.identityToken, nonce);
      registerPushToken(user.uid, "unknown").catch(() => {});
      await routeOAuthUser(user.uid);
    } catch (e) {
      const msg = getOAuthError(e);
      if (msg) setError(msg);
    } finally {
      setAppleLoading(false);
    }
  };

  // ── Email sign-in ────────────────────────────────────────────────────────────
  const canSubmit = email.trim().length > 3 && password.length >= 6 && !anyLoading;

  const handleEmailSignIn = async () => {
    if (!canSubmit) return;
    if (!IS_FIREBASE_READY) { setError(t("errorGeneric")); return; }
    setError("");
    setEmailLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const userData = await getUserDoc(cred.user.uid);
      let userRole = userData?.role;
      if (!userRole) {
        // Client-side users/{uid} read came back empty — could be missing
        // rules coverage for newer roles. Fall back to an Admin-SDK lookup
        // (functions/index.js: getMyRole) before assuming "teacher".
        userRole = await getMyRoleRemote().catch(() => null);
      }
      userRole = userRole ?? effectiveRole;
      await setCachedRole(cred.user.uid, userRole);
      registerPushToken(cred.user.uid, userRole).catch(() => {});
      router.replace(
        userRole === "parent" ? "/(parent-tabs)"
          : userRole === "student" ? "/(student-tabs)"
          : isStaffRole(userRole) ? "/(admin-tabs)" : "/(tabs)"
      );
    } catch (e) {
      setError(EMAIL_ERRORS[e.code] ?? t("errorGeneric"));
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Apple availability (iOS only) ─────────────────────────────────────────
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);

  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1, justifyContent: "center",
            paddingHorizontal: 28,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 28, opacity: 0.8 }}
          >
            <ArrowLeft size={16} color="#FFFFFF" />
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#FFFFFF" }}>{t("back")}</Text>
          </TouchableOpacity>

          {/* Logo */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center", justifyContent: "center",
              marginBottom: 14, borderWidth: 1.5,
              borderColor: "rgba(255,255,255,0.35)",
            }}>
              <RoleIcon size={34} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.5 }}>
              {t("loginTitle")}
            </Text>
            <View style={{ marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)" }}>
                {subtitle}
              </Text>
            </View>
          </View>

          {/* ── OAuth buttons ─────────────────────────────────────────────── */}
          <View style={{ gap: 10, marginBottom: 4 }}>
            {/* Google */}
            <OAuthButton
              onPress={handleGooglePress}
              loading={googleLoading}
              disabled={anyLoading}
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <GoogleIcon size={20} />
              <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}>
                {t("loginWithGoogle")}
              </Text>
            </OAuthButton>

            {/* Apple — iOS only */}
            {appleAvailable && (
              <OAuthButton
                onPress={handleApplePress}
                loading={appleLoading}
                disabled={anyLoading}
                style={{ backgroundColor: "#000000" }}
              >
                <Text style={{ fontSize: 18, color: "#FFFFFF", lineHeight: 22 }}>⌘</Text>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                  {t("loginWithApple")}
                </Text>
              </OAuthButton>
            )}
          </View>

          <OrDivider text={t("or")} />

          {/* ── Email sign-in ─────────────────────────────────────────────── */}
          <View style={{ gap: 12, marginBottom: 12 }}>
            <Field icon={Mail} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <Field
              icon={Lock} placeholder={t("passwordField")} value={password} onChangeText={setPassword} secure={!showPw}
              right={
                <TouchableOpacity onPress={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff size={18} color="rgba(255,255,255,0.7)" /> : <Eye size={18} color="rgba(255,255,255,0.7)" />}
                </TouchableOpacity>
              }
            />
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            onPress={() => router.push(`/forgot-password?role=${effectiveRole}`)}
            style={{ alignSelf: "flex-end", marginBottom: 20 }}
          >
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.75)" }}>
              {t("forgotPasswordLink")}
            </Text>
          </TouchableOpacity>

          {/* Error */}
          {!!error && (
            <View style={{
              backgroundColor: "rgba(239,68,68,0.2)", borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
              borderWidth: 1, borderColor: "rgba(239,68,68,0.4)",
            }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#FCA5A5", textAlign: "center" }}>
                {error}
              </Text>
            </View>
          )}

          {/* Email submit */}
          <TouchableOpacity
            onPress={handleEmailSignIn}
            disabled={!canSubmit}
            activeOpacity={0.85}
            style={{
              height: 52, borderRadius: 14,
              backgroundColor: canSubmit ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.28)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            {emailLoading
              ? <ActivityIndicator color={roleColor} />
              : <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: roleColor }}>{t("loginWithEmail")}</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
