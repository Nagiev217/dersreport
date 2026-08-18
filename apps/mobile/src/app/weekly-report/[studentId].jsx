import { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Share, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Share2, CalendarRange } from "lucide-react-native";
import { useStudentsStore } from "@/utils/students/store";
import { useLessonsStore } from "@/utils/lessons/store";
import { useProgressStore } from "@/utils/progress/store";
import { useHomeworkStore } from "@/utils/homework/store";
import { useWritingStore } from "@/utils/writing/store";
import { useT } from "@/utils/i18n";

const PINK = "#8B5CF6";
const TEXT = "#111827";
const SUB = "#8E93A1";

const pad = (n) => String(n).padStart(2, "0");
const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function currentWeek() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now); mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: toStr(mon), end: toStr(sun) };
}

const avg = (arr) => (arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

// Builds the parent-facing weekly report text in Azerbaijani.
function buildAzReport({ studentName, week, lessonsCount, present, late, absent, evals, homeworks, writings }) {
  const L = [];
  L.push("📚 Həftəlik hesabat");
  L.push(`Şagird: ${studentName}`);
  L.push(`Həftə: ${week.start} — ${week.end}`);
  L.push("");
  L.push(`Dərslər: ${lessonsCount} dərs`);
  L.push(`Davamiyyət: ${present} iştirak, ${late} gecikmə, ${absent} qayıb`);

  if (evals.length) {
    const a = avg(evals.map((e) => e.activity).filter(Boolean));
    const c = avg(evals.map((e) => e.comprehension).filter(Boolean));
    const h = avg(evals.map((e) => e.homework).filter(Boolean));
    const b = avg(evals.map((e) => e.behavior).filter(Boolean));
    L.push("");
    L.push("Qiymətləndirmə (orta):");
    L.push(`• Fəallıq: ${a.toFixed(1)}/5`);
    L.push(`• Anlama: ${c.toFixed(1)}/5`);
    L.push(`• Ev tapşırığı: ${h.toFixed(1)}/5`);
    L.push(`• Davranış: ${b.toFixed(1)}/5`);
  }

  if (homeworks.length) {
    L.push("");
    L.push("Ev tapşırıqları:");
    homeworks.forEach((hw) => {
      const status = hw.status === "done" ? "✓ tamamlandı" : "gözləyir";
      L.push(`• ${hw.title} — ${status} (son tarix: ${hw.dueDate})`);
    });
  }

  if (writings.length) {
    L.push("");
    L.push("IELTS Writing:");
    writings.forEach((w) => {
      L.push(`• Task ${w.task}: ${Number(w.overall).toFixed(1)} bal`);
    });
  }

  const notes = evals.map((e) => e.notes).filter((n) => n && n.trim());
  if (notes.length) {
    L.push("");
    L.push("Müəllimin qeydləri:");
    notes.forEach((n) => L.push(`• ${n}`));
  }

  L.push("");
  L.push("— Jeff Colleges");
  return L.join("\n");
}

export default function WeeklyReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { studentId } = useLocalSearchParams();
  const { t, tName } = useT();

  const { students } = useStudentsStore();
  const { lessons } = useLessonsStore();
  const { evaluations } = useProgressStore();
  const { homework } = useHomeworkStore();
  const { writings } = useWritingStore();

  const student = students.find((s) => String(s.id) === String(studentId));
  const week = useMemo(() => currentWeek(), []);

  const report = useMemo(() => {
    const sid = String(studentId);
    const inWeek = (d) => d >= week.start && d <= week.end;

    const weekLessons = lessons.filter(
      (l) => (l.studentIds ?? []).map(String).includes(sid) && inWeek(l.date) && l.status !== "cancelled"
    );
    const weekEvals = evaluations.filter((e) => String(e.studentId) === sid && inWeek(e.date));
    // attendance defaults to "present" for older records without the field
    const present = weekEvals.filter((e) => (e.attendance ?? "present") === "present").length;
    const late = weekEvals.filter((e) => e.attendance === "late").length;
    const absent = weekEvals.filter((e) => e.attendance === "absent").length;
    const weekHw = homework.filter((h) => (h.studentIds ?? []).map(String).includes(sid));
    const weekWr = writings.filter((w) => String(w.studentId) === sid && inWeek(w.date));

    return {
      text: buildAzReport({
        studentName: tName(student?.name ?? "—"),
        week,
        lessonsCount: weekLessons.length,
        present, late, absent,
        evals: weekEvals,
        homeworks: weekHw,
        writings: weekWr,
      }),
      counts: { lessons: weekLessons.length, evals: weekEvals.length, hw: weekHw.length, wr: weekWr.length },
    };
  }, [studentId, lessons, evaluations, homework, writings, student, week, tName]);

  const handleShare = async () => {
    try {
      await Share.share({ message: report.text, title: `Həftəlik hesabat — ${tName(student?.name ?? "")}` });
    } catch (e) {
      Alert.alert(t("error"), e?.message ?? t("errorGeneric"));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF" }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("back")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={19} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>{t("weeklyReportTitle")}</Text>
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB }}>{tName(student?.name ?? "—")}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <CalendarRange size={16} color={PINK} />
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: SUB }}>{week.start} — {week.end}</Text>
        </View>

        {/* AZ report preview — monospace-ish block */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, shadowColor: "#0B1B3A", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#1C1C1E", lineHeight: 22 }}>
            {report.text}
          </Text>
        </View>
      </ScrollView>

      {/* Share bar */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#F2F2F7" }}>
        <TouchableOpacity onPress={handleShare} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t("weeklyReportShare")}
          style={{ height: 52, borderRadius: 16, backgroundColor: PINK, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
          <Share2 size={18} color="#FFFFFF" />
          <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("weeklyReportShare")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
