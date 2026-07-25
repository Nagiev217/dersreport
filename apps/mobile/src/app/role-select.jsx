import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  GraduationCap, Users, BookOpen, LogIn,
} from "lucide-react-native";
import { useT } from "@/utils/i18n";

const TEACHER_COLOR = "#6B5CF6";
const PARENT_COLOR  = "#0EA5E9";
const STUDENT_COLOR = "#10B981";

function RoleCard({ role }) {
  const { t } = useT();
  const Icon = role.icon;
  const features = role.featureKeys.map(k => t(k));
  return (
    <LinearGradient
      colors={role.gradient}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 24, padding: 22,
        shadowColor: role.gradient[1],
        shadowOpacity: 0.35, shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }}
    >
      {/* Icon + Title */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <View style={{
          width: 52, height: 52, borderRadius: 15,
          backgroundColor: "rgba(255,255,255,0.2)",
          alignItems: "center", justifyContent: "center",
          borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
        }}>
          <Icon size={26} color="#FFFFFF" />
        </View>
        <View>
          <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
            {t(role.titleKey)}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" }}>
            {t(role.descKey)}
          </Text>
        </View>
      </View>

      {/* Features */}
      <View style={{ gap: 6, marginBottom: 20 }}>
        {features.map((f, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" }} />
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" }}>
              {f}
            </Text>
          </View>
        ))}
      </View>

      {/* Action button */}
      <TouchableOpacity
        onPress={() => router.push(`/login?role=${role.key}`)}
        activeOpacity={0.85}
        style={{
          height: 46, borderRadius: 13,
          backgroundColor: "#FFFFFF",
          alignItems: "center", justifyContent: "center",
          flexDirection: "row", gap: 6,
        }}
      >
        <LogIn size={15} color={role.color} />
        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: role.color }}>
          {t("roleSignInBtn")}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

export default function RoleSelectScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();

  const ROLES = [
    {
      key: "teacher",
      icon: GraduationCap,
      titleKey: "roleTeacherTitle",
      descKey:  "roleTeacherDesc",
      featureKeys: ["roleTeacherF1", "roleTeacherF2", "roleTeacherF3"],
      gradient: ["#4F46E5", "#6B5CF6"],
      color: TEACHER_COLOR,
    },
    {
      key: "parent",
      icon: Users,
      titleKey: "roleParentTitle",
      descKey:  "roleParentDesc",
      featureKeys: ["roleParentF1", "roleParentF2", "roleParentF3"],
      gradient: ["#0EA5E9", "#6366F1"],
      color: PARENT_COLOR,
    },
    {
      key: "student",
      icon: BookOpen,
      titleKey: "roleStudentTitle",
      descKey:  "roleStudentDesc",
      featureKeys: ["roleStudentF1", "roleStudentF2", "roleStudentF3"],
      gradient: ["#10B981", "#059669"],
      color: STUDENT_COLOR,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{
          paddingTop: insets.top + 32,
          paddingHorizontal: 24,
          paddingBottom: 28,
          alignItems: "center",
        }}>
          <View style={{
            width: 68, height: 68, borderRadius: 20,
            backgroundColor: "#6B5CF6",
            alignItems: "center", justifyContent: "center",
            marginBottom: 18,
            shadowColor: "#6B5CF6", shadowOpacity: 0.35,
            shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}>
            <BookOpen size={32} color="#FFFFFF" />
          </View>
          <Text style={{
            fontSize: 30, fontFamily: "Inter_700Bold",
            color: "#1C1C1E", letterSpacing: -0.5,
          }}>
            Jeff
          </Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#8E8E93", letterSpacing: 0.5, marginBottom: 6 }}>
            Colleges
          </Text>
          <Text style={{ fontSize: 16, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
            {t("roleSelectSubtitle")}
          </Text>
        </View>

        {/* Role cards */}
        <View style={{ paddingHorizontal: 20, gap: 16, paddingBottom: insets.bottom + 40 }}>
          {ROLES.map(role => <RoleCard key={role.key} role={role} />)}

          {/* Bottom hint */}
          <Text style={{
            textAlign: "center", fontSize: 12,
            fontFamily: "Inter_400Regular", color: "#C7C7CC",
            marginTop: 4,
          }}>
            {t("roleSelectHint")}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
