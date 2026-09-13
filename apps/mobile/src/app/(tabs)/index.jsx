import { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Bell, ArrowLeft } from "lucide-react-native";
import { auth } from "@/utils/firebase/config";
import { useStudentsStore } from "@/utils/students/store";
import { useLessonsStore } from "@/utils/lessons/store";
import { useReportsStore } from "@/utils/reports/store";
import { useMyRole } from "@/utils/auth/useMyRole";
import { isStaffRole } from "@/utils/auth/permissions";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

// "Светлый минимализм" — imported from the same Claude Design canvas as the
// parent tabs (Lesson Reports Home.dc.html, turn t4, option 4a). Old design
// kept at index-variant-classic.jsx — see PROJECT.md if reconciling palettes.
const INK    = "#0B1437";
const BLUE   = "#2F5BE8";
const INDIGO = "#4F46E5";
const BG     = "#F5F6FA";
const SUB    = "rgba(11,20,55,.62)";
const BORDER = "rgba(11,20,55,.07)";
const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 };

const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const addMinutes = (time, minutes) => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
};
const initials = (name = "") => {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
};
const lessonsWord = (n) => (n % 10 === 1 && n % 100 !== 11 ? "урок" : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? "урока" : "уроков");
const MONTH_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
function relativeDateLabel(dateStr, today) {
  if (dateStr === today) return null;
  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  if (dateStr === tomorrowStr) return "Завтра";
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTH_SHORT[m - 1] ?? ""}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const myRole = useMyRole();
  const { t, tSubject, tName, tNameList } = useT();

  const { students } = useStudentsStore();
  const { lessons } = useLessonsStore();
  const { reports } = useReportsStore();

  const user = auth?.currentUser;
  const fullName = user?.displayName ?? t("profileTeacher");
  const today = todayStr();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dateHeader = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  const todayLessons = useMemo(
    () => lessons.filter((l) => l.date === today && l.status !== "cancelled").sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
    [lessons, today]
  );

  // "идёт сейчас" if inside a today lesson's time window, else the next
  // planned lesson — today first, falling back to the nearest future date
  // (so the card doesn't just disappear on a day with nothing scheduled).
  const current = useMemo(() => {
    const toMin = (tm) => { const [h, m] = (tm ?? "0:0").split(":").map(Number); return h * 60 + m; };
    const ongoing = todayLessons.find((l) => {
      const start = toMin(l.time);
      return nowMin >= start && nowMin < start + (l.duration ?? 60);
    });
    if (ongoing) return { lesson: ongoing, ongoing: true };
    const todayNext = todayLessons.find((l) => l.status === "planned" && toMin(l.time) >= nowMin);
    if (todayNext) return { lesson: todayNext, ongoing: false };
    const future = lessons
      .filter((l) => l.status === "planned" && l.date > today)
      .sort((a, b) => `${a.date}T${a.time ?? ""}`.localeCompare(`${b.date}T${b.time ?? ""}`))[0];
    return future ? { lesson: future, ongoing: false } : null;
  }, [todayLessons, lessons, today, nowMin]);

  // completed lessons with no matching report yet (by student + date)
  const pendingCount = useMemo(() => {
    const hasReport = (l) => reports.some((r) => (l.studentIds ?? []).includes(String(r.studentId)) && r.date === l.date);
    return lessons.filter((l) => l.status === "completed" && !hasReport(l)).length;
  }, [lessons, reports]);

  // attendance % per student, top 5 by lesson count
  const studentProgress = useMemo(() => {
    return students
      .map((s) => {
        const sl = lessons.filter((l) => (l.studentIds ?? []).includes(String(s.id)));
        const done = sl.filter((l) => l.status === "completed").length;
        return { id: s.id, name: s.name, pct: sl.length ? Math.round((done / sl.length) * 100) : 0, count: sl.length };
      })
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [students, lessons]);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + S.sm, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.springify().damping(18).stiffness(180)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl }}>
          <View style={{ gap: 3, flex: 1 }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: SUB, textTransform: "capitalize" }}>{dateHeader}</Text>
            <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.4 }}>
              {todayLessons.length} {lessonsWord(todayLessons.length)} сегодня
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {isStaffRole(myRole) && (
              <PressableScale
                onPress={() => router.replace("/(admin-tabs)")}
                accessibilityRole="button"
                accessibilityLabel={t("backToAdmin")}
                style={{ width: 40, height: 40, borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
              >
                <ArrowLeft size={16} color={INK} />
              </PressableScale>
            )}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Уведомления"
              style={{ width: 40, height: 40, borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}
            >
              <Bell size={16} color={INK} />
            </PressableScale>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: INK, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{initials(tName(fullName))}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={{ paddingHorizontal: S.xl, gap: S.md, marginTop: S.lg }}>
          {/* Идёт сейчас / Следующий урок */}
          {current && (
            <Animated.View
              entering={FadeInDown.delay(40).springify().damping(18).stiffness(180)}
              style={{ backgroundColor: INK, borderRadius: 24, padding: S.xl, overflow: "hidden" }}
            >
              <View style={{ position: "absolute", right: -50, top: -60, width: 190, height: 190, borderRadius: 95, backgroundColor: "rgba(79,70,229,0.4)" }} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#8FA6FF" }} />
                  <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 1 }}>
                    {current.ongoing ? "Идёт сейчас" : "Следующий урок"}
                  </Text>
                </View>
                <View style={{ backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                    {[relativeDateLabel(current.lesson.date, today), `${current.lesson.time} – ${addMinutes(current.lesson.time, current.lesson.duration ?? 60)}`].filter(Boolean).join(", ")}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 13, marginTop: 16 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{initials((current.lesson.studentNames ?? [])[0] ?? "?")}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 19, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.3 }}>
                    {current.lesson.studentNames?.length ? tNameList(current.lesson.studentNames) : "—"}
                  </Text>
                  <Text style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" }}>
                    {tSubject(current.lesson.subject)} · {current.lesson.format === "Офлайн" ? t("offline") : t("online")}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
                <PressableScale
                  onPress={() => router.push(`/report/add?studentId=${(current.lesson.studentIds ?? [])[0] ?? ""}`)}
                  style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 15, paddingVertical: 13, alignItems: "center" }}
                >
                  <Text style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: INK }}>Заполнить отчёт</Text>
                </PressableScale>
                <PressableScale
                  onPress={() => router.push(`/lesson/${current.lesson.id}`)}
                  style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 15, paddingVertical: 13, paddingHorizontal: 16 }}
                >
                  <Text style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>План урока</Text>
                </PressableScale>
              </View>
            </Animated.View>
          )}

          {/* Отчёты не отправлены */}
          {pendingCount > 0 && (
            <Animated.View
              entering={FadeInDown.delay(70).springify().damping(18).stiffness(180)}
              style={{ backgroundColor: "#EEF1FC", borderWidth: 1, borderColor: "rgba(79,70,229,0.18)", borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}
            >
              <View style={{ gap: 3, flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontFamily: "Inter_700Bold", color: "#1E1B4B" }}>{pendingCount} {lessonsWord(pendingCount)} без отчёта</Text>
                <Text style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: "rgba(30,27,75,.65)" }}>Родители ждут обратную связь</Text>
              </View>
              <PressableScale
                onPress={() => router.navigate("/(tabs)/reports")}
                style={{ backgroundColor: "#3730A3", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 }}
              >
                <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>Заполнить</Text>
              </PressableScale>
            </Animated.View>
          )}

          {/* Расписание на сегодня */}
          <Animated.View entering={FadeInDown.delay(100).springify().damping(18).stiffness(180)}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingVertical: 6 }}>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.2 }}>Расписание на сегодня</Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: BLUE }}>Неделя</Text>
            </View>
            {todayLessons.length === 0 ? (
              <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 24, alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: SUB }}>{t("homeNoLessonsToday")}</Text>
              </View>
            ) : (
              <View style={{ gap: S.sm }}>
                {todayLessons.map((l) => {
                  const state = l.status === "completed" ? "Проведён" : l.status === "planned" ? "Запланирован" : l.status;
                  const stateColor = l.status === "completed" ? "#16A34A" : BLUE;
                  const stateBg = l.status === "completed" ? "rgba(22,163,74,.1)" : "rgba(47,91,232,.1)";
                  return (
                    <PressableScale
                      key={l.id}
                      onPress={() => router.push(`/lesson/${l.id}`)}
                      style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
                    >
                      <Text style={{ width: 42, fontSize: 13.5, fontFamily: "Inter_700Bold", color: INK }}>{l.time}</Text>
                      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: BLUE }}>{initials((l.studentNames ?? [])[0] ?? "?")}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={1} style={{ fontSize: 14.5, fontFamily: "Inter_700Bold", color: INK }}>
                          {l.studentNames?.length ? tNameList(l.studentNames) : "—"}
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: SUB }}>{tSubject(l.subject)}</Text>
                      </View>
                      <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: stateBg }}>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: stateColor }}>{state}</Text>
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            )}
          </Animated.View>

          {/* Прогресс учеников */}
          {studentProgress.length > 0 && (
            <Animated.View entering={FadeInDown.delay(140).springify().damping(18).stiffness(180)}>
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingVertical: 6 }}>
                <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.2 }}>Прогресс учеников</Text>
                <PressableScale onPress={() => router.navigate("/(tabs)/students")}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: BLUE }}>Все {students.length}</Text>
                </PressableScale>
              </View>
              <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 22, paddingHorizontal: 18 }}>
                {studentProgress.map((s, i) => (
                  <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: BORDER }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF1FC", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: "#3730A3" }}>{initials(s.name)}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: INK }} numberOfLines={1}>{tName(s.name)}</Text>
                        <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: INK }}>{s.pct}%</Text>
                      </View>
                      <View style={{ height: 5, borderRadius: 3, backgroundColor: "#E6E9F5", overflow: "hidden" }}>
                        <View style={{ height: "100%", width: `${s.pct}%`, borderRadius: 3, backgroundColor: i % 2 ? INDIGO : BLUE }} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
