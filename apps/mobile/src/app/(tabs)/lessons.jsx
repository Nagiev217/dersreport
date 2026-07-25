import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  BookOpen,
  Clock,
  Video,
  Globe,
  Hash,
  GraduationCap,
  Calendar,
  CalendarDays,
  Plus,
  Timer,
  Archive,
  Banknote,
  CreditCard,
  Smartphone,
  TrendingUp,
  Trash2,
  ChevronRight,
  CheckCircle2,
  Ban,
} from "lucide-react-native";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import { useLessonsStore } from "@/utils/lessons/store";
import { usePaymentsStore } from "@/utils/payments/store";
import AddPaymentModal from "@/components/AddPaymentModal";
import { useT, useDateLocale } from "@/utils/i18n";
import {
  formatDateShort,
  todayStr,
  toDateStr,
  isToday,
  isTomorrow,
} from "@/utils/dateUtils";

// ─── Palette ──────────────────────────────────────────────────────────────────
const NAVY_GRAD = ["#22447A", "#152C51"];
const SHEET = "#F4F5F7";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BLUE  = "#2563EB";

// ─── Constants ────────────────────────────────────────────────────────────────

// Filter keys (translated inside component)
const ARCHIVE_FILTER_KEYS = ["all", "done", "cancelled"];

const SUBJECT_CONFIG = {
  IELTS:      { Icon: BookOpen,     color: "#6B5CF6", bg: "#EEF0FF" },
  SAT:        { Icon: Hash,         color: "#3B82F6", bg: "#EFF6FF" },
  General:    { Icon: Globe,        color: "#10B981", bg: "#ECFDF5" },
  Английский: { Icon: GraduationCap, color: "#F59E0B", bg: "#FFFBEB" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lessonEndTime(lesson) {
  const [h, m] = (lesson.time ?? "00:00").split(":").map(Number);
  const d = new Date(`${lesson.date}T00:00:00`);
  d.setHours(h, m + (lesson.duration ?? 60), 0, 0);
  return d;
}

// A lesson is "archived" when it has fully ended or was completed/cancelled
function isArchived(lesson, now) {
  if (lesson.status === "completed" || lesson.status === "cancelled") return true;
  return lessonEndTime(lesson) < now;
}

function parseLocalDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// "Сегодня, 7 мая" | "Завтра, 8 мая" | "14 июня"
function groupDateLabel(dateStr, t, monthsFull) {
  const d = parseLocalDate(dateStr);
  const label = `${d.getDate()} ${monthsFull[d.getMonth()]}`;
  if (isToday(dateStr)) return `${t("today")}, ${label}`;
  if (isTomorrow(dateStr)) return `${t("tomorrow")}, ${label}`;
  return label;
}

function groupByDate(list) {
  const map = {};
  list.forEach((l) => { (map[l.date] ??= []).push(l); });
  return Object.keys(map).sort().map((date) => ({
    date,
    lessons: map[date].slice().sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
  }));
}

// Monday-first week containing today
function getCurrentWeek() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x;
  });
}

// ─── DateGroupCard — timeline list for one date, continuous connector line ─────

function DateGroupCard({ dateLabel, lessons, onOpen }) {
  const { t, tSubject, tName, tNameList } = useT();
  const [rowLayouts, setRowLayouts] = useState({});
  const handleRowLayout = useCallback((i, e) => {
    const { y, height } = e.nativeEvent.layout;
    setRowLayouts((prev) => {
      const cur = prev[i];
      if (cur && cur.y === y && cur.height === height) return prev;
      return { ...prev, [i]: { y, height } };
    });
  }, []);
  const geometry = useMemo(() => {
    if (lessons.length < 2) return null;
    const first = rowLayouts[0];
    const last  = rowLayouts[lessons.length - 1];
    if (!first || !last) return null;
    const firstCenter = first.y + first.height / 2;
    const lastCenter  = last.y + last.height / 2;
    return { top: firstCenter, height: lastCenter - firstCenter };
  }, [rowLayouts, lessons.length]);

  const STATUS_CFG = {
    planned:   { label: t("statusPlanned"),   color: "#6B5CF6", bg: "#EEF0FF" },
    completed: { label: t("statusCompleted"), color: "#22C55E", bg: "#F0FDF4" },
    cancelled: { label: t("statusCancelled"), color: "#EF4444", bg: "#FEF2F2" },
  };

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 10 }}>
        {dateLabel}
      </Text>
      <View style={{
        backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 14, position: "relative",
        shadowColor: "#0B1B3A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
      }}>
        {/* single continuous timeline line — drawn first (bottom layer) so dots sit on top */}
        {geometry && (
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: 73, top: geometry.top, height: geometry.height, width: 2, backgroundColor: "#D5D9E0" }}
          />
        )}

        {lessons.map((l, i) => {
          const cfg = SUBJECT_CONFIG[l.subject] || SUBJECT_CONFIG.Английский;
          const statusCfg = STATUS_CFG[l.status] || STATUS_CFG.planned;
          const isLast = i === lessons.length - 1;
          const names = Array.isArray(l.studentNames) && l.studentNames.length
            ? tNameList(l.studentNames)
            : tName(l.student ?? "—");
          return (
            <TouchableOpacity
              key={l.id}
              onLayout={(e) => handleRowLayout(i, e)}
              onPress={() => onOpen(l.id)}
              activeOpacity={0.75}
              style={{
                flexDirection: "row", alignItems: "center", gap: 10,
                paddingVertical: 13,
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: "#EEF0F3",
              }}
            >
              {/* time */}
              <Text style={{ width: 44, fontSize: 13, fontFamily: "Inter_700Bold", color: TEXT }}>
                {l.time}
              </Text>

              {/* timeline dot */}
              <View style={{ width: 12, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: cfg.color }} />
              </View>

              {/* subject + students */}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 14.5, fontFamily: "Inter_700Bold", color: TEXT }}>
                  {tSubject(l.subject)}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>
                  {names} · {l.format === "Офлайн" ? t("offline") : t("online")}
                </Text>
              </View>

              {/* status pill */}
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: statusCfg.bg }}>
                <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: statusCfg.color }}>
                  {statusCfg.label}
                </Text>
              </View>

              <ChevronRight size={16} color="#C6CBD5" strokeWidth={2} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── LessonCard (used in Archive list — flat, non-grouped) ─────────────────────

const LessonCard = ({ lesson, onPress, dimmed }) => {
  const { t, tSubject, tName } = useT();
  const locale = useDateLocale();
  const STATUS_CFG = {
    planned:   { label: t("statusPlanned"),   color: "#6B5CF6", bg: "#EEF0FF" },
    completed: { label: t("statusCompleted"), color: "#22C55E", bg: "#F0FDF4" },
    cancelled: { label: t("statusCancelled"), color: "#EF4444", bg: "#FEF2F2" },
  };
  const subjectCfg = SUBJECT_CONFIG[lesson.subject] || SUBJECT_CONFIG.Английский;
  const statusCfg  = STATUS_CFG[lesson.status] || STATUS_CFG.planned;
  const SubjectIcon = subjectCfg.Icon;

  const names = Array.isArray(lesson.studentNames)
    ? lesson.studentNames.map(tName).join(" · ")
    : tName(lesson.student ?? "—");

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        opacity: dimmed ? 0.72 : 1,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      {/* Row 1: subject + status */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: subjectCfg.bg, alignItems: "center", justifyContent: "center" }}>
            <SubjectIcon size={18} color={subjectCfg.color} />
          </View>
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#1C1C1E" }}>
            {tSubject(lesson.subject)}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: statusCfg.bg, borderRadius: 20 }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: statusCfg.color }}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Row 2: students */}
      <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: "#3C3C43", marginBottom: 10 }} numberOfLines={1}>
        {names}
      </Text>

      {/* Row 3: time · duration · format */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Clock size={13} color="#8E8E93" />
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{lesson.time}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Timer size={13} color="#8E8E93" />
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>{lesson.duration} {t("min_abbr")}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Video size={13} color="#6B5CF6" />
          <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#6B5CF6" }}>{lesson.format === "Офлайн" ? t("offline") : t("online")}</Text>
        </View>
      </View>

      {/* Row 4: date */}
      {lesson.date && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: "#F2F2F7" }}>
          <Calendar size={12} color="#8E8E93" />
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
            {formatDateShort(lesson.date, locale)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Empty states ─────────────────────────────────────────────────────────────

const EmptyActive = ({ onAdd }) => {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <BookOpen size={32} color="#6B5CF6" />
      </View>
      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 6, textAlign: "center" }}>
        {t("lessonsEmptyTitle")}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center", lineHeight: 20, marginBottom: 24 }}>
        {t("lessonsEmptyDefault")}
      </Text>
      <TouchableOpacity activeOpacity={0.85} onPress={onAdd} style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#6B5CF6", borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Plus size={16} color="#FFFFFF" />
        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("lessonsAddBtn")}</Text>
      </TouchableOpacity>
    </View>
  );
};

const EmptyArchive = () => {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Archive size={32} color="#8E8E93" />
      </View>
      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 6, textAlign: "center" }}>
        {t("lessonsArchiveEmpty")}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center", lineHeight: 20 }}>
        {t("lessonsArchiveEmptyHint")}
      </Text>
    </View>
  );
};

// ─── PaymentCard ──────────────────────────────────────────────────────────────

const PaymentCard = ({ payment, onDelete }) => {
  const METHOD_CFG = {
    cash:     { Icon: Banknote,   color: "#22C55E", bg: "#F0FDF4" },
    card:     { Icon: CreditCard, color: "#3B82F6", bg: "#EFF6FF" },
    transfer: { Icon: Smartphone, color: "#8B5CF6", bg: "#F5F3FF" },
  };
  const METHOD_LABELS = { cash: "addPayCash", card: "addPayCard", transfer: "addPayTransfer" };
  const cfg = METHOD_CFG[payment.method] ?? METHOD_CFG.cash;
  const MethodIcon = cfg.Icon;

  const { t, tName } = useT();
  const displayName = tName(payment.studentName ?? "?");

  const initials = displayName
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function confirmDelete() {
    Alert.alert(t("addPayDeleteTitle"), t("addPayDeleteMsg"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => onDelete(payment.id) },
    ]);
  }

  return (
    <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14,
      shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
      flexDirection: "row", alignItems: "center", gap: 12 }}>
      {/* Avatar */}
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#EEF0FF",
        alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#6B5CF6" }}>{initials}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" }} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4,
            paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: cfg.bg }}>
            <MethodIcon size={11} color={cfg.color} />
            <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: cfg.color }}>
              {t(METHOD_LABELS[payment.method] ?? "addPayCash")}
            </Text>
          </View>
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }}>
            {payment.date}
          </Text>
        </View>
        {payment.note ? (
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" }} numberOfLines={1}>
            {payment.note}
          </Text>
        ) : null}
      </View>

      {/* Amount + delete */}
      <View style={{ alignItems: "flex-end", gap: 8 }}>
        <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#22C55E" }}>
          +{payment.amount} ₼
        </Text>
        <TouchableOpacity activeOpacity={0.7} onPress={confirmDelete}>
          <Trash2 size={14} color="#C7C7CC" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EmptyPayments = ({ onAdd }) => {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Banknote size={32} color="#22C55E" />
      </View>
      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginBottom: 6, textAlign: "center" }}>
        {t("paymentsEmptyTitle")}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center", lineHeight: 20, marginBottom: 24 }}>
        {t("paymentsEmptyHint")}
      </Text>
      <TouchableOpacity activeOpacity={0.85} onPress={onAdd} style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#22C55E", borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Plus size={16} color="#FFFFFF" />
        <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("paymentsAddBtn")}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LessonsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { t, tp, days } = useT();

  const [tab,          setTab]          = useState("active"); // "active" | "archive" | "payments"
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState(null); // archive filter chips
  const [showAddPay,   setShowAddPay]   = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const ARCHIVE_FILTERS = [t("all"), t("lessonsFilterDone"), t("lessonsFilterCancelled")];
  const filterAll        = t("all");
  const filterDone       = t("lessonsFilterDone");
  const filterCancelled  = t("lessonsFilterCancelled");
  const activeFilter     = filter ?? filterAll;

  const { lessons } = useLessonsStore();
  const { payments, deletePayment } = usePaymentsStore();

  const now      = new Date();
  const today    = todayStr();
  const weekDates = useMemo(() => getCurrentWeek(), []);
  const daysShort = days(true);
  const monthsFull = useDateLocale().monthsFull;

  // Split into active / archived
  const { active, archived } = useMemo(() => {
    const active   = [];
    const archived = [];
    for (const l of lessons) {
      if (isArchived(l, now)) archived.push(l);
      else active.push(l);
    }
    archived.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
    return { active, archived };
  }, [lessons]);

  // Switch tab → reset filter/search
  function switchTab(newTab) {
    setTab(newTab);
    setFilter(null);
    setSearch("");
  }

  // Schedule (active) tab — grouped by date, from selectedDate forward
  const scheduleGroups = useMemo(() => {
    const list = active.filter(l => l.date >= selectedDate);
    return groupByDate(list);
  }, [active, selectedDate]);

  // Archive filters
  const filteredArchive = useMemo(() => {
    let list = archived;
    if (activeFilter === filterDone)           list = list.filter(l => l.status === "completed");
    else if (activeFilter === filterCancelled) list = list.filter(l => l.status === "cancelled");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.subject.toLowerCase().includes(q) ||
        (l.studentNames ?? []).some(n => n.toLowerCase().includes(q)) ||
        (l.student ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [archived, activeFilter, search, filterDone, filterCancelled]);

  // Payment stats
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { thisMonthTotal, allTimeTotal, filteredPayments } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = payments
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
    const filtered = q
      ? list.filter(p => (p.studentName ?? "").toLowerCase().includes(q))
      : list;
    const thisMonth = list.filter(p => p.period === currentPeriod);
    return {
      thisMonthTotal:   thisMonth.reduce((s, p) => s + (p.amount ?? 0), 0),
      allTimeTotal:     list.reduce((s, p) => s + (p.amount ?? 0), 0),
      filteredPayments: filtered,
    };
  }, [payments, search, currentPeriod]);

  // Global lesson stats (footer bar on schedule tab)
  const totalCount     = lessons.length;
  const completedCount = useMemo(() => lessons.filter(l => l.status === "completed").length, [lessons]);
  const plannedCount   = useMemo(() => lessons.filter(l => l.status === "planned").length, [lessons]);
  const cancelledCount = useMemo(() => lessons.filter(l => l.status === "cancelled").length, [lessons]);

  const handleAdd  = () => router.push("/lesson/add");
  const handleOpen = (id) => router.push(`/lesson/${id}`);

  function handlePlusPress() {
    if (tab === "payments") setShowAddPay(true);
    else handleAdd();
  }

  const TABS = [
    { id: "active",   label: t("lessonsTabActive") },
    { id: "archive",  label: t("lessonsTabArchive") },
    { id: "payments", label: t("lessonsTabPayments") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: SHEET }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Fills the top overscroll/bounce gap with navy instead of the sheet's white */}
        <View style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: NAVY_GRAD[0] }} />

        {/* ══ NAVY HEADER ══════════════════════════════════════════════ */}
        <LinearGradient
          colors={NAVY_GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 18 }}
        >
          {/* logo row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
              <GraduationCap size={19} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.3, lineHeight: 19 }}>
                Jeff
              </Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", letterSpacing: 0.3 }}>
                Colleges
              </Text>
            </View>
          </View>

          {/* title + buttons */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.5 }}>
              {t("lessonsTitle")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setSelectedDate(today)}
                activeOpacity={0.75}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}
              >
                <CalendarDays size={17} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePlusPress}
                activeOpacity={0.8}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
              >
                <Plus size={20} color={NAVY_GRAD[1]} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* tab toggle — dark pill container, white active segment */}
          <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 15, padding: 4 }}>
            {TABS.map(({ id, label }) => {
              const active = tab === id;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => switchTab(id)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center",
                    backgroundColor: active ? "#FFFFFF" : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 13.5, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? NAVY_GRAD[1] : "#FFFFFF" }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* week day strip — schedule tab only */}
          {tab === "active" && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", paddingVertical: 14, paddingHorizontal: 4, marginTop: 16 }}>
              {weekDates.map((d) => {
                const ds = toDateStr(d);
                const selected = ds === selectedDate;
                return (
                  <TouchableOpacity
                    key={ds}
                    onPress={() => setSelectedDate(ds)}
                    activeOpacity={0.75}
                    style={{ alignItems: "center", width: 34 }}
                  >
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
                      {daysShort[(d.getDay() + 6) % 7]}
                    </Text>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: selected ? "#FFFFFF" : "transparent", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: selected ? NAVY_GRAD[1] : "#FFFFFF" }}>
                        {d.getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </LinearGradient>

        {/* ══ WHITE SHEET ══════════════════════════════════════════════ */}
        <View style={{ flex: 1, backgroundColor: SHEET, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -14, paddingTop: 20, paddingBottom: insets.bottom + 24 }}>

          {/* ── Schedule (active) tab ─────────────────────────────────── */}
          {tab === "active" && (
            <View style={{ paddingHorizontal: 20 }}>
              {scheduleGroups.length === 0 ? (
                <EmptyActive onAdd={handleAdd} />
              ) : (
                scheduleGroups.map(({ date, lessons: dayLessons }) => (
                  <DateGroupCard
                    key={date}
                    dateLabel={groupDateLabel(date, t, monthsFull)}
                    lessons={dayLessons}
                    onOpen={handleOpen}
                  />
                ))
              )}

              {/* stats footer bar */}
              {lessons.length > 0 && (
                <View style={{
                  flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, marginTop: 4, marginBottom: 8,
                  shadowColor: "#0B1B3A", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
                }}>
                  {[
                    { Icon: CalendarDays, value: totalCount,     label: t("lessonsStatTotal"),     color: BLUE },
                    { Icon: CheckCircle2, value: completedCount, label: t("lessonsStatCompleted"), color: "#22C55E" },
                    { Icon: Clock,        value: plannedCount,   label: t("lessonsStatPlanned"),   color: "#F59E0B" },
                    { Icon: Ban,          value: cancelledCount, label: t("lessonsStatCancelled"), color: SUB },
                  ].map(({ Icon, value, label, color }, i) => (
                    <View key={i} style={{ flex: 1, alignItems: "center", borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: "#EEF0F3" }}>
                      <Icon size={18} color={color} strokeWidth={2} />
                      <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT, marginTop: 6 }}>{value}</Text>
                      <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", marginTop: 2 }}>{label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Archive tab ───────────────────────────────────────────── */}
          {tab === "archive" && (
            <View style={{ paddingHorizontal: 20 }}>
              <SearchBar
                placeholder={t("lessonsSearchArchive")}
                value={search}
                onChangeText={setSearch}
                showMic={false}
              />
              <View style={{ marginTop: 14, marginLeft: -20, paddingLeft: 20 }}>
                <FilterChips options={ARCHIVE_FILTERS} selected={activeFilter} onSelect={setFilter} />
              </View>

              {archived.length > 0 && (
                <View style={{ marginTop: 16, backgroundColor: "#F8F7FF", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E8E5FF" }}>
                  <Archive size={18} color="#6B5CF6" />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#6B5CF6", flex: 1, lineHeight: 18 }}>
                    {t("lessonsArchiveHint")}
                  </Text>
                </View>
              )}

              <View style={{ gap: 10, marginTop: 16 }}>
                {filteredArchive.length === 0 ? (
                  <EmptyArchive />
                ) : (
                  filteredArchive.map(lesson => (
                    <LessonCard key={lesson.id} lesson={lesson} onPress={() => handleOpen(lesson.id)} dimmed />
                  ))
                )}
              </View>
            </View>
          )}

          {/* ── Payments tab ──────────────────────────────────────────── */}
          {tab === "payments" && (
            <View style={{ paddingHorizontal: 20 }}>
              <SearchBar
                placeholder={t("lessonsSearchPay")}
                value={search}
                onChangeText={setSearch}
                showMic={false}
              />

              {payments.length > 0 && (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 16 }}>
                  <View style={{ flex: 1, backgroundColor: "#ECFDF5", borderRadius: 16, padding: 14, alignItems: "center", gap: 4 }}>
                    <TrendingUp size={18} color="#22C55E" />
                    <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#22C55E" }}>
                      {thisMonthTotal} ₼
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280", textAlign: "center" }}>
                      {t("lessonsThisMonth")}
                    </Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: "#F5F3FF", borderRadius: 16, padding: 14, alignItems: "center", gap: 4 }}>
                    <Banknote size={18} color="#8B5CF6" />
                    <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#8B5CF6" }}>
                      {allTimeTotal} ₼
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#6B7280", textAlign: "center" }}>
                      {t("lessonsAllTime")}
                    </Text>
                  </View>
                </View>
              )}

              <View style={{ gap: 10, marginTop: payments.length > 0 ? 0 : 16 }}>
                {filteredPayments.length === 0 ? (
                  <EmptyPayments onAdd={() => setShowAddPay(true)} />
                ) : (
                  filteredPayments.map(p => (
                    <PaymentCard key={p.id} payment={p} onDelete={deletePayment} />
                  ))
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Add Payment modal ─────────────────────────────────────────── */}
      <AddPaymentModal
        visible={showAddPay}
        onClose={() => setShowAddPay(false)}
      />
    </View>
  );
}
