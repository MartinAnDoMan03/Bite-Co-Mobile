import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import COLORS from "../constants/color";
import config from "../constants/config";

const CATEGORY_OPTIONS = [
  { key: "makanan", label: "Makanan", icon: "restaurant" },
  { key: "minuman", label: "Minuman", icon: "local-cafe" },
  { key: "snack", label: "Snack", icon: "cookie" },
];

const EventRegisterForm = () => {
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const [categories, setCategories] = useState([]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleCategory = (key) => {
    setCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (categories.length === 0) {
      Alert.alert("Lengkapi Data", "Pilih minimal 1 kategori produk kamu.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Lengkapi Data", "Deskripsi produk wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("sellerToken");
      const res = await axios.post(
        `${config.API_URL}/seller/events/${eventId}/register`,
        { eventCategory: categories, eventDescription: description.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert(
        "Pendaftaran Berhasil",
        res.data.message || "Kamu berhasil terdaftar di event ini.",
        [{ text: "OK", onPress: () => router.replace("seller/(tabs)") }]
      );
    } catch (e) {
      const errMsg = e.response?.data?.error || "Gagal mendaftar. Coba lagi.";
      Alert.alert("Gagal", errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Kembali">
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daftar Mitra Event</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Kategori Produk</Text>
        <Text style={styles.sublabel}>Bisa pilih lebih dari satu kategori</Text>
        <View style={styles.categoryRow}>
          {CATEGORY_OPTIONS.map((opt) => {
            const active = categories.includes(opt.key);
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.categoryCard, active && styles.categoryCardActive]}
                onPress={() => toggleCategory(opt.key)}
              >
                {active && (
                  <View style={styles.checkBadge}>
                    <MaterialIcons name="check" size={11} color={COLORS.PRIMARY} />
                  </View>
                )}
                <MaterialIcons
                  name={opt.icon}
                  size={26}
                  color={active ? "#fff" : COLORS.PRIMARY}
                />
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { marginTop: 24 }]}>Deskripsi Produk</Text>
        <Text style={styles.sublabel}>Jelaskan singkat apa yang kamu jual di stand nanti</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Contoh: Snack & Minuman Sehat, Nasi Box dengan lauk pilihan..."
          placeholderTextColor="#aaa"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Daftar Sekarang</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default EventRegisterForm;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.PRIMARY },
  scrollContent: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 15, fontWeight: "700", color: "#23272f" },
  sublabel: { fontSize: 12.5, color: "#888", marginTop: 3, marginBottom: 12 },
  categoryRow: { flexDirection: "row", gap: 10 },
  categoryCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
    position: "relative",
  },
  categoryCardActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  checkBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.PRIMARY,
    marginTop: 6,
  },
  categoryLabelActive: { color: "#fff" },
  textArea: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#23272f",
    minHeight: 100,
    textAlignVertical: "top",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  submitButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: "center",
  },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});