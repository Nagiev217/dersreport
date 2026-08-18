import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  Pressable, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Plus, X, ClipboardList, Trash2, CheckCircle2, Circle, Calendar } from "lucide-react-native";
import { useHomeworkStore } from "@/utils/homework/store";
import { useStudentsStore } from "@/utils/students/store";
import { useT } from "@/utils/i18n";

const SKY = "#0EA5E9";
const TEXT = "#111827";
const SUB = "#8E93A1";

const pad = (n) => String(n).padStart(2, "0");
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function plusDaysStr(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function HomeworkScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tName } = useT();
  const { homework, addHomework, updateHomework, deleteHomework } = useHomeworkStore();
  const { students } = useStudentsStore();

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dueDate, setDueDate] = useState(plusDaysStr(7));
  const [studentIds, setStudentIds] = useState([]);

  const resetForm = () => {
    setTitle(""); setDesc(""); setDueDate(plusDaysStr(7)); setStudentIds([]);
  };
  const closeAdd = () => { resetForm(); setShowAdd(false); };

  const toggleStudent = (id) =>
    setStudentIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const canSave = title.trim().length > 0 && studentIds.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(dueDate);

  const handleSave = () => {
    if (!canSave) return;
    const names = studentIds.map((id) => students.find((s) => String(s.id) === String(id))?.name ?? "").filter(Boolean);
    addHomework({
      id: `hw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      description: desc.trim(),
      studentIds: studentIds.map(String),
      studentNames: names,
      dueDate,
      status: "open",
      createdAt: Date.now(),
    });
    closeAdd();
  };

  const confirmDelete = (id) => {
    Alert.alert(t("hwDeleteTitle"), t("hwDeleteMsg"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => deleteHomework(id) },
    ]);
  };

  const sorted = [...homework].sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  return (
    <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF" }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("back")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={19} color={TEXT} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT }}>{t("homeHomework")}</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} accessibilityRole="button" accessibilityLabel={t("hwCreate")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: SKY, alignItems: "center", justifyContent: "center" }}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {sorted.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <ClipboardList size={32} color={SKY} />
            </View>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>{t("hwEmpty")}</Text>
          </View>
        ) : sorted.map((hw) => {
          const done = hw.status === "done";
          const overdue = !done && hw.dueDate < todayStr();
          return (
            <View key={hw.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 12, opacity: done ? 0.6 : 1 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <TouchableOpacity onPress={() => updateHomework(hw.id, { status: done ? "open" : "done" })} style={{ paddingTop: 1 }}>
                  {done ? <CheckCircle2 size={22} color="#22C55E" /> : <Circle size={22} color="#C7C7CC" />}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT, textDecorationLine: done ? "line-through" : "none" }}>{hw.title}</Text>
                  {hw.description ? (
                    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginTop: 3 }}>{hw.description}</Text>
                  ) : null}
                  <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 6 }}>
                    {(hw.studentNames ?? []).map((n) => tName(n)).join(", ")}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                    <Calendar size={12} color={overdue ? "#EF4444" : SUB} />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: overdue ? "#EF4444" : SUB }}>
                      {hw.dueDate}{overdue ? ` · ${t("hwOverdue")}` : ""}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(hw.id)} style={{ padding: 4 }}>
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Create modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={closeAdd}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" }} onPress={closeAdd}>
          <Pressable onPress={() => {}}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingBottom: insets.bottom + 16, paddingTop: 8, maxHeight: "92%" }}>
                <View style={{ alignItems: "center", marginBottom: 12 }}><View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} /></View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT }}>{t("hwCreate")}</Text>
                  <TouchableOpacity onPress={closeAdd} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
                    <X size={16} color="#3C3C43" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>{t("hwTitleLabel")}</Text>
                  <TextInput value={title} onChangeText={setTitle} placeholder={t("hwTitleHint")} placeholderTextColor="#C7C7CC"
                    style={{ backgroundColor: "#F2F2F7", borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT, marginBottom: 14 }} />

                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>{t("hwDescLabel")}</Text>
                  <TextInput value={desc} onChangeText={setDesc} placeholder={t("hwDescHint")} placeholderTextColor="#C7C7CC" multiline
                    style={{ backgroundColor: "#F2F2F7", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 72, fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT, marginBottom: 14, textAlignVertical: "top" }} />

                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>{t("hwDueLabel")}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                    <TextInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor="#C7C7CC" autoCapitalize="none"
                      style={{ flex: 1, backgroundColor: "#F2F2F7", borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, fontFamily: "Inter_600SemiBold", color: SKY }} />
                    <TouchableOpacity onPress={() => setDueDate(plusDaysStr(1))} style={{ paddingHorizontal: 12, height: 48, borderRadius: 12, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: SKY }}>{t("hwTomorrow")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDueDate(plusDaysStr(7))} style={{ paddingHorizontal: 12, height: 48, borderRadius: 12, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: SKY }}>+7</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 8, marginTop: 10 }}>
                    {t("hwStudentsLabel")} ({studentIds.length})
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                    {students.length === 0 ? (
                      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>{t("hwNoStudents")}</Text>
                    ) : students.map((s) => {
                      const active = studentIds.includes(String(s.id));
                      return (
                        <TouchableOpacity key={s.id} onPress={() => toggleStudent(String(s.id))}
                          style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: active ? SKY : "#F2F2F7", borderWidth: active ? 0 : 1, borderColor: "#E5E5EA" }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : "#3C3C43" }}>{tName(s.name)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity onPress={handleSave} disabled={!canSave} activeOpacity={0.85}
                    style={{ height: 52, borderRadius: 14, backgroundColor: canSave ? SKY : "#BAE6FD", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                    <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("hwSaveBtn")}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
