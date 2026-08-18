import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { LogOut, Globe, ChevronRight, Check, X, ShieldCheck, Crown, Sparkles } from "lucide-react-native";
import { signOut } from "firebase/auth";
import { auth } from "@/utils/firebase/config";
import { clearCachedRole } from "@/utils/auth/roleCache";
import { useT, useLangStore } from "@/utils/i18n";
import { useMyRole } from "@/utils/auth/useMyRole";
import { ROLES } from "@/utils/auth/permissions";

const NAVY_GRAD = ["#2563EB", "#4F46E5"];

const LANG_OPTIONS = [
  { id: "ru", flag: "🇷🇺", native: "Русский" },
  { id: "az", flag: "🇦🇿", native: "Azərbaycan" },
  { id: "en", flag: "🇬🇧", native: "English" },
];

function LangModal({ visible, onClose }) {
  const { lang, setLang } = useLangStore();
  const { t } = useT();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 }} activeOpacity={1} onPress={onClose}>
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 }}>
            <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{t("profileLanguage")}</Text>
            <TouchableOpacity onPress={onClose}><X size={18} color="#8E8E93" /></TouchableOpacity>
          </View>
          {LANG_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              onPress={() => { setLang(opt.id); onClose(); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12 }}
            >
              <Text style={{ fontSize: 20 }}>{opt.flag}</Text>
              <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: "#1C1C1E" }}>{opt.native}</Text>
              {lang === opt.id && <Check size={18} color={NAVY_GRAD[1]} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function AdminProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const { lang } = useLangStore();
  const role = useMyRole();
  const [showLang, setShowLang] = useState(false);

  const currentLangLabel = LANG_OPTIONS.find((o) => o.id === lang);
  const displayName = auth?.currentUser?.displayName ?? t("profileTeacher");
  const email = auth?.currentUser?.email ?? "";
  const roleLabelKey = role === ROLES.BOSS ? "roleBossTitle" : "roleAdminTitle";

  const handleSignOut = () => {
    Alert.alert(t("profileSignOutTitle"), t("profileSignOutMsg"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("profileSignOutBtn"),
        style: "destructive",
        onPress: async () => {
          await clearCachedRole();
          signOut(auth).then(() => router.replace("/role-select")).catch(() => router.replace("/role-select"));
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F2F2F7" }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={NAVY_GRAD}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={{ paddingTop: insets.top + 16, paddingHorizontal: 24, paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, alignItems: "center" }}
      >
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.3)", marginBottom: 16 }}>
          {role === ROLES.BOSS ? <Crown size={34} color="#FFFFFF" /> : <ShieldCheck size={34} color="#FFFFFF" />}
        </View>
        <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 4 }}>{displayName}</Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>{email}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t(roleLabelKey)}</Text>
        </View>
      </LinearGradient>

      <View style={{ marginHorizontal: 20, marginTop: 24, backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden" }}>
        <TouchableOpacity
          onPress={() => setShowLang(true)}
          activeOpacity={0.7}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center" }}>
            <Globe size={18} color={NAVY_GRAD[1]} />
          </View>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: "#1C1C1E" }}>{t("profileLanguage")}</Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
            {currentLangLabel ? `${currentLangLabel.flag} ${currentLangLabel.native}` : ""}
          </Text>
          <ChevronRight size={16} color="#C7C7CC" />
        </TouchableOpacity>

        {role === ROLES.BOSS ? (
          <TouchableOpacity
            onPress={() => router.push("/boss-home-test")}
            activeOpacity={0.7}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: "#F1F2F5" }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={18} color="#4F46E5" />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: "#1C1C1E" }}>Тестовый дизайн (превью)</Text>
            <ChevronRight size={16} color="#C7C7CC" />
          </TouchableOpacity>
        ) : null}

        {role === ROLES.BOSS ? (
          <TouchableOpacity
            onPress={() => router.push("/(admin-tabs)/analytics-variant-tabs")}
            activeOpacity={0.7}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: "#F1F2F5" }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={18} color="#4F46E5" />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: "#1C1C1E" }}>Статистика — вариант «Вкладки»</Text>
            <ChevronRight size={16} color="#C7C7CC" />
          </TouchableOpacity>
        ) : null}

        {role === ROLES.BOSS ? (
          <TouchableOpacity
            onPress={() => router.push("/(admin-tabs)/analytics-variant-calm")}
            activeOpacity={0.7}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: "#F1F2F5" }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={18} color="#4F46E5" />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: "#1C1C1E" }}>Статистика — вариант «Спокойный»</Text>
            <ChevronRight size={16} color="#C7C7CC" />
          </TouchableOpacity>
        ) : null}

        {role === ROLES.BOSS ? (
          <TouchableOpacity
            onPress={() => router.push("/(admin-tabs)/analytics-variant-premium")}
            activeOpacity={0.7}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: "#F1F2F5" }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={18} color="#4F46E5" />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: "#1C1C1E" }}>Статистика — вариант «Premium»</Text>
            <ChevronRight size={16} color="#C7C7CC" />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={handleSignOut}
        activeOpacity={0.8}
        style={{
          marginHorizontal: 20, marginTop: 16, height: 52, borderRadius: 16,
          backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center",
          flexDirection: "row", gap: 8, borderWidth: 1, borderColor: "#FECACA",
        }}
      >
        <LogOut size={16} color="#EF4444" />
        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#EF4444" }}>{t("profileSignOut")}</Text>
      </TouchableOpacity>

      <LangModal visible={showLang} onClose={() => setShowLang(false)} />
    </ScrollView>
  );
}
