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
import { X, Target, Flag } from "lucide-react-native";
import { useProgressStore } from "@/utils/progress/store";
import { useT } from "@/utils/i18n";

const PROGRESS_PRESETS = [0, 25, 50, 75, 100];

export default function AddGoalModal({ visible, onClose, studentId, editGoal }) {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { addGoal, updateGoal } = useProgressStore();

  const STATUS_OPTIONS = [
    { value: "active",    label: t("goalStatusActive"), color: "#22C55E", bg: "#ECFDF5" },
    { value: "paused",    label: t("goalStatusPaused"), color: "#F59E0B", bg: "#FFFBEB" },
    { value: "completed", label: t("goalStatusDone"),   color: "#6B5CF6", bg: "#EEF0FF" },
  ];

  const isEdit = Boolean(editGoal);

  const [title, setTitle] = useState(editGoal?.title ?? "");
  const [description, setDescription] = useState(editGoal?.description ?? "");
  const [progress, setProgress] = useState(editGoal?.progress ?? 0);
  const [progressText, setProgressText] = useState(String(editGoal?.progress ?? 0));
  const [deadline, setDeadline] = useState(editGoal?.deadline ?? "");
  const [status, setStatus] = useState(editGoal?.status ?? "active");

  const reset = () => {
    setTitle(editGoal?.title ?? "");
    setDescription(editGoal?.description ?? "");
    setProgress(editGoal?.progress ?? 0);
    setProgressText(String(editGoal?.progress ?? 0));
    setDeadline(editGoal?.deadline ?? "");
    setStatus(editGoal?.status ?? "active");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleProgressText = (text) => {
    setProgressText(text);
    const n = parseInt(text);
    if (!isNaN(n)) setProgress(Math.min(100, Math.max(0, n)));
  };

  const canSave = title.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const finalProgress = Math.min(100, Math.max(0, progress));

    if (isEdit) {
      updateGoal(editGoal.id, {
        title: title.trim(),
        description: description.trim(),
        progress: finalProgress,
        deadline,
        status,
      });
    } else {
      addGoal({
        id: `goal-${studentId}-${Date.now()}`,
        studentId,
        title: title.trim(),
        description: description.trim(),
        progress: finalProgress,
        deadline,
        status,
        createdAt: Date.now(),
      });
    }

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
              {/* Handle */}
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
              </View>

              {/* Header */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center" }}>
                    <Target size={18} color="#6B5CF6" />
                  </View>
                  <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
                    {isEdit ? t("goalEditTitle") : t("goalNewTitle")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={16} color="#3C3C43" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Title */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43", marginBottom: 6 }}>
                    {t("goalNameLabel")}
                  </Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder={t("goalNameHint")}
                    placeholderTextColor="#C7C7CC"
                    style={{
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: "#F2F2F7",
                      paddingHorizontal: 14,
                      fontSize: 15,
                      fontFamily: "Inter_400Regular",
                      color: "#1C1C1E",
                    }}
                  />
                </View>

                {/* Description */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43", marginBottom: 6 }}>
                    {t("goalDescLabel")}
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder={t("goalDescHint")}
                    placeholderTextColor="#C7C7CC"
                    multiline
                    numberOfLines={3}
                    style={{
                      borderRadius: 12,
                      backgroundColor: "#F2F2F7",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 14,
                      fontFamily: "Inter_400Regular",
                      color: "#1C1C1E",
                      minHeight: 76,
                      textAlignVertical: "top",
                    }}
                  />
                </View>

                {/* Progress */}
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43" }}>
                      {t("goalProgressLabel")}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <TextInput
                        value={progressText}
                        onChangeText={handleProgressText}
                        keyboardType="numeric"
                        maxLength={3}
                        style={{
                          width: 48,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: "#EEF0FF",
                          textAlign: "center",
                          fontSize: 14,
                          fontFamily: "Inter_700Bold",
                          color: "#6B5CF6",
                        }}
                      />
                      <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: "#8E8E93" }}>%</Text>
                    </View>
                  </View>

                  {/* Progress bar visual */}
                  <View style={{ height: 8, backgroundColor: "#F2F2F7", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                    <View style={{ height: 8, width: `${progress}%`, backgroundColor: "#6B5CF6", borderRadius: 4 }} />
                  </View>

                  {/* Quick presets */}
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {PROGRESS_PRESETS.map((p) => (
                      <TouchableOpacity
                        key={p}
                        onPress={() => { setProgress(p); setProgressText(String(p)); }}
                        style={{
                          flex: 1,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: progress === p ? "#6B5CF6" : "#F2F2F7",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: progress === p ? "#FFFFFF" : "#8E8E93" }}>
                          {p}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Deadline */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43", marginBottom: 6 }}>
                    {t("goalDeadlineLabel")}
                  </Text>
                  <TextInput
                    value={deadline}
                    onChangeText={setDeadline}
                    placeholder="2026-09-01"
                    placeholderTextColor="#C7C7CC"
                    style={{
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: "#F2F2F7",
                      paddingHorizontal: 14,
                      fontSize: 15,
                      fontFamily: "Inter_400Regular",
                      color: "#1C1C1E",
                    }}
                  />
                </View>

                {/* Status */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43", marginBottom: 8 }}>
                    {t("goalStatusLabel")}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {STATUS_OPTIONS.map((opt) => {
                      const active = status === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => setStatus(opt.value)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 12,
                            backgroundColor: active ? opt.bg : "#F2F2F7",
                            alignItems: "center",
                            borderWidth: active ? 1.5 : 0,
                            borderColor: opt.color,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontFamily: active ? "Inter_700Bold" : "Inter_400Regular", color: active ? opt.color : "#8E8E93" }}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

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
                    {isEdit ? t("goalSaveBtn") : t("goalCreateBtn")}
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
