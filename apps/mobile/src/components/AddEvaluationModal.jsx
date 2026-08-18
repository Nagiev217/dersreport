import {
  View,
  Text,
  Modal,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { X, Star } from "lucide-react-native";
import { useProgressStore } from "@/utils/progress/store";
import { useT } from "@/utils/i18n";

const SCORE_COLORS = { 1: "#EF4444", 2: "#F97316", 3: "#F59E0B", 4: "#3B82F6", 5: "#22C55E" };

// ─── Score Picker ─────────────────────────────────────────────────────────────

const ScorePicker = ({ label, value, onChange }) => {
  const { t } = useT();
  const SCORE_LABELS = { 1: t("scorePoor"), 2: t("scoreBelowAvg"), 3: t("scoreMedium"), 4: t("scoreGood"), 5: t("scoreExcellent") };
  return (
  <View style={{ marginBottom: 16 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43" }}>{label}</Text>
      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: value ? SCORE_COLORS[value] : "#C7C7CC" }}>
        {value ? SCORE_LABELS[value] : "—"}
      </Text>
    </View>
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value === n;
        return (
          <TouchableOpacity
            key={n}
            activeOpacity={0.7}
            onPress={() => onChange(n)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              backgroundColor: active ? SCORE_COLORS[n] : "#F2F2F7",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: active ? 0 : 1,
              borderColor: "#E5E5EA",
            }}
          >
            <Star
              size={14}
              color={active ? "#FFFFFF" : "#C7C7CC"}
              fill={active ? "#FFFFFF" : "none"}
            />
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Inter_700Bold",
                color: active ? "#FFFFFF" : "#8E8E93",
                marginTop: 1,
              }}
            >
              {n}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function AddEvaluationModal({ visible, onClose, studentId, studentName }) {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { addEvaluation, updateEvaluation, evaluations } = useProgressStore();

  const [attendance, setAttendance] = useState("present"); // present | late | absent
  const [activity, setActivity] = useState(0);
  const [comprehension, setComprehension] = useState(0);
  const [homework, setHomework] = useState(0);
  const [behavior, setBehavior] = useState(0);
  const [notes, setNotes] = useState("");

  const reset = () => {
    setAttendance("present");
    setActivity(0);
    setComprehension(0);
    setHomework(0);
    setBehavior(0);
    setNotes("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // An "absent" record needs no per-skill scores; present/late require them.
  const canSave =
    attendance === "absent" ||
    (activity > 0 && comprehension > 0 && homework > 0 && behavior > 0);

  const handleSave = () => {
    if (!canSave) return;

    const pad = (n) => String(n).padStart(2, "0");
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const absent = attendance === "absent";
    addEvaluation({
      id: `ev-${studentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studentId,
      date: dateStr,
      attendance,
      activity: absent ? 0 : activity,
      comprehension: absent ? 0 : comprehension,
      homework: absent ? 0 : homework,
      behavior: absent ? 0 : behavior,
      notes: notes.trim(),
      createdAt: Date.now(),
    });

    handleClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" }}
        onPress={handleClose}
      >
        <Pressable onPress={() => {}}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 26,
                borderTopRightRadius: 26,
                paddingHorizontal: 20,
                paddingBottom: insets.bottom + 16,
                paddingTop: 8,
                maxHeight: "92%",
              }}
            >
              {/* Drag handle */}
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
              </View>

              {/* Header */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <View>
                  <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
                    {t("evalTitle")}
                  </Text>
                  {studentName ? (
                    <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 2 }}>
                      {studentName}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={16} color="#3C3C43" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginTop: 16 }}>
                {/* Attendance */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43", marginBottom: 8 }}>
                    {t("evalAttendance")}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[
                      { key: "present", label: t("attnPresent"), color: "#22C55E" },
                      { key: "late",    label: t("attnLate"),    color: "#F59E0B" },
                      { key: "absent",  label: t("attnAbsent"),  color: "#EF4444" },
                    ].map(({ key, label, color }) => {
                      const active = attendance === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          activeOpacity={0.75}
                          onPress={() => setAttendance(key)}
                          style={{
                            flex: 1, height: 44, borderRadius: 12,
                            backgroundColor: active ? color : "#F2F2F7",
                            alignItems: "center", justifyContent: "center",
                            borderWidth: active ? 0 : 1, borderColor: "#E5E5EA",
                          }}
                        >
                          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : "#3C3C43" }}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {attendance !== "absent" && (<>
                <ScorePicker label={t("evalActivity")} value={activity} onChange={setActivity} />
                <ScorePicker label={t("evalComprehension")} value={comprehension} onChange={setComprehension} />
                <ScorePicker label={t("evalHomework")} value={homework} onChange={setHomework} />
                <ScorePicker label={t("evalBehavior")} value={behavior} onChange={setBehavior} />
                </>)}

                {/* Notes */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43", marginBottom: 8 }}>
                    {t("evalNotes")}
                  </Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={t("evalNotesHint")}
                    placeholderTextColor="#C7C7CC"
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: "#F2F2F7",
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 14,
                      fontFamily: "Inter_400Regular",
                      color: "#1C1C1E",
                      minHeight: 80,
                      textAlignVertical: "top",
                    }}
                  />
                </View>

                {/* Avg preview */}
                {canSave && attendance !== "absent" && (
                  <View
                    style={{
                      backgroundColor: "#EEF0FF",
                      borderRadius: 14,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#6B5CF6" }}>
                      {t("evalAvgScore")}
                    </Text>
                    <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#6B5CF6" }}>
                      {((activity + comprehension + homework + behavior) / 4).toFixed(1)} / 5
                    </Text>
                  </View>
                )}

                {/* Save */}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!canSave}
                  activeOpacity={0.85}
                  style={{
                    height: 52,
                    borderRadius: 14,
                    backgroundColor: canSave ? "#6B5CF6" : "#D1C9FF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                    {t("evalSaveBtn")}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
