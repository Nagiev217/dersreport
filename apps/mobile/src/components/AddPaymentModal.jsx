import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Wallet, Banknote, CreditCard, ArrowRightLeft, Trash2, ChevronDown } from "lucide-react-native";
import { usePaymentsStore } from "@/utils/payments/store";
import { useStudentsStore } from "@/utils/students/store";
import { useT } from "@/utils/i18n";

// METHOD_OPTIONS built inside component (needs t())

const pad = (n) => String(n).padStart(2, "0");

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export default function AddPaymentModal({
  visible,
  onClose,
  studentId,
  studentName,
  defaultAmount = 0,
  defaultPeriod,
  editPayment,
}) {
  const insets = useSafeAreaInsets();
  const { t, months } = useT();
  const MONTHS_FULL = months(false);
  const { addPayment, updatePayment, deletePayment } = usePaymentsStore();
  const { students } = useStudentsStore();

  const METHOD_OPTIONS = [
    { value: "cash",     label: t("addPayCash"),     Icon: Banknote       },
    { value: "card",     label: t("addPayCard"),     Icon: CreditCard     },
    { value: "transfer", label: t("addPayTransfer"), Icon: ArrowRightLeft },
  ];

  const isEdit = Boolean(editPayment);
  const hasPreselectedStudent = Boolean(studentId);

  const [pickedStudentId,   setPickedStudentId]   = useState(studentId ?? null);
  const [pickedStudentName, setPickedStudentName] = useState(studentName ?? null);
  const [studentDropOpen,   setStudentDropOpen]   = useState(false);

  const [amountText, setAmountText] = useState("");
  const [date, setDate] = useState(todayStr());
  const [period, setPeriod] = useState(defaultPeriod ?? currentPeriod());
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (editPayment) {
      setPickedStudentId(editPayment.studentId);
      setPickedStudentName(editPayment.studentName);
      setAmountText(String(editPayment.amount));
      setDate(editPayment.date);
      setPeriod(editPayment.period);
      setMethod(editPayment.method ?? "cash");
      setNote(editPayment.note ?? "");
    } else {
      setPickedStudentId(studentId ?? null);
      setPickedStudentName(studentName ?? null);
      setAmountText(defaultAmount > 0 ? String(defaultAmount) : "");
      setDate(todayStr());
      setPeriod(defaultPeriod ?? currentPeriod());
      setMethod("cash");
      setNote("");
      setStudentDropOpen(false);
    }
  }, [visible, editPayment, defaultAmount, defaultPeriod, studentId, studentName]);

  const amount = parseFloat(amountText) || 0;
  const canSave =
    pickedStudentId &&
    amount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^\d{4}-\d{2}$/.test(period);

  const handleSave = () => {
    if (!canSave) return;
    if (isEdit) {
      updatePayment(editPayment.id, { amount, date, period, method, note: note.trim() });
    } else {
      addPayment({
        id: `pay-${pickedStudentId}-${Date.now()}`,
        studentId:   pickedStudentId,
        studentName: pickedStudentName,
        amount,
        date,
        period,
        method,
        note: note.trim(),
        createdAt: Date.now(),
      });
    }
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(t("addPayDeleteTitle"), t("addPayDeleteMsg"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => { deletePayment(editPayment.id); onClose(); },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" }}
        onPress={onClose}
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
              }}
            >
              {/* Handle */}
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
              </View>

              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: "#ECFDF5",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Wallet size={18} color="#10B981" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 19, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
                      {isEdit ? t("editPayTitle") : t("addPayTitle")}
                    </Text>
                    {pickedStudentName && (
                      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
                        {pickedStudentName}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {isEdit && (
                    <TouchableOpacity
                      onPress={handleDelete}
                      style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: "#FEF2F2",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Trash2 size={15} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={onClose}
                    style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: "#F2F2F7",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={16} color="#3C3C43" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Student picker — shown only when not pre-selected */}
                {!hasPreselectedStudent && !isEdit && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#3C3C43", marginBottom: 8 }}>
                      {t("addPayStudent")}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setStudentDropOpen(!studentDropOpen)}
                      style={{
                        flexDirection: "row", alignItems: "center",
                        backgroundColor: "#F2F2F7", borderRadius: 14, padding: 14,
                        borderWidth: studentDropOpen ? 1.5 : 0,
                        borderColor: studentDropOpen ? "#10B981" : "transparent",
                      }}
                    >
                      {pickedStudentName ? (
                        <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: "#1C1C1E" }}>
                          {pickedStudentName}
                        </Text>
                      ) : (
                        <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#C7C7CC" }}>
                          {t("addPaySelectStudent")}
                        </Text>
                      )}
                      <ChevronDown size={18} color="#8E8E93" />
                    </TouchableOpacity>
                    {studentDropOpen && (
                      <View style={{ backgroundColor: "#F8FFF8", borderRadius: 14, marginTop: 4, overflow: "hidden", borderWidth: 1, borderColor: "#D1FAE5" }}>
                        {students.map((s, i) => {
                          const sName = s.name ?? s.fullName ?? t("studentDefault");
                          const selected = pickedStudentId === s.id;
                          return (
                            <TouchableOpacity
                              key={s.id}
                              activeOpacity={0.7}
                              onPress={() => {
                                setPickedStudentId(s.id);
                                setPickedStudentName(sName);
                                setStudentDropOpen(false);
                              }}
                              style={{
                                flexDirection: "row", alignItems: "center", gap: 10, padding: 12,
                                borderBottomWidth: i < students.length - 1 ? 0.5 : 0,
                                borderBottomColor: "#D1FAE5",
                                backgroundColor: selected ? "#ECFDF5" : "transparent",
                              }}
                            >
                              <Text style={{ fontSize: 18 }}>{s.emoji ?? "🧑"}</Text>
                              <Text style={{ fontSize: 14, fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular", color: selected ? "#10B981" : "#1C1C1E" }}>
                                {sName}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

                {/* Amount — big input */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#3C3C43", marginBottom: 8 }}>
                    {t("addPayAmount")}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      height: 60,
                      borderRadius: 16,
                      backgroundColor: "#F2F2F7",
                      paddingHorizontal: 18,
                    }}
                  >
                    <TextInput
                      value={amountText}
                      onChangeText={setAmountText}
                      placeholder="0"
                      placeholderTextColor="#C7C7CC"
                      keyboardType="numeric"
                      style={{
                        flex: 1,
                        fontSize: 28,
                        fontFamily: "Inter_700Bold",
                        color: "#1C1C1E",
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 22,
                        fontFamily: "Inter_700Bold",
                        color: "#8E8E93",
                      }}
                    >
                      ₼
                    </Text>
                  </View>
                </View>

                {/* Method */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#3C3C43", marginBottom: 8 }}>
                    {t("addPayMethod")}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {METHOD_OPTIONS.map(({ value, label, Icon }) => {
                      const sel = method === value;
                      return (
                        <TouchableOpacity
                          key={value}
                          onPress={() => setMethod(value)}
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 12,
                            backgroundColor: sel ? "#10B981" : "#F2F2F7",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Icon size={18} color={sel ? "#FFFFFF" : "#8E8E93"} />
                          <Text
                            style={{
                              fontSize: 11,
                              fontFamily: sel ? "Inter_700Bold" : "Inter_400Regular",
                              color: sel ? "#FFFFFF" : "#8E8E93",
                            }}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Date + Period row */}
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#3C3C43", marginBottom: 8 }}>
                      {t("addPayDate")}
                    </Text>
                    <TextInput
                      value={date}
                      onChangeText={setDate}
                      placeholder={t("addPayDateFmt")}
                      placeholderTextColor="#C7C7CC"
                      keyboardType="numeric"
                      maxLength={10}
                      style={{
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: "#F2F2F7",
                        paddingHorizontal: 14,
                        fontSize: 14,
                        fontFamily: "Inter_500Medium",
                        color: "#1C1C1E",
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#3C3C43", marginBottom: 8 }}>
                      {t("addPayPeriod")}
                    </Text>
                    <TextInput
                      value={period}
                      onChangeText={setPeriod}
                      placeholder={t("addPayPeriodFmt")}
                      placeholderTextColor="#C7C7CC"
                      keyboardType="numeric"
                      maxLength={7}
                      style={{
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: "#F2F2F7",
                        paddingHorizontal: 14,
                        fontSize: 14,
                        fontFamily: "Inter_500Medium",
                        color: "#1C1C1E",
                      }}
                    />
                    {/^\d{4}-\d{2}$/.test(period) && (() => {
                      const [y, m] = period.split("-").map(Number);
                      return (
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#10B981", marginTop: 4, paddingHorizontal: 2 }}>
                          {MONTHS_FULL[m - 1]} {y}
                        </Text>
                      );
                    })()}
                  </View>
                </View>

                {/* Note */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#3C3C43", marginBottom: 8 }}>
                    {t("addPayNote")}
                  </Text>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder={t("addPayNoteHint")}
                    placeholderTextColor="#C7C7CC"
                    multiline
                    style={{
                      borderRadius: 12,
                      backgroundColor: "#F2F2F7",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 14,
                      fontFamily: "Inter_400Regular",
                      color: "#1C1C1E",
                      minHeight: 72,
                      textAlignVertical: "top",
                    }}
                  />
                </View>

                {/* Save */}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!canSave}
                  activeOpacity={0.85}
                  style={{
                    height: 52,
                    borderRadius: 14,
                    backgroundColor: canSave ? "#10B981" : "#A7F3D0",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                    {isEdit ? t("addPaySaveEdit") : `${t("addPaySaveBtn")}${amount > 0 ? ` ${amount} ₼` : ""}`}
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
