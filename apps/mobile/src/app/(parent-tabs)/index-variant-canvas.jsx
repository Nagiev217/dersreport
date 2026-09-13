import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { ChevronRight, SlidersHorizontal } from "lucide-react-native";
import { useParentData } from "@/utils/firebase/parentRealtime";
import { getScoreColor } from "@/data/mockData";
import PressableScale from "@/components/PressableScale";
import VariantSwitcher from "@/components/VariantSwitcher";

// ─── "Светлый минимализм" — imported from the Claude Design canvas
// (Lesson Reports Home.dc.html, turn t1, option 1a). Own palette by design,
// same as the other comparison variants in this file group. ────────────────
const INK      = "#0B1437";
const BLUE     = "#2F5BE8";
const INDIGO   = "#4F46E5";
const BG       = "#F5F6FA";
const SUB      = "rgba(11,20,55,.62)";
const BORDER   = "rgba(11,20,55,.07)";

const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 };

const WEEKDAY_NAMES = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
const MONTH_NAMES = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

function initials(name) {
  return (name ?? "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

function AttendanceRing({ size = 78, progress = 0 }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, progress)) / 100);
  const c = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={c} cy={c} r={r} stroke="#E6E9F5" strokeWidth={stroke} fill="none" />
        <Circle
          cx={c} cy={c} r={r}
          stroke={BLUE} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.3 }}>{progress}%</Text>
    </View>
  );
}

export default function ParentHomeVariantCanvas() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { students, lessons, reports } = useParentData();
  const [selectedId, setSelectedId] = useState(null);

  const parentName = "родитель";
  const child = students.find((s) => String(s.id) === selectedId) ?? students[0];
  const childIdStr = child ? String(child.id) : null;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dateLabel = `${WEEKDAY_NAMES[now.getDay()]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]}`;

  const childLessons = childIdStr ? lessons.filter((l) => (l.studentIds ?? []).map(String).includes(childIdStr)) : [];
  const childReports = childIdStr ? reports.filter((r) => String(r.studentId) === childIdStr) : [];

  const completed = childLessons.filter((l) => l.status === "completed");
  const attendance = childLessons.length ? Math.round((completed.length / childLessons.length) * 100) : 0;

  const upcoming = childLessons
    .filter((l) => l.date >= today && l.status === "planned")
    .sort((a, b) => `${a.date}T${a.time ?? ""}`.localeCompare(`${b.date}T${b.time ?? ""}`))[0];

  const hoursUntil = upcoming
    ? Math.max(1, Math.round((new Date(`${upcoming.date}T${upcoming.time ?? "00:00"}`) - now) / 3600000))
    : null;

  const recentReports = childReports.slice(0, 3);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ paddingTop: insets.top + S.md, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.springify().damping(18).stiffness(180)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl }}>
        <View style={{ gap: 3 }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: SUB, textTransform: "uppercase", letterSpacing: 0.9 }}>{dateLabel}</Text>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.4 }}>Здравствуйте, {parentName}</Text>
        </View>
        <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
          <SlidersHorizontal size={15} color={INK} />
        </View>
      </Animated.View>

      <View style={{ paddingHorizontal: S.xl }}>
        <VariantSwitcher activeKey="index-variant-canvas" activeColor={BLUE} activeBg="#EEF2FF" />
      </View>

      {/* Kids carousel */}
      {students.length > 0 && (
        <Animated.View entering={FadeInDown.delay(40).springify().damping(18).stiffness(180)} style={{ marginTop: S.lg }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: S.xl }}>
            {students.map((s) => {
              const active = String(s.id) === childIdStr;
              const rs = reports.filter((r) => String(r.studentId) === String(s.id));
              const avg = rs.length ? rs.reduce((sum, r) => sum + (r.activityScore ?? 0), 0) / rs.length : 0;
              return (
                <PressableScale
                  key={s.id}
                  onPress={() => setSelectedId(String(s.id))}
                  style={{
                    width: 232, borderRadius: 22, padding: S.xl,
                    backgroundColor: active ? INK : "#FFFFFF",
                    borderWidth: active ? 0 : 1, borderColor: BORDER,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: active ? "rgba(255,255,255,0.15)" : "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: active ? "#FFFFFF" : BLUE }}>{initials(s.name)}</Text>
                    </View>
                    <View style={{ gap: 2 }}>
                      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: active ? "#FFFFFF" : INK, letterSpacing: -0.2 }}>{s.name}</Text>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: active ? "rgba(255,255,255,0.6)" : SUB }}>
                        {[s.type, s.subject].filter(Boolean).join(" · ") || "Ученик"}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 18 }}>
                    <View style={{ gap: 2 }}>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: active ? "rgba(255,255,255,0.6)" : SUB }}>Средняя оценка</Text>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: active ? "#FFFFFF" : INK }}>{avg.toFixed(1)}</Text>
                    </View>
                  </View>
                </PressableScale>
              );
            })}
          </ScrollView>

          {students.length > 1 && (
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: S.md }}>
              {students.map((s) => (
                <View
                  key={s.id}
                  style={{
                    width: 6, height: 6, borderRadius: 3,
                    backgroundColor: String(s.id) === childIdStr ? BLUE : "rgba(11,20,55,0.15)",
                  }}
                />
              ))}
            </View>
          )}
        </Animated.View>
      )}

      <View style={{ paddingHorizontal: S.xl, gap: S.md, marginTop: S.lg }}>
        {/* Успеваемость */}
        {child && (
          <Animated.View
            entering={FadeInDown.delay(80).springify().damping(18).stiffness(180)}
            style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 22, padding: S.xl }}
          >
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: S.lg }}>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.2 }}>Успеваемость</Text>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: SUB }}>посещаемость</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
              <AttendanceRing progress={attendance} />
              <View style={{ flex: 1, gap: 12 }}>
                <View style={{ gap: 3 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: SUB }}>Прогресс по программе</Text>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: INK }}>
                    {completed.length} из {childLessons.length || completed.length} уроков пройдено
                  </Text>
                </View>
                {recentReports.length > 0 && (
                  <View style={{ flexDirection: "row", gap: 7 }}>
                    {recentReports.map((r, i) => (
                      <View
                        key={r.id ?? i}
                        style={{
                          width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center",
                          backgroundColor: getScoreColor(r.activityScore ?? 0) + "1A",
                        }}
                      >
                        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: getScoreColor(r.activityScore ?? 0) }}>
                          {r.activityScore ?? "—"}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Следующий урок */}
        {upcoming && (
          <Animated.View
            entering={FadeInDown.delay(120).springify().damping(18).stiffness(180)}
            style={{ backgroundColor: INK, borderRadius: 22, padding: S.xl, overflow: "hidden" }}
          >
            <View style={{ position: "absolute", right: -40, top: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(79,70,229,0.35)" }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1 }}>Следующий урок</Text>
              {hoursUntil != null && (
                <View style={{ backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>через {hoursUntil} ч</Text>
                </View>
              )}
            </View>
            <View style={{ marginTop: 14, gap: 5 }}>
              <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.3 }}>{upcoming.subject ?? "Урок"}</Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.68)" }}>
                {upcoming.date === today ? "Сегодня" : upcoming.date}{upcoming.time ? ` · ${upcoming.time}` : ""} · {child?.name}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <PressableScale
                onPress={() => router.push("/(parent-tabs)/lessons")}
                style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
              >
                <Text style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: INK }}>Расписание</Text>
              </PressableScale>
              <PressableScale
                onPress={() => Alert.alert("Скоро", "Сообщения преподавателю появятся в одном из следующих обновлений.")}
                style={{ flex: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
              >
                <Text style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>Написать преподавателю</Text>
              </PressableScale>
            </View>
          </Animated.View>
        )}

        {/* Последние отчёты */}
        {recentReports.length > 0 && (
          <Animated.View entering={FadeInDown.delay(160).springify().damping(18).stiffness(180)}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingVertical: 6 }}>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.2 }}>Последние отчёты</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/(parent-tabs)/reports")}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: BLUE }}>Все</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: S.md }}>
              {recentReports.map((r, i) => (
                <PressableScale
                  key={r.id ?? i}
                  onPress={() => router.push("/(parent-tabs)/reports")}
                  style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 16, flexDirection: "row", gap: 14 }}
                >
                  <View
                    style={{
                      width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center",
                      backgroundColor: getScoreColor(r.activityScore ?? 0) + "1A",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: getScoreColor(r.activityScore ?? 0) }}>{r.activityScore ?? "—"}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                      <Text style={{ flex: 1, fontSize: 14.5, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.1 }} numberOfLines={1}>
                        {r.topic ?? "Отчёт об уроке"}
                      </Text>
                      <Text style={{ fontSize: 11.5, fontFamily: "Inter_600SemiBold", color: SUB }}>{r.date}</Text>
                    </View>
                    {!!r.comment && (
                      <Text numberOfLines={2} style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, lineHeight: 18 }}>
                        {r.comment}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={16} color={SUB} style={{ marginTop: 2 }} />
                </PressableScale>
              ))}
            </View>
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}
