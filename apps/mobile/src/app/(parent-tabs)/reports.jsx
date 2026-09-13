import { useMemo, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { useParentData } from "@/utils/firebase/parentRealtime";
import PressableScale from "@/components/PressableScale";

// Same "Светлый минимализм" palette as the Home tab (Claude Design canvas,
// turn t2, options 2a/2b). See index.jsx for the palette's origin note.
const INK    = "#0B1437";
const BLUE   = "#2F5BE8";
const INDIGO = "#4F46E5";
const BG     = "#F5F6FA";
const SUB    = "rgba(11,20,55,.62)";
const BORDER = "rgba(11,20,55,.07)";
const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 };

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const MONTH_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function dateShort(dateStr) {
  if (!dateStr) return "";
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTH_SHORT[m - 1] ?? ""}`;
}

// ─── Список ("2a") ──────────────────────────────────────────────────────────

function ReportsList({ students, reports, onOpen }) {
  const [childFilter, setChildFilter] = useState(null); // null = все

  const filtered = childFilter ? reports.filter((r) => String(r.studentId) === childFilter) : reports;
  const child = childFilter ? students.find((s) => String(s.id) === childFilter) : null;

  const avg = filtered.length ? filtered.reduce((sum, r) => sum + (r.activityScore ?? 0), 0) / filtered.length : 0;

  const months = useMemo(() => {
    const groups = [];
    const seen = {};
    filtered.forEach((r) => {
      const key = (r.date ?? "").slice(0, 7); // YYYY-MM
      if (!seen[key]) { seen[key] = { key, items: [] }; groups.push(seen[key]); }
      seen[key].items.push(r);
    });
    return groups.sort((a, b) => b.key.localeCompare(a.key));
  }, [filtered]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: S.xl, paddingBottom: S.md }}>
        <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.5 }}>Отчёты</Text>
      </View>

      {students.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.xl, paddingBottom: S.md }}>
          {[{ id: null, name: "Все" }, ...students].map((c) => {
            const active = c.id === childFilter || (c.id === null && childFilter === null);
            return (
              <PressableScale
                key={c.id ?? "all"}
                onPress={() => setChildFilter(c.id === null ? null : String(c.id))}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
                  backgroundColor: active ? INK : "#FFFFFF",
                  borderWidth: active ? 0 : 1, borderColor: BORDER,
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: active ? "#FFFFFF" : INK }}>{c.name}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      )}

      <View style={{ paddingHorizontal: S.xl, paddingBottom: S.md }}>
        <View style={{ backgroundColor: INK, borderRadius: 22, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1 }}>Итог за месяц</Text>
            <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
              {avg > 0 ? `${child?.name ?? "Все дети"} · ${filtered.length} ${filtered.length === 1 ? "отчёт" : "отчётов"}` : "Пока нет отчётов"}
            </Text>
          </View>
          {avg > 0 && (
            <Text style={{ fontSize: 32, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -1 }}>{avg.toFixed(1)}</Text>
          )}
        </View>
      </View>

      <View style={{ paddingHorizontal: S.xl, gap: S.sm }}>
        {months.length === 0 ? (
          <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 20, padding: 40, alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: SUB, textAlign: "center" }}>Отчётов пока нет</Text>
          </View>
        ) : (
          months.map(({ key, items }) => {
            const [, m] = key.split("-").map(Number);
            return (
              <View key={key} style={{ gap: S.sm, paddingBottom: S.xs }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 4, paddingTop: S.xs }}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: SUB, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    {MONTH_NAMES[m - 1] ?? key}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: SUB }}>{items.length}</Text>
                </View>
                {items.map((r) => (
                  <PressableScale
                    key={r.id}
                    onPress={() => onOpen(r)}
                    style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 14, flexDirection: "row", gap: 12 }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: BLUE }}>{r.activityScore ?? "—"}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 5 }}>
                      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                        <Text style={{ flex: 1, fontSize: 14.5, fontFamily: "Inter_700Bold", color: INK, letterSpacing: -0.1 }} numberOfLines={1}>
                          {r.topic ?? "Отчёт об уроке"}
                        </Text>
                        <Text style={{ fontSize: 11.5, fontFamily: "Inter_600SemiBold", color: SUB }}>{dateShort(r.date)}</Text>
                      </View>
                      {!!r.comment && (
                        <Text numberOfLines={2} style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: SUB, lineHeight: 18 }}>{r.comment}</Text>
                      )}
                      {!!(r.difficulties || r.nextLessonPlan) && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: INDIGO }} />
                          <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#3730A3" }}>
                            Над чем поработать: {r.difficulties || r.nextLessonPlan}
                          </Text>
                        </View>
                      )}
                    </View>
                  </PressableScale>
                ))}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

// ─── Детали ("2b") ──────────────────────────────────────────────────────────

function ReportDetail({ report, studentName, insets, onBack }) {
  const focus = report.difficulties || report.nextLessonPlan;
  const passedTopic = report.description || report.topic;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl, paddingTop: insets.top + S.sm, paddingBottom: S.md }}>
        <PressableScale onPress={onBack} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Назад" style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={18} color={BLUE} />
          <Text style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: BLUE }}>Отчёты</Text>
        </PressableScale>
        {!!studentName && <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: SUB }}>{studentName}</Text>}
      </View>

      <View style={{ paddingHorizontal: S.xl, paddingBottom: S.md }}>
        <View style={{ backgroundColor: INK, borderRadius: 24, padding: 22, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -50, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(79,70,229,0.4)" }} />
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1 }}>Отчёт об уроке</Text>
              <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.4, lineHeight: 26 }}>{report.topic ?? "Урок"}</Text>
              <Text style={{ fontSize: 12.5, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.65)" }}>{dateShort(report.date)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Оценка</Text>
              <Text style={{ fontSize: 42, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -1.5 }}>{report.activityScore ?? "—"}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: S.xl, gap: S.md }}>
        {!!passedTopic && (
          <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 22, padding: 20, gap: 8 }}>
            <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: SUB, textTransform: "uppercase", letterSpacing: 1 }}>Пройденная тема</Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: INK, lineHeight: 21 }}>{passedTopic}</Text>
          </View>
        )}

        {!!report.comment && (
          <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 22, padding: 20, gap: 8 }}>
            <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: SUB, textTransform: "uppercase", letterSpacing: 1 }}>Комментарий преподавателя</Text>
            <Text style={{ fontSize: 14.5, fontFamily: "Inter_400Regular", color: "rgba(11,20,55,.78)", lineHeight: 22 }}>{report.comment}</Text>
          </View>
        )}

        {!!focus && (
          <View style={{ backgroundColor: "#EEF1FC", borderWidth: 1, borderColor: "rgba(79,70,229,0.18)", borderRadius: 22, padding: 20, gap: 8 }}>
            <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: "#3730A3", textTransform: "uppercase", letterSpacing: 1 }}>Над чем поработать</Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: "#1E1B4B", lineHeight: 21 }}>{focus}</Text>
          </View>
        )}

        {!!report.strengths && (
          <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 22, padding: 20, gap: 8 }}>
            <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: SUB, textTransform: "uppercase", letterSpacing: 1 }}>Получилось хорошо</Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: INK, lineHeight: 21 }}>{report.strengths}</Text>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 8, paddingTop: S.xs }}>
          <PressableScale
            onPress={() => Alert.alert("Скоро", "Сообщения преподавателю появятся в одном из следующих обновлений.")}
            style={{ flex: 1, backgroundColor: INK, borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
          >
            <Text style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>Написать преподавателю</Text>
          </PressableScale>
          <PressableScale
            onPress={() => Alert.alert("Скоро", "Делиться отчётами можно будет в одном из следующих обновлений.")}
            style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center" }}
          >
            <Text style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: INK }}>Поделиться</Text>
          </PressableScale>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ParentReports() {
  const insets = useSafeAreaInsets();
  const { students, reports, loading } = useParentData();
  const [selected, setSelected] = useState(null);

  if (selected) {
    const student = students.find((s) => String(s.id) === String(selected.studentId));
    return <ReportDetail report={selected} studentName={student?.name} insets={insets} onBack={() => setSelected(null)} />;
  }

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: BG }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top + S.sm }}>
      <ReportsList students={students} reports={reports} onOpen={setSelected} />
    </View>
  );
}
