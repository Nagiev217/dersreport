import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Phone,
  Mail,
  ExternalLink,
  Pencil,
  Trash2,
  X,
} from "lucide-react-native";
import { useParentsStore } from "@/utils/parents/store";
import { useStudentsStore } from "@/utils/students/store";
import { useReportsStore } from "@/utils/reports/store";
import AddParentModal from "@/components/AddParentModal";
import { useT } from "@/utils/i18n";
import PressableScale from "@/components/PressableScale";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";
const GREEN = "#22C55E";

// ─── Sub-components ────────────────────────────────────────────────────────────

const ContactRow = ({ icon: Icon, label, value, onPress }) => (
  <TouchableOpacity
    activeOpacity={value ? 0.7 : 1}
    onPress={onPress}
    style={{
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      gap: 12,
    }}
  >
    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}>
      <Icon size={15} color={INDIGO} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 1 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: value ? TEXT : "#C7C7CC" }}>
        {value || "—"}
      </Text>
    </View>
    {value && <ExternalLink size={14} color="#C7C7CC" />}
  </TouchableOpacity>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ParentProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { parents, updateParent, deleteParent, unlinkStudent } = useParentsStore();
  const { students, updateStudent } = useStudentsStore();
  const { reports } = useReportsStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const { t, tp, tSubject, tName } = useT();

  const parent = parents.find((p) => p.id === id);

  if (!parent) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
        <Text style={{ fontSize: 16, fontFamily: "Inter_500Medium", color: SUB, marginBottom: 24 }}>{t("parentNotFound")}</Text>
        <PressableScale onPress={() => router.back()} scaleTo={0.96} style={{ borderRadius: 14, overflow: "hidden" }}>
          <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("back")}</Text>
          </LinearGradient>
        </PressableScale>
      </View>
    );
  }

  const linkedStudents = students.filter((s) =>
    (parent.studentIds ?? []).includes(s.id)
  );
  const parentReports = reports.filter((r) =>
    (parent.studentIds ?? []).includes(r.studentId)
  );

  const handleDelete = () => {
    Alert.alert(
      t("deleteParentTitle"),
      t("deleteParentMsg", { name: tName(parent.name) }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            // Remove parentId from linked students
            linkedStudents.forEach((s) => {
              updateStudent(s.id, {
                parentIds: (s.parentIds ?? []).filter((pid) => pid !== parent.id),
              });
            });
            deleteParent(parent.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleUnlinkStudent = (studentId) => {
    Alert.alert(t("unlinkStudentTitle"), t("unlinkStudentMsg"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("unlinkBtn"),
        style: "destructive",
        onPress: () => {
          unlinkStudent(parent.id, studentId);
          const student = students.find((s) => s.id === studentId);
          if (student) {
            updateStudent(studentId, {
              parentIds: (student.parentIds ?? []).filter((pid) => pid !== parent.id),
            });
          }
        },
      },
    ]);
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: "#FFFFFF" }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            paddingBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <PressableScale
            onPress={() => router.back()}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={t("back")}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={20} color={TEXT} />
          </PressableScale>
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>{t("roleParentTitle")}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <PressableScale
              onPress={() => setShowEditModal(true)}
              scaleTo={0.9}
              accessibilityRole="button"
              accessibilityLabel={t("edit")}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center" }}
            >
              <Pencil size={17} color={INDIGO} />
            </PressableScale>
            <PressableScale
              onPress={handleDelete}
              scaleTo={0.9}
              accessibilityRole="button"
              accessibilityLabel={t("delete")}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}
            >
              <Trash2 size={17} color="#EF4444" />
            </PressableScale>
          </View>
        </View>

        {/* Avatar + name hero */}
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 14,
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 20,
            alignItems: "center",
            borderWidth: 1,
            borderColor: BORDER,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: parent.avatarColor ?? INDIGO,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              borderWidth: 3,
              borderColor: "#FFFFFF",
              shadowColor: parent.avatarColor ?? INDIGO,
              shadowOpacity: 0.35,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}
          >
            <Text style={{ fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
              {tName(parent.name)?.[0] ?? "?"}
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 4 }}>
            {tName(parent.name)}
          </Text>
          <View
            style={{ paddingHorizontal: 12, paddingVertical: 4, backgroundColor: INDIGO_50, borderRadius: 20 }}
          >
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: INDIGO }}>
              {t("roleParentTitle")} · {tp(linkedStudents.length, "student")}
            </Text>
          </View>
        </View>

        {/* Contact info */}
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 14,
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: BORDER,
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: SUB, textTransform: "uppercase", letterSpacing: 0.5, paddingTop: 14, paddingBottom: 4 }}>
            {t("contacts")}
          </Text>
          <ContactRow
            icon={Phone}
            label={t("phone")}
            value={parent.phone}
            onPress={() => parent.phone && Linking.openURL(`tel:${parent.phone}`)}
          />
          <ContactRow
            icon={Mail}
            label="Email"
            value={parent.email}
            onPress={() => parent.email && Linking.openURL(`mailto:${parent.email}`)}
          />
          <View style={{ height: 8 }} />
        </View>

        {/* Linked students */}
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 14,
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: BORDER,
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: SUB, textTransform: "uppercase", letterSpacing: 0.5, paddingTop: 14, paddingBottom: 4 }}>
            {t("parentChildrenSection", { n: linkedStudents.length })}
          </Text>
          {linkedStudents.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#C7C7CC" }}>
                {t("noLinkedStudents")}
              </Text>
            </View>
          ) : (
            linkedStudents.map((student, idx) => (
              <View
                key={student.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderBottomWidth: idx < linkedStudents.length - 1 ? 1 : 0,
                  borderBottomColor: BORDER,
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push(`/student/${student.id}`)}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: student.avatarColor ?? BLUE, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" }}>{tName(student.name)?.[0]}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{tName(student.name)}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>{tSubject(student.type)} · {t("attendancePct", { n: student.attendance ?? 0 })}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleUnlinkStudent(student.id)}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={13} color={SUB} />
                </TouchableOpacity>
              </View>
            ))
          )}
          <View style={{ height: 8 }} />
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 14 }}>
          {[
            { label: t("parentStatReports"), value: parentReports.length, color: INDIGO, bg: INDIGO_50 },
            { label: t("parentStudentsLabel"), value: linkedStudents.length, color: BLUE, bg: BLUE_50 },
            { label: t("parentStatLessons"), value: linkedStudents.reduce((acc, s) => acc + (s.lessonsCompleted ?? 0), 0), color: GREEN, bg: "#ECFDF5" },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: stat.bg,
                borderRadius: 14,
                padding: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: stat.color }}>{stat.value}</Text>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Open parent portal */}
        <View style={{ paddingHorizontal: 20 }}>
          <PressableScale
            onPress={() => router.push(`/parent-portal?parentId=${parent.id}`)}
            scaleTo={0.98}
            style={{ borderRadius: 16, overflow: "hidden" }}
          >
            <LinearGradient
              colors={[BLUE, INDIGO]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 }}
            >
              <ExternalLink size={17} color="#FFFFFF" />
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                {t("openParentPortal")}
              </Text>
            </LinearGradient>
          </PressableScale>
        </View>
      </ScrollView>

      {/* Edit parent modal — reuse AddParentModal in "new" tab prefilled */}
      <AddParentModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onConfirm={(updatedParent) => {
          updateParent(parent.id, {
            name: updatedParent.name,
            phone: updatedParent.phone,
            email: updatedParent.email,
          });
        }}
        excludeParentIds={[parent.id]}
      />
    </>
  );
}
