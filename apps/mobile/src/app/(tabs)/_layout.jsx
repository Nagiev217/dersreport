import { Tabs } from "expo-router";
import { Home, Users, BookOpen, BarChart3, UserCircle } from "lucide-react-native";
import { View } from "react-native";
import { useT } from "@/utils/i18n";

const ACTIVE_COLOR = "#6B5CF6";

function TabIcon({ Icon, focused }) {
  return (
    <View
      style={{
        width: 44,
        height: 36,
        borderRadius: 10,
        backgroundColor: focused ? "#EEF0FF" : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={20} color={focused ? ACTIVE_COLOR : "#8E8E93"} strokeWidth={focused ? 2.2 : 1.8} />
    </View>
  );
}

export default function TabLayout() {
  const { t } = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#F2F2F7", paddingTop: 4 },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: "#8E8E93",
        tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 4 },
        tabBarIconStyle: { marginBottom: 0 },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: t("tabHome"),       tabBarIcon: ({ focused }) => <TabIcon Icon={Home}      focused={focused} /> }} />
      <Tabs.Screen name="students" options={{ title: t("studentsTitle"), tabBarIcon: ({ focused }) => <TabIcon Icon={Users}     focused={focused} /> }} />
      <Tabs.Screen name="lessons"  options={{ title: t("lessonsTitle"),  tabBarIcon: ({ focused }) => <TabIcon Icon={BookOpen}  focused={focused} /> }} />
      <Tabs.Screen name="reports"  options={{ title: t("reportsTitle"),  tabBarIcon: ({ focused }) => <TabIcon Icon={BarChart3}  focused={focused} /> }} />
      <Tabs.Screen name="analytics" options={{ title: t("analyticsTitle"), href: null }} />
      <Tabs.Screen name="schedule"  options={{ title: t("scheduleTitle"),  href: null }} />
      <Tabs.Screen name="profile"  options={{ title: t("tabProfile"),    tabBarIcon: ({ focused }) => <TabIcon Icon={UserCircle} focused={focused} /> }} />
    </Tabs>
  );
}
