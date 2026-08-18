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
import { auth } from "@/utils/firebase/config";
import { getStudentProfile, getStudentAccess } from "@/utils/firebase/roles";
import { clearCachedRole } from "@/utils/auth/roleCache";
import { useT } from "@/utils/i18n";
import DevAccountSwitcher from "@/components/DevAccountSwitcher";

// Minimal QR display using a styled code block (no external package)
function QRDisplay({ value }) {
  if (!value || value === "—") return null;
  return (
    <View style={{ alignItems: "center", backgroundColor: "#FAFAFA", borderRadius: 16, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: "#F2F2F7" }}>
      <View style={{ width: 160, height: 160, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", top: 0, left: 0, width: 30, height: 30, borderTopWidth: 3, borderLeftWidth: 3, borderColor: "#1C1C1E", borderRadius: 4 }} />
        <View style={{ position: "absolute", top: 0, right: 0, width: 30, height: 30, borderTopWidth: 3, borderRightWidth: 3, borderColor: "#1C1C1E", borderRadius: 4 }} />
        <View style={{ position: "absolute", bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: "#1C1C1E", borderRadius: 4 }} />
        <View style={{ position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 3, borderRightWidth: 3, borderColor: "#1C1C1E", borderRadius: 4 }} />
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93", marginBottom: 8 }}>Student ID</Text>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#1C1C1E", letterSpacing: 3 }}>{value}</Text>
        </View>
      </View>
    </View>
  );
}

export default function StudentProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();

  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const uid = auth?.currentUser?.uid;
  const displayName = auth?.currentUser?.displayName ?? t("roleStudentTitle");
  const email = auth?.currentUser?.email ?? "";

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    Promise.all([getStudentProfile(uid), getStudentAccess(uid)]).then(([prof, acc]) => {
      setProfile(prof);
      setLinks(acc);
      setLoading(false);
    });
  }, [uid]);

  const studentCode = profile?.studentCode ?? "—";

  const handleCopy = async () => {
    await Clipboard.setStringAsync(studentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    Share.share({
      message: t("studentShareMsg", { code: studentCode }),
      title: "Student ID — Jeff Colleges",
    });
  };

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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#10B981" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F2F2F7" }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ backgroundColor: "#10B981", paddingTop: insets.top + 16, paddingHorizontal: 24, paddingBottom: 32, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, alignItems: "center" }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" }}>
          <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{displayName[0]}</Text>
        </View>
        <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 4 }}>{displayName}</Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" }}>{email}</Text>
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
          <Shield size={12} color="#FFFFFF" />
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("roleStudentTitle")}</Text>
        </View>
      </View>

      {/* Student ID card */}
      <View style={{ marginHorizontal: 20, marginTop: 20, marginBottom: 16 }}>
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 5, alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Link2 size={14} color="#10B981" />
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#10B981", textTransform: "uppercase", letterSpacing: 0.8 }}>
              {t("studentProfileIDLabel")}
            </Text>
          </View>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93", marginBottom: 20, textAlign: "center" }}>
            {t("studentProfileIDHint")}
          </Text>

          <QRDisplay value={studentCode} />

          <View style={{ backgroundColor: "#ECFDF5", borderRadius: 16, paddingHorizontal: 28, paddingVertical: 16, marginBottom: 16, borderWidth: 1.5, borderColor: "#A7F3D0", alignItems: "center", width: "100%" }}>
            <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: "#10B981", letterSpacing: 4 }}>{studentCode}</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
            <TouchableOpacity
              onPress={handleCopy}
              style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: copied ? "#ECFDF5" : "#F2F2F7", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
            >
              {copied ? (
                <>
                  <CheckCircle2 size={16} color="#22C55E" />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#22C55E" }}>{t("copied")}</Text>
                </>
              ) : (
                <>
                  <Copy size={16} color="#10B981" />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#10B981" }}>{t("copy")}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
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
            {t("studentLinkedTeachers")}
          </Text>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, overflow: "hidden" }}>
            {links.map(({ teacherUid, teacherName }, i) => (
              <View
                key={teacherUid}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: i < links.length - 1 ? 0.5 : 0, borderBottomColor: "#F2F2F7", gap: 12 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" }}>
                  <User size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}>
                    {teacherName || t("teacherDefault")}
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
            {t("studentNoTeachers")}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center", lineHeight: 18 }}>
            {t("studentNoTeachersHint")}
          </Text>
        </View>
      )}

      {/* Sign out */}
      <TouchableOpacity
        onPress={handleSignOut}
        style={{ marginHorizontal: 20, height: 52, borderRadius: 16, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, borderWidth: 1, borderColor: "#FECACA" }}
      >
        <LogOut size={16} color="#EF4444" />
        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#EF4444" }}>{t("profileSignOut")}</Text>
      </TouchableOpacity>

      <DevAccountSwitcher currentRole="student" />
    </ScrollView>
  );
}
