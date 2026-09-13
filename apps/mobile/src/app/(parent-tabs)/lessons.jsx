import { useMemo, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useParentData } from "@/utils/firebase/parentRealtime";
import { useT } from "@/utils/i18n";
import PressableScale from "@/components/PressableScale";

// Same "Светлый минимализм" palette as Home/Reports (Claude Design canvas,
// turn t3, option 3a — week strip + tap-a-day lesson list).
const INK    = "#0B1437";
const BLUE   = "#2F5BE8";
const BG     = "#F5F6FA";
const SUB    = "rgba(11,20,55,.62)";
const BORDER = "rgba(11,20,55,.07)";
const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 };

const DOW_SHORT = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const STATUS_CFG = {
  planned:   { label: "Запланирован", color: BLUE,      bg: "rgba(47,91,232,.1)" },
  completed: { label: "Проведён",     color: "#16A34A", bg: "rgba(22,163,74,.1)" },
  cancelled: { label: "Отменён",      color: "#DC2626", bg: "rgba(220,38,38,.1)" },
};

const pad = (n) => String(n).padStart(2, "0");
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addMinutes = (time, minutes) => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
};

export default function ParentLessons() {
  const insets = useSafeAreaInsets();
  const { tSubject, tName } = useT();
  const { students, lessons, loading } = useParentData();
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));

  const todayStr = toDateStr(new Date());

  const week = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday-start
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = toDateStr(d);
      return { dateStr, dow: DOW_SHORT[d.getDay()], num: d.getDate(), hasLessons: lessons.some((l) => l.date === dateStr) };
    });
  }, [lessons]);

  const dayLessons = lessons
    .filter((l) => l.date === selectedDate)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const dayTitle = selectedDate === todayStr ? "Сегодня" : (() => {
    const [, m, d] = selectedDate.split("-").map(Number);
    return `${d} ${MONTH_NAMES[m - 1]}`;
  })();

  const monthLabel = MONTH_NAMES[new Date().getMonth()];

  const nameFor = (l) => {
    const id = (l.studentIds ?? [])[0];
    return id ? tName(students.find((s) => String(s.id) === String(id))?.name ?? "") : "";
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: BG }} />;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + S.sm, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: S.xl, paddingBottom: S.md, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.5 }}>Расписание</Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: BLUE }}>{monthLabel}</Text>
        </View>

        <View style={{ paddingHorizontal: S.md, paddingBottom: S.md }}>
          <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 22, padding: 6, flexDirection: "row", gap: 2 }}>
            {week.map((d) => {
              const active = d.dateStr === selectedDate;
              return (
                <PressableScale
                  key={d.dateStr}
                  onPress={() => setSelectedDate(d.dateStr)}
                  style={{ flex: 1, borderRadius: 16, paddingVertical: 10, alignItems: "center", gap: 4, backgroundColor: active ? INK : "transparent" }}
                >
                  <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: active ? "rgba(255,255,255,0.6)" : SUB }}>{d.dow}</Text>
                  <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: active ? "#FFFFFF" : INK }}>{d.num}</Text>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: d.hasLessons ? (active ? "#FFFFFF" : BLUE) : "transparent" }} />
                </PressableScale>
              );
            })}
          </View>
        </View>

        <View style={{ paddingHorizontal: S.xl, paddingBottom: S.sm, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.2 }}>{dayTitle}</Text>
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: SUB }}>
            {dayLessons.length} {dayLessons.length === 1 ? "урок" : "уроков"}
          </Text>
        </View>

        <View style={{ paddingHorizontal: S.xl, gap: S.sm }}>
          {dayLessons.length === 0 ? (
            <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(11,20,55,.16)", borderRadius: 22, padding: 34, alignItems: "center", gap: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 11, borderWidth: 2, borderColor: "rgba(11,20,55,.16)" }} />
              <Text style={{ fontSize: 14.5, fontFamily: "Inter_700Bold", color: INK }}>Занятий нет</Text>
              <Text style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: SUB, textAlign: "center", maxWidth: 220 }}>
                Выберите другой день или напишите преподавателю, чтобы добавить урок.
              </Text>
            </View>
          ) : (
            dayLessons.map((l) => {
              const status = STATUS_CFG[l.status] ?? STATUS_CFG.planned;
              return (
                <View key={l.id} style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16, flexDirection: "row", gap: 14 }}>
                  <View style={{ width: 52, alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.3 }}>{l.time}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: SUB }}>{addMinutes(l.time, l.duration ?? 60)}</Text>
                  </View>
                  <View style={{ width: 2, borderRadius: 1, backgroundColor: BORDER }} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.1 }}>{l.topic || tSubject(l.subject) || "Урок"}</Text>
                    <Text style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: SUB }}>{tSubject(l.subject)}</Text>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                      {!!nameFor(l) && (
                        <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(11,20,55,.06)" }}>
                          <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: INK }}>{nameFor(l)}</Text>
                        </View>
                      )}
                      <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: status.bg }}>
                        <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: status.color }}>{status.label}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {dayLessons.length > 0 && (
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: S.xl, paddingTop: S.lg }}>
            <PressableScale
              onPress={() => Alert.alert("Скоро", "Сообщения преподавателю появятся в одном из следующих обновлений.")}
              style={{ flex: 1, backgroundColor: INK, borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
            >
              <Text style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>Написать преподавателю</Text>
            </PressableScale>
            <PressableScale
              onPress={() => Alert.alert("Скоро", "Перенос урока появится в одном из следующих обновлений.")}
              style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center" }}
            >
              <Text style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: INK }}>Перенести</Text>
            </PressableScale>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
