import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, FileText, Shield } from "lucide-react-native";
import { useParentsStore } from "@/utils/parents/store";
import { useStudentsStore } from "@/utils/students/store";
import { useReportsStore } from "@/utils/reports/store";
import { useT } from "@/utils/i18n";
import { ReportRow } from "./index";

// Full report list for a parent — reached from the "see all" link on the
// parent-portal home screen once a child has more than 3 reports. Reuses
// ReportRow from ./index so the row look stays identical to the home preview.
export default function ParentAllReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { parentId } = useLocalSearchParams();
  const { t, tSubject } = useT();

  const { parents } = useParentsStore();
  const { students } = useStudentsStore();
  const { reports, markAsRead } = useReportsStore();

  const parent = parents.find((p) => p.id === parentId);

  if (!parent) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Shield size={48} color="#C7C7CC" />
        <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#1C1C1E", marginTop: 16, marginBottom: 8 }}>
          {t("portalNotFound")}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#6B5CF6", borderRadius: 14 }}
        >
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const myStudentIds = new Set(students.filter((s) => (parent.studentIds ?? []).includes(s.id)).map((s) => s.id));
  const myReports = reports
    .filter((r) => myStudentIds.has(r.studentId))
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F2F2F7" }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ backgroundColor: "#6B5CF6", paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
            {t("parentRecentReports")}
          </Text>
        </View>
      </View>

      <View style={{ marginHorizontal: 20, marginTop: 16 }}>
        {myReports.length === 0 ? (
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: 32, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
            <FileText size={28} color="#C7C7CC" />
            <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: "#8E8E93", marginTop: 12, textAlign: "center" }}>
              {t("portalReportsEmpty")}
            </Text>
          </View>
        ) : (
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
            {myReports.map((report, idx) => (
              <View key={report.id}>
                <ReportRow
                  report={report}
                  isNew={!report.isRead}
                  tSubject={tSubject}
                  onPress={() => {
                    markAsRead(report.id);
                    router.push(`/parent-portal/report/${report.id}?parentId=${parentId}`);
                  }}
                />
                {idx < myReports.length - 1 && (
                  <View style={{ height: 0.5, backgroundColor: "#F2F2F7" }} />
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
