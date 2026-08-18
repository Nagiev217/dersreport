import { Tabs } from "expo-router";
import { Home, Users, UserPlus, UserCircle, BarChart2, Heart, CalendarDays } from "lucide-react-native";
import { View } from "react-native";
import { useT } from "@/utils/i18n";
import { useMyRole } from "@/utils/auth/useMyRole";
import { canManageAccounts, ROLES } from "@/utils/auth/permissions";

const ACTIVE_COLOR = "#2563EB";

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
  // Admin gets "Расписание" (schedule management) in place of "Аналитика" —
  // Boss keeps Analytics as before. `role === null` (not yet resolved) keeps
  // both hidden briefly rather than flashing the wrong one.
  const isAdmin = role === ROLES.ADMIN;
  const showAnalytics = role !== null && !isAdmin;
  const showSchedule = isAdmin;

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
      <Tabs.Screen
        name="analytics"
        options={{
          title: t("adminAnalyticsTab"),
          href: showAnalytics ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon Icon={BarChart2} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: t("adminScheduleTab"),
          href: showSchedule ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon Icon={CalendarDays} focused={focused} />,
        }}
      />
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
      <Tabs.Screen name="salaries" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="teacher/[uid]" options={{ href: null }} />
      <Tabs.Screen name="teacher/schedule" options={{ href: null }} />
      <Tabs.Screen name="analytics-variant-tabs" options={{ href: null }} />
      <Tabs.Screen name="analytics-variant-calm" options={{ href: null }} />
      <Tabs.Screen name="analytics-variant-premium" options={{ href: null }} />
    </Tabs>
  );
}
