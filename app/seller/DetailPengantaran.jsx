import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import COLORS from '../constants/color';
import { useLanguage } from '../contexts/LanguageContext';

// Status -> warna pill (bg tint + teks) - sama seperti di JadwalPengantaran
const STATUS_STYLES = {
  completed: { bg: "#E8F5E9", color: "#2E7D32" },
  processing: { bg: "#FFF3E0", color: "#B26A00" },
  cancelled: { bg: "#FFEBEE", color: "#C62828" },
};
const getStatusStyle = (statusKey) =>
  STATUS_STYLES[statusKey] || { bg: "#F0F0F0", color: "#757575" };

const InfoRow = ({ icon, label, value, isLast, fallback }) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.infoRowLeft}>
      <MaterialIcons name={icon} size={16} color="#999" />
      <Text style={styles.infoRowLabel}>{label}</Text>
    </View>
    <Text style={styles.infoRowValue} numberOfLines={1}>{value || fallback}</Text>
  </View>
);

const DetailPengantaran = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const { name, address, date, time, statusKey } = useLocalSearchParams();
  const statusStyle = getStatusStyle(statusKey);
  const statusLabel = statusKey ? t(`jadwalPengantaran.status.${statusKey}`) : t('jadwalPengantaran.statusFallback');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('jadwalPengantaran.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('jadwalPengantaran.detailHeader.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, styles.shadow]}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName} numberOfLines={1}>{name || t('jadwalPengantaran.fallbackValue')}</Text>
              <View style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusChipText, { color: statusStyle.color }]}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>

          <InfoRow icon="location-on" label={t('jadwalPengantaran.detail.address')} value={address} fallback={t('jadwalPengantaran.fallbackValue')} />
          <InfoRow icon="event" label={t('jadwalPengantaran.detail.deliveryDate')} value={date} fallback={t('jadwalPengantaran.fallbackValue')} />
          <InfoRow icon="schedule" label={t('jadwalPengantaran.detail.deliveryTime')} value={time} isLast fallback={t('jadwalPengantaran.fallbackValue')} />
        </View>

        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="local-shipping" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>{t('jadwalPengantaran.actions.deliverNow')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default DetailPengantaran;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.PRIMARY },

  content: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5B342",
    justifyContent: "center",
    alignItems: "center",
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#23272f",
    marginBottom: 5,
  },
  statusChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "600",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoRowLabel: {
    fontSize: 13.5,
    color: "#777",
  },
  infoRowValue: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#23272f",
    maxWidth: "55%",
    textAlign: "right",
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 16,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14.5,
    fontWeight: "700",
  },
});