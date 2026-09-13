import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import PressableScale from "@/components/PressableScale";

const VARIANTS = [
  { key: "index-test",          label: "Тест",  route: "/(parent-tabs)/index-test" },
  { key: "index-variant-hero",  label: "Hero",  route: "/(parent-tabs)/index-variant-hero" },
  { key: "index-variant-pulse", label: "Pulse", route: "/(parent-tabs)/index-variant-pulse" },
  { key: "index-variant-canvas", label: "Canvas", route: "/(parent-tabs)/index-variant-canvas" },
];

// Dev-only pill row for hopping between the parent-home design variants
// without swapping files manually. Drop into any of them.
export default function VariantSwitcher({ activeKey, activeColor = "#2563EB", activeBg = "#EFF6FF" }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
      {VARIANTS.map((v) => {
        const active = v.key === activeKey;
        return (
          <PressableScale
            key={v.key}
            onPress={() => !active && router.replace(v.route)}
            style={{
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
              backgroundColor: active ? activeBg : "transparent",
              borderWidth: 1, borderColor: active ? activeColor : "#E5E9F2",
            }}
          >
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: active ? activeColor : "#8E93A1" }}>
              {v.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
