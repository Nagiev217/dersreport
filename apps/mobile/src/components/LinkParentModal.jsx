import { useState, useRef } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  X,
  QrCode,
  Search,
  UserCheck,
  Link2,
  AlertCircle,
  ChevronRight,
} from "lucide-react-native";
import { auth } from "@/utils/firebase/config";
import {
  lookupParentByCode,
  linkParentToStudent,
} from "@/utils/firebase/roles";
import { useParentsStore } from "@/utils/parents/store";
import { useT } from "@/utils/i18n";

export default function LinkParentModal({
  visible,
  onClose,
  studentId,
  studentName,
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState("manual"); // "manual" | "scan"
  const [code, setCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [linking, setLinking] = useState(false);
  const [found, setFound] = useState(null); // { uid, name, code }
  const [error, setError] = useState("");
  const [scanned, setScanned] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const { t, tName } = useT();

  const { parents, addParent, updateParent, linkStudent } = useParentsStore();

  const reset = () => {
    setCode("");
    setFound(null);
    setError("");
    setLooking(false);
    setLinking(false);
    setScanned(false);
    setTab("manual");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleLookup = async (rawCode) => {
    const trimmed = (rawCode ?? code).trim().toUpperCase();
    if (!trimmed || trimmed.length < 4) {
      setError(t("linkParentInvalidCode"));
      return;
    }

    setError("");
    setFound(null);
    setLooking(true);

    try {
      const result = await lookupParentByCode(trimmed);
      if (!result) {
        setError(t("linkParentNotFound"));
      } else {
        // Check if already linked to this student
        const existing = parents.find(
          (p) =>
            p.appUserId === result.uid &&
            (p.studentIds ?? []).includes(String(studentId))
        );
        if (existing) {
          setError(t("linkParentAlreadyLinked", { name: tName(result.name) }));
        } else {
          setFound(result);
        }
      }
    } catch (e) {
      console.error("[LinkParentModal] lookupParentByCode failed:", e?.code, e?.message);
      setError(t("linkParentNetError"));
    } finally {
      setLooking(false);
    }
  };

  const handleLink = async () => {
    if (!found) return;
    setLinking(true);

    const teacherUid = auth?.currentUser?.uid;
    const teacherName =
      auth?.currentUser?.displayName ?? auth?.currentUser?.email ?? "";

    try {
      // Write to Firestore (grants parent access to teacher's data for this student)
      await linkParentToStudent(
        teacherUid,
        teacherName,
        found.uid,
        found.code,
        studentId
      );

      // Update local parents store
      const existingByUid = parents.find((p) => p.appUserId === found.uid);
      if (existingByUid) {
        // Already in store — just link the student
        linkStudent(existingByUid.id, String(studentId));
      } else {
        // Add new parent record
        addParent({
          id: `parent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: found.name,
          phone: "",
          email: "",
          appUserId: found.uid,
          parentCode: found.code,
          avatarColor: "#0EA5E9",
          studentIds: [String(studentId)],
          createdAt: Date.now(),
        });
      }

      Alert.alert(
        t("linkParentSuccess"),
        t("linkParentSuccessMsg", { name: tName(found.name), student: tName(studentName) }),
        [{ text: t("linkParentSuccessOk"), onPress: handleClose }]
      );
    } catch (e) {
      console.error("[LinkParentModal] linkParentToStudent failed:", e?.code, e?.message);
      Alert.alert(t("error"), t("linkParentFailMsg"));
    } finally {
      setLinking(false);
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setCode(data);
    setTab("manual");
    handleLookup(data);
  };

  const handleScanTab = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          t("linkParentCameraPermTitle"),
          t("linkParentCameraPermMsg")
        );
        return;
      }
    }
    setTab("scan");
    setScanned(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
        {/* Header */}
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
              {t("linkParentTitle")}
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

        {/* Tab selector */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#FFFFFF",
            paddingHorizontal: 20,
            paddingBottom: 12,
            gap: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => setTab("manual")}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 12,
              backgroundColor: tab === "manual" ? "#6B5CF6" : "#F2F2F7",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
            }}
          >
            <Search size={14} color={tab === "manual" ? "#FFFFFF" : "#8E8E93"} />
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tab === "manual" ? "#FFFFFF" : "#8E8E93" }}>
              {t("linkParentEnterCode")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleScanTab}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 12,
              backgroundColor: tab === "scan" ? "#6B5CF6" : "#F2F2F7",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
            }}
          >
            <QrCode size={14} color={tab === "scan" ? "#FFFFFF" : "#8E8E93"} />
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tab === "scan" ? "#FFFFFF" : "#8E8E93" }}>
              {t("linkParentScanQR")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* QR scan view */}
        {tab === "scan" && (
          <View style={{ flex: 1 }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            {/* Overlay */}
            <View
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                alignItems: "center",
                justifyContent: "center",
              }}
              pointerEvents="none"
            >
              <View style={{ width: 220, height: 220, borderRadius: 20, borderWidth: 3, borderColor: "#FFFFFF" }} />
              <Text style={{ color: "#FFFFFF", fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 20, textShadowColor: "#000", textShadowRadius: 4 }}>
                {t("linkParentCameraHint")}
              </Text>
            </View>
          </View>
        )}

        {/* Manual entry */}
        {tab === "manual" && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {/* Explanation */}
              <View
                style={{
                  backgroundColor: "#EEF0FF",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 20,
                  flexDirection: "row",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <Link2 size={18} color="#6B5CF6" style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#6B5CF6", lineHeight: 19 }}>
                  {t("linkParentExplanation")}
                </Text>
              </View>

              {/* Code input */}
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1C1C1E", marginBottom: 8 }}>
                {t("linkParentIDLabel")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <TextInput
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.toUpperCase());
                    setFound(null);
                    setError("");
                  }}
                  placeholder="PRT-XXXXXX"
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
                    color: "#6B5CF6",
                    letterSpacing: 2,
                    borderWidth: 1.5,
                    borderColor: error ? "#FECACA" : found ? "#BBF7D0" : "#E5E5EA",
                  }}
                />
                <TouchableOpacity
                  onPress={() => handleLookup()}
                  disabled={looking || !code.trim()}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    backgroundColor: code.trim() ? "#6B5CF6" : "#E5E5EA",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {looking ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Search size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Error */}
              {!!error && (
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 8, marginBottom: 8 }}>
                  <AlertCircle size={14} color="#EF4444" style={{ marginTop: 1 }} />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#EF4444", flex: 1 }}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Found parent card */}
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
                      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
                        {tName(found.name)}
                      </Text>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
                        {found.code}
                      </Text>
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
                    style={{
                      height: 50,
                      borderRadius: 14,
                      backgroundColor: "#22C55E",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 8,
                    }}
                  >
                    {linking ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Link2 size={16} color="#FFFFFF" />
                        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                          {t("linkParentBtn")}
                        </Text>
                        <ChevronRight size={16} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}
