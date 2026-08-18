import { useState } from "react";
import { View, Text, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Shuffle } from "lucide-react-native";
import PressableScale from "@/components/PressableScale";
import { switchToDevAccount } from "@/utils/dev/accountSwitch";
import { DEV_ACCOUNTS, DEV_ROLE_LABELS } from "@/utils/dev/devAccounts";

const BLUE  = "#2563EB";
const BLUE_50 = "#EFF6FF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";

const ROLES = ["teacher", "parent", "student"];

// Dev-only convenience: jump straight into another role's account without
// manually signing out and typing credentials each time. Configure the
// accounts in utils/dev/devAccounts.js — a role's button is hidden until
// its email/password are filled in there.
export default function DevAccountSwitcher({ currentRole }) {
  const router = useRouter();
  const [switching, setSwitching] = useState(null); // which role is mid-switch

  const available = ROLES.filter((r) => DEV_ACCOUNTS[r]?.email && DEV_ACCOUNTS[r]?.password);
  if (available.length === 0) return null;

  const handlePress = async (role) => {
    if (role === currentRole || switching) return;
    setSwitching(role);
    try {
      await switchToDevAccount(role, router);
    } catch (e) {
      Alert.alert("Не удалось переключиться", e?.message ?? String(e));
    } finally {
      setSwitching(null);
    }
  };

  return (
    <View style={{ marginHorizontal: 20, marginTop: 20, marginBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Shuffle size={13} color={SUB} />
        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: SUB, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Быстрое переключение (тест)
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {available.map((role) => {
          const active = role === currentRole;
          return (
            <PressableScale
              key={role}
              onPress={() => handlePress(role)}
              disabled={active || !!switching}
              scaleTo={0.96}
              style={{
                flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center",
                backgroundColor: active ? BLUE : "#FFFFFF",
                borderWidth: 1, borderColor: active ? BLUE : BORDER,
                opacity: switching && switching !== role ? 0.5 : 1,
              }}
            >
              {switching === role ? (
                <ActivityIndicator size="small" color={active ? "#FFFFFF" : BLUE} />
              ) : (
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : TEXT }}>
                  {DEV_ROLE_LABELS[role]}
                </Text>
              )}
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
