import { Tabs } from "expo-router";
import { Home, FileText, User, Calendar } from "lucide-react-native";
import { View } from "react-native";
import { useT } from "@/utils/i18n";
import { StudentDataProvider } from "@/utils/firebase/studentRealtime";

const ACTIVE_COLOR = "#10B981";

function TabIcon({ Icon, focused }) {
  return (
    <View
      style={{
        width: 44,
        height: 36,
        borderRadius: 10,
        backgroundColor: focused ? "#ECFDF5" : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={20} color={focused ? ACTIVE_COLOR : "#8E8E93"} strokeWidth={focused ? 2.2 : 1.8} />
    </View>
  );
}

export default function StudentTabLayout() {
  const { t } = useT();
  return (
    <StudentDataProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#F2F2F7", paddingTop: 4 },
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: "#8E8E93",
          tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 4 },
        }}
      >
        <Tabs.Screen name="index"   options={{ title: t("tabHome"),      tabBarIcon: ({ focused }) => <TabIcon Icon={Home}     focused={focused} /> }} />
        <Tabs.Screen name="lessons" options={{ title: t("tabLessons"),   tabBarIcon: ({ focused }) => <TabIcon Icon={Calendar} focused={focused} /> }} />
        <Tabs.Screen name="reports" options={{ title: t("reportsTitle"), tabBarIcon: ({ focused }) => <TabIcon Icon={FileText} focused={focused} /> }} />
        <Tabs.Screen name="profile" options={{ title: t("tabProfile"),   tabBarIcon: ({ focused }) => <TabIcon Icon={User}     focused={focused} /> }} />
      </Tabs>
    </StudentDataProvider>
  );
}
