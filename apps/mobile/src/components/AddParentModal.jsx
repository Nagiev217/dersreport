import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { X, Check, UserPlus, Users } from "lucide-react-native";
import { useParentsStore } from "@/utils/parents/store";
import { useT } from "@/utils/i18n";

const AVATAR_COLORS = [
  "#C084FC","#A5B4FC","#FDA4AF","#6EE7B7","#818CF8","#FDE68A","#67E8F9","#FCA5A5",
];

const TAB = { EXISTING: "existing", NEW: "new" };

export default function AddParentModal({ visible, onClose, onConfirm, excludeParentIds = [] }) {
  const insets = useSafeAreaInsets();
  const { t, tName } = useT();
  const { parents, addParent } = useParentsStore();
  const [tab, setTab] = useState(TAB.EXISTING);

  // New parent form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Existing parent selection
  const [selectedId, setSelectedId] = useState(null);

  const availableParents = parents.filter(
    (p) => !excludeParentIds.includes(p.id)
  );

  const resetNew = () => {
    setName("");
    setPhone("");
    setEmail("");
    setSelectedId(null);
  };

  const handleClose = () => {
    resetNew();
    onClose();
  };

  const handleConfirm = () => {
    if (tab === TAB.EXISTING) {
      if (!selectedId) return;
      const parent = parents.find((p) => p.id === selectedId);
      onConfirm(parent);
    } else {
      if (!name.trim()) return;
      const newParent = {
        id: `parent-${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        appUserId: null,
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        studentIds: [],
        createdAt: Date.now(),
      };
      addParent(newParent);
      onConfirm(newParent);
    }
    resetNew();
    onClose();
  };

  const canConfirm =
    (tab === TAB.EXISTING && !!selectedId) ||
    (tab === TAB.NEW && name.trim().length > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        onPress={handleClose}
      >
        <Pressable onPress={() => {}}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 20,
                paddingBottom: insets.bottom + 16,
                paddingTop: 8,
                maxHeight: 560,
              }}
            >
              {/* Drag handle */}
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
              </View>

              {/* Header */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
                  {t("roleParentTitle")}
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={16} color="#3C3C43" />
                </TouchableOpacity>
              </View>

              {/* Tabs */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "#F2F2F7",
                  borderRadius: 12,
                  padding: 3,
                  marginBottom: 16,
                }}
              >
                {[
                  { key: TAB.EXISTING, label: t("addParentTabSelect"), Icon: Users },
                  { key: TAB.NEW, label: t("addParentTabCreate"), Icon: UserPlus },
                ].map(({ key, label, Icon }) => (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.8}
                    onPress={() => { setTab(key); setSelectedId(null); }}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      paddingVertical: 9,
                      borderRadius: 10,
                      backgroundColor: tab === key ? "#FFFFFF" : "transparent",
                    }}
                  >
                    <Icon size={14} color={tab === key ? "#6B5CF6" : "#8E8E93"} />
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: tab === key ? "Inter_600SemiBold" : "Inter_400Regular",
                        color: tab === key ? "#6B5CF6" : "#8E8E93",
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tab content */}
              {tab === TAB.EXISTING ? (
                availableParents.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 32 }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center" }}>
                      {t("addParentNoAvail")}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={availableParents}
                    keyExtractor={(item) => item.id}
                    style={{ maxHeight: 250 }}
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
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              backgroundColor: item.avatarColor ?? "#6B5CF6",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" }}>
                              {tName(item.name)?.[0] ?? "?"}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }}>
                              {tName(item.name)}
                            </Text>
                            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
                              {item.phone || item.email || "—"}
                            </Text>
                          </View>
                          <View
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              borderWidth: 2,
                              borderColor: checked ? "#6B5CF6" : "#D1D1D6",
                              backgroundColor: checked ? "#6B5CF6" : "transparent",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {checked && <Check size={13} color="#FFF" />}
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                )
              ) : (
                <View style={{ gap: 10 }}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t("addParentNamePh")}
                    placeholderTextColor="#C7C7CC"
                    style={{ height: 48, borderRadius: 12, backgroundColor: "#F2F2F7", paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E" }}
                  />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+994 50 000 00 00"
                    placeholderTextColor="#C7C7CC"
                    keyboardType="phone-pad"
                    style={{ height: 48, borderRadius: 12, backgroundColor: "#F2F2F7", paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E" }}
                  />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@example.com"
                    placeholderTextColor="#C7C7CC"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{ height: 48, borderRadius: 12, backgroundColor: "#F2F2F7", paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E" }}
                  />
                </View>
              )}

              {/* Confirm */}
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={!canConfirm}
                activeOpacity={0.85}
                style={{
                  marginTop: 16,
                  height: 50,
                  borderRadius: 14,
                  backgroundColor: canConfirm ? "#6B5CF6" : "#D1C9FF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
                  {tab === TAB.EXISTING ? t("addParentSelectBtn") : t("addParentCreateBtn")}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
