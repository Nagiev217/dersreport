import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Archive } from "lucide-react-native";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import PressableScale from "@/components/PressableScale";
import { useLessonsStore } from "@/utils/lessons/store";
import { useT, useDateLocale } from "@/utils/i18n";
import { formatDateShort, todayStr, toDateStr } from "@/utils/dateUtils";

// "Светлый минимализм" — тот же canvas, что и остальные вкладки
// (Lesson Reports Home.dc.html, turn t5, option 5a).
const INK    = "#0B1437";
const BLUE   = "#2F5BE8";
const BG     = "#F5F6FA";
const SUB    = "rgba(11,20,55,.62)";
const BORDER = "rgba(11,20,55,.07)";
const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 };

const DOW_SHORT = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

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

const STATUS_CFG = {
  planned:   { color: BLUE,      bg: "rgba(47,91,232,.1)" },
  completed: { color: "#16A34A", bg: "rgba(22,163,74,.1)" },
  cancelled: { color: "#DC2626", bg: "rgba(220,38,38,.1)" },
};

// ─── Карточка урока (canvas 5a) ─────────────────────────────────────────────
function LessonRow({ lesson, onPress }) {
  const { t, tSubject, tName, tNameList } = useT();
  const cfg = STATUS_CFG[lesson.status] ?? STATUS_CFG.planned;
  const statusLabel = lesson.status === "completed" ? "Проведён" : lesson.status === "cancelled" ? "Отменён" : "Запланирован";
  const isGroup = (lesson.studentIds ?? []).length > 1;
  const names = Array.isArray(lesson.studentNames) && lesson.studentNames.length
    ? tNameList(lesson.studentNames)
    : tName(lesson.student ?? "—");

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16, flexDirection: "row", gap: 14 }}
    >
      <View style={{ width: 50, alignItems: "center", gap: 5 }}>
        <Text style={{ fontSize: 14.5, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.2 }}>{lesson.time}</Text>
        <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: SUB }}>{lesson.duration ?? 60} {t("min_abbr")}</Text>
      </View>
      <View style={{ width: 2, borderRadius: 1, backgroundColor: BORDER }} />
      <View style={{ flex: 1, gap: 7, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 14.5, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.1 }}>{names}</Text>
        <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: SUB }}>{tSubject(lesson.subject)}</Text>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(11,20,55,.06)" }}>
            <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: INK }}>{isGroup ? "Группа" : "Инд."}</Text>
          </View>
          <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: cfg.bg }}>
            <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: cfg.color }}>{statusLabel}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

// ─── Карточка урока в архиве (плоский список) ───────────────────────────────
function ArchiveRow({ lesson, onPress }) {
  const { tSubject, tName, tNameList } = useT();
  const locale = useDateLocale();
  const cfg = STATUS_CFG[lesson.status] ?? STATUS_CFG.planned;
  const statusLabel = lesson.status === "completed" ? "Проведён" : lesson.status === "cancelled" ? "Отменён" : "Запланирован";
  const names = Array.isArray(lesson.studentNames) && lesson.studentNames.length
    ? tNameList(lesson.studentNames)
    : tName(lesson.student ?? "—");

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16, gap: 8, opacity: 0.85 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontFamily: "Inter_700Bold", color: INK }}>{tSubject(lesson.subject)}</Text>
        <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: cfg.bg }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: cfg.color }}>{statusLabel}</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: SUB }}>{names}</Text>
      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: SUB }}>
        {lesson.date ? formatDateShort(lesson.date, locale) : ""} · {lesson.time}
      </Text>
    </PressableScale>
  );
}

// ─── Пустые состояния ───────────────────────────────────────────────────────
function EmptyActive({ onAdd }) {
  return (
    <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(11,20,55,.16)", borderRadius: 22, padding: 34, alignItems: "center", gap: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 11, borderWidth: 2, borderColor: "rgba(11,20,55,.16)" }} />
      <Text style={{ fontSize: 14.5, fontFamily: "Inter_700Bold", color: INK }}>Уроков нет</Text>
      <Text style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: SUB, textAlign: "center", maxWidth: 230 }}>
        Свободный день. Можно добавить урок на эту дату.
      </Text>
      <PressableScale onPress={onAdd} style={{ marginTop: 4, backgroundColor: INK, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11 }}>
        <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>Добавить урок</Text>
      </PressableScale>
    </View>
  );
}
function EmptyArchive() {
  const { t } = useT();
  return (
    <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "#EEF1FC", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Archive size={32} color="#3730A3" />
      </View>
      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: INK, marginBottom: 6, textAlign: "center" }}>
        {t("lessonsArchiveEmpty")}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", lineHeight: 20 }}>
        {t("lessonsArchiveEmptyHint")}
      </Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LessonsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();

  const [tab, setTab] = useState("active"); // "active" | "archive"
  const [kindFilter, setKindFilter] = useState(null); // архив-фильтр статуса
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const filterAll       = t("all");
  const filterDone      = t("lessonsFilterDone");
  const filterCancelled = t("lessonsFilterCancelled");
  const ARCHIVE_FILTERS = [filterAll, filterDone, filterCancelled];
  const activeArchiveFilter = kindFilter ?? filterAll;

  const { lessons } = useLessonsStore();

  const now = new Date();
  const today = todayStr();
  const weekDates = useMemo(() => getCurrentWeek(), []);

  const { active, archived } = useMemo(() => {
    const active = [];
    const archived = [];
    for (const l of lessons) (isArchived(l, now) ? archived : active).push(l);
    archived.sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
    return { active, archived };
  }, [lessons]);

  const weekLoad = useMemo(() => {
    const map = {};
    lessons.forEach((l) => { map[l.date] = (map[l.date] ?? 0) + 1; });
    return map;
  }, [lessons]);

  // Смотрим по всем урокам этого дня, а не только по "active" — иначе
  // прошедший/завершённый урок (ушедший в архив) пропадал бы из недели.
  const dayLessons = useMemo(
    () => lessons.filter((l) => l.date === selectedDate).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
    [lessons, selectedDate]
  );
  const dayLoadHours = Math.round(dayLessons.reduce((sum, l) => sum + (l.duration ?? 60), 0) / 60 * 10) / 10;

  const filteredArchive = useMemo(() => {
    let list = archived;
    if (activeArchiveFilter === filterDone) list = list.filter((l) => l.status === "completed");
    else if (activeArchiveFilter === filterCancelled) list = list.filter((l) => l.status === "cancelled");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) =>
        l.subject.toLowerCase().includes(q) ||
        (l.studentNames ?? []).some((n) => n.toLowerCase().includes(q)) ||
        (l.student ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [archived, activeArchiveFilter, search, filterDone, filterCancelled]);

  function switchTab(newTab) {
    setTab(newTab);
    setKindFilter(null);
    setSearch("");
  }

  const handleAdd = () => router.push("/lesson/add");
  const handleOpen = (id) => router.push(`/lesson/${id}`);

  const dayTitle = selectedDate === today ? "Сегодня" : (() => {
    const [, m, d] = selectedDate.split("-").map(Number);
    const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    return `${d} ${months[m - 1]}`;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: S.xl, paddingBottom: S.md, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.5 }}>{t("scheduleTitle")}</Text>
          <PressableScale onPress={handleAdd}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: BLUE }}>Добавить урок</Text>
          </PressableScale>
        </View>

        {/* Сегменты — Расписание / Архив */}
        <View style={{ paddingHorizontal: S.xl, paddingBottom: S.md }}>
          <View style={{ flexDirection: "row", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 4, gap: 4 }}>
            {[{ id: "active", label: "Расписание" }, { id: "archive", label: t("lessonsTabArchive") }].map(({ id, label }) => {
              const active = tab === id;
              return (
                <PressableScale
                  key={id}
                  onPress={() => switchTab(id)}
                  scaleTo={0.97}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                  style={{ flex: 1, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: active ? INK : "transparent" }}
                >
                  <Text style={{ fontSize: 13.5, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? "#FFFFFF" : SUB }}>{label}</Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {tab === "active" ? (
          <>
            {/* Неделя с нагрузкой */}
            <View style={{ paddingHorizontal: S.md, paddingBottom: S.md }}>
              <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 22, padding: 6, flexDirection: "row", gap: 2 }}>
                {weekDates.map((d) => {
                  const ds = toDateStr(d);
                  const active = ds === selectedDate;
                  const load = Math.min(3, weekLoad[ds] ?? 0);
                  return (
                    <PressableScale
                      key={ds}
                      onPress={() => setSelectedDate(ds)}
                      style={{ flex: 1, borderRadius: 16, paddingVertical: 10, alignItems: "center", gap: 6, backgroundColor: active ? INK : "transparent" }}
                    >
                      <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: active ? "rgba(255,255,255,0.6)" : SUB }}>{DOW_SHORT[(d.getDay() + 6) % 7]}</Text>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: active ? "#FFFFFF" : INK }}>{d.getDate()}</Text>
                      <View style={{ flexDirection: "row", gap: 2, height: 4 }}>
                        {Array.from({ length: 3 }, (_, i) => (
                          <View
                            key={i}
                            style={{
                              width: 4, height: 4, borderRadius: 2,
                              backgroundColor: i < load ? (active ? "#FFFFFF" : BLUE) : (active ? "rgba(255,255,255,0.25)" : "rgba(11,20,55,.1)"),
                            }}
                          />
                        ))}
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            </View>

            <View style={{ paddingHorizontal: S.xl, paddingBottom: S.sm, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.2 }}>{dayTitle}</Text>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: SUB }}>
                {dayLessons.length} {dayLessons.length === 1 ? "урок" : "уроков"}{dayLessons.length > 0 ? ` · ${dayLoadHours} ч` : ""}
              </Text>
            </View>

            <View style={{ paddingHorizontal: S.xl, gap: S.sm }}>
              {dayLessons.length === 0 ? (
                <EmptyActive onAdd={handleAdd} />
              ) : (
                dayLessons.map((l, i) => (
                  <Animated.View key={l.id} entering={FadeInDown.delay(i * 30).duration(280)}>
                    <LessonRow lesson={l} onPress={() => handleOpen(l.id)} />
                  </Animated.View>
                ))
              )}
            </View>
          </>
        ) : (
          <View style={{ paddingHorizontal: S.xl }}>
            <SearchBar placeholder={t("lessonsSearchArchive")} value={search} onChangeText={setSearch} showMic={false} />
            <View style={{ marginTop: 14, marginLeft: -20, paddingLeft: 20 }}>
              <FilterChips options={ARCHIVE_FILTERS} selected={activeArchiveFilter} onSelect={setKindFilter} />
            </View>

            <View style={{ gap: S.sm, marginTop: S.lg }}>
              {filteredArchive.length === 0 ? (
                <EmptyArchive />
              ) : (
                filteredArchive.map((lesson, i) => (
                  <Animated.View key={lesson.id} entering={FadeInDown.delay(i * 30).duration(280)}>
                    <ArchiveRow lesson={lesson} onPress={() => handleOpen(lesson.id)} />
                  </Animated.View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
