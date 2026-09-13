import { View, Text, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useStudentsStore } from "@/utils/students/store";
import { useLessonsStore } from "@/utils/lessons/store";
import { useReportsStore } from "@/utils/reports/store";
import PressableScale from "@/components/PressableScale";
import { useT } from "@/utils/i18n";

// "Светлый минимализм" — тот же canvas, что и остальные вкладки
// (Lesson Reports Home.dc.html, turn t6, option 6a).
const INK    = "#0B1437";
const BLUE   = "#2F5BE8";
const BG     = "#F5F6FA";
const SUB    = "rgba(11,20,55,.62)";
const BORDER = "rgba(11,20,55,.07)";
const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 };

const MONTH_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
function relativeDate(dateStr, today) {
  if (dateStr === today) return "сегодня";
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTH_SHORT[m - 1] ?? ""}`;
}
function initials(name = "") {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}
const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, tSubject, tName } = useT();
  const [seg, setSeg] = useState("todo"); // "todo" | "sent"

  const { students } = useStudentsStore();
  const { lessons } = useLessonsStore();
  const { reports } = useReportsStore();

  const today = todayStr();
  const nameOf = (id) => tName(students.find((s) => String(s.id) === String(id))?.name ?? "—");

  // Очередь "нужно заполнить" — завершённые уроки без отчёта того же дня.
  const todoQueue = useMemo(() => {
    const hasReport = (l) => reports.some((r) => (l.studentIds ?? []).includes(String(r.studentId)) && r.date === l.date);
    return lessons
      .filter((l) => l.status === "completed" && !hasReport(l))
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  }, [lessons, reports]);

  const sentQueue = useMemo(
    () => [...reports].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [reports]
  );

  const items = seg === "todo" ? todoQueue : sentQueue;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: S.xl, paddingBottom: S.md, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.5 }}>{t("reportsTitle")}</Text>
          <PressableScale onPress={() => Alert.alert("Скоро", "Шаблоны отчётов появятся в одном из следующих обновлений.")}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: BLUE }}>Шаблоны</Text>
          </PressableScale>
        </View>

        {/* Сегменты — нужно заполнить / отправленные */}
        <View style={{ paddingHorizontal: S.xl, paddingBottom: S.md }}>
          <View style={{ flexDirection: "row", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 5, gap: 4 }}>
            {[
              { key: "todo", label: "Нужно заполнить", n: todoQueue.length },
              { key: "sent", label: "Отправленные", n: sentQueue.length },
            ].map((s) => {
              const active = seg === s.key;
              return (
                <PressableScale
                  key={s.key}
                  onPress={() => setSeg(s.key)}
                  scaleTo={0.97}
                  accessibilityRole="button"
                  accessibilityLabel={s.label}
                  accessibilityState={{ selected: active }}
                  style={{ flex: 1, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: active ? INK : "transparent" }}
                >
                  <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? "#FFFFFF" : SUB }}>{s.label}</Text>
                  <View style={{ minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: active ? "rgba(255,255,255,0.18)" : "rgba(11,20,55,.06)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: active ? "#FFFFFF" : SUB }}>{s.n}</Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* Заполнить всё по шаблону */}
        {seg === "todo" && todoQueue.length > 0 && (
          <View style={{ paddingHorizontal: S.xl, paddingBottom: S.md }}>
            <PressableScale
              onPress={() => router.push(`/report/add?studentId=${(todoQueue[0].studentIds ?? [])[0] ?? ""}`)}
              scaleTo={0.985}
              style={{ backgroundColor: INK, borderRadius: 20, padding: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, overflow: "hidden" }}
            >
              <View style={{ position: "absolute", right: -40, top: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(79,70,229,0.45)" }} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 14.5, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>Заполнить всё по шаблону</Text>
                <Text style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" }}>
                  {todoQueue.length} {todoQueue.length === 1 ? "отчёт" : "отчёта"} · ~{Math.max(1, todoQueue.length)} мин
                </Text>
              </View>
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 }}>
                <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: INK }}>Начать</Text>
              </View>
            </PressableScale>
          </View>
        )}

        {/* Список */}
        <View style={{ paddingHorizontal: S.xl, gap: S.sm }}>
          {items.length === 0 ? (
            <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 40, alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: SUB, textAlign: "center" }}>
                {seg === "todo" ? "Все отчёты заполнены" : "Отчётов пока нет"}
              </Text>
            </View>
          ) : seg === "todo" ? (
            todoQueue.map((l, i) => {
              const studentId = (l.studentIds ?? [])[0];
              const who = l.studentNames?.length ? l.studentNames.map(tName).join(", ") : nameOf(studentId);
              return (
                <Animated.View key={l.id} entering={FadeInDown.delay(i * 30).duration(280)}>
                  <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16, gap: 12 }}>
                    <View style={{ flexDirection: "row", gap: 13, alignItems: "flex-start" }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEF1FC", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: "#3730A3" }}>{initials(who)}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.1 }}>{who}</Text>
                        <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: SUB }}>
                          {tSubject(l.subject)} · {relativeDate(l.date, today)}{l.time ? ` ${l.time}` : ""}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <PressableScale
                        onPress={() => router.push(`/report/add?studentId=${studentId ?? ""}`)}
                        style={{ flex: 1, backgroundColor: INK, borderRadius: 13, paddingVertical: 11, alignItems: "center" }}
                      >
                        <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>Заполнить</Text>
                      </PressableScale>
                      <PressableScale
                        onPress={() => Alert.alert("Скоро", "Шаблоны отчётов появятся в одном из следующих обновлений.")}
                        style={{ borderWidth: 1, borderColor: "rgba(11,20,55,.14)", borderRadius: 13, paddingHorizontal: 14, paddingVertical: 11 }}
                      >
                        <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: INK }}>Шаблон</Text>
                      </PressableScale>
                    </View>
                  </View>
                </Animated.View>
              );
            })
          ) : (
            sentQueue.map((r, i) => (
              <Animated.View key={r.id} entering={FadeInDown.delay(i * 30).duration(280)}>
                <PressableScale
                  onPress={() => router.push(`/report/${r.id}`)}
                  scaleTo={0.985}
                  style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16, flexDirection: "row", gap: 13, alignItems: "flex-start" }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEF1FC", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: "#3730A3" }}>{initials(tName(r.studentName ?? "—"))}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.1 }}>{tName(r.studentName ?? "—")}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: SUB }}>
                      {r.topic ?? tSubject(r.subject)} · {relativeDate(r.date, today)}
                    </Text>
                  </View>
                  <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: "rgba(11,20,55,.06)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#3730A3" }}>{r.activityScore ?? "—"}</Text>
                  </View>
                </PressableScale>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
