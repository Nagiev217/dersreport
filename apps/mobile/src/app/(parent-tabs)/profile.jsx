import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import {
  Copy,
  Share2,
  Shield,
  User,
  LogOut,
  CheckCircle2,
  Users,
  Link2,
} from "lucide-react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../utils/firebase/config";
import { getParentProfile, getParentAccess } from "../../utils/firebase/roles";
import { clearCachedRole } from "../../utils/auth/roleCache";
import { useT } from "../../utils/i18n";
import DevAccountSwitcher from "@/components/DevAccountSwitcher";

// Minimal QR display using SVG-like grid (no external package)
function QRDisplay({ value }) {
  if (!value || value === "—") return null;

  // Show styled code block as QR replacement
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "#FAFAFA",
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#F2F2F7",
      }}
    >
      {/* Simulated QR corners */}
      <View style={{ width: 160, height: 160, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", top: 0, left: 0, width: 30, height: 30, borderTopWidth: 3, borderLeftWidth: 3, borderColor: "#1C1C1E", borderRadius: 4 }} />
        <View style={{ position: "absolute", top: 0, right: 0, width: 30, height: 30, borderTopWidth: 3, borderRightWidth: 3, borderColor: "#1C1C1E", borderRadius: 4 }} />
        <View style={{ position: "absolute", bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: "#1C1C1E", borderRadius: 4 }} />
        <View style={{ position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 3, borderRightWidth: 3, borderColor: "#1C1C1E", borderRadius: 4 }} />
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93", marginBottom: 8 }}>Parent ID</Text>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#1C1C1E", letterSpacing: 3 }}>
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ParentProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tp } = useT();

  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const uid = auth?.currentUser?.uid;
  const displayName = auth?.currentUser?.displayName ?? t("roleParentTitle");
  const email = auth?.currentUser?.email ?? "";

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    Promise.all([getParentProfile(uid), getParentAccess(uid)]).then(
      ([prof, acc]) => {
        setProfile(prof);
        setLinks(acc);
        setLoading(false);
      }
    );
  }, [uid]);

  const parentCode = profile?.parentCode ?? "—";

  const handleCopy = async () => {
    await Clipboard.setStringAsync(parentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    Share.share({
      message: t("parentShareMsg", { code: parentCode }),
      title: "Parent ID — DərsReport",
    });
  };

  const handleSignOut = () => {
    Alert.alert(
      t("profileSignOutTitle"),
      t("profileSignOutMsg"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("profileSignOutBtn"),
          style: "destructive",
          onPress: async () => {
            await clearCachedRole();
            signOut(auth)
              .then(() => router.replace("/role-select"))
              .catch(() => router.replace("/role-select"));
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#0EA5E9" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F2F2F7" }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: "#0EA5E9",
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 32,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "rgba(255,255,255,0.25)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.4)",
          }}
        >
          <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
            {displayName[0]}
          </Text>
        </View>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 4 }}>
          {displayName}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" }}>
          {email}
        </Text>
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
          <Shield size={12} color="#FFFFFF" />
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("roleParentTitle")}</Text>
        </View>
      </View>

      {/* Parent ID card */}
      <View style={{ marginHorizontal: 20, marginTop: 20, marginBottom: 16 }}>
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 24,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 5,
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Link2 size={14} color="#0EA5E9" />
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#0EA5E9", textTransform: "uppercase", letterSpacing: 0.8 }}>
              {t("parentProfileIDLabel")}
            </Text>
          </View>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93", marginBottom: 20, textAlign: "center" }}>
            {t("parentProfileIDHint")}
          </Text>

          {/* QR-style display */}
          <QRDisplay value={parentCode} />

          {/* Code display */}
          <View
            style={{
              backgroundColor: "#EEF0FF",
              borderRadius: 16,
              paddingHorizontal: 28,
              paddingVertical: 16,
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: "#DDD9FF",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Text
              style={{
                fontSize: 28,
                fontFamily: "Inter_700Bold",
                color: "#6B5CF6",
                letterSpacing: 4,
              }}
            >
              {parentCode}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
            <TouchableOpacity
              onPress={handleCopy}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                backgroundColor: copied ? "#ECFDF5" : "#F2F2F7",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              {copied ? (
                <>
                  <CheckCircle2 size={16} color="#22C55E" />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#22C55E" }}>{t("copied")}</Text>
                </>
              ) : (
                <>
                  <Copy size={16} color="#6B5CF6" />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#6B5CF6" }}>{t("copy")}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                backgroundColor: "#0EA5E9",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Share2 size={16} color="#FFFFFF" />
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("share")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Linked teachers */}
      {links.length > 0 && (
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 10 }}>
            {t("parentLinkedTeachers")}
          </Text>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, overflow: "hidden" }}>
            {links.map(({ teacherUid, teacherName, studentIds }, i) => (
              <View
                key={teacherUid}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: i < links.length - 1 ? 0.5 : 0,
                  borderBottomColor: "#F2F2F7",
                  gap: 12,
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center" }}>
                  <User size={18} color="#6B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}>
                    {teacherName || t("teacherDefault")}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
                    {tp(studentIds?.length ?? 0, "student")}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Users size={13} color="#22C55E" />
                  <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#22C55E" }}>{t("activeStatus")}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {links.length === 0 && (
        <View style={{ marginHorizontal: 20, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 16 }}>
          <Users size={32} color="#C7C7CC" />
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#1C1C1E", marginTop: 12, marginBottom: 6 }}>
            {t("parentNoTeachers")}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center", lineHeight: 18 }}>
            {t("parentNoTeachersHint")}
          </Text>
        </View>
      )}

      {/* Sign out */}
      <TouchableOpacity
        onPress={handleSignOut}
        style={{
          marginHorizontal: 20,
          height: 52,
          borderRadius: 16,
          backgroundColor: "#FEF2F2",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          borderWidth: 1,
          borderColor: "#FECACA",
        }}
      >
        <LogOut size={16} color="#EF4444" />
        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#EF4444" }}>
          {t("profileSignOut")}
        </Text>
      </TouchableOpacity>

      <DevAccountSwitcher currentRole="parent" />
    </ScrollView>
  );
}
