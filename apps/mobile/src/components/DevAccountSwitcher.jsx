import { useCallback, useState } from "react";
import { View, Text, Alert, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Shuffle } from "lucide-react-native";
import PressableScale from "@/components/PressableScale";
import { switchToDevAccount } from "@/utils/dev/accountSwitch";
import { getSavedAccounts } from "@/utils/dev/savedAccounts";

const BLUE  = "#2563EB";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";

const ROLES = ["teacher", "parent", "student", "admin", "boss"];
const ROLE_LABELS = {
  teacher: "Учитель",
  parent:  "Родитель",
  student: "Ученик",
  admin:   "Админ",
  boss:    "Босс",
};

// Dev-only convenience: jump straight into any account you've previously
// logged into on this device, without manually signing out and typing
// credentials again. Accounts are saved automatically by login.jsx on every
// real sign-in (device keystore, keyed by role) — nothing to configure.
export default function DevAccountSwitcher({ currentRole }) {
  const router = useRouter();
  const [saved, setSaved] = useState({});
  const [switching, setSwitching] = useState(null); // which role is mid-switch

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getSavedAccounts().then((accounts) => { if (!cancelled) setSaved(accounts); });
      return () => { cancelled = true; };
    }, [])
  );

  const available = ROLES.filter((r) => saved[r]?.email);
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
          Сохранённые аккаунты
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {available.map((role) => {
          const active = role === currentRole;
          return (
            <PressableScale
              key={role}
              onPress={() => handlePress(role)}
              disabled={active || !!switching}
              scaleTo={0.96}
              style={{
                flexBasis: "47%", flexGrow: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center",
                backgroundColor: active ? BLUE : "#FFFFFF",
                borderWidth: 1, borderColor: active ? BLUE : BORDER,
                opacity: switching && switching !== role ? 0.5 : 1,
              }}
            >
              {switching === role ? (
                <ActivityIndicator size="small" color={active ? "#FFFFFF" : BLUE} />
              ) : (
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : TEXT }}>
                  {ROLE_LABELS[role]}
                </Text>
              )}
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
