import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import COLORS from '../constants/color';
import { useLanguage } from '../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import config from '../constants/config';
import * as Location from 'expo-location';

// Status -> warna pill (bg tint + teks) - sama seperti di JadwalPengantaran
const STATUS_STYLES = {
  completed: { bg: "#E8F5E9", color: "#2E7D32" },
  processing: { bg: "#FFF3E0", color: "#B26A00" },
  delivery: { bg: "#E3F2FD", color: "#1565C0" },
  cancelled: { bg: "#FFEBEE", color: "#C62828" },
};
const getStatusStyle = (statusKey) =>
  STATUS_STYLES[statusKey] || { bg: "#F0F0F0", color: "#757575" };

const canStartToday = (startDate) => {
  if (!startDate) return true;
  const start = new Date(startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return today >= start;
};

const isTodayDeliveryCompleted = (dailyDeliveryLogs = []) => {
  const today = new Date().toISOString().split('T')[0];
  return dailyDeliveryLogs.some((log) => log.deliveryDate === today);
};

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
  const {
    orderId, name, address, startDate, endDate, statusKey: initialStatusKey,
    orderType, packageType, dailyDeliveryLogs: dailyDeliveryLogsParam,
  } = useLocalSearchParams();

  const [statusKey, setStatusKey] = useState(initialStatusKey);
  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------------------------------------------
  // Live location tracking — kirim posisi seller berkala selama order ini
  // statusnya 'delivery' dan halaman ini masih terbuka. Berhenti otomatis
  // kalau seller pindah halaman atau order sudah diselesaikan. Foreground
  // tracking saja (bukan background) — seller diasumsikan pegang HP selama
  // nganter, sesuai keputusan desain.
  // ---------------------------------------------------------------------
  const locationSubscription = React.useRef(null);

  useEffect(() => {
    let isActive = true;

    const startTracking = async () => {
      if (statusKey !== 'delivery') return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 20000, // update tiap 20 detik
          distanceInterval: 30, // atau tiap pergerakan 30 meter, mana yang lebih dulu
        },
        async (position) => {
          if (!isActive) return;
          try {
            const token = await AsyncStorage.getItem('sellerToken');
            await axios.patch(
              `${config.API_URL}/seller/orders/${orderId}/location`,
              { lat: position.coords.latitude, lng: position.coords.longitude },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (e) {
            // Gagal kirim 1 update lokasi bukan hal fatal — coba lagi di update berikutnya
          }
        }
      );
    };

    startTracking();

    return () => {
      isActive = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, [statusKey, orderId]);

  const dailyDeliveryLogs = React.useMemo(() => {
    try {
      return dailyDeliveryLogsParam ? JSON.parse(dailyDeliveryLogsParam) : [];
    } catch {
      return [];
    }
  }, [dailyDeliveryLogsParam]);

  const isRantangan = orderType === 'Rantangan' || orderType?.includes('Rantangan');
  const isRecurring = packageType === 'Mingguan' || packageType === 'Bulanan';
  const orderCanStart = canStartToday(startDate);
  const todayDone = isRantangan && isRecurring && isTodayDeliveryCompleted(dailyDeliveryLogs);

  const statusStyle = getStatusStyle(statusKey);
  const statusLabel = statusKey ? t(`jadwalPengantaran.status.${statusKey}`) : t('jadwalPengantaran.statusFallback');

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const dateDisplay = isRecurring && startDate && endDate
    ? `${formatDate(startDate)} – ${formatDate(endDate)}`
    : formatDate(startDate);

  // Update status order lewat endpoint yang sama dengan SellerOrder.jsx —
  // konsisten, bukan bikin logic terpisah.
  const updateOrderStatus = async (newStatus) => {
    const token = await AsyncStorage.getItem("sellerToken");
    await axios.patch(
      `${config.API_URL}/seller/orders/${orderId}`,
      { statusProgress: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  };

  // Untuk Rantangan Mingguan/Bulanan, "selesai" itu menyelesaikan satu hari
  // (dailyDeliveryLogs), bukan mengubah statusProgress ke "completed" —
  // order tetap "delivery" sampai seluruh siklus (endDate) selesai.
  const completeDailyDelivery = async () => {
    const token = await AsyncStorage.getItem("sellerToken");
    await axios.post(
      `${config.API_URL}/seller/orders/${orderId}/complete-daily-delivery`,
      {
        deliveryDate: new Date().toISOString().split('T')[0],
        deliveryTime: new Date().toISOString(),
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  };

  const handleStartDelivery = async () => {
    // Guard: order Rantangan belum boleh diantar sebelum startDate tiba
    if (isRantangan && !orderCanStart) {
      Alert.alert('Belum Masa Pengantaran', 'Tanggal mulai pengantaran untuk pesanan ini belum tiba.');
      return;
    }
    setSubmitting(true);
    try {
      await updateOrderStatus('delivery');
      setStatusKey('delivery');
      router.back();
    } catch (e) {
      Alert.alert('Gagal', 'Terjadi kendala saat memperbarui status pesanan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteDelivery = async () => {
    setSubmitting(true);
    try {
      if (isRantangan && isRecurring) {
        await completeDailyDelivery();
      } else {
        await updateOrderStatus('completed');
      }
      router.back();
    } catch (e) {
      Alert.alert('Gagal', 'Terjadi kendala saat menyelesaikan pesanan.');
    } finally {
      setSubmitting(false);
    }
  };

  // Tombol dinamis sesuai status — sinkron dengan renderProgressAction di SellerOrder.jsx
  const renderActionButton = () => {
    if (statusKey === 'processing') {
      const disabled = submitting || (isRantangan && !orderCanStart);
      const label = isRantangan && !orderCanStart
        ? 'Belum Masa Pengantaran'
        : 'Antar Sekarang';
      return (
        <TouchableOpacity
          style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
          onPress={handleStartDelivery}
          disabled={disabled}
        >
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
            <>
              <MaterialIcons name="local-shipping" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>{label}</Text>
            </>
          )}
        </TouchableOpacity>
      );
    }
    if (statusKey === 'delivery') {
      const disabled = submitting || todayDone;
      const label = todayDone ? 'Sudah Diantar Hari Ini' : 'Pesanan Selesai';
      return (
        <TouchableOpacity
          style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
          onPress={handleCompleteDelivery}
          disabled={disabled}
        >
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
            <>
              <MaterialIcons name="check-circle" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>{label}</Text>
            </>
          )}
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <InfoRow icon="event" label={t('jadwalPengantaran.detail.deliveryDate')} value={dateDisplay} isLast fallback={t('jadwalPengantaran.fallbackValue')} />
        </View>

        {renderActionButton()}
      </View>
    </SafeAreaView>
  );
};

export default DetailPengantaran;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6FA" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.PRIMARY },
  content: { padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14 },
  shadow: {
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  avatarRow: {
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14,
    paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: "#F5B342",
    justifyContent: "center", alignItems: "center",
  },
  customerName: { fontSize: 16, fontWeight: "700", color: "#23272f", marginBottom: 5 },
  statusChip: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  statusChipText: { fontSize: 11, fontWeight: "600" },
  infoRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  infoRowLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoRowLabel: { fontSize: 13.5, color: "#777" },
  infoRowValue: { fontSize: 13.5, fontWeight: "600", color: "#23272f", maxWidth: "55%", textAlign: "right" },
  actionButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.PRIMARY, paddingVertical: 14, borderRadius: 30, marginTop: 16,
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: { color: "#fff", fontSize: 14.5, fontWeight: "700" },
});