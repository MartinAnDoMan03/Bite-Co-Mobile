import { StyleSheet, Text, TouchableOpacity, View, Modal, TouchableWithoutFeedback } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from '../constants/color';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLanguage } from '../contexts/LanguageContext';
import { ScrollView, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import config from '../constants/config';


const PERIOD_OPTIONS = [
  { key: '1hari', label: '1 Hari', days: 1 },
  { key: '7hari', label: '7 Hari', days: 7 },
  { key: '30hari', label: '30 Hari', days: 30 },
  { key: 'semua', label: 'Semua', days: null },
];
const DEFAULT_PERIOD = 'semua'; 

const matchesPeriod = (dateStr, periodKey) => {
  const option = PERIOD_OPTIONS.find((p) => p.key === periodKey);
  if (!option || option.days === null) return true;
  if (!dateStr) return false;
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return false;
  return ts >= Date.now() - option.days * 24 * 60 * 60 * 1000;
};

// Status -> warna pill (bg tint + teks)
const STATUS_STYLES = {
  completed: { bg: "#E8F5E9", color: "#2E7D32" },
  processing: { bg: "#FFF3E0", color: "#B26A00" },
  delivery: { bg: "#E3F2FD", color: "#1565C0" },
  cancelled: { bg: "#FFEBEE", color: "#C62828" },
};
const getStatusStyle = (statusKey) =>
  STATUS_STYLES[statusKey] || { bg: "#F0F0F0", color: "#757575" };

// Cek apakah order Rantangan boleh mulai diantar hari ini (startDate sudah tiba)
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

// FIX: sebelumnya "tanggal jadwal" yang ditampilkan itu createdAt (waktu order
// dibuat), bukan startDate (tanggal janji antar yang sebenarnya). Sekarang
// pakai startDate, dan untuk Rantangan Mingguan/Bulanan ditampilkan bersama
// endDate biar seller tahu ini order berulang, bukan sekali antar.
const formatScheduleDate = (order) => {
  const status = order.statusProgress || order.status;

  if (status === 'completed' && order.completedAt) {
    return `Selesai ${new Date(order.completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}`;
  }
  if (status === 'delivery' && order.deliveryAt) {
    return `Diantar sejak ${new Date(order.deliveryAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}`;
  }
  if (status === 'processing' && order.processingAt) {
    return `Diproses sejak ${new Date(order.processingAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}`;
  }

  if (!order.startDate) return "-";
  const start = new Date(order.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
  const isRecurring = order.packageType === 'Mingguan' || order.packageType === 'Bulanan';
  if (isRecurring && order.endDate) {
    const end = new Date(order.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
    return `${start} – ${end}`;
  }
  return start;
};

const Card = ({ order, buyerName, statusLabel, statusKey, onPress }) => {
  const statusStyle = getStatusStyle(statusKey);
  const isRantangan = order.orderType === 'Rantangan' || order.orderType?.includes('Rantangan');
  const isRecurring = order.packageType === 'Mingguan' || order.packageType === 'Bulanan';
  const todayDone = isRantangan && isRecurring && isTodayDeliveryCompleted(order.dailyDeliveryLogs || []);
  const notStartedYet = isRantangan && !canStartToday(order.startDate);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <MaterialIcons name="person" size={22} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{buyerName}</Text>
          <View style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusChipText, { color: statusStyle.color }]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <MaterialIcons name="location-on" size={13} color="#999" />
          <Text style={styles.metaText} numberOfLines={1}>{order.deliveryAddress || "-"}</Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialIcons name="event" size={13} color="#999" />
          <Text style={styles.metaText}>{formatScheduleDate(order)}</Text>
        </View>
        {notStartedYet && (
          <View style={styles.notStartedPill}>
            <MaterialIcons name="schedule" size={11} color="#B26A00" />
            <Text style={styles.notStartedText}>Belum masa antar</Text>
          </View>
        )}
        {todayDone && (
          <View style={styles.doneTodayPill}>
            <MaterialIcons name="check-circle" size={11} color="#2E7D32" />
            <Text style={styles.doneTodayText}>Sudah diantar hari ini</Text>
          </View>
        )}
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#c9c9c9" />
    </TouchableOpacity>
  );
};

const JadwalPengantaran = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [buyerMap, setBuyerMap] = React.useState({});
  const [activePeriod, setActivePeriod] = React.useState(DEFAULT_PERIOD);
  const [showPeriodModal, setShowPeriodModal] = React.useState(false);
  const [tempPeriod, setTempPeriod] = React.useState(DEFAULT_PERIOD);


  const fetchDeliveryOrders = React.useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("sellerToken");
      const res = await axios.get(`${config.API_URL}/seller/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allOrders = res.data.orders || [];

      // Sekarang termasuk 'completed' juga — sebelumnya order yang sudah
      // selesai langsung hilang dari layar ini sama sekali, bahkan sebelum
      // sempat kelihatan di tab manapun.
      const deliveryOrders = allOrders.filter((o) =>
        ['processing', 'delivery', 'completed'].includes(o.statusProgress || o.status)
      );
      setOrders(deliveryOrders);

      // Fetch buyer names
      const uniqueBuyerIds = [...new Set(deliveryOrders.map((o) => o.buyerId).filter(Boolean))];
      uniqueBuyerIds.forEach(async (buyerId) => {
        try {
          const buyerRes = await axios.get(`${config.API_URL}/buyer/profile/${buyerId}`);
          if (buyerRes.data?.name) {
            setBuyerMap((prev) => ({ ...prev, [buyerId]: buyerRes.data.name }));
          }
        } catch {}
      });
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchDeliveryOrders();
    }, [fetchDeliveryOrders])
  );

  React.useEffect(() => {
    if (params.justCompleted === '1') {
      setActiveFilter('completed');
    }
  }, [params.justCompleted]);

const FILTERS = [
  { key: "all", label: t('jadwalPengantaran.filters.all') },
  { key: "processing", label: t('jadwalPengantaran.filters.processing') },
  { key: "delivery", label: t('jadwalPengantaran.filters.delivery', 'Diantar') },
  { key: "completed", label: t('jadwalPengantaran.filters.completed') },
];

const filteredData = orders.filter((o) => {
  const status = o.statusProgress || o.status;
  if (activeFilter !== "all" && status !== activeFilter) return false;
  if (activeFilter === "completed") return matchesPeriod(o.completedAt, activePeriod);
  return true;
});

  const handlePressCard = (item) => {
    router.push({
      pathname: "seller/DetailPengantaran",
      params: {
        orderId: item.id,
        name: buyerMap[item.buyerId] || "-",
        address: item.deliveryAddress || "-",
        startDate: item.startDate || "",
        endDate: item.endDate || "",
        statusKey: item.statusProgress || item.status,
        orderType: item.orderType || "",
        packageType: item.packageType || "",
        dailyDeliveryLogs: JSON.stringify(item.dailyDeliveryLogs || []),
        // Koordinat buat halaman peta setelah "Antar Sekarang" diklik
      sellerLat: item.sellerLat != null ? String(item.sellerLat) : "",
      sellerLng: item.sellerLng != null ? String(item.sellerLng) : "",
      buyerLat: item.buyerLat != null ? String(item.buyerLat) : "",
      buyerLng: item.buyerLng != null ? String(item.buyerLng) : "",
      },
    });
  };

return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('jadwalPengantaran.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('jadwalPengantaran.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={[styles.content, { flex: 1 }]}>
        
{/* SECTION FILTER */}
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={{ flex: 1 }} // Biarkan ScrollView mengambil sisa ruang kiri
            contentContainerStyle={styles.filterScrollContent}
          >
            {FILTERS.map((f) => {
              const active = activeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Period filter */}
          {activeFilter === "completed" && (
            <View style={styles.iconFilterWrapper}>
              <TouchableOpacity
                // Saat default (Semua) warnanya redup. Saat aktif (1/7/30 Hari) baru reverse jadi warna PRIMARY.
                style={[styles.iconFilterBtn, activePeriod !== 'semua' && styles.iconFilterBtnActive]}
                onPress={() => {
                  setTempPeriod(activePeriod);
                  setShowPeriodModal(true);
                }}
              >
                <MaterialIcons 
                  name="tune" 
                  size={20} 
                  color={activePeriod !== 'semua' ? "#fff" : COLORS.PRIMARY} 
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.PRIMARY} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={{ marginTop: 16 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 10, paddingBottom: 24 }}>
              {filteredData.map((item) => (
                <Card
                  key={item.id}
                  order={item}
                  buyerName={buyerMap[item.buyerId] || "-"}
                  statusLabel={t(`jadwalPengantaran.status.${item.statusProgress || item.status}`) || item.statusProgress}
                  statusKey={item.statusProgress || item.status}
                  onPress={() => handlePressCard(item)}
                />
              ))}
              {filteredData.length === 0 && (
                <Text style={{ textAlign: "center", color: "#aaa", marginTop: 30 }}>
                  {t('jadwalPengantaran.emptyState')}
                </Text>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Modal Periode */}
      <Modal
        visible={showPeriodModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPeriodModal(false)}>
          <View style={styles.sheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheetCard}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Filter Periode</Text>

                {PERIOD_OPTIONS.map((p) => {
                  const isSelected = tempPeriod === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={styles.sheetOption}
                      onPress={() => setTempPeriod(p.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.sheetOptionLabel}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.sheetApplyBtn}
                  onPress={() => {
                    setActivePeriod(tempPeriod);
                    setShowPeriodModal(false);
                  }}
                >
                  <Text style={styles.sheetApplyBtnText}>Terapkan</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default JadwalPengantaran;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6FA" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.PRIMARY },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  filterBar: { flexDirection: "row", gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#EAEAEA",
  },
  filterChipActive: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY },
  filterChipText: { fontSize: 13, color: "#888", fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 13,
    flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: "#F5B342",
    justifyContent: "center", alignItems: "center",
  },
  nameRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3,
  },
  name: { fontSize: 15, fontWeight: "700", color: "#23272f", flex: 1, marginRight: 8 },
  statusChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  statusChipText: { fontSize: 10.5, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  metaText: { fontSize: 12, color: "#777" },
  notStartedPill: {
    flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6,
    backgroundColor: "#FFF3E0", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, alignSelf: "flex-start",
  },
  notStartedText: { fontSize: 10.5, color: "#B26A00", fontWeight: "600" },
  doneTodayPill: {
    flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6,
    backgroundColor: "#E8F5E9", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, alignSelf: "flex-start",
  },
  doneTodayText: { fontSize: 10.5, color: "#2E7D32", fontWeight: "600" },

  filtersContainer: {
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 8,
  },
  filterScrollContent: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
    paddingRight: 8,
  },
  filterBarRow: {
  flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap", 
    gap: 8, 
    marginBottom: 4, 
  },
  iconFilterWrapper: {
    marginLeft: 12, 
    paddingBottom: 4,
  },
  iconFilterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff", 
    borderWidth: 1,
    borderColor: "#EAEAEA",
    justifyContent: "center",
    alignItems: "center",
  },
  iconFilterBtnActive: {
    backgroundColor: COLORS.PRIMARY, 
    borderColor: COLORS.PRIMARY,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e0e0e0",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#23272f",
    marginBottom: 12,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#d9c3cc",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: { borderColor: COLORS.PRIMARY },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.PRIMARY,
  },
  sheetOptionLabel: { fontSize: 14.5, color: "#23272f", fontWeight: "500" },
  sheetApplyBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 18,
  },
  sheetApplyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14.5 },
});