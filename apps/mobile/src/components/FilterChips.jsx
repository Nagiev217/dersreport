import { ScrollView, TouchableOpacity, Text } from "react-native";

export default function FilterChips({ options, selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      style={{ flexGrow: 0 }}
    >
      {options.map((option) => {
        const isSelected = selected === option;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: isSelected ? "#1C1C1E" : "#FFFFFF",
              borderWidth: isSelected ? 0 : 1,
              borderColor: "#E5E7EB",
            }}
            activeOpacity={0.75}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: isSelected
                  ? "Inter_600SemiBold"
                  : "Inter_400Regular",
                color: isSelected ? "#FFFFFF" : "#6B7280",
              }}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
