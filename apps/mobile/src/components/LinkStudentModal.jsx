import { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import {
  X,
  Search,
  UserCheck,
  Link2,
  AlertCircle,
  ChevronRight,
} from "lucide-react-native";
import { auth } from "@/utils/firebase/config";
import { lookupStudentByCode, linkStudentToTeacher } from "@/utils/firebase/roles";
import { useStudentsStore } from "@/utils/students/store";
import { useT } from "@/utils/i18n";

// Simplified sibling of LinkParentModal — manual code entry only (no QR tab),
// since a student maps to exactly one roster entry per teacher, not many.
export default function LinkStudentModal({ visible, onClose, studentId, studentName }) {
  const [code, setCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [linking, setLinking] = useState(false);
  const [found, setFound] = useState(null); // { uid, name, code }
  const [error, setError] = useState("");

  const { t, tName } = useT();
  const { updateStudent } = useStudentsStore();

  const reset = () => {
    setCode("");
    setFound(null);
    setError("");
    setLooking(false);
    setLinking(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleLookup = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || trimmed.length < 4) {
      setError(t("linkParentInvalidCode"));
      return;
    }
    setError("");
    setFound(null);
    setLooking(true);
    try {
      const result = await lookupStudentByCode(trimmed);
      if (!result) {
        setError(t("linkParentNotFound"));
      } else {
        setFound(result);
      }
    } catch {
      setError(t("linkParentNetError"));
    } finally {
      setLooking(false);
    }
  };

  const handleLink = async () => {
    if (!found) return;
    setLinking(true);

    const teacherUid = auth?.currentUser?.uid;
    const teacherName = auth?.currentUser?.displayName ?? auth?.currentUser?.email ?? "";

    try {
      await linkStudentToTeacher(teacherUid, teacherName, found.uid, studentId);
      updateStudent(studentId, { linkedStudentUid: found.uid, linkedStudentName: found.name });

      Alert.alert(
        t("linkParentSuccess"),
        t("linkParentSuccessMsg", { name: tName(found.name), student: tName(studentName) }),
        [{ text: t("linkParentSuccessOk"), onPress: handleClose }]
      );
    } catch (e) {
      console.error("[LinkStudentModal] linkStudentToTeacher failed:", e?.code, e?.message);
      Alert.alert(t("error"), t("linkParentFailMsg"));
    } finally {
      setLinking(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
            backgroundColor: "#FFFFFF",
            borderBottomWidth: 0.5,
            borderBottomColor: "#F2F2F7",
          }}
        >
          <View>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
              {t("studentLinkStudentAccount")}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 2 }}>
              {t("linkParentStudentLbl")}{tName(studentName)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}
          >
            <X size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <View
              style={{
                backgroundColor: "#ECFDF5",
                borderRadius: 14,
                padding: 14,
                marginBottom: 20,
                flexDirection: "row",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <Link2 size={18} color="#10B981" style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#10B981", lineHeight: 19 }}>
                {t("linkStudentExplanation")}
              </Text>
            </View>

            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1C1C1E", marginBottom: 8 }}>
              {t("linkParentIDLabel")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 6 }}>
              <TextInput
                value={code}
                onChangeText={(v) => { setCode(v.toUpperCase()); setFound(null); setError(""); }}
                placeholder="STU-XXXXXX"
                placeholderTextColor="#C7C7CC"
                autoCapitalize="characters"
                autoCorrect={false}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 16,
                  fontSize: 18,
                  fontFamily: "Inter_700Bold",
                  color: "#10B981",
                  letterSpacing: 2,
                  borderWidth: 1.5,
                  borderColor: error ? "#FECACA" : found ? "#BBF7D0" : "#E5E5EA",
                }}
              />
              <TouchableOpacity
                onPress={handleLookup}
                disabled={looking || !code.trim()}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: code.trim() ? "#10B981" : "#E5E5EA",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {looking ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Search size={20} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>

            {!!error && (
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 8, marginBottom: 8 }}>
                <AlertCircle size={14} color="#EF4444" style={{ marginTop: 1 }} />
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#EF4444", flex: 1 }}>{error}</Text>
              </View>
            )}

            {found && (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 16,
                  marginTop: 16,
                  borderWidth: 2,
                  borderColor: "#BBF7D0",
                  shadowColor: "#22C55E",
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" }}>
                    <UserCheck size={20} color="#22C55E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{tName(found.name)}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{found.code}</Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#ECFDF5", borderRadius: 20 }}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#22C55E" }}>{t("linkParentFound")}</Text>
                  </View>
                </View>

                <View style={{ backgroundColor: "#F0FDF4", borderRadius: 10, padding: 10, marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#166534", lineHeight: 18 }}>
                    {t("linkParentConfirmMsg", { name: found.name, student: studentName })}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleLink}
                  disabled={linking}
                  style={{ height: 50, borderRadius: 14, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
                >
                  {linking ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Link2 size={16} color="#FFFFFF" />
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{t("linkParentBtn")}</Text>
                      <ChevronRight size={16} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
