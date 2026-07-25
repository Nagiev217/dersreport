import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar } from "lucide-react-native";
import { useT } from "../../utils/i18n";

export default function ParentLessons() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  return (
    <View style={{ flex: 1, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center", paddingTop: insets.top }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Calendar size={32} color="#6B5CF6" />
      </View>
      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 8 }}>
        {t("tabLessons")}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center" }}>
        {t("parentUpcomingLessons")}
      </Text>
    </View>
  );
}
