import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Modal } from "react-native";
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

const ALERT_TYPE_STYLES = {
  info: { icon: 'info', color: COLORS.PRIMARY, bg: '#F7EAEF' },
  success: { icon: 'check-circle', color: '#2E7D32', bg: '#E8F5E9' },
  error: { icon: 'error', color: '#C62828', bg: '#FFEBEE' },
  warning: { icon: 'warning', color: '#B26A00', bg: '#FFF3E0' },
};

const CustomAlert = ({ visible, title, message, buttons, type = 'info', onClose }) => {
  const typeStyle = ALERT_TYPE_STYLES[type] || ALERT_TYPE_STYLES.info;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.alertOverlay}>
        <View style={styles.alertContent}>
          <View style={[styles.alertIconCircle, { backgroundColor: typeStyle.bg }]}>
            <MaterialIcons name={typeStyle.icon} size={26} color={typeStyle.color} />
          </View>
          <Text style={styles.alertTitle}>{title}</Text>
          {!!message && <Text style={styles.alertMessage}>{message}</Text>}
          <View style={styles.alertButtons}>
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.alertButton, isCancel ? styles.alertButtonOutline : styles.alertButtonSolid]}
                  onPress={() => {
                    onClose();
                    btn.onPress && btn.onPress();
                  }}
                >
                  <Text style={[styles.alertButtonText, isCancel ? styles.alertButtonTextOutline : styles.alertButtonTextSolid]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const EventRegisterForm = () => {
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const [categories, setCategories] = useState([]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', buttons: [], type: 'info' });

  const showAlert = (title, message, buttons = [{ text: 'OK' }], type = 'info') => {
    setCustomAlert({ visible: true, title, message, buttons, type });
  };
  const closeAlert = () => setCustomAlert((prev) => ({ ...prev, visible: false }));

  const toggleCategory = (key) => {
    setCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (categories.length === 0) {
      showAlert("Lengkapi Data", "Pilih minimal 1 kategori produk kamu.", [{ text: "OK" }], "warning");
      return;
    }
    if (!description.trim()) {
      showAlert("Lengkapi Data", "Deskripsi produk wajib diisi.", [{ text: "OK" }], "warning");
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

      showAlert(
        "Pendaftaran Berhasil",
        (res.data.message || "Kamu berhasil terdaftar di event ini.") + " Kategori dan deskripsi produkmu sudah tersimpan.",
        [{ text: "OK", onPress: () => router.replace({ pathname: "seller/EventMenuSelect", params: { eventId } }) }],
        "success"
      );
    } catch (e) {
      const errMsg = e.response?.data?.error || "Gagal mendaftar. Coba lagi.";
      showAlert("Gagal", errMsg, [{ text: "OK" }], "error");
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

      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        type={customAlert.type}
        onClose={closeAlert}
      />
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

  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  alertContent: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  alertIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23272f',
    textAlign: 'center',
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 13.5,
    color: '#777',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  alertButtonSolid: {
    backgroundColor: COLORS.PRIMARY,
  },
  alertButtonOutline: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertButtonTextSolid: {
    color: '#fff',
  },
  alertButtonTextOutline: {
    color: '#777',
  },
});