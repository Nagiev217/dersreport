import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Sparkles, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react-native";
import { checkEssay } from "@/utils/writing/essayChecker";
import { useEssayHistoryStore } from "@/utils/writing/essayHistoryStore";
import { useT } from "@/utils/i18n";

const GRAD = ["#10B981", "#059669"];
const TEXT = "#111827";
const SUB = "#8E93A1";
const CARD = "#FFFFFF";

function bandColor(b) {
  if (b >= 7) return "#22C55E";
  if (b >= 6) return "#3B82F6";
  if (b >= 5) return "#F59E0B";
  return "#EF4444";
}

function BandBadge({ band, size = 64 }) {
  const col = bandColor(band);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: col + "1A", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: col }}>
      <Text style={{ fontSize: size * 0.34, fontFamily: "Inter_700Bold", color: col }}>{band.toFixed(1)}</Text>
    </View>
  );
}

export default function EssayCheck() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const addCheck = useEssayHistoryStore((s) => s.addCheck);

  const [task, setTask] = useState(2);
  const [essay, setEssay] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const wordCount = (essay.trim().match(/[A-Za-z']+/g) || []).length;

  const run = async () => {
    if (wordCount < 20) return;
    setChecking(true);
    try {
      const res = await checkEssay({ text: essay, task });
      setResult(res);
      addCheck({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, task, essay, result: res, createdAt: Date.now() });
    } finally {
      setChecking(false);
    }
  };

  const reset = () => { setResult(null); };

  return (
    <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      {/* Header */}
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("back")}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={19} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Sparkles size={18} color="#FFFFFF" />
              <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.3 }}>{t("essayCheckTitle")}</Text>
            </View>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{t("essayCheckSubtitle")}</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={insets.top + 60}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!result ? (
            <>
              {/* Task picker */}
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT, marginBottom: 8 }}>{t("essayTaskLabel")}</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
                {[1, 2].map((tk) => {
                  const active = task === tk;
                  return (
                    <TouchableOpacity key={tk} onPress={() => setTask(tk)} activeOpacity={0.8}
                      style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: active ? "#ECFDF5" : CARD, borderWidth: 1.5, borderColor: active ? GRAD[0] : "#EDEEF1", alignItems: "center" }}>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: active ? GRAD[1] : TEXT }}>Task {tk}</Text>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, marginTop: 2 }}>{tk === 1 ? t("essayTask1Hint") : t("essayTask2Hint")}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Essay input */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT }}>{t("essayInputLabel")}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: wordCount >= (task === 1 ? 150 : 250) ? "#22C55E" : SUB }}>
                  {wordCount} {t("essayWords")}
                </Text>
              </View>
              <TextInput
                value={essay} onChangeText={setEssay} multiline textAlignVertical="top"
                placeholder={t("essayInputPlaceholder")} placeholderTextColor="#B7BCC7"
                style={{ minHeight: 260, backgroundColor: CARD, borderRadius: 16, padding: 16, fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular", color: TEXT, borderWidth: 1, borderColor: "#EDEEF1" }}
              />

              <TouchableOpacity onPress={run} disabled={checking || wordCount < 20} activeOpacity={0.85}
                style={{ marginTop: 18, height: 54, borderRadius: 15, backgroundColor: wordCount < 20 ? "#C7E9DA" : GRAD[1], alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
                {checking ? <ActivityIndicator color="#FFFFFF" /> : (
                  <>
                    <Sparkles size={18} color="#FFFFFF" />
                    <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("essayCheckBtn")}</Text>
                  </>
                )}
              </TouchableOpacity>
              {wordCount < 20 && (
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", marginTop: 10 }}>{t("essayMinHint")}</Text>
              )}
            </>
          ) : (
            <>
              {/* Overall band */}
              <View style={{ backgroundColor: CARD, borderRadius: 20, padding: 20, alignItems: "center", marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: SUB, marginBottom: 12, letterSpacing: 0.5 }}>{t("essayOverallBand")}</Text>
                <BandBadge band={result.overall} size={96} />
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center", marginTop: 14, lineHeight: 18 }}>{result.summaryRu}</Text>
              </View>

              {/* Criteria */}
              {result.criteria.map((c) => (
                <View key={c.key} style={{ backgroundColor: CARD, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <BandBadge band={c.band} size={52} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT }}>{c.titleEn}</Text>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: SUB, marginTop: 1 }}>{c.subtitleRu}</Text>
                    </View>
                  </View>
                  {c.adviceRu.map((a, i) => (
                    <View key={i} style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: bandColor(c.band), marginTop: 7 }} />
                      <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#3C3C43", lineHeight: 19 }}>{a}</Text>
                    </View>
                  ))}
                </View>
              ))}

              {/* Strengths */}
              {result.strengthsRu.length > 0 && (
                <View style={{ backgroundColor: "#ECFDF5", borderRadius: 16, padding: 16, marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <CheckCircle2 size={17} color="#22C55E" />
                    <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#15803D" }}>{t("essayStrengths")}</Text>
                  </View>
                  {result.strengthsRu.map((s, i) => (
                    <Text key={i} style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#166534", lineHeight: 20, marginTop: 2 }}>• {s}</Text>
                  ))}
                </View>
              )}

              {/* Improvements */}
              {result.improvementsRu.length > 0 && (
                <View style={{ backgroundColor: "#FEF3F2", borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <AlertTriangle size={17} color="#F97316" />
                    <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#C2410C" }}>{t("essayImprovements")}</Text>
                  </View>
                  {result.improvementsRu.map((s, i) => (
                    <Text key={i} style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#9A3412", lineHeight: 20, marginTop: 2 }}>• {s}</Text>
                  ))}
                </View>
              )}

              <TouchableOpacity onPress={reset} activeOpacity={0.85}
                style={{ height: 52, borderRadius: 15, backgroundColor: GRAD[1], alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}>
                <RotateCcw size={17} color="#FFFFFF" />
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{t("essayCheckAnother")}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
