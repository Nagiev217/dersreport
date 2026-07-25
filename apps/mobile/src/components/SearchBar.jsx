import { View, TextInput, TouchableOpacity } from "react-native";
import { Search, Mic } from "lucide-react-native";
import { useT } from "@/utils/i18n";

export default function SearchBar({
  placeholder,
  value,
  onChangeText,
  showMic = true,
}) {
  const { t } = useT();
  const ph = placeholder ?? t("search");
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EBEBF0",
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
      }}
    >
      <Search size={16} color="#8E8E93" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={ph}
        placeholderTextColor="#8E8E93"
        style={{
          flex: 1,
          fontSize: 16,
          color: "#1C1C1E",
          padding: 0,
          fontFamily: "Inter_400Regular",
        }}
      />
      {showMic && (
        <TouchableOpacity>
          <Mic size={16} color="#8E8E93" />
        </TouchableOpacity>
      )}
    </View>
  );
}
