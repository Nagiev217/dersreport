import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  Pressable, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Plus, X, PenLine, Trash2, Minus } from "lucide-react-native";
import { useWritingStore, ieltsOverall } from "@/utils/writing/store";
import { useStudentsStore } from "@/utils/students/store";
import { useT } from "@/utils/i18n";

const PINK = "#EC4899";
const TEXT = "#111827";
const SUB = "#8E93A1";

function bandColor(b) {
  if (b >= 7) return "#22C55E";
  if (b >= 5.5) return "#3B82F6";
  if (b >= 4) return "#F59E0B";
  return "#EF4444";
}

// 0–9 band stepper in 0.5 increments — IELTS scoring granularity.
function BandStepper({ label, value, onChange }) {
  const dec = () => onChange(Math.max(0, Math.round((value - 0.5) * 2) / 2));
  const inc = () => onChange(Math.min(9, Math.round((value + 0.5) * 2) / 2));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43", paddingRight: 10 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <TouchableOpacity onPress={dec} accessibilityRole="button" accessibilityLabel="−0.5"
          style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
          <Minus size={16} color="#3C3C43" />
        </TouchableOpacity>
        <View style={{ width: 52, height: 44, borderRadius: 12, backgroundColor: bandColor(value) + "22", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: bandColor(value) }}>{value.toFixed(1)}</Text>
        </View>
        <TouchableOpacity onPress={inc} accessibilityRole="button" accessibilityLabel="+0.5"
          style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
          <Plus size={16} color="#3C3C43" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function WritingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tName } = useT();
  const { writings, addWriting, deleteWriting } = useWritingStore();
  const { students } = useStudentsStore();

  const [showAdd, setShowAdd] = useState(false);
  const [studentId, setStudentId] = useState(null);
  const [task, setTask] = useState(2);
  const [essay, setEssay] = useState("");
  const [taskCriterion, setTaskCriterion] = useState(6);
  const [coherence, setCoherence] = useState(6);
  const [lexical, setLexical] = useState(6);
  const [grammar, setGrammar] = useState(6);
  const [feedback, setFeedback] = useState("");

  const overall = ieltsOverall(taskCriterion, coherence, lexical, grammar);

  const reset = () => {
    setStudentId(null); setTask(2); setEssay("");
    setTaskCriterion(6); setCoherence(6); setLexical(6); setGrammar(6); setFeedback("");
  };
  const closeAdd = () => { reset(); setShowAdd(false); };

  const canSave = studentId != null;

  const handleSave = () => {
    if (!canSave) return;
    const pad = (n) => String(n).padStart(2, "0");
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const student = students.find((s) => String(s.id) === String(studentId));
    addWriting({
      id: `wr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studentId: String(studentId),
      studentName: student?.name ?? "",
      task,
      essay: essay.trim(),
      taskCriterion, coherence, lexical, grammar,
      overall,
      feedback: feedback.trim(),
      date: dateStr,
      createdAt: Date.now(),
    });
    closeAdd();
  };

  const confirmDelete = (id) => {
    Alert.alert(t("wrDeleteTitle"), t("wrDeleteMsg"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => deleteWriting(id) },
    ]);
  };

  const sorted = [...writings].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  // Criterion label depends on task: TA (Task 1) vs TR (Task 2).
  const taskCritLabel = task === 1 ? t("wrTaskAchievement") : t("wrTaskResponse");

  return (
    <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF" }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("back")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={19} color={TEXT} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT }}>IELTS Writing</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} accessibilityRole="button" accessibilityLabel={t("wrCreate")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: PINK, alignItems: "center", justifyContent: "center" }}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {sorted.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "#FCE7F1", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <PenLine size={32} color={PINK} />
            </View>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>{t("wrEmpty")}</Text>
          </View>
        ) : sorted.map((w) => (
          <View key={w.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: bandColor(w.overall) + "22", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: bandColor(w.overall) }}>{w.overall.toFixed(1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{tName(w.studentName)}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>Task {w.task} · {w.date}</Text>
              </View>
              <TouchableOpacity onPress={() => confirmDelete(w.id)} style={{ padding: 4 }}>
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {[
                { l: "TA/TR", v: w.taskCriterion }, { l: "CC", v: w.coherence },
                { l: "LR", v: w.lexical }, { l: "GRA", v: w.grammar },
              ].map(({ l, v }) => (
                <View key={l} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#F2F2F7", borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: SUB }}>{l} {Number(v).toFixed(1)}</Text>
                </View>
              ))}
            </View>
            {w.feedback ? (
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#3C3C43", marginTop: 10, lineHeight: 19 }}>{w.feedback}</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {/* Create / assess modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={closeAdd}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" }} onPress={closeAdd}>
          <Pressable onPress={() => {}}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingBottom: insets.bottom + 16, paddingTop: 8, maxHeight: "94%" }}>
                <View style={{ alignItems: "center", marginBottom: 12 }}><View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} /></View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT }}>{t("wrCreate")}</Text>
                  <TouchableOpacity onPress={closeAdd} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
                    <X size={16} color="#3C3C43" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* Task 1 / Task 2 */}
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                    {[1, 2].map((n) => {
                      const active = task === n;
                      return (
                        <TouchableOpacity key={n} onPress={() => setTask(n)}
                          style={{ flex: 1, height: 46, borderRadius: 12, backgroundColor: active ? PINK : "#F2F2F7", alignItems: "center", justifyContent: "center", borderWidth: active ? 0 : 1, borderColor: "#E5E5EA" }}>
                          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : "#3C3C43" }}>Task {n}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Student picker */}
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 8 }}>{t("wrStudentLabel")}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    {students.length === 0 ? (
                      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>{t("hwNoStudents")}</Text>
                    ) : students.map((s) => {
                      const active = String(studentId) === String(s.id);
                      return (
                        <TouchableOpacity key={s.id} onPress={() => setStudentId(String(s.id))}
                          style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: active ? PINK : "#F2F2F7", borderWidth: active ? 0 : 1, borderColor: "#E5E5EA" }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : "#3C3C43" }}>{tName(s.name)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Essay text */}
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>{t("wrEssayLabel")}</Text>
                  <TextInput value={essay} onChangeText={setEssay} placeholder={t("wrEssayHint")} placeholderTextColor="#C7C7CC" multiline
                    style={{ backgroundColor: "#F2F2F7", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 90, fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT, marginBottom: 18, textAlignVertical: "top" }} />

                  {/* Criteria */}
                  <BandStepper label={taskCritLabel} value={taskCriterion} onChange={setTaskCriterion} />
                  <BandStepper label={t("wrCoherence")} value={coherence} onChange={setCoherence} />
                  <BandStepper label={t("wrLexical")} value={lexical} onChange={setLexical} />
                  <BandStepper label={t("wrGrammar")} value={grammar} onChange={setGrammar} />

                  {/* Overall */}
                  <View style={{ backgroundColor: bandColor(overall) + "18", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 8 }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: bandColor(overall) }}>{t("wrOverall")}</Text>
                    <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: bandColor(overall) }}>{overall.toFixed(1)}</Text>
                  </View>

                  {/* Feedback */}
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6, marginTop: 8 }}>{t("wrFeedbackLabel")}</Text>
                  <TextInput value={feedback} onChangeText={setFeedback} placeholder={t("wrFeedbackHint")} placeholderTextColor="#C7C7CC" multiline
                    style={{ backgroundColor: "#F2F2F7", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 72, fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT, marginBottom: 18, textAlignVertical: "top" }} />

                  <TouchableOpacity onPress={handleSave} disabled={!canSave} activeOpacity={0.85}
                    style={{ height: 52, borderRadius: 14, backgroundColor: canSave ? PINK : "#F9A8D4", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                    <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("wrSaveBtn")}</Text>
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
