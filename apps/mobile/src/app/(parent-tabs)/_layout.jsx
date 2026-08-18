import { Tabs } from "expo-router";
import { Home, FileText, User, Users, Calendar } from "lucide-react-native";
import { View } from "react-native";
import { useT } from "@/utils/i18n";
import { ParentDataProvider } from "@/utils/firebase/parentRealtime";

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

export default function ParentTabLayout() {
  const { t } = useT();
  return (
    <ParentDataProvider>
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
      <Tabs.Screen name="child"   options={{ title: t("tabMyChild"),   tabBarIcon: ({ focused }) => <TabIcon Icon={Users}    focused={focused} /> }} />
      <Tabs.Screen name="child-variant-modules" options={{ href: null }} />
      <Tabs.Screen name="reports-variant-timeline" options={{ href: null }} />
      <Tabs.Screen name="lessons" options={{ title: t("tabLessons"),   tabBarIcon: ({ focused }) => <TabIcon Icon={Calendar} focused={focused} /> }} />
      <Tabs.Screen name="reports" options={{ title: t("reportsTitle"), tabBarIcon: ({ focused }) => <TabIcon Icon={FileText} focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: t("tabProfile"),   tabBarIcon: ({ focused }) => <TabIcon Icon={User}     focused={focused} /> }} />
    </Tabs>
    </ParentDataProvider>
  );
}
