import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "../constants/color";
import config from "../constants/config";

const EventTerms = () => {
  const router = useRouter();
  const { eventId } = useLocalSearchParams();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [themeColor, setThemeColor] = useState(COLORS.PRIMARY);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${config.API_URL}/events/${eventId}`);
        const data = await res.json();
        if (data.success && data.event) {
          setEvent(data.event);
          if (data.event.themeColor) setThemeColor(data.event.themeColor);
        } else {
          setError(data.message || "Event tidak ditemukan");
        }
      } catch (e) {
        setError("Gagal memuat data event");
      } finally {
        setLoading(false);
      }
    };
    if (eventId) fetchEvent();
  }, [eventId]);

  const handleDaftar = () => {
    if (!agreed) return;
    router.push({
      pathname: "seller/EventRegisterForm",
      params: { eventId },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Info Event</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.centerBox}>
          <MaterialIcons name="error-outline" size={48} color="#ccc" />
          <Text style={styles.errorText}>{error || "Event tidak ditemukan"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Kembali">
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.shortName}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {event.sellerBannerImageUrl && (
        <View style={styles.bannerWrapper}>
       <Image
         source={{ uri: event.sellerBannerImageUrl }}
         style={styles.bannerImage}
         resizeMode="contain"
       />
     </View>
        )}

        <Text style={[styles.eventName, { color: themeColor }]}>{event.name}</Text>

        <View style={styles.infoRow}>
          {event.location && (
            <View style={styles.infoItem}>
              <MaterialIcons name="location-on" size={16} color={themeColor} />
              <Text style={styles.infoText}>{event.location}</Text>
            </View>
          )}
          {(event.startDate || event.endDate) && (
            <View style={styles.infoItem}>
              <MaterialIcons name="event" size={16} color={themeColor} />
              <Text style={styles.infoText}>
                {event.startDate} {event.endDate ? `- ${event.endDate}` : ""}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.termsBox}>
          <Text style={[styles.termsTitle, { color: themeColor }]}>Syarat & Ketentuan</Text>
          <Text style={styles.termsText}>{event.termsAndConditions}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              agreed && { backgroundColor: themeColor, borderColor: themeColor },
            ]}
          >
            {agreed && <MaterialIcons name="check" size={14} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>
            Saya telah membaca dan menyetujui syarat & ketentuan di atas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: agreed ? themeColor : "#ccc" },
          ]}
          onPress={handleDaftar}
          disabled={!agreed}
        >
          <Text style={styles.submitButtonText}>Daftar Sekarang</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default EventTerms;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { marginTop: 10, color: "#666", textAlign: "center" },
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
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: COLORS.PRIMARY },
  scrollContent: { paddingBottom: 20 },
   bannerWrapper: {
   width: "100%",
   backgroundColor: COLORS.PRIMARY,
 },
 bannerImage: {
   width: "100%",
   aspectRatio: 16 / 9,
 },
    eventName: {
    fontSize: 20,
    fontWeight: "800",
    marginHorizontal: 20,
    marginTop: 16,
  },
  infoRow: { marginHorizontal: 20, marginTop: 10, gap: 6 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 13, color: "#666" },
  termsBox: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#fafafa",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 16,
  },
  termsTitle: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  termsText: { fontSize: 13, color: "#555", lineHeight: 20 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  checkboxRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 14 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  checkboxLabel: { flex: 1, fontSize: 12.5, color: "#444", lineHeight: 18 },
  submitButton: {
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: "center",
  },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});