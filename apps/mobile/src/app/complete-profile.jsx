import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator,
  Platform, KeyboardAvoidingView, StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Camera, GraduationCap, Users, CheckCircle2,
  Phone, FileText, DollarSign, ArrowRight, SkipForward,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { auth } from "@/utils/firebase/config";
import {
  updateTeacherProfile,
  updateParentProfile,
  markProfileCompleted,
} from "@/utils/firebase/users";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useT } from "@/utils/i18n";

const TEACHER_SUBJECTS = [
  "Математика", "Физика", "Химия", "Биология", "История",
  "Английский", "Русский язык", "Азербайджанский",
  "Информатика", "Музыка", "Рисование", "Физкультура",
  "Немецкий", "Французский", "Литература", "Обществознание",
  "Экономика", "География",
];

const ROLE_META = {
  teacher: {
    gradient: ["#4F46E5", "#6B5CF6"],
    Icon: GraduationCap,
    color: "#6B5CF6",
    lightBg: "#EEF0FF",
    titleKey: "completeProfileTeacherTitle",
  },
  parent: {
    gradient: ["#0EA5E9", "#6366F1"],
    Icon: Users,
    color: "#0EA5E9",
    lightBg: "#E0F2FE",
    titleKey: "completeProfileParentTitle",
  },
};

function SubjectChip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: selected ? "#6B5CF6" : "#F2F2F7",
        borderWidth: selected ? 0 : 1,
        borderColor: "#E5E5EA",
        flexDirection: "row", alignItems: "center", gap: 4,
      }}
    >
      {selected && <CheckCircle2 size={13} color="#FFFFFF" />}
      <Text style={{
        fontSize: 13,
        fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
        color: selected ? "#FFFFFF" : "#3C3C43",
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SectionLabel({ children }) {
  return (
    <Text style={{
      fontSize: 13, fontFamily: "Inter_600SemiBold",
      color: "#8E8E93", textTransform: "uppercase",
      letterSpacing: 0.5, marginBottom: 10, marginTop: 24,
    }}>
      {children}
    </Text>
  );
}

function InputField({ placeholder, value, onChangeText, keyboardType, multiline, numberOfLines }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#C7C7CC"
      keyboardType={keyboardType ?? "default"}
      multiline={multiline}
      numberOfLines={numberOfLines}
      autoCapitalize="none"
      autoCorrect={false}
      style={{
        backgroundColor: "#F2F2F7", borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: multiline ? 14 : 0,
        height: multiline ? undefined : 52,
        minHeight: multiline ? 100 : undefined,
        fontSize: 15, fontFamily: "Inter_400Regular",
        color: "#1C1C1E", textAlignVertical: multiline ? "top" : "center",
      }}
    />
  );
}

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const { role } = useLocalSearchParams();
  const effectiveRole = role === "parent" ? "parent" : "teacher";
  const meta = ROLE_META[effectiveRole];
  const { t } = useT();

  const [photoUri, setPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);

  // Teacher fields
  const [subjects, setSubjects] = useState([]);
  const [lessonPrice, setLessonPrice] = useState("");
  const [description, setDescription] = useState("");

  // Parent fields
  const [phone, setPhone] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const uid = auth?.currentUser?.uid;

  const pickPhoto = () => {
    Alert.alert(t("completeProfilePhotoTitle"), t("completeProfilePhotoSource"), [
      {
        text: t("completeProfileGallery"),
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") { Alert.alert(t("completeProfileNoAccess"), t("completeProfileGalleryDenied")); return; }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.7,
          });
          if (!result.canceled) savePhoto(result.assets[0].uri);
        },
      },
      {
        text: t("completeProfileCamera"),
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") { Alert.alert(t("completeProfileNoAccess"), t("completeProfileCameraDenied")); return; }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.7,
          });
          if (!result.canceled) savePhoto(result.assets[0].uri);
        },
      },
      { text: t("cancel"), style: "cancel" },
    ]);
  };

  const savePhoto = async (uri) => {
    try {
      const dest = FileSystem.documentDirectory + "profile_photo.jpg";
      await FileSystem.copyAsync({ from: uri, to: dest });
      setPhotoUri(dest);
      await AsyncStorage.setItem("teacherProfilePhoto", dest);
    } catch {
      setPhotoUri(uri);
      await AsyncStorage.setItem("teacherProfilePhoto", uri);
    }
  };

  const toggleSubject = (s) => {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const navigate = () => {
    router.replace(effectiveRole === "parent" ? "/(parent-tabs)" : "/(tabs)");
  };

  const handleSave = async () => {
    if (!uid) { navigate(); return; }
    setSaving(true);
    try {
      if (effectiveRole === "teacher") {
        await updateTeacherProfile(uid, {
          photoURL: photoUri,
          subjects,
          lessonPrice: lessonPrice ? Number(lessonPrice) : null,
          description: description.trim(),
        });
      } else {
        await updateParentProfile(uid, {
          photoURL: photoUri,
          phone: phone.trim(),
          additionalInfo: additionalInfo.trim(),
        });
      }
      await markProfileCompleted(uid);
    } catch {}
    finally { setSaving(false); }
    navigate();
  };

  const handleSkip = async () => {
    if (uid) markProfileCompleted(uid).catch(() => {});
    navigate();
  };

  const displayName = auth?.currentUser?.displayName ?? "";

  return (
    <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      <StatusBar barStyle="light-content" />

      {/* Hero banner */}
      <LinearGradient
        colors={meta.gradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 24,
          paddingBottom: 36,
          alignItems: "center",
        }}
      >
        {/* Avatar picker */}
        <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85}>
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: "rgba(255,255,255,0.25)",
            alignItems: "center", justifyContent: "center",
            borderWidth: 3, borderColor: "rgba(255,255,255,0.5)",
            overflow: "hidden",
          }}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: 100, height: 100 }} />
            ) : (
              <Text style={{ fontSize: 36, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                {displayName[0]?.toUpperCase() ?? "?"}
              </Text>
            )}
          </View>
          <View style={{
            position: "absolute", bottom: 2, right: 2,
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: "#FFFFFF",
            alignItems: "center", justifyContent: "center",
            shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
          }}>
            <Camera size={14} color={meta.color} />
          </View>
        </TouchableOpacity>

        <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 14 }}>
          {displayName || t("completeProfileWelcome")}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
          {t("completeProfileSubtitle")}
        </Text>

        {/* Progress badge */}
        <View style={{
          marginTop: 12, paddingHorizontal: 14, paddingVertical: 6,
          backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20,
          flexDirection: "row", alignItems: "center", gap: 6,
        }}>
          <meta.Icon size={13} color="#FFFFFF" />
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
            {t(meta.titleKey)}
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}
        >
          {effectiveRole === "teacher" ? (
            <>
              <SectionLabel>{t("completeProfileSubjects")}</SectionLabel>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {TEACHER_SUBJECTS.map(s => (
                  <SubjectChip
                    key={s} label={s}
                    selected={subjects.includes(s)}
                    onPress={() => toggleSubject(s)}
                  />
                ))}
              </View>

              <SectionLabel>{t("completeProfileLessonPrice")}</SectionLabel>
              <View style={{
                flexDirection: "row", alignItems: "center",
                backgroundColor: "#F2F2F7", borderRadius: 14,
                paddingHorizontal: 16, height: 52, gap: 10,
              }}>
                <DollarSign size={18} color="#8E8E93" />
                <TextInput
                  value={lessonPrice}
                  onChangeText={setLessonPrice}
                  placeholder={t("completeProfilePricePlaceholder")}
                  placeholderTextColor="#C7C7CC"
                  keyboardType="numeric"
                  style={{ flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E" }}
                />
              </View>

              <SectionLabel>{t("completeProfileAbout")}</SectionLabel>
              <View style={{ backgroundColor: "#F2F2F7", borderRadius: 14, padding: 16 }}>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t("completeProfileAboutPlaceholder")}
                  placeholderTextColor="#C7C7CC"
                  multiline
                  numberOfLines={4}
                  style={{
                    fontSize: 15, fontFamily: "Inter_400Regular",
                    color: "#1C1C1E", minHeight: 100, textAlignVertical: "top",
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <SectionLabel>{t("completeProfilePhone")}</SectionLabel>
              <View style={{
                flexDirection: "row", alignItems: "center",
                backgroundColor: "#F2F2F7", borderRadius: 14,
                paddingHorizontal: 16, height: 52, gap: 10,
              }}>
                <Phone size={18} color="#8E8E93" />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+994 XX XXX XX XX"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="phone-pad"
                  style={{ flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#1C1C1E" }}
                />
              </View>

              <SectionLabel>{t("completeProfileAdditional")}</SectionLabel>
              <View style={{ backgroundColor: "#F2F2F7", borderRadius: 14, padding: 16 }}>
                <TextInput
                  value={additionalInfo}
                  onChangeText={setAdditionalInfo}
                  placeholder={t("completeProfileAdditionalPlaceholder")}
                  placeholderTextColor="#C7C7CC"
                  multiline
                  numberOfLines={4}
                  style={{
                    fontSize: 15, fontFamily: "Inter_400Regular",
                    color: "#1C1C1E", minHeight: 100, textAlignVertical: "top",
                  }}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky bottom buttons */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1, borderTopColor: "#F2F2F7",
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: insets.bottom + 12,
        flexDirection: "row", gap: 10,
      }}>
        <TouchableOpacity
          onPress={handleSkip}
          style={{
            flex: 1, height: 52, borderRadius: 14,
            backgroundColor: "#F2F2F7",
            alignItems: "center", justifyContent: "center",
            flexDirection: "row", gap: 6,
          }}
        >
          <SkipForward size={16} color="#8E8E93" />
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#8E8E93" }}>
            {t("completeProfileSkip")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          style={{
            flex: 2, height: 52, borderRadius: 14,
            backgroundColor: meta.color,
            alignItems: "center", justifyContent: "center",
            flexDirection: "row", gap: 8,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                {t("completeProfileSave")}
              </Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
