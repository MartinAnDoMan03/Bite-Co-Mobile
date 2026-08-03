import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useToast } from '../../components/ToastProvider';
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import COLORS from '../constants/color';
import { useLanguage } from '../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import config from '../constants/config';
import * as Location from 'expo-location';
import TrackingMap from '../../components/TrackingMap';

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

// Pastikan koordinat berupa number murni — react-native-maps bisa crash
// (native crash, bukan error JS biasa) kalau coordinate yang dioper ke
// <Marker> ternyata string, bukan number.
const toNum = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
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
    sellerLat: sellerLatParam, sellerLng: sellerLngParam,
    buyerLat: buyerLatParam, buyerLng: buyerLngParam,
  } = useLocalSearchParams();

  const [statusKey, setStatusKey] = useState(initialStatusKey);
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  // Posisi live seller sendiri (dari GPS device ini) — dipakai buat marker
  // biru di peta, sekaligus yang dikirim berkala ke server lewat effect
  // di bawah supaya buyer juga bisa lihat titik yang sama.
  const [currentPosition, setCurrentPosition] = useState(null);

  const sellerLat = toNum(sellerLatParam);
  const sellerLng = toNum(sellerLngParam);
  const buyerLat = toNum(buyerLatParam);
  const buyerLng = toNum(buyerLngParam);

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
          const { latitude, longitude } = position.coords;
          setCurrentPosition({ lat: latitude, lng: longitude });
          try {
            const token = await AsyncStorage.getItem('sellerToken');
            await axios.patch(
              `${config.API_URL}/seller/orders/${orderId}/location`,
              { lat: latitude, lng: longitude },
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
         try {
      locationSubscription.current.remove();
    } catch (err) {
      // expo-location's web shim doesn't fully support subscription.remove()
      // — harmless to skip, tracking is stopping anyway since we're unmounting.
      console.warn('Gagal membersihkan location subscription:', err);
    }
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

  const updateOrderStatus = async (newStatus) => {
    const token = await AsyncStorage.getItem("sellerToken");
    await axios.patch(
      `${config.API_URL}/seller/orders/${orderId}`,
      { statusProgress: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  };

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
      if (isRantangan && !orderCanStart) {
        showError('Tanggal mulai pengantaran untuk pesanan ini belum tiba.', { title: 'Belum Masa Pengantaran' });
        return;
      }
      setSubmitting(true);
      try {
        await updateOrderStatus('delivery');
        setStatusKey('delivery');
      } catch (e) {
        showError('Terjadi kendala saat memperbarui status pesanan.', { title: 'Gagal' });
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
      showSuccess('Pengantaran berhasil diselesaikan.', { title: 'Pesanan Selesai' });
      router.replace({
        pathname: 'seller/JadwalPengantaran',
        params: { justCompleted: '1' },
      });
    } catch (e) {
      showError('Terjadi kendala saat menyelesaikan pesanan.', { title: 'Gagal' });
    } finally {
      setSubmitting(false);
    }
  };
  // ---------------------------------------------------------------------
  // Mode peta — begitu status 'delivery', seluruh body halaman berubah
  // jadi peta di atas + info pembeli & tombol selesai di bawah.
  // ---------------------------------------------------------------------
  if (statusKey === 'delivery') {
    const mapOrderData = {
      sellerLat,
      sellerLng,
      buyerLat,
      buyerLng,
      currentLat: currentPosition?.lat ?? null,
      currentLng: currentPosition?.lng ?? null,
      sellerName: 'Toko Saya',
      deliveryAddress: address,
    };

    const disabled = submitting || todayDone;
    const completeLabel = todayDone ? 'Sudah Diantar Hari Ini' : 'Pesanan Selesai';

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('jadwalPengantaran.accessibility.back')}>
            <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lacak Pengiriman</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={{ flex: 1 }}>
          {sellerLat && sellerLng && buyerLat && buyerLng ? (
            <TrackingMap selectedOrder={mapOrderData} routeCoordinates={[]} primaryColor={COLORS.PRIMARY} />
          ) : (
            <View style={styles.mapUnavailable}>
              <MaterialIcons name="location-off" size={40} color="#ccc" />
              <Text style={styles.mapUnavailableText}>Koordinat pesanan tidak tersedia</Text>
            </View>
          )}

          <View style={styles.bottomPanel}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <MaterialIcons name="person" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName} numberOfLines={1}>{name || t('jadwalPengantaran.fallbackValue')}</Text>
                <Text style={styles.bottomAddress} numberOfLines={2}>{address || t('jadwalPengantaran.fallbackValue')}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
              onPress={handleCompleteDelivery}
              disabled={disabled}
            >
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <MaterialIcons name="check-circle" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>{completeLabel}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------
  // Mode biasa (status 'processing' atau lainnya) — tampilan lama, cuma
  // card info + tombol "Antar Sekarang"
  // ---------------------------------------------------------------------
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

        {statusKey === 'processing' && (
          <TouchableOpacity
            style={[styles.actionButton, (submitting || (isRantangan && !orderCanStart)) && styles.actionButtonDisabled]}
            onPress={handleStartDelivery}
            disabled={submitting || (isRantangan && !orderCanStart)}
          >
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <MaterialIcons name="local-shipping" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>
                  {isRantangan && !orderCanStart ? 'Belum Masa Pengantaran' : 'Antar Sekarang'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
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

  // ---------------- Mode peta ----------------
  mapUnavailable: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  mapUnavailableText: { fontSize: 13, color: "#999" },
  bottomPanel: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 6,
  },
  bottomAddress: { fontSize: 12.5, color: "#777", marginTop: 2 },
});