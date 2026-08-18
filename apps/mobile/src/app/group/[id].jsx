import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { useState, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft, Pencil, UserPlus, Trash2, Archive,
  ChevronRight, X, Check, RotateCcw,
} from "lucide-react-native";
import { useGroupsStore } from "@/utils/groups/store";
import { useStudentsStore } from "@/utils/students/store";
import { useProgressStore } from "@/utils/progress/store";
import { useT } from "@/utils/i18n";
import PressableScale from "@/components/PressableScale";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT   = "#111827";
const SUB    = "#8E93A1";
const CARD   = "#FFFFFF";
const BORDER = "#E5E9F2";
const GREEN  = "#22C55E";
const AMBER  = "#D97706";

const EMOJI_OPTS = [
  { emoji: "📚", color: "#EDEDF9" },
  { emoji: "📐", color: "#E8F0FE" },
  { emoji: "💻", color: "#E6F4EA" },
  { emoji: "📖", color: "#FEF3E8" },
  { emoji: "🔬", color: "#EDF9F0" },
  { emoji: "🧪", color: "#F0F0F0" },
  { emoji: "🌍", color: "#E8F5E9" },
  { emoji: "🎨", color: "#FDE8EE" },
  { emoji: "🔢", color: "#E8F0FE" },
  { emoji: "⚗️", color: "#F5E8FD" },
];

// ─── helpers ─────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 9) return GREEN;
  if (s >= 8) return BLUE;
  if (s >= 7) return AMBER;
  return "#EF4444";
}

const PALETTE = [BLUE, INDIGO, GREEN, AMBER, "#EF4444", "#06B6D4", "#EC4899", "#0EA5E9"];
function avatarBg(name = "", override) {
  if (override) return override;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}
// ─── Student row ─────────────────────────────────────────────────────────────
function StudentRow({ student, score, onPress, onLongPress, showBorder }) {
  const { tSubject, tName } = useT();
  const bg     = avatarBg(student.name, student.avatarColor);
  const sColor = score > 0 ? scoreColor(score) : SUB;
  const displayName = tName(student.name);
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
      delayLongPress={400}
      style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 16, paddingVertical: 15,
        borderBottomWidth: showBorder ? 1 : 0,
        borderBottomColor: BORDER,
      }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" }}>
          {initials(displayName)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 3 }}>
          {displayName}
        </Text>
        {student.type ? (
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>
            {tSubject(student.type)}
          </Text>
        ) : null}
      </View>
      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: sColor, marginRight: 4 }}>
        {score > 0 ? `${score.toFixed(1)}/10` : "—"}
      </Text>
      <ChevronRight size={16} color={SUB} strokeWidth={2} />
    </TouchableOpacity>
  );
}

// ─── Edit group modal ─────────────────────────────────────────────────────────
function EditGroupModal({ visible, group, onSave, onClose }) {
  const { t } = useT();
  const [name,  setName]  = useState(group?.name  ?? "");
  const [emoji, setEmoji] = useState(
    EMOJI_OPTS.find((o) => o.emoji === group?.emoji) ?? EMOJI_OPTS[0]
  );

  // reset when group changes
  useMemo(() => {
    setName(group?.name ?? "");
    setEmoji(EMOJI_OPTS.find((o) => o.emoji === group?.emoji) ?? EMOJI_OPTS[0]);
  }, [group?.id]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor: CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: "center", marginBottom: 20 }} />
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 22 }}>
            <Text style={{ flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT }}>{t("groupsEditTitle")}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={SUB} strokeWidth={2} /></TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 8 }}>{t("groupsNameLabel")}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("groupsNameHint")}
            placeholderTextColor={SUB}
            style={{ borderWidth: 1.5, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, fontFamily: "Inter_400Regular", color: TEXT, marginBottom: 20 }}
          />

          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 10 }}>{t("groupsIconLabel")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
            {EMOJI_OPTS.map((opt) => {
              const sel = opt.emoji === emoji.emoji;
              return (
                <TouchableOpacity
                  key={opt.emoji}
                  onPress={() => setEmoji(opt)}
                  activeOpacity={0.75}
                  style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: opt.color, alignItems: "center", justifyContent: "center", borderWidth: sel ? 2.5 : 0, borderColor: sel ? INDIGO : "transparent" }}
                >
                  <Text style={{ fontSize: 24 }}>{opt.emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <PressableScale
            onPress={() => name.trim() && onSave({ name: name.trim(), emoji: emoji.emoji, emojiColor: emoji.color })}
            scaleTo={0.98}
            style={{ borderRadius: 16, overflow: "hidden" }}
          >
            {name.trim() ? (
              <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 15, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" }}>{t("save")}</Text>
              </LinearGradient>
            ) : (
              <View style={{ backgroundColor: INDIGO_50, paddingVertical: 15, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#B4B9D9" }}>{t("save")}</Text>
              </View>
            )}
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add students modal (multi-select) ───────────────────────────────────────
function AddStudentsModal({ visible, students, onAdd, onClose }) {
  const { t, tSubject, tName } = useT();
  const [selected, setSelected] = useState([]);

  function toggle(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleAdd() {
    onAdd(selected);
    setSelected([]);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(17,24,39,0.4)" }}>
        <View style={{ backgroundColor: CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "75%", paddingBottom: 34 }}>
          {/* Handle */}
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: "center", marginTop: 12, marginBottom: 4 }} />

          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 }}>
            <Text style={{ flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{t("groupsAddStudentsTitle")}</Text>
            <TouchableOpacity onPress={() => { setSelected([]); onClose(); }}>
              <X size={20} color={SUB} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {students.length === 0 ? (
            <View style={{ alignItems: "center", padding: 40 }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>
                {t("groupsAllInGroup")}
              </Text>
            </View>
          ) : (
            <>
              <ScrollView style={{ paddingHorizontal: 20 }}>
                <View style={{ borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
                  {students.map((s, i) => {
                    const bg   = avatarBg(s.name, s.avatarColor);
                    const sDisplayName = tName(s.name);
                    const isSel = selected.includes(s.id);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => toggle(s.id)}
                        activeOpacity={0.75}
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 12,
                          paddingHorizontal: 14, paddingVertical: 13,
                          borderBottomWidth: i < students.length - 1 ? 1 : 0,
                          borderBottomColor: BORDER,
                          backgroundColor: isSel ? INDIGO_50 : CARD,
                        }}
                      >
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" }}>
                            {initials(sDisplayName)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT }}>{sDisplayName}</Text>
                          {s.type ? <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>{tSubject(s.type)}</Text> : null}
                        </View>
                        <View style={{
                          width: 24, height: 24, borderRadius: 12,
                          backgroundColor: isSel ? INDIGO : "transparent",
                          borderWidth: 2, borderColor: isSel ? INDIGO : BORDER,
                          alignItems: "center", justifyContent: "center",
                        }}>
                          {isSel && <Check size={13} color="#FFF" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                <PressableScale onPress={handleAdd} scaleTo={0.98} style={{ borderRadius: 16, overflow: "hidden" }}>
                  {selected.length ? (
                    <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 15, alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" }}>{t("groupsAddBtn", { n: selected.length })}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={{ backgroundColor: INDIGO_50, paddingVertical: 15, alignItems: "center" }}>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#B4B9D9" }}>{t("groupsSelectStudents")}</Text>
                    </View>
                  )}
                </PressableScale>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function GroupDetailScreen() {
  const { id }     = useLocalSearchParams();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const { t, tp, tName } = useT();

  const { groups, updateGroup, deleteGroup, archiveGroup, unarchiveGroup, addStudentToGroup, removeStudentFromGroup } = useGroupsStore();
  const { students }    = useStudentsStore();
  const { evaluations } = useProgressStore();

  const [showEdit,       setShowEdit]       = useState(false);
  const [showAddStudents, setShowAddStudents] = useState(false);

  const group = groups.find((g) => g.id === id);

  // Redirect back if group was deleted
  if (!group) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 20 }}>
          <Text style={{ color: INDIGO, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>← {t("back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Group students enriched with score
  const groupStudents = useMemo(() =>
    students
      .filter((s) => group.studentIds.includes(s.id))
      .map((s) => {
        const evs = evaluations
          .filter((e) => e.studentId === s.id)
          .sort((a, b) => b.createdAt - a.createdAt);
        const last  = evs[0];
        const score = last
          ? ((last.activity + last.comprehension + last.homework + last.behavior) / 4) * 2
          : 0;
        return { ...s, _score: score };
      }),
    [students, evaluations, group.studentIds],
  );

  const avgScore = useMemo(() => {
    const scored = groupStudents.filter((s) => s._score > 0);
    return scored.length
      ? scored.reduce((a, s) => a + s._score, 0) / scored.length
      : 0;
  }, [groupStudents]);

  // Students not yet in this group
  const available = students.filter((s) => !group.studentIds.includes(s.id));

  const isArchived = group.category === "archived";

  function handleRemoveStudent(student) {
    Alert.alert(
      t("groupsRemoveTitle"),
      t("groupsRemoveMsg", { name: tName(student.name) }),
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("groupsRemoveBtn"), style: "destructive", onPress: () => removeStudentFromGroup(id, student.id) },
      ]
    );
  }

  function handleArchive() {
    Alert.alert(
      isArchived ? t("groupsRestoreBtn") : t("groupsArchiveBtn"),
      isArchived
        ? t("groupsRestoreMsg", { name: group.name })
        : t("groupsArchiveMsg", { name: group.name }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: isArchived ? t("groupsRestoreAlertBtn") : t("groupsArchiveAlertBtn"),
          onPress: () => {
            if (isArchived) unarchiveGroup(id);
            else archiveGroup(id);
            router.back();
          },
        },
      ]
    );
  }

  function handleDelete() {
    Alert.alert(
      t("groupsDeleteBtn"),
      t("groupsDeleteMsg", { name: group.name }),
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("delete"), style: "destructive", onPress: () => { deleteGroup(id); router.back(); } },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* ── Gradient header ─────────────────────────────────────────── */}
      <LinearGradient
        colors={[BLUE, INDIGO]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 20 }}
      >
        {/* Back + edit row */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
          <PressableScale
            onPress={() => router.back()}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={t("back")}
            style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginRight: "auto" }}
          >
            <ArrowLeft size={20} color="#FFF" strokeWidth={2} />
          </PressableScale>
          <PressableScale
            onPress={() => setShowEdit(true)}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={t("groupsEditTitle")}
            style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}
          >
            <Pencil size={18} color="#FFF" strokeWidth={2} />
          </PressableScale>
        </View>

        {/* Emoji + name + stats */}
        <View style={{ alignItems: "center", gap: 8 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: group.emojiColor, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
            <Text style={{ fontSize: 38 }}>{group.emoji}</Text>
          </View>

          {isArchived && (
            <View style={{ backgroundColor: "rgba(245,158,11,0.28)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FEF3C7" }}>{t("groupsInArchive")}</Text>
            </View>
          )}

          <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFF", textAlign: "center", letterSpacing: -0.3 }}>
            {group.name}
          </Text>

          {/* Stats row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 28, marginTop: 6 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFF" }}>
                {groupStudents.length}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" }}>
                {tp(groupStudents.length, "student")}
              </Text>
            </View>
            <View style={{ width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.25)" }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFF" }}>
                {avgScore > 0 ? avgScore.toFixed(1) : "—"}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" }}>
                {t("groupsAvgScore")}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
      >
        {/* Students section */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>
            {t("groupsStudentsTitle")}{" "}
            <Text style={{ fontFamily: "Inter_400Regular", color: SUB, fontSize: 15 }}>
              ({groupStudents.length})
            </Text>
          </Text>
          {!isArchived && (
            <TouchableOpacity
              onPress={() => setShowAddStudents(true)}
              activeOpacity={0.75}
              style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: INDIGO_50 }}
            >
              <UserPlus size={14} color={INDIGO} strokeWidth={2} />
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: INDIGO }}>{t("add")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {groupStudents.length === 0 ? (
          <View style={{ backgroundColor: CARD, borderRadius: 18, padding: 32, alignItems: "center", borderWidth: 1, borderColor: BORDER }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", lineHeight: 22 }}>
              {t("groupsNoStudents")}
            </Text>
          </View>
        ) : (
          <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
            {groupStudents.map((s, i) => (
              <StudentRow
                key={s.id}
                student={s}
                score={s._score}
                onPress={() => router.push(`/student/${s.id}`)}
                onLongPress={() => !isArchived && handleRemoveStudent(s)}
                showBorder={i < groupStudents.length - 1}
              />
            ))}
          </View>
        )}

        {!isArchived && groupStudents.length > 0 && (
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", marginTop: 8 }}>
            {t("groupsLongPressHint")}
          </Text>
        )}

        {/* ── Actions ─────────────────────────────────────────────── */}
        <View style={{ gap: 12, marginTop: 28 }}>
          {/* Archive / Restore */}
          <TouchableOpacity
            onPress={handleArchive}
            activeOpacity={0.75}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              backgroundColor: CARD, borderRadius: 16, paddingVertical: 15,
              borderWidth: 1, borderColor: BORDER,
            }}
          >
            {isArchived
              ? <RotateCcw size={18} color={GREEN} strokeWidth={2} />
              : <Archive size={18} color={AMBER} strokeWidth={2} />
            }
            <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: isArchived ? GREEN : AMBER }}>
              {isArchived ? t("groupsRestoreBtn") : t("groupsArchiveBtn")}
            </Text>
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            onPress={handleDelete}
            activeOpacity={0.75}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              backgroundColor: "#FEF2F2", borderRadius: 16, paddingVertical: 15,
              borderWidth: 1, borderColor: "#FECACA",
            }}
          >
            <Trash2 size={18} color="#EF4444" strokeWidth={2} />
            <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#EF4444" }}>
              {t("groupsDeleteBtn")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <EditGroupModal
        visible={showEdit}
        group={group}
        onSave={(updates) => { updateGroup(id, updates); setShowEdit(false); }}
        onClose={() => setShowEdit(false)}
      />
      <AddStudentsModal
        visible={showAddStudents}
        students={available}
        onAdd={(ids) => { ids.forEach((sid) => addStudentToGroup(id, sid)); setShowAddStudents(false); }}
        onClose={() => setShowAddStudents(false)}
      />
    </View>
  );
}
