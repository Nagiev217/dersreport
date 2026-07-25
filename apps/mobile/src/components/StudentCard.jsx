import { View, Text, TouchableOpacity } from "react-native";
import { getScoreColor } from "../data/mockData";
import { useT } from "@/utils/i18n";

export default function StudentCard({ student, showNextLesson = false, onPress }) {
  const { t } = useT();
  const scoreColor = getScoreColor(student.score);
  const progress = student.score / student.maxScore;
  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {/* Avatar */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: student.avatarColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Inter_700Bold",
              color: "#FFFFFF",
            }}
          >
            {initials}
          </Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Inter_600SemiBold",
              color: "#1C1C1E",
            }}
          >
            {student.name}
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_400Regular",
              color: "#8E8E93",
              marginTop: 2,
            }}
          >
            {student.subject}
          </Text>
        </View>

        {/* Score + Bar */}
        <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Inter_700Bold",
              color: scoreColor,
            }}
          >
            {student.score}/{student.maxScore}
          </Text>
          <View
            style={{
              width: 52,
              height: 4,
              backgroundColor: "#F2F2F7",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                backgroundColor: scoreColor,
                borderRadius: 2,
              }}
            />
          </View>
        </View>
      </View>

      {showNextLesson && (
        <View
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "#F2F2F7",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: "#8E8E93",
            }}
          >
            {t("studentNextCard")}{student.nextLesson}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
