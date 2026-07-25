import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { signOut } from "firebase/auth";
import { ShieldAlert, LogOut } from "lucide-react-native";
import { auth } from "@/utils/firebase/config";
import { useT } from "@/utils/i18n";

// Reached when a Google/Apple sign-in resolves to an email with no
// users/{uid} Firestore doc yet. Accounts are no longer self-provisioned —
// only Boss can create them (see AddManagedAccount) — so we block access
// here instead of showing a role picker.
export default function OAuthRoleSelectScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();

  const handleSignOut = async () => {
    try { await signOut(auth); } catch {}
    router.replace("/role-select");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      <StatusBar barStyle="dark-content" />

      <LinearGradient
        colors={["#4F46E5", "#6B5CF6", "#8B5CF6"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 32,
          paddingHorizontal: 28,
          paddingBottom: 48,
          alignItems: "center",
        }}
      >
        <View style={{
          width: 72, height: 72, borderRadius: 22,
          backgroundColor: "rgba(255,255,255,0.2)",
          alignItems: "center", justifyContent: "center",
          marginBottom: 20, borderWidth: 1.5,
          borderColor: "rgba(255,255,255,0.35)",
        }}>
          <ShieldAlert size={34} color="#FFFFFF" />
        </View>

        <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF", textAlign: "center", marginBottom: 8 }}>
          {t("oauthAccountNotFound")}
        </Text>
        <Text style={{
          fontSize: 14, fontFamily: "Inter_400Regular",
          color: "rgba(255,255,255,0.8)",
          textAlign: "center", lineHeight: 20,
        }}>
          {t("oauthAccountNotFoundMsg")}
        </Text>
      </LinearGradient>

      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 28, paddingBottom: insets.bottom + 24, justifyContent: "flex-end" }}>
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.85}
          style={{
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            height: 52, borderRadius: 16, backgroundColor: "#FFFFFF",
            borderWidth: 1, borderColor: "#E5E5EA",
          }}
        >
          <LogOut size={18} color="#EF4444" />
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#EF4444" }}>
            {t("profileSignOutBtn")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
