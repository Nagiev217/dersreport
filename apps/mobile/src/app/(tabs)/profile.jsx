import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, Easing } from "react-native-reanimated";
import {
  LogOut,
  GraduationCap,
  Users,
  BookOpen,
  FileText,
  BarChart2,
  Camera,
  Pencil,
  ChevronRight,
  Bell,
  Info,
  Star,
  CalendarDays,
  UserCircle,
  X,
  Globe,
  Check,
} from "lucide-react-native";
import { signOut, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, IS_FIREBASE_READY } from "@/utils/firebase/config";
import { useStudentsStore } from "@/utils/students/store";
import { useReportsStore } from "@/utils/reports/store";
import { useLessonsStore } from "@/utils/lessons/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearCachedRole } from "@/utils/auth/roleCache";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import PressableScale from "@/components/PressableScale";
import DevAccountSwitcher from "@/components/DevAccountSwitcher";
import { useT, useLangStore } from "@/utils/i18n";

const PHOTO_KEY = "teacherProfilePhoto";
const NOTIF_KEY = "teacherNotifications";

// ─── Design tokens — Blue + Indigo + White, matching the Boss dashboard ─────
const BLUE      = "#2563EB";
const INDIGO    = "#4F46E5";
const BLUE_50   = "#EFF6FF";
const INDIGO_50 = "#EEF2FF";
const TEXT  = "#111827";
const SUB   = "#8E93A1";
const BORDER = "#E5E9F2";

const LANG_OPTIONS = [
  { id: "ru", flag: "🇷🇺", native: "Русский" },
  { id: "az", flag: "🇦🇿", native: "Azərbaycan" },
  { id: "en", flag: "🇬🇧", native: "English" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, alignItems: "center", gap: 6, borderWidth: 1, borderColor: BORDER }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={color} />
      </View>
      <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT }}>{value}</Text>
      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: SUB, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title }) {
  return (
    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: SUB, textTransform: "uppercase", letterSpacing: 0.6, marginHorizontal: 20, marginBottom: 8, marginTop: 20 }}>
      {title}
    </Text>
  );
}

function MenuRow({ icon: Icon, iconColor, iconBg, label, value, onPress, right }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: iconBg ?? "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
        <Icon size={17} color={iconColor ?? SUB} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: TEXT }} numberOfLines={1}>
        {label}
      </Text>
      {right ?? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {value ? <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB }}>{value}</Text> : null}
          <ChevronRight size={16} color="#C7C7CC" />
        </View>
      )}
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: "#F1F5F9", marginLeft: 64 }} />;
}

function Card({ children, style }) {
  return (
    <View style={[{ marginHorizontal: 20, backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: BORDER }, style]}>
      {children}
    </View>
  );
}

// ─── Language Picker Modal ────────────────────────────────────────────────────

function LangModal({ visible, onClose }) {
  const { t } = useT();
  const { lang, setLang } = useLangStore();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: insets.bottom + 20, paddingTop: 8 }}>
            {/* Handle */}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center" }}>
                  <Globe size={18} color={BLUE} />
                </View>
                <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>
                  {t("langTitle")}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
                <X size={16} color={SUB} />
              </TouchableOpacity>
            </View>

            <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: BORDER }}>
              {LANG_OPTIONS.map((opt, i) => {
                const active = lang === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={0.7}
                    onPress={() => { setLang(opt.id); onClose(); }}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 14,
                      padding: 16,
                      backgroundColor: active ? BLUE_50 : "#FFFFFF",
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: "#F1F5F9",
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>{opt.flag}</Text>
                    <Text style={{ flex: 1, fontSize: 16, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular", color: active ? BLUE : TEXT }}>
                      {opt.native}
                    </Text>
                    {active && <Check size={20} color={BLUE} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Edit Name Modal ──────────────────────────────────────────────────────────

function EditNameModal({ visible, currentName, onSave, onClose }) {
  const { t } = useT();
  const [value, setValue] = useState(currentName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setValue(currentName);
  }, [visible, currentName]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: trimmed });
      if (IS_FIREBASE_READY && db && auth.currentUser) {
        await setDoc(doc(db, "users", auth.currentUser.uid), { name: trimmed }, { merge: true });
      }
      onSave(trimmed);
    } catch {
      Alert.alert(t("error"), t("profileErrName"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "rgba(15,23,42,0.45)", position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT }}>
              {t("profileEditName")}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={SUB} />
            </TouchableOpacity>
          </View>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={t("profileYourName")}
            placeholderTextColor="#C7C7CC"
            autoFocus
            style={{ backgroundColor: "#F2F2F7", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: "Inter_400Regular", color: TEXT, marginBottom: 16 }}
          />
          <PressableScale
            onPress={handleSave}
            disabled={saving || !value.trim()}
            scaleTo={0.97}
            style={{ borderRadius: 16, overflow: "hidden" }}
          >
            <LinearGradient
              colors={value.trim() ? [BLUE, INDIGO] : ["#E5E5EA", "#E5E5EA"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ height: 52, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: value.trim() ? "#FFFFFF" : "#8E8E93" }}>
                {saving ? t("saving") : t("save")}
              </Text>
            </LinearGradient>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TeacherProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const { lang } = useLangStore();

  const [displayName,  setDisplayName]  = useState(auth?.currentUser?.displayName ?? t("profileTeacher"));
  const [photoUri,     setPhotoUri]     = useState(null);
  const [notifications,setNotifications]= useState(true);
  const [showEditName, setShowEditName] = useState(false);
  const [showLang,     setShowLang]     = useState(false);

  const email = auth?.currentUser?.email ?? "";
  const { students } = useStudentsStore();
  const { reports }  = useReportsStore();
  const { lessons }  = useLessonsStore();

  const currentLangLabel = LANG_OPTIONS.find(o => o.id === lang);

  useEffect(() => {
    AsyncStorage.multiGet([PHOTO_KEY, NOTIF_KEY]).then(([[, photo], [, notif]]) => {
      if (photo) setPhotoUri(photo);
      if (notif !== null) setNotifications(notif === "true");
    });
  }, []);

  const pickPhoto = () => {
    Alert.alert(t("profilePickPhotoTitle"), t("profilePickPhotoSrc"), [
      {
        text: t("profileGallery"),
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(t("profileNoAccess"), t("profileNoAccessGallery"));
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
          if (!result.canceled) savePhoto(result.assets[0].uri);
        },
      },
      {
        text: t("profileCamera"),
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(t("profileNoAccess"), t("profileNoAccessCamera"));
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
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
      await AsyncStorage.setItem(PHOTO_KEY, dest);
    } catch {
      setPhotoUri(uri);
      await AsyncStorage.setItem(PHOTO_KEY, uri);
    }
  };

  const toggleNotifications = async (val) => {
    setNotifications(val);
    await AsyncStorage.setItem(NOTIF_KEY, String(val));
  };

  const handleSignOut = () => {
    if (!IS_FIREBASE_READY || !auth) return;
    Alert.alert(t("profileSignOutTitle"), t("profileSignOutMsg"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("profileSignOutBtn"),
        style: "destructive",
        onPress: async () => {
          await clearCachedRole();
          signOut(auth)
            .then(() => router.replace("/role-select"))
            .catch(() => router.replace("/role-select"));
        },
      },
    ]);
  };

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: "#FFFFFF" }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Fills the top overscroll/bounce gap with the hero color instead of white */}
        <View pointerEvents="none" style={{ position: "absolute", top: -600, left: 0, right: 0, height: 600, backgroundColor: BLUE_50 }} />
        {/* ── SECTION 1 — Hero (gradient blue-50 → indigo-50 → white) ── */}
        <LinearGradient
          colors={[BLUE_50, INDIGO_50, "#FFFFFF"]}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ paddingTop: insets.top + 16, paddingHorizontal: 24, paddingBottom: 24, alignItems: "center" }}
        >
          <Animated.View entering={FadeInDown.duration(360).easing(Easing.out(Easing.cubic))} style={{ alignItems: "center" }}>
            <PressableScale onPress={pickPhoto} scaleTo={0.95} accessibilityRole="button" accessibilityLabel={t("profileChangePhoto")} style={{ marginBottom: 16 }}>
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: BLUE, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#FFFFFF", overflow: "hidden" }}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={{ width: 96, height: 96 }} />
                ) : (
                  <Text style={{ fontSize: 36, fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                    {displayName[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER }}>
                <Camera size={14} color={BLUE} />
              </View>
            </PressableScale>

            <TouchableOpacity onPress={() => setShowEditName(true)} activeOpacity={0.8} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT }}>{displayName}</Text>
              <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: BLUE_50, alignItems: "center", justifyContent: "center" }}>
                <Pencil size={12} color={BLUE} />
              </View>
            </TouchableOpacity>

            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: SUB, marginBottom: 12 }}>
              {email}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(37,99,235,0.1)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
              <GraduationCap size={13} color={BLUE} />
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: BLUE }}>
                {t("profileTeacher")}
              </Text>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 20, marginTop: 20, marginBottom: 4 }}>
          <StatCard icon={Users}    label={t("profileStudents")} value={students.length} color={BLUE}   bg={BLUE_50} />
          <StatCard icon={BookOpen} label={t("profileLessons")}  value={lessons.length}  color={INDIGO} bg={INDIGO_50} />
          <StatCard icon={FileText} label={t("profileReports")}  value={reports.length}  color="#22C55E" bg="#ECFDF5" />
        </View>

        {/* ── Аккаунт ────────────────────────────────────────────────────── */}
        <SectionHeader title={t("profileSectionAccount")} />
        <Card>
          <MenuRow icon={Pencil}     iconColor={BLUE}   iconBg={BLUE_50}   label={t("profileChangeName")} value={displayName} onPress={() => setShowEditName(true)} />
          <Divider />
          <MenuRow icon={Camera}     iconColor={INDIGO} iconBg={INDIGO_50} label={t("profileChangePhoto")} onPress={pickPhoto} />
          <Divider />
          <MenuRow icon={UserCircle} iconColor={SUB}    iconBg="#F1F5F9"   label={t("profileChangeRole")} onPress={() => router.replace("/role-select")} />
        </Card>

        {/* ── Быстрый доступ ─────────────────────────────────────────────── */}
        <SectionHeader title={t("profileSectionQuick")} />
        <Card>
          <MenuRow icon={Users}       iconColor={BLUE}   iconBg={BLUE_50}   label={t("profileMyStudents")} value={`${students.length}`} onPress={() => router.navigate("/(tabs)/students")} />
          <Divider />
          <MenuRow icon={CalendarDays} iconColor="#D97706" iconBg="#FFFBEB"  label={t("profileSchedule")}   onPress={() => router.navigate("/(tabs)/schedule")} />
          <Divider />
          <MenuRow icon={BarChart2}   iconColor="#22C55E" iconBg="#ECFDF5"  label={t("profileAnalytics")}  onPress={() => router.navigate("/(tabs)/analytics")} />
        </Card>

        {/* ── Настройки ──────────────────────────────────────────────────── */}
        <SectionHeader title={t("profileSectionSettings")} />
        <Card>
          <MenuRow
            icon={Bell}
            iconColor="#D97706"
            iconBg="#FFFBEB"
            label={t("profileNotifications")}
            right={
              <Switch
                value={notifications}
                onValueChange={toggleNotifications}
                trackColor={{ false: "#E5E5EA", true: BLUE_50 }}
                thumbColor={notifications ? BLUE : "#FFFFFF"}
              />
            }
          />
          <Divider />
          <MenuRow
            icon={Globe}
            iconColor={BLUE}
            iconBg={BLUE_50}
            label={t("profileLanguage")}
            value={currentLangLabel ? `${currentLangLabel.flag} ${currentLangLabel.native}` : ""}
            onPress={() => setShowLang(true)}
          />
        </Card>

        {/* ── О приложении ───────────────────────────────────────────────── */}
        <SectionHeader title={t("profileSectionAbout")} />
        <Card style={{ marginBottom: 16 }}>
          <MenuRow icon={Info} iconColor={INDIGO} iconBg={INDIGO_50} label={t("profileVersion")} value="1.0.0" onPress={() => {}} />
          <Divider />
          <MenuRow
            icon={Star}
            iconColor="#D97706"
            iconBg="#FFFBEB"
            label={t("profileRate")}
            onPress={() => Alert.alert(t("profileRateThx"), t("profileRateMsg"))}
          />
        </Card>

        {/* ── Выйти ──────────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.8}
          style={{ marginHorizontal: 20, height: 52, borderRadius: 16, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, borderWidth: 1, borderColor: "#FECACA" }}
        >
          <LogOut size={16} color="#EF4444" />
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#EF4444" }}>
            {t("profileSignOut")}
          </Text>
        </TouchableOpacity>

        <DevAccountSwitcher currentRole="teacher" />
      </ScrollView>

      <EditNameModal
        visible={showEditName}
        currentName={displayName}
        onSave={(name) => { setDisplayName(name); setShowEditName(false); }}
        onClose={() => setShowEditName(false)}
      />

      <LangModal visible={showLang} onClose={() => setShowLang(false)} />
    </>
  );
}
