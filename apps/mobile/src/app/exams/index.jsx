import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft, Plus, X, FileCheck2, Trash2, ChevronRight,
  UserPlus, Check, Circle,
} from "lucide-react-native";
import { useExamsStore, IELTS_SECTIONS, totalPoints } from "@/utils/exams/store";
import { useStudentsStore } from "@/utils/students/store";
import { useT } from "@/utils/i18n";

const INDIGO = "#4F46E5";
const TEXT = "#111827";
const SUB = "#8E93A1";

const SECTION_COLOR = { listening: "#2563EB", reading: "#22C55E", writing: "#8B5CF6", speaking: "#F59E0B" };

const pad = (n) => String(n).padStart(2, "0");
function plusDaysStr(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const blankQuestion = () => ({ id: uid(), type: "mcq", text: "", options: ["", ""], answer: 0, points: 1 });

export default function ExamsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tName } = useT();
  const { exams, assignments, addExam, updateExam, deleteExam, addAssignments } = useExamsStore();
  const { students } = useStudentsStore();

  // ── Builder modal state ──
  const [showBuilder, setShowBuilder] = useState(false);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState("");
  const [section, setSection] = useState("reading");
  const [questions, setQuestions] = useState([blankQuestion()]);

  // ── Assign modal state ──
  const [assignExam, setAssignExam] = useState(null);
  const [assignStudentIds, setAssignStudentIds] = useState([]);
  const [assignDue, setAssignDue] = useState(plusDaysStr(7));

  const openCreate = () => {
    setEditId(null); setTitle(""); setSection("reading"); setQuestions([blankQuestion()]); setShowBuilder(true);
  };
  const openEdit = (exam) => {
    setEditId(exam.id); setTitle(exam.title); setSection(exam.section);
    setQuestions(exam.questions.length ? exam.questions : [blankQuestion()]); setShowBuilder(true);
  };
  const closeBuilder = () => setShowBuilder(false);

  const setQ = (qid, patch) => setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, ...patch } : q)));
  const addQuestion = () => setQuestions((qs) => [...qs, blankQuestion()]);
  const removeQuestion = (qid) => setQuestions((qs) => (qs.length > 1 ? qs.filter((q) => q.id !== qid) : qs));
  const setOption = (qid, idx, val) =>
    setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, options: q.options.map((o, i) => (i === idx ? val : o)) } : q)));
  const addOption = (qid) =>
    setQuestions((qs) => qs.map((q) => (q.id === qid && q.options.length < 5 ? { ...q, options: [...q.options, ""] } : q)));

  const validQuestion = (q) => {
    if (!q.text.trim()) return false;
    if (q.type === "mcq") return q.options.filter((o) => o.trim()).length >= 2 && q.options[q.answer]?.trim();
    if (q.type === "short") return String(q.answer ?? "").trim().length > 0;
    return true; // tfng always has an answer
  };
  const canSaveExam = title.trim().length > 0 && questions.length > 0 && questions.every(validQuestion);

  const saveExam = () => {
    if (!canSaveExam) return;
    const clean = questions.map((q) => ({
      ...q,
      text: q.text.trim(),
      options: q.type === "mcq" ? q.options.map((o) => o.trim()).filter(Boolean) : [],
      points: Number(q.points) || 1,
    }));
    const payload = {
      title: title.trim(), section, questions: clean,
      totalPoints: totalPoints(clean), updatedAt: Date.now(),
    };
    if (editId) updateExam(editId, payload);
    else addExam({ id: `ex-${uid()}`, createdAt: Date.now(), ...payload });
    closeBuilder();
  };

  const confirmDeleteExam = (id) => {
    Alert.alert(t("examDeleteTitle"), t("examDeleteMsg"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => deleteExam(id) },
    ]);
  };

  // ── Assign ──
  const openAssign = (exam) => { setAssignExam(exam); setAssignStudentIds([]); setAssignDue(plusDaysStr(7)); };
  const toggleAssignStudent = (id) =>
    setAssignStudentIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const canAssign = assignStudentIds.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(assignDue);
  const doAssign = () => {
    if (!canAssign || !assignExam) return;
    const rows = assignStudentIds.map((sid) => {
      const s = students.find((x) => String(x.id) === String(sid));
      return {
        id: `asg-${uid()}`, examId: assignExam.id, examTitle: assignExam.title, section: assignExam.section,
        studentId: String(sid), studentName: s?.name ?? "", dueDate: assignDue, assignedAt: Date.now(), status: "assigned",
      };
    });
    addAssignments(rows);
    setAssignExam(null);
    Alert.alert(t("examAssignedTitle"), t("examAssignedMsg", { n: rows.length }));
  };

  const countFor = (examId) => assignments.filter((a) => a.examId === examId).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF" }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("back")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={19} color={TEXT} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT }}>{t("examsTitle")}</Text>
        <TouchableOpacity onPress={openCreate} accessibilityRole="button" accessibilityLabel={t("examCreate")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: INDIGO, alignItems: "center", justifyContent: "center" }}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {exams.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <FileCheck2 size={32} color={INDIGO} />
            </View>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>{t("examsEmpty")}</Text>
          </View>
        ) : exams.map((ex) => {
          const col = SECTION_COLOR[ex.section] ?? INDIGO;
          return (
            <View key={ex.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 12 }}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => openEdit(ex)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: col + "22", alignItems: "center", justifyContent: "center" }}>
                  <FileCheck2 size={20} color={col} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT }}>{ex.title}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>
                    {t(`examSection_${ex.section}`)} · {ex.questions.length} {t("examQuestionsShort")} · {ex.totalPoints} {t("examPointsShort")}
                  </Text>
                </View>
                <ChevronRight size={17} color="#C6CBD5" />
              </TouchableOpacity>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TouchableOpacity onPress={() => openAssign(ex)} style={{ flex: 1, height: 40, borderRadius: 11, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
                  <UserPlus size={15} color={INDIGO} />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: INDIGO }}>
                    {t("examAssign")}{countFor(ex.id) > 0 ? ` (${countFor(ex.id)})` : ""}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDeleteExam(ex.id)} style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ── Builder modal (full screen) ── */}
      <Modal visible={showBuilder} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeBuilder}>
        <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, backgroundColor: "#FFFFFF", borderBottomWidth: 0.5, borderBottomColor: "#E5E5EA" }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{editId ? t("examEdit") : t("examCreate")}</Text>
            <TouchableOpacity onPress={closeBuilder} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
              <X size={16} color="#3C3C43" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>{t("examTitleLabel")}</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder={t("examTitleHint")} placeholderTextColor="#C7C7CC"
                style={{ backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT, marginBottom: 16 }} />

              {/* Section */}
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 8 }}>{t("examSectionLabel")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {IELTS_SECTIONS.map((sec) => {
                  const active = section === sec;
                  const col = SECTION_COLOR[sec];
                  return (
                    <TouchableOpacity key={sec} onPress={() => setSection(sec)}
                      style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: active ? col : "#FFFFFF", borderWidth: active ? 0 : 1, borderColor: "#E5E5EA" }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : "#3C3C43" }}>{t(`examSection_${sec}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Questions */}
              {questions.map((q, qi) => (
                <View key={q.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: INDIGO }}>{t("examQuestion")} {qi + 1}</Text>
                    <TouchableOpacity onPress={() => removeQuestion(q.id)} disabled={questions.length === 1} style={{ padding: 4, opacity: questions.length === 1 ? 0.3 : 1 }}>
                      <Trash2 size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Type */}
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
                    {[["mcq", t("examTypeMcq")], ["tfng", "T/F/NG"], ["short", t("examTypeShort")]].map(([tp, lbl]) => {
                      const active = q.type === tp;
                      return (
                        <TouchableOpacity key={tp} onPress={() => setQ(q.id, { type: tp, answer: tp === "mcq" ? 0 : tp === "tfng" ? "true" : "" })}
                          style={{ flex: 1, height: 38, borderRadius: 10, backgroundColor: active ? "#EEF0FF" : "#F2F2F7", alignItems: "center", justifyContent: "center", borderWidth: active ? 1 : 0, borderColor: INDIGO }}>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? INDIGO : "#8E8E93" }}>{lbl}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Question text */}
                  <TextInput value={q.text} onChangeText={(v) => setQ(q.id, { text: v })} placeholder={t("examQuestionHint")} placeholderTextColor="#C7C7CC" multiline
                    style={{ backgroundColor: "#F2F2F7", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT, marginBottom: 10, textAlignVertical: "top" }} />

                  {/* Type-specific answer */}
                  {q.type === "mcq" && (
                    <View style={{ gap: 8, marginBottom: 6 }}>
                      {q.options.map((opt, oi) => {
                        const correct = q.answer === oi;
                        return (
                          <View key={oi} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <TouchableOpacity onPress={() => setQ(q.id, { answer: oi })} accessibilityRole="radio" accessibilityState={{ selected: correct }}
                              style={{ width: 26, height: 26, alignItems: "center", justifyContent: "center" }}>
                              {correct ? <Check size={20} color="#22C55E" /> : <Circle size={18} color="#C7C7CC" />}
                            </TouchableOpacity>
                            <TextInput value={opt} onChangeText={(v) => setOption(q.id, oi, v)} placeholder={`${t("examOption")} ${oi + 1}`} placeholderTextColor="#C7C7CC"
                              style={{ flex: 1, backgroundColor: "#F2F2F7", borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT }} />
                          </View>
                        );
                      })}
                      {q.options.length < 5 && (
                        <TouchableOpacity onPress={() => addOption(q.id)} style={{ alignSelf: "flex-start", paddingVertical: 4 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: INDIGO }}>+ {t("examAddOption")}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {q.type === "tfng" && (
                    <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
                      {[["true", "True"], ["false", "False"], ["ng", "Not Given"]].map(([val, lbl]) => {
                        const active = q.answer === val;
                        return (
                          <TouchableOpacity key={val} onPress={() => setQ(q.id, { answer: val })}
                            style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: active ? "#22C55E" : "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : "#3C3C43" }}>{lbl}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {q.type === "short" && (
                    <TextInput value={String(q.answer ?? "")} onChangeText={(v) => setQ(q.id, { answer: v })} placeholder={t("examCorrectAnswer")} placeholderTextColor="#C7C7CC"
                      style={{ backgroundColor: "#ECFDF5", borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#166534", marginBottom: 6 }} />
                  )}

                  {/* Points */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: SUB }}>{t("examPoints")}</Text>
                    <TextInput value={String(q.points)} onChangeText={(v) => setQ(q.id, { points: v.replace(/[^0-9]/g, "") })} keyboardType="number-pad"
                      style={{ width: 60, backgroundColor: "#F2F2F7", borderRadius: 10, paddingHorizontal: 12, height: 40, fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT, textAlign: "center" }} />
                  </View>
                </View>
              ))}

              <TouchableOpacity onPress={addQuestion} style={{ height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: INDIGO, borderStyle: "dashed", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, marginBottom: 20 }}>
                <Plus size={18} color={INDIGO} />
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: INDIGO }}>{t("examAddQuestion")}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={saveExam} disabled={!canSaveExam} activeOpacity={0.85}
                style={{ height: 52, borderRadius: 14, backgroundColor: canSaveExam ? INDIGO : "#C7D2FE", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("examSaveBtn")}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Assign modal ── */}
      <Modal visible={!!assignExam} transparent animationType="slide" onRequestClose={() => setAssignExam(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingBottom: insets.bottom + 16, paddingTop: 8, maxHeight: "88%" }}>
              <View style={{ alignItems: "center", marginBottom: 12 }}><View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} /></View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT }}>{t("examAssign")}</Text>
                <TouchableOpacity onPress={() => setAssignExam(null)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
                  <X size={16} color="#3C3C43" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 16 }}>{assignExam?.title}</Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 6 }}>{t("hwDueLabel")}</Text>
                <TextInput value={assignDue} onChangeText={setAssignDue} placeholder="YYYY-MM-DD" placeholderTextColor="#C7C7CC" autoCapitalize="none"
                  style={{ backgroundColor: "#F2F2F7", borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, fontFamily: "Inter_600SemiBold", color: INDIGO, marginBottom: 16 }} />

                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 8 }}>{t("hwStudentsLabel")} ({assignStudentIds.length})</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                  {students.length === 0 ? (
                    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>{t("hwNoStudents")}</Text>
                  ) : students.map((s) => {
                    const active = assignStudentIds.includes(String(s.id));
                    return (
                      <TouchableOpacity key={s.id} onPress={() => toggleAssignStudent(String(s.id))}
                        style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: active ? INDIGO : "#F2F2F7", borderWidth: active ? 0 : 1, borderColor: "#E5E5EA" }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : "#3C3C43" }}>{tName(s.name)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity onPress={doAssign} disabled={!canAssign} activeOpacity={0.85}
                  style={{ height: 52, borderRadius: 14, backgroundColor: canAssign ? INDIGO : "#C7D2FE", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("examAssignBtn")}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
