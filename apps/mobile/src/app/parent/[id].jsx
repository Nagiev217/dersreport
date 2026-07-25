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
import {
  ArrowLeft,
  Phone,
  Mail,
  Users,
  FileText,
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

// ─── Sub-components ────────────────────────────────────────────────────────────

const ContactRow = ({ icon: Icon, label, value, onPress }) => (
  <TouchableOpacity
    activeOpacity={value ? 0.7 : 1}
    onPress={onPress}
    style={{
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: "#F2F2F7",
      gap: 12,
    }}
  >
    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center" }}>
      <Icon size={15} color="#6B5CF6" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93", marginBottom: 1 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: value ? "#1C1C1E" : "#C7C7CC" }}>
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
      <View style={{ flex: 1, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 16, fontFamily: "Inter_500Medium", color: "#8E8E93", marginBottom: 24 }}>{t("parentNotFound")}</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#6B5CF6", borderRadius: 14 }}
        >
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("back")}</Text>
        </TouchableOpacity>
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
        style={{ flex: 1, backgroundColor: "#F2F2F7" }}
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
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{t("roleParentTitle")}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowEditModal(true)}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center" }}
            >
              <Pencil size={17} color="#6B5CF6" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleDelete}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}
            >
              <Trash2 size={17} color="#EF4444" />
            </TouchableOpacity>
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
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: parent.avatarColor ?? "#6B5CF6",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              shadowColor: parent.avatarColor ?? "#6B5CF6",
              shadowOpacity: 0.4,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Text style={{ fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
              {tName(parent.name)?.[0] ?? "?"}
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 4 }}>
            {tName(parent.name)}
          </Text>
          <View
            style={{ paddingHorizontal: 12, paddingVertical: 4, backgroundColor: "#EEF0FF", borderRadius: 20 }}
          >
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#6B5CF6" }}>
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
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, paddingTop: 14, paddingBottom: 4 }}>
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
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, paddingTop: 14, paddingBottom: 4 }}>
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
                  borderBottomWidth: idx < linkedStudents.length - 1 ? 0.5 : 0,
                  borderBottomColor: "#F2F2F7",
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push(`/student/${student.id}`)}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: student.avatarColor ?? "#6B5CF6", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" }}>{tName(student.name)?.[0]}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}>{tName(student.name)}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{tSubject(student.type)} · {t("attendancePct", { n: student.attendance ?? 0 })}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleUnlinkStudent(student.id)}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={13} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            ))
          )}
          <View style={{ height: 8 }} />
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 14 }}>
          {[
            { label: t("parentStatReports"), value: parentReports.length, color: "#6B5CF6" },
            { label: t("parentStudentsLabel"), value: linkedStudents.length, color: "#3B82F6" },
            { label: t("parentStatLessons"), value: linkedStudents.reduce((acc, s) => acc + (s.lessonsCompleted ?? 0), 0), color: "#22C55E" },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                padding: 12,
                alignItems: "center",
                shadowColor: "#000",
                shadowOpacity: 0.04,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 1,
              }}
            >
              <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: stat.color }}>{stat.value}</Text>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Open parent portal */}
        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(`/parent-portal?parentId=${parent.id}`)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: "#6B5CF6",
              borderRadius: 16,
              paddingVertical: 15,
            }}
          >
            <ExternalLink size={17} color="#FFFFFF" />
            <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
              {t("openParentPortal")}
            </Text>
          </TouchableOpacity>
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
