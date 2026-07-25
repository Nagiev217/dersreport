import { useState } from "react";
import { View, Text, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from "react-native";
import { Ban, CheckCircle2, KeyRound, Trash2, X } from "lucide-react-native";
import { setAccountEnabled, resetManagedPassword, deleteManagedAccount } from "@/utils/firebase/adminAccounts";
import { useT } from "@/utils/i18n";

const RED   = "#EF4444";
const GREEN = "#22C55E";
const AMBER = "#F59E0B";
const BLUE  = "#2563EB";

function ActionRow({ icon: Icon, color, label, onPress, disabled, border }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={{
        flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
        borderTopWidth: border ? 1 : 0, borderTopColor: "#F1F2F5",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${color}1A`, alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={color} />
      </View>
      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}>{label}</Text>
    </TouchableOpacity>
  );
}

// Boss-only account lifecycle controls (disable/enable, reset password,
// delete). Reused by the teacher drill-down and the parents screen — same
// three server calls (functions/index.js: setAccountEnabled/
// resetManagedPassword/deleteManagedAccount) regardless of which role owns
// the target account.
export default function AdminAccountActions({ uid, disabled, onDisabledChange, onDeleted }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const handleToggle = () => {
    Alert.alert(
      disabled ? t("adminEnableTitle") : t("adminDisableTitle"),
      disabled ? t("adminEnableMsg") : t("adminDisableMsg"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: disabled ? t("adminEnableBtn") : t("adminDisableBtn"),
          style: disabled ? "default" : "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await setAccountEnabled(uid, !disabled);
              onDisabledChange?.(!disabled);
            } catch (e) {
              Alert.alert(t("error"), e?.message ?? t("errorGeneric"));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) return;
    setBusy(true);
    try {
      await resetManagedPassword(uid, newPassword);
      setShowPwModal(false);
      setNewPassword("");
      Alert.alert(t("adminResetPwSuccessTitle"), t("adminResetPwSuccessMsg"));
    } catch (e) {
      Alert.alert(t("error"), e?.message ?? t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t("adminDeleteTitle"),
      t("adminDeleteMsg"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("adminDeleteBtn"),
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await deleteManagedAccount(uid);
              onDeleted?.();
            } catch (e) {
              Alert.alert(t("error"), e?.message ?? t("errorGeneric"));
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
      <ActionRow
        icon={disabled ? CheckCircle2 : Ban}
        color={disabled ? GREEN : AMBER}
        label={disabled ? t("adminEnableBtn") : t("adminDisableBtn")}
        onPress={handleToggle}
        disabled={busy}
      />
      <ActionRow
        icon={KeyRound}
        color={BLUE}
        label={t("adminResetPasswordBtn")}
        onPress={() => setShowPwModal(true)}
        disabled={busy}
        border
      />
      <ActionRow
        icon={Trash2}
        color={RED}
        label={t("adminDeleteBtn")}
        onPress={handleDelete}
        disabled={busy}
        border
      />

      <Modal visible={showPwModal} transparent animationType="fade" onRequestClose={() => setShowPwModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{t("adminResetPasswordBtn")}</Text>
              <TouchableOpacity onPress={() => setShowPwModal(false)}>
                <X size={18} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder={t("adminFieldPassword")}
              placeholderTextColor="#C7C7CC"
              style={{
                height: 50, borderRadius: 14, backgroundColor: "#F2F2F7",
                borderWidth: 1.5, borderColor: "#E5E5EA", paddingHorizontal: 16,
                fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E", marginBottom: 16,
              }}
            />
            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={newPassword.length < 6 || busy}
              style={{
                height: 50, borderRadius: 14,
                backgroundColor: newPassword.length >= 6 ? BLUE : "#C7C7CC",
                alignItems: "center", justifyContent: "center",
              }}
            >
              {busy
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{t("adminResetPasswordBtn")}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
