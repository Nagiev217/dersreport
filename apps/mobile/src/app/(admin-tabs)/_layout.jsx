import { Tabs } from "expo-router";
import { Home, Users, UserPlus, UserCircle, BarChart2, Heart } from "lucide-react-native";
import { View } from "react-native";
import { useT } from "@/utils/i18n";
import { useMyRole } from "@/utils/auth/useMyRole";
import { canManageAccounts } from "@/utils/auth/permissions";

const ACTIVE_COLOR = "#22447A";

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

export default function AdminTabLayout() {
  const { t } = useT();
  const role = useMyRole();
  const showCreate = canManageAccounts(role); // hidden until role confirms 'boss'

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
      <Tabs.Screen name="index" options={{ title: t("dashboardTab"), tabBarIcon: ({ focused }) => <TabIcon Icon={Home} focused={focused} /> }} />
      <Tabs.Screen name="teachers" options={{ title: t("adminRosterTab"), tabBarIcon: ({ focused }) => <TabIcon Icon={Users} focused={focused} /> }} />
      <Tabs.Screen name="analytics" options={{ title: t("adminAnalyticsTab"), tabBarIcon: ({ focused }) => <TabIcon Icon={BarChart2} focused={focused} /> }} />
      <Tabs.Screen name="parents" options={{ title: t("adminParentsTab"), tabBarIcon: ({ focused }) => <TabIcon Icon={Heart} focused={focused} /> }} />
      <Tabs.Screen
        name="create"
        options={{
          title: t("adminCreateTab"),
          href: showCreate ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon Icon={UserPlus} focused={focused} />,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: t("tabProfile"), tabBarIcon: ({ focused }) => <TabIcon Icon={UserCircle} focused={focused} /> }} />
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="teacher/[uid]" options={{ href: null }} />
    </Tabs>
  );
}
