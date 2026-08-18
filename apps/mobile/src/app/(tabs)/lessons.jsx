import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo, useCallback } from "react";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
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
  ChevronRight,
  CheckCircle2,
  Ban,
} from "lucide-react-native";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import PressableScale from "@/components/PressableScale";
import { useLessonsStore } from "@/utils/lessons/store";
import { useT, useDateLocale } from "@/utils/i18n";
import {
  formatDateShort,
  todayStr,
  toDateStr,
  isToday,
  isTomorrow,
} from "@/utils/dateUtils";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECT_CONFIG = {
  IELTS:      { Icon: BookOpen,      color: INDIGO,     bg: INDIGO_50 },
  SAT:        { Icon: Hash,          color: BLUE,       bg: BLUE_50 },
  General:    { Icon: Globe,         color: "#22C55E",  bg: "#ECFDF5" },
  Английский: { Icon: GraduationCap, color: "#D97706",  bg: "#FFFBEB" },
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

const STATUS_CFG_BASE = {
  planned:   { color: INDIGO,     bg: INDIGO_50 },
  completed: { color: "#22C55E",  bg: "#ECFDF5" },
  cancelled: { color: "#EF4444",  bg: "#FEF2F2" },
};

// ─── DateGroupCard — timeline list for one date, continuous connector line ─────

function DateGroupCard({ dateLabel, lessons, onOpen, delay }) {
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
    planned:   { label: t("statusPlanned"),   ...STATUS_CFG_BASE.planned },
    completed: { label: t("statusCompleted"), ...STATUS_CFG_BASE.completed },
    cancelled: { label: t("statusCancelled"), ...STATUS_CFG_BASE.cancelled },
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(320)} style={{ marginBottom: 18 }}>
      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 10 }}>
        {dateLabel}
      </Text>
      <View style={{
        backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 14, position: "relative",
        borderWidth: 1, borderColor: BORDER,
      }}>
        {/* single continuous timeline line — drawn first (bottom layer) so dots sit on top */}
        {geometry && (
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: 73, top: geometry.top, height: geometry.height, width: 2, backgroundColor: "#E5E9F2" }}
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
                borderBottomColor: "#F1F5F9",
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
    </Animated.View>
  );
}

// ─── LessonCard (used in Archive list — flat, non-grouped) ─────────────────────

const LessonCard = ({ lesson, onPress, dimmed }) => {
  const { t, tSubject, tName } = useT();
  const locale = useDateLocale();
  const STATUS_CFG = {
    planned:   { label: t("statusPlanned"),   ...STATUS_CFG_BASE.planned },
    completed: { label: t("statusCompleted"), ...STATUS_CFG_BASE.completed },
    cancelled: { label: t("statusCancelled"), ...STATUS_CFG_BASE.cancelled },
  };
  const subjectCfg = SUBJECT_CONFIG[lesson.subject] || SUBJECT_CONFIG.Английский;
  const statusCfg  = STATUS_CFG[lesson.status] || STATUS_CFG.planned;
  const SubjectIcon = subjectCfg.Icon;

  const names = Array.isArray(lesson.studentNames)
    ? lesson.studentNames.map(tName).join(" · ")
    : tName(lesson.student ?? "—");

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        opacity: dimmed ? 0.75 : 1,
        borderWidth: 1,
        borderColor: BORDER,
      }}
    >
      {/* Row 1: subject + status */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: subjectCfg.bg, alignItems: "center", justifyContent: "center" }}>
            <SubjectIcon size={18} color={subjectCfg.color} />
          </View>
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>
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
          <Clock size={13} color={SUB} />
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>{lesson.time}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Timer size={13} color={SUB} />
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB }}>{lesson.duration} {t("min_abbr")}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Video size={13} color={INDIGO} />
          <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: INDIGO }}>{lesson.format === "Офлайн" ? t("offline") : t("online")}</Text>
        </View>
      </View>

      {/* Row 4: date */}
      {lesson.date && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
          <Calendar size={12} color={SUB} />
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>
            {formatDateShort(lesson.date, locale)}
          </Text>
        </View>
      )}
    </PressableScale>
  );
};

// ─── Empty states ─────────────────────────────────────────────────────────────

const EmptyActive = ({ onAdd }) => {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: INDIGO_50, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <BookOpen size={32} color={INDIGO} />
      </View>
      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 6, textAlign: "center" }}>
        {t("lessonsEmptyTitle")}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>
        {t("lessonsEmptyDefault")}
      </Text>
      <PressableScale onPress={onAdd} scaleTo={0.96} style={{ borderRadius: 14, overflow: "hidden" }}>
        <LinearGradient colors={[BLUE, INDIGO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 24, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("lessonsAddBtn")}</Text>
        </LinearGradient>
      </PressableScale>
    </View>
  );
};

const EmptyArchive = () => {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Archive size={32} color={SUB} />
      </View>
      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT, marginBottom: 6, textAlign: "center" }}>
        {t("lessonsArchiveEmpty")}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", lineHeight: 20 }}>
        {t("lessonsArchiveEmptyHint")}
      </Text>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LessonsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { t, tp, days } = useT();

  const [tab,          setTab]          = useState("active"); // "active" | "archive"
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState(null); // archive filter chips
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const ARCHIVE_FILTERS = [t("all"), t("lessonsFilterDone"), t("lessonsFilterCancelled")];
  const filterAll        = t("all");
  const filterDone       = t("lessonsFilterDone");
  const filterCancelled  = t("lessonsFilterCancelled");
  const activeFilter     = filter ?? filterAll;

  const { lessons } = useLessonsStore();

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

  // Global lesson stats (footer bar on schedule tab)
  const totalCount     = lessons.length;
  const completedCount = useMemo(() => lessons.filter(l => l.status === "completed").length, [lessons]);
  const plannedCount   = useMemo(() => lessons.filter(l => l.status === "planned").length, [lessons]);
  const cancelledCount = useMemo(() => lessons.filter(l => l.status === "cancelled").length, [lessons]);

  const handleAdd  = () => router.push("/lesson/add");
  const handleOpen = (id) => router.push(`/lesson/${id}`);

  const TABS = [
    { id: "active",   label: t("lessonsTabActive") },
    { id: "archive",  label: t("lessonsTabArchive") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Fills the top overscroll/bounce gap with the hero color instead of white */}
        <View pointerEvents="none" style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: BLUE_50 }} />
        {/* ── SECTION 1 — Hero (gradient blue-50 → indigo-50 → white) ── */}
        <LinearGradient
          colors={[BLUE_50, INDIGO_50, "#FFFFFF"]}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 20 }}
        >
          {/* logo row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}>
              <GraduationCap size={18} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.3, lineHeight: 19 }}>
                Jeff
              </Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: SUB, letterSpacing: 0.3 }}>
                Colleges
              </Text>
            </View>
          </View>

          {/* title + buttons */}
          <Animated.View entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: TEXT, letterSpacing: -0.5 }}>
              {t("lessonsTitle")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <PressableScale
                onPress={() => setSelectedDate(today)}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel={t("today")}
                style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" }}
              >
                <CalendarDays size={17} color={BLUE} strokeWidth={2} />
              </PressableScale>
              <PressableScale
                onPress={handleAdd}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel={t("lessonsAddBtn")}
                style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" }}
              >
                <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
              </PressableScale>
            </View>
          </Animated.View>

          {/* tab toggle — segmented control */}
          <View style={{ flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 4, borderWidth: 1, borderColor: BORDER }}>
            {TABS.map(({ id, label }) => {
              const active = tab === id;
              return (
                <PressableScale
                  key={id}
                  onPress={() => switchTab(id)}
                  scaleTo={0.97}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
                    backgroundColor: active ? BLUE : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 13.5, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? "#FFFFFF" : SUB }}>
                    {label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {/* week day strip — schedule tab only */}
          {tab === "active" && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: BORDER, paddingVertical: 12, paddingHorizontal: 4, marginTop: 14 }}>
              {weekDates.map((d) => {
                const ds = toDateStr(d);
                const selected = ds === selectedDate;
                return (
                  <PressableScale
                    key={ds}
                    onPress={() => setSelectedDate(ds)}
                    scaleTo={0.9}
                    accessibilityRole="button"
                    accessibilityLabel={ds}
                    accessibilityState={{ selected }}
                    style={{ alignItems: "center", width: 34 }}
                  >
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: SUB, marginBottom: 8 }}>
                      {daysShort[(d.getDay() + 6) % 7]}
                    </Text>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: selected ? BLUE : "transparent", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: selected ? "#FFFFFF" : TEXT }}>
                        {d.getDate()}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          )}
        </LinearGradient>

        {/* ── SECTION 2 — Content (white) ── */}
        <View style={{ paddingTop: 22 }}>

          {/* ── Schedule (active) tab ─────────────────────────────────── */}
          {tab === "active" && (
            <View style={{ paddingHorizontal: 20 }}>
              {scheduleGroups.length === 0 ? (
                <EmptyActive onAdd={handleAdd} />
              ) : (
                scheduleGroups.map(({ date, lessons: dayLessons }, gi) => (
                  <DateGroupCard
                    key={date}
                    dateLabel={groupDateLabel(date, t, monthsFull)}
                    lessons={dayLessons}
                    onOpen={handleOpen}
                    delay={gi * 40}
                  />
                ))
              )}

              {/* stats footer bar */}
              {lessons.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4, marginBottom: 8 }}>
                  {[
                    { Icon: CalendarDays, value: totalCount,     label: t("lessonsStatTotal"),     color: BLUE,      bg: BLUE_50 },
                    { Icon: CheckCircle2, value: completedCount, label: t("lessonsStatCompleted"), color: "#22C55E", bg: "#ECFDF5" },
                    { Icon: Clock,        value: plannedCount,   label: t("lessonsStatPlanned"),   color: "#D97706", bg: "#FFFBEB" },
                    { Icon: Ban,          value: cancelledCount, label: t("lessonsStatCancelled"), color: "#EF4444", bg: "#FEF2F2" },
                  ].map(({ Icon, value, label, color, bg }, i) => (
                    <View key={i} style={{ flexBasis: "47%", flexGrow: 1, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: BORDER }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                        <Icon size={14} color={color} strokeWidth={2} />
                      </View>
                      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT }}>{value}</Text>
                      <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: SUB, marginTop: 1 }}>{label}</Text>
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
                <View style={{ marginTop: 16, backgroundColor: INDIGO_50, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E0E4FA" }}>
                  <Archive size={18} color={INDIGO} />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: INDIGO, flex: 1, lineHeight: 18 }}>
                    {t("lessonsArchiveHint")}
                  </Text>
                </View>
              )}

              <View style={{ gap: 10, marginTop: 16 }}>
                {filteredArchive.length === 0 ? (
                  <EmptyArchive />
                ) : (
                  filteredArchive.map((lesson, i) => (
                    <Animated.View key={lesson.id} entering={FadeInDown.delay(i * 30).duration(280)}>
                      <LessonCard lesson={lesson} onPress={() => handleOpen(lesson.id)} dimmed />
                    </Animated.View>
                  ))
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
