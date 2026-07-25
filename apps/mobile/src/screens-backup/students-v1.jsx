import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { UserPlus, GraduationCap, Search } from "lucide-react-native";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import StudentCard from "@/components/StudentCard";
import AddStudentModal from "@/components/AddStudentModal";
import { useStudentsStore } from "@/utils/students/store";

const EmptyStudents = ({ onAdd }) => (
  <View style={{ alignItems: "center", paddingTop: 52, paddingHorizontal: 32 }}>
    <View style={{
      width: 80, height: 80, borderRadius: 24,
      backgroundColor: "#EEF0FF",
      alignItems: "center", justifyContent: "center",
      marginBottom: 20,
    }}>
      <GraduationCap size={36} color="#6B5CF6" />
    </View>
    <Text style={{
      fontSize: 20, fontFamily: "Inter_700Bold",
      color: "#1C1C1E", marginBottom: 8, textAlign: "center",
    }}>
      Учеников пока нет
    </Text>
    <Text style={{
      fontSize: 14, fontFamily: "Inter_400Regular",
      color: "#8E8E93", textAlign: "center",
      lineHeight: 20, marginBottom: 28,
    }}>
      Добавьте первого ученика, чтобы{"\n"}начать отслеживать прогресс
    </Text>
    <TouchableOpacity
      onPress={onAdd}
      activeOpacity={0.85}
      style={{
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#6B5CF6", paddingHorizontal: 24,
        paddingVertical: 13, borderRadius: 14,
      }}
    >
      <UserPlus size={17} color="#FFFFFF" />
      <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>
        Добавить ученика
      </Text>
    </TouchableOpacity>
  </View>
);

const EmptySearch = () => (
  <View style={{ alignItems: "center", paddingTop: 40, paddingHorizontal: 32 }}>
    <View style={{
      width: 56, height: 56, borderRadius: 16,
      backgroundColor: "#F2F2F7",
      alignItems: "center", justifyContent: "center",
      marginBottom: 12,
    }}>
      <Search size={24} color="#C7C7CC" />
    </View>
    <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: "#8E8E93", textAlign: "center" }}>
      Ученики не найдены
    </Text>
  </View>
);

const FILTERS = ["Все", "Активные", "IELTS", "SAT"];

export default function StudentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("Все");
  const [showAddModal, setShowAddModal] = useState(false);

  const { students } = useStudentsStore();

  const filtered = students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      selected === "Все" || selected === "Активные" || s.type === selected;
    return matchSearch && matchFilter;
  });

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F2F2F7" }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            marginBottom: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 32,
                  fontFamily: "Inter_700Bold",
                  color: "#1C1C1E",
                  letterSpacing: -0.5,
                }}
              >
                Ученики
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Inter_400Regular",
                  color: "#8E8E93",
                  marginTop: 2,
                }}
              >
                Ваши ученики и их прогресс
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowAddModal(true)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "#6B5CF6",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 4,
              }}
            >
              <UserPlus size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: 20, marginTop: 16, marginBottom: 14 }}>
          <SearchBar
            placeholder="Поиск ученика"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filters */}
        <View style={{ paddingLeft: 20, marginBottom: 16 }}>
          <FilterChips
            options={FILTERS}
            selected={selected}
            onSelect={setSelected}
          />
        </View>

        {/* Student Cards */}
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {students.length === 0 ? (
            <EmptyStudents onAdd={() => setShowAddModal(true)} />
          ) : filtered.length === 0 ? (
            <EmptySearch />
          ) : (
            filtered.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                showNextLesson
                onPress={() => router.push(`/student/${student.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <AddStudentModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </>
  );
}
