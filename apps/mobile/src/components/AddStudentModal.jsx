import {
  View,
  Text,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { X, ChevronDown, Users, UserPlus, Check, ArrowLeft } from "lucide-react-native";
import { useStudentsStore } from "@/utils/students/store";
import { useParentsStore } from "@/utils/parents/store";
import { useVipStore, FREE_LIMIT } from "@/utils/vip/store";
import { useT } from "@/utils/i18n";

const LESSON_TYPES = ["IELTS", "SAT", "General", "Английский"];
const PAYMENT_TYPES = ["Почасовая", "За урок", "Месячная"];
const AVATAR_COLORS = ["#C084FC", "#A5B4FC", "#FDA4AF", "#6EE7B7", "#818CF8", "#FDE68A"];
const PARENT_COLORS = ["#C084FC", "#A5B4FC", "#FDA4AF", "#6EE7B7", "#818CF8", "#FDE68A", "#67E8F9", "#FCA5A5"];

const TAB = { EXISTING: "existing", NEW: "new" };

// ─── Inline parent panel (no nested Modal) ────────────────────────────────────
function ParentPanel({ onBack, onConfirm, excludeIds }) {
  const { parents, addParent } = useParentsStore();
  const { t, tName } = useT();
  const [tab, setTab] = useState(TAB.EXISTING);
  const [selectedId, setSelectedId] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const available = parents.filter((p) => !excludeIds.includes(p.id));

  const canConfirm =
    (tab === TAB.EXISTING && !!selectedId) ||
    (tab === TAB.NEW && name.trim().length > 0);

  const handleConfirm = () => {
    if (tab === TAB.EXISTING) {
      const parent = parents.find((p) => p.id === selectedId);
      if (parent) onConfirm(parent);
    } else {
      const newParent = {
        id: `parent-${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        appUserId: null,
        avatarColor: PARENT_COLORS[Math.floor(Math.random() * PARENT_COLORS.length)],
        studentIds: [],
        createdAt: Date.now(),
      };
      addParent(newParent);
      onConfirm(newParent);
    }
    onBack();
  };

  return (
    <>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 8 }}>
        <TouchableOpacity
          onPress={onBack}
          style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}
        >
          <ArrowLeft size={16} color="#3C3C43" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E", flex: 1 }}>
          {t("addParentBtn")}
        </Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", backgroundColor: "#F2F2F7", borderRadius: 12, padding: 3, marginBottom: 14 }}>
        {[
          { key: TAB.EXISTING, label: t("addStudentParentSelect"), Icon: Users },
          { key: TAB.NEW, label: t("addStudentParentCreate"), Icon: UserPlus },
        ].map(({ key, label, Icon }) => (
          <TouchableOpacity
            key={key}
            activeOpacity={0.8}
            onPress={() => { setTab(key); setSelectedId(null); }}
            style={{
              flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
              gap: 5, paddingVertical: 9, borderRadius: 10,
              backgroundColor: tab === key ? "#FFFFFF" : "transparent",
            }}
          >
            <Icon size={14} color={tab === key ? "#6B5CF6" : "#8E8E93"} />
            <Text style={{ fontSize: 14, fontFamily: tab === key ? "Inter_600SemiBold" : "Inter_400Regular", color: tab === key ? "#6B5CF6" : "#8E8E93" }}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {tab === TAB.EXISTING ? (
        available.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 28 }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center", lineHeight: 20 }}>
              {t("addStudentNoParents")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={available}
            keyExtractor={(p) => p.id}
            style={{ maxHeight: 220 }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 0.5, backgroundColor: "#F2F2F7" }} />}
            renderItem={({ item }) => {
              const checked = selectedId === item.id;
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSelectedId(checked ? null : item.id)}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 11, gap: 12 }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.avatarColor ?? "#6B5CF6", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" }}>{tName(item.name)?.[0] ?? "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}>{tName(item.name)}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{item.phone || item.email || "—"}</Text>
                  </View>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: checked ? "#6B5CF6" : "#D1D1D6", backgroundColor: checked ? "#6B5CF6" : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {checked && <Check size={13} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )
      ) : (
        <View style={{ gap: 10 }}>
          <TextInput value={name} onChangeText={setName} placeholder={t("addStudentParentName")} placeholderTextColor="#C7C7CC"
            style={{ height: 48, borderRadius: 12, backgroundColor: "#F2F2F7", paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E" }} />
          <TextInput value={phone} onChangeText={setPhone} placeholder="+994 50 000 00 00" placeholderTextColor="#C7C7CC" keyboardType="phone-pad"
            style={{ height: 48, borderRadius: 12, backgroundColor: "#F2F2F7", paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E" }} />
          <TextInput value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor="#C7C7CC" keyboardType="email-address" autoCapitalize="none"
            style={{ height: 48, borderRadius: 12, backgroundColor: "#F2F2F7", paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E" }} />
        </View>
      )}

      <TouchableOpacity
        onPress={handleConfirm}
        disabled={!canConfirm}
        activeOpacity={0.85}
        style={{ marginTop: 16, height: 50, borderRadius: 14, backgroundColor: canConfirm ? "#6B5CF6" : "#D1C9FF", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
          {tab === TAB.EXISTING ? t("addStudentSelectParent") : t("addStudentCreateLink")}
        </Text>
      </TouchableOpacity>
    </>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function AddStudentModal({ visible, onClose, onAdd }) {
  const insets = useSafeAreaInsets();
  const { t, tName } = useT();
  const { students, addStudent } = useStudentsStore();
  const { linkStudent } = useParentsStore();
  const { isVip } = useVipStore();

  const LESSON_TYPE_LABELS = {
    "IELTS": "IELTS",
    "SAT": "SAT",
    "General": "General",
    "Английский": t("addLessonSubjectEnglish"),
  };
  const PAYMENT_TYPE_LABELS = {
    "Почасовая": t("addStudentPayHourly"),
    "За урок":   t("addStudentPayLesson"),
    "Месячная":  t("addStudentPayMonthly"),
  };

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lessonType, setLessonType] = useState("IELTS");
  const [paymentType, setPaymentType] = useState("Почасовая");
  const [rate, setRate] = useState("");
  const [showLessonPicker, setShowLessonPicker] = useState(false);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [linkedParents, setLinkedParents] = useState([]);
  const [showParentPanel, setShowParentPanel] = useState(false);

  const resetForm = () => {
    setName(""); setPhone(""); setLessonType("IELTS");
    setPaymentType("Почасовая"); setRate(""); setLinkedParents([]);
    setShowLessonPicker(false); setShowPaymentPicker(false);
    setShowParentPanel(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleAdd = () => {
    if (!name.trim()) return;
    if (students.length >= FREE_LIMIT && !isVip) { onClose(); return; }
    const now = Date.now();
    const newId = String(now);
    const newStudent = {
      id: newId,
      name: name.trim(),
      phone: phone.trim(),
      subject: "Английский",
      type: lessonType,
      paymentType,
      rate: rate ? parseFloat(rate) : 0,
      score: 0,
      maxScore: 10,
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      nextLesson: "—",
      parentIds: linkedParents.map((p) => p.id),
      lessonsCompleted: 0,
      lessonsRemaining: 0,
      attendance: 100,
      skills: [],
      lessonHistory: [],
      createdAt: now,
      updatedAt: now,
    };
    addStudent(newStudent);
    if (onAdd) onAdd(newStudent);
    linkedParents.forEach((p) => linkStudent(p.id, newId));
    resetForm();
    onClose();
  };

  const isNameValid = name.trim().length > 0;
  const { height: screenH } = useWindowDimensions();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "flex-end" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]} onPress={handleClose} />
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 16,
            paddingTop: 8,
            maxHeight: screenH * 0.78,
          }}
        >
            {/* Drag handle */}
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
            </View>

            {showParentPanel ? (
              // ── Parent selection panel ──────────────────────────────────
              <ParentPanel
                onBack={() => setShowParentPanel(false)}
                onConfirm={(parent) => {
                  if (!linkedParents.find((p) => p.id === parent.id))
                    setLinkedParents((prev) => [...prev, parent]);
                }}
                excludeIds={linkedParents.map((p) => p.id)}
              />
            ) : (
              // ── Main student form ───────────────────────────────────────
              <>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>{t("addStudentTitle")}</Text>
                  <TouchableOpacity onPress={handleClose}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
                    <X size={16} color="#3C3C43" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* Name */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={labelStyle}>{t("addStudentName")}</Text>
                    <TextInput value={name} onChangeText={setName} placeholder={t("addStudentNameHint")}
                      placeholderTextColor="#C7C7CC" returnKeyType="next"
                      style={inputStyle} />
                  </View>

                  {/* Phone */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={labelStyle}>{t("addStudentPhone")}</Text>
                    <TextInput value={phone} onChangeText={setPhone} placeholder="+994 50 000 00 00"
                      placeholderTextColor="#C7C7CC" keyboardType="phone-pad"
                      style={inputStyle} />
                  </View>

                  {/* Lesson type + Payment */}
                  <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={labelStyle}>{t("addStudentLessonType")}</Text>
                      <TouchableOpacity
                        onPress={() => { setShowLessonPicker(!showLessonPicker); setShowPaymentPicker(false); }}
                        style={[inputStyle, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14 }]}
                      >
                        <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E" }}>{LESSON_TYPE_LABELS[lessonType] ?? lessonType}</Text>
                        <ChevronDown size={16} color="#8E8E93" />
                      </TouchableOpacity>
                      {showLessonPicker && (
                        <View style={dropdownStyle}>
                          {LESSON_TYPES.map((lt, i) => (
                            <TouchableOpacity key={lt} onPress={() => { setLessonType(lt); setShowLessonPicker(false); }}
                              style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: i < LESSON_TYPES.length - 1 ? 0.5 : 0, borderBottomColor: "#E5E5EA" }}>
                              <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: lt === lessonType ? "#6B5CF6" : "#1C1C1E" }}>{LESSON_TYPE_LABELS[lt] ?? lt}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={labelStyle}>{t("addStudentPayment")}</Text>
                      <TouchableOpacity
                        onPress={() => { setShowPaymentPicker(!showPaymentPicker); setShowLessonPicker(false); }}
                        style={[inputStyle, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14 }]}
                      >
                        <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E" }}>{PAYMENT_TYPE_LABELS[paymentType] ?? paymentType}</Text>
                        <ChevronDown size={16} color="#8E8E93" />
                      </TouchableOpacity>
                      {showPaymentPicker && (
                        <View style={dropdownStyle}>
                          {PAYMENT_TYPES.map((pt, i) => (
                            <TouchableOpacity key={pt} onPress={() => { setPaymentType(pt); setShowPaymentPicker(false); }}
                              style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: i < PAYMENT_TYPES.length - 1 ? 0.5 : 0, borderBottomColor: "#E5E5EA" }}>
                              <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: pt === paymentType ? "#6B5CF6" : "#1C1C1E" }}>{PAYMENT_TYPE_LABELS[pt] ?? pt}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Rate */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={labelStyle}>{t("addStudentRateHint")}</Text>
                    <TextInput value={rate} onChangeText={setRate} placeholder="0"
                      placeholderTextColor="#C7C7CC" keyboardType="numeric"
                      style={inputStyle} />
                  </View>

                  {/* Parents */}
                  <View style={{ marginBottom: 24 }}>
                    <Text style={labelStyle}>{t("addStudentParents")}</Text>

                    {linkedParents.length > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        {linkedParents.map((parent) => (
                          <View key={parent.id} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#EEF0FF", borderRadius: 20 }}>
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: parent.avatarColor ?? "#6B5CF6", alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFF" }}>{tName(parent.name)?.[0]}</Text>
                            </View>
                            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#6B5CF6" }}>{tName(parent.name)}</Text>
                            <TouchableOpacity onPress={() => setLinkedParents((prev) => prev.filter((p) => p.id !== parent.id))}>
                              <X size={13} color="#6B5CF6" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity activeOpacity={0.8} onPress={() => setShowParentPanel(true)}
                      style={{ height: 48, borderRadius: 12, backgroundColor: "#F2F2F7", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: "#E5E5EA", borderStyle: "dashed" }}>
                      <Users size={16} color="#8E8E93" />
                      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
                        {linkedParents.length === 0 ? t("addStudentLinkParent") : t("addStudentAddMore")}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Submit */}
                  <TouchableOpacity onPress={handleAdd} disabled={!isNameValid} activeOpacity={0.85}
                    style={{ height: 52, borderRadius: 14, backgroundColor: isNameValid ? "#6B5CF6" : "#D1C9FF", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                    <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("addStudentBtn")}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const labelStyle = { fontSize: 13, fontFamily: "Inter_500Medium", color: "#3C3C43", marginBottom: 6 };
const inputStyle = { height: 48, borderRadius: 12, backgroundColor: "#F2F2F7", paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E" };
const dropdownStyle = { position: "absolute", top: 74, left: 0, right: 0, backgroundColor: "#FFFFFF", borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8, zIndex: 100 };
