import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2 } from "lucide-react-native";
import { useVipStore, FREE_LIMIT } from "@/utils/vip/store";
import { useT } from "@/utils/i18n";

export default function VipPaywallModal({ visible, onClose, onUpgraded }) {
  const insets = useSafeAreaInsets();
  const { isVip, setIsVip } = useVipStore();
  const { t } = useT();

  const BENEFITS = [t("vipBenefit1"), t("vipBenefit2"), t("vipBenefit3")];

  function activateVip() {
    setIsVip(true);
    if (onUpgraded) onUpgraded();
  }

  function deactivateVip() {
    setIsVip(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onClose} />

        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 20,
            paddingTop: 8,
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
          </View>

          {/* Crown + VIP badge */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#FDF4E7",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 36 }}>👑</Text>
            </View>

            <View
              style={{
                backgroundColor: "#6B5CF6",
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 5,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: 1 }}>
                {t("vipBadge")}
              </Text>
            </View>

            <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#1C1C1E", textAlign: "center", lineHeight: 28, marginBottom: 6 }}>
              {t("vipTitle")}
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center", lineHeight: 20 }}>
              {t("vipSubtitle", { n: FREE_LIMIT })}
            </Text>
          </View>

          {/* Benefits */}
          <View
            style={{
              backgroundColor: "#F8F7FF",
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              gap: 12,
            }}
          >
            {BENEFITS.map((b) => (
              <View key={b} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={18} color="#22C55E" />
                <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: "#1C1C1E", flex: 1 }}>
                  {b}
                </Text>
              </View>
            ))}
          </View>

          {/* TEST section */}
          <View
            style={{
              backgroundColor: "#FFF8ED",
              borderRadius: 14,
              padding: 14,
              borderWidth: 1.5,
              borderColor: "#FED7AA",
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <View style={{ backgroundColor: "#F97316", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: 0.5 }}>
                  {t("vipTestLabel")}
                </Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#9A6003" }}>
                {t("vipTestHint")}
              </Text>
            </View>

            {!isVip ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={activateVip}
                style={{
                  backgroundColor: "#6B5CF6",
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                  {t("vipActivate")}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={deactivateVip}
                style={{
                  backgroundColor: "#EF4444",
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                  {t("vipDeactivate")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Close link */}
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ alignItems: "center", paddingVertical: 4 }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
              {t("vipClose")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
