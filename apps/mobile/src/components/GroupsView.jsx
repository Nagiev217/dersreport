import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { useState, useMemo } from "react";
import { ChevronRight, Archive, Users, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useGroupsStore } from "@/utils/groups/store";
import { useStudentsStore } from "@/utils/students/store";
import { useProgressStore } from "@/utils/progress/store";
import { useT } from "@/utils/i18n";

// ─── tokens ──────────────────────────────────────────────────────────────────
const P      = "#5B4FE9";
const CARD   = "#FFFFFF";
const TEXT   = "#111827";
const SUB    = "#9CA3AF";
const BG     = "#FAFAFA";
const BORDER = "#F3F4F6";

// ─── helpers ─────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 9) return "#10B981";
  if (s >= 8) return "#3B82F6";
  if (s >= 7) return "#F59E0B";
  return "#EF4444";
}

function computeStats(group, students, evaluations) {
  const members = students.filter((s) => group.studentIds.includes(s.id));
  const scores = members
    .map((s) => {
      const evs = evaluations
        .filter((e) => e.studentId === s.id)
        .sort((a, b) => b.createdAt - a.createdAt);
      const last = evs[0];
      return last
        ? ((last.activity + last.comprehension + last.homework + last.behavior) / 4) * 2
        : 0;
    })
    .filter((sc) => sc > 0);
  return {
    count: members.length,
    avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
  };
}

// ─── Emoji options for AddGroupModal ─────────────────────────────────────────
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

// ─── Group card (carousel) ────────────────────────────────────────────────────
function GroupCard({ group, stats, onPress }) {
  const { tp } = useT();
  const sc = stats.avg > 0 ? scoreColor(stats.avg) : SUB;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.84}
      style={{
        width: 148,
        backgroundColor: CARD,
        borderRadius: 20,
        paddingTop: 18,
        paddingBottom: 16,
        paddingHorizontal: 14,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
      }}
    >
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: group.emojiColor, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        <Text style={{ fontSize: 32 }}>{group.emoji}</Text>
      </View>
      <Text numberOfLines={2} style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT, textAlign: "center", lineHeight: 18, marginBottom: 4 }}>
        {group.name}
      </Text>
      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 6 }}>
        {stats.count} {tp(stats.count, "student")}
      </Text>
      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: stats.avg > 0 ? sc : SUB }}>
        {stats.avg > 0 ? `${stats.avg.toFixed(1)}/10` : "—"}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Group row (list) ─────────────────────────────────────────────────────────
function GroupRow({ group, stats, onPress, showBorder }) {
  const { tp } = useT();
  const sc = stats.avg > 0 ? scoreColor(stats.avg) : SUB;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 16, paddingVertical: 15,
        borderBottomWidth: showBorder ? 1 : 0,
        borderBottomColor: BORDER,
      }}
    >
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: group.emojiColor, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 24 }}>{group.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 3 }}>
          {group.name}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>
          {stats.count} {tp(stats.count, "student")}
        </Text>
      </View>
      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: stats.avg > 0 ? sc : SUB, marginRight: 4 }}>
        {stats.avg > 0 ? `${stats.avg.toFixed(1)}/10` : "—"}
      </Text>
      <ChevronRight size={16} color={SUB} strokeWidth={2} />
    </TouchableOpacity>
  );
}

// ─── Add group modal ──────────────────────────────────────────────────────────
function AddGroupModal({ visible, onClose }) {
  const { t } = useT();
  const { addGroup } = useGroupsStore();
  const [name,  setName]  = useState("");
  const [emoji, setEmoji] = useState(EMOJI_OPTS[0]);

  function handleSave() {
    if (!name.trim()) return;
    addGroup({
      id:         `gr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name:       name.trim(),
      emoji:      emoji.emoji,
      emojiColor: emoji.color,
      studentIds: [],
      category:   "active",
      createdAt:  Date.now(),
    });
    setName("");
    setEmoji(EMOJI_OPTS[0]);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor: CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: "center", marginBottom: 20 }} />
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 22 }}>
            <Text style={{ flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT }}>{t("groupsNewTitle")}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={SUB} strokeWidth={2} />
            </TouchableOpacity>
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
                  style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: opt.color, alignItems: "center", justifyContent: "center", borderWidth: sel ? 2.5 : 0, borderColor: sel ? P : "transparent" }}
                >
                  <Text style={{ fontSize: 24 }}>{opt.emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.85}
            style={{ backgroundColor: name.trim() ? P : `${P}50`, borderRadius: 16, paddingVertical: 15, alignItems: "center" }}
          >
            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" }}>{t("groupsCreateBtn")}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────
function EmptyGroups() {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 40 }}>
      <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: `${P}10`, alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
        <Users size={40} color={P} strokeWidth={1.4} />
      </View>
      <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 10, textAlign: "center" }}>
        {t("groupsEmptyTitle")}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", lineHeight: 22 }}>
        {t("groupsEmptyHint")}
      </Text>
    </View>
  );
}

function EmptyArchive() {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 40 }}>
      <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
        <Archive size={40} color={SUB} strokeWidth={1.4} />
      </View>
      <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 10 }}>{t("groupsArchiveEmpty")}</Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", lineHeight: 22 }}>
        {t("groupsArchiveEmptyHint")}
      </Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GroupsView({ bottomInset = 0, showAddModal, onCloseAddModal }) {
  const router = useRouter();
  const { t } = useT();
  const [innerTab, setInnerTab] = useState("all");

  const { groups }      = useGroupsStore();
  const { students }    = useStudentsStore();
  const { evaluations } = useProgressStore();

  const enriched = useMemo(() =>
    groups.map((g) => ({ ...g, _stats: computeStats(g, students, evaluations) })),
    [groups, students, evaluations],
  );

  const activeGroups   = enriched.filter((g) => g.category === "active");
  const archivedGroups = enriched.filter((g) => g.category === "archived");

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* ── Inner sub-tabs ──────────────────────────────────────────── */}
      <View style={{ backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER }}>
        <View style={{ flexDirection: "row" }}>
          {[
            { id: "all",     label: t("groupsAll") },
            { id: "archive", label: t("groupsArchive") },
          ].map(({ id, label }) => {
            const active = innerTab === id;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => setInnerTab(id)}
                activeOpacity={0.7}
                style={{ flex: 1, paddingVertical: 13, alignItems: "center", position: "relative" }}
              >
                <Text style={{ fontSize: 14, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular", color: active ? P : SUB }}>
                  {label}
                </Text>
                {active && (
                  <View style={{ position: "absolute", bottom: 0, left: 24, right: 24, height: 2.5, borderRadius: 1.5, backgroundColor: P }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 100 }}>
        {innerTab === "all" && (
          <>
            {activeGroups.length === 0 ? (
              <EmptyGroups />
            ) : (
              <>
                {/* Carousel */}
                <View style={{ marginBottom: 28 }}>
                  <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 14 }}>
                    <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT }}>
                      {t("groupsActiveLabel")}{" "}
                      <Text style={{ fontFamily: "Inter_400Regular", color: SUB, fontSize: 15 }}>
                        ({activeGroups.length})
                      </Text>
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
                    {activeGroups.map((g) => (
                      <GroupCard
                        key={g.id}
                        group={g}
                        stats={g._stats}
                        onPress={() => router.push(`/group/${g.id}`)}
                      />
                    ))}
                  </ScrollView>
                </View>

                {/* All groups list */}
                <View style={{ paddingHorizontal: 20 }}>
                  <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 14 }}>
                    {t("groupsAllLabel")}{" "}
                    <Text style={{ fontFamily: "Inter_400Regular", color: SUB, fontSize: 15 }}>
                      ({activeGroups.length})
                    </Text>
                  </Text>
                  <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                    {activeGroups.map((g, i) => (
                      <GroupRow
                        key={g.id}
                        group={g}
                        stats={g._stats}
                        onPress={() => router.push(`/group/${g.id}`)}
                        showBorder={i < activeGroups.length - 1}
                      />
                    ))}
                  </View>
                </View>
              </>
            )}
          </>
        )}

        {innerTab === "archive" && (
          archivedGroups.length === 0 ? (
            <EmptyArchive />
          ) : (
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 14 }}>
                {t("groupsArchive")}{" "}
                <Text style={{ fontFamily: "Inter_400Regular", color: SUB, fontSize: 15 }}>
                  ({archivedGroups.length})
                </Text>
              </Text>
              <View style={{ backgroundColor: CARD, borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                {archivedGroups.map((g, i) => (
                  <GroupRow
                    key={g.id}
                    group={g}
                    stats={g._stats}
                    onPress={() => router.push(`/group/${g.id}`)}
                    showBorder={i < archivedGroups.length - 1}
                  />
                ))}
              </View>
            </View>
          )
        )}
      </ScrollView>

      <AddGroupModal visible={showAddModal} onClose={onCloseAddModal} />
    </View>
  );
}
