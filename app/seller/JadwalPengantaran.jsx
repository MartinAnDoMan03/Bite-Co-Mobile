import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from '../constants/color';
import { useRouter } from "expo-router";
import { useLanguage } from '../contexts/LanguageContext';
import { ScrollView, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import config from '../constants/config';

// Data jadwal pengantaran (sementara masih statis, gampang diganti fetch API nanti)
// statusKey dipakai untuk logika (filter & warna), label tampilan diambil lewat t()
const SCHEDULE_DATA = [
  {
    id: "1",
    name: "Budi Santoso",
    address: "Jl. Melati No. 7",
    date: "12 Januari",
    time: "14:00",
    statusKey: "processing",
  },
];

// Status -> warna pill (bg tint + teks)
const STATUS_STYLES = {
  completed: { bg: "#E8F5E9", color: "#2E7D32" },
  processing: { bg: "#FFF3E0", color: "#B26A00" },
  delivery: { bg: "#E3F2FD", color: "#1565C0" },
  cancelled: { bg: "#FFEBEE", color: "#C62828" },
};
const getStatusStyle = (statusKey) =>
  STATUS_STYLES[statusKey] || { bg: "#F0F0F0", color: "#757575" };

const matchesFilter = (statusKey, filterKey) => {
  if (filterKey === "all") return true;
  return statusKey === filterKey;
};

const Card = ({ name, address, date, time, statusLabel, statusKey, onPress }) => {
  const statusStyle = getStatusStyle(statusKey);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <MaterialIcons name="person" size={22} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusChipText, { color: statusStyle.color }]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <MaterialIcons name="location-on" size={13} color="#999" />
          <Text style={styles.metaText} numberOfLines={1}>{address}</Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialIcons name="schedule" size={13} color="#999" />
          <Text style={styles.metaText}>{date}, {time}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#c9c9c9" />
    </TouchableOpacity>
  );
};

const JadwalPengantaran = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [buyerMap, setBuyerMap] = React.useState({});

  React.useEffect(() => {
    const fetchDeliveryOrders = async () => {
      try {
        const token = await AsyncStorage.getItem("sellerToken");
        const res = await axios.get(`${config.API_URL}/seller/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const allOrders = res.data.orders || [];

        // Only show orders in active delivery states
        const deliveryOrders = allOrders.filter((o) =>
          ['processing', 'delivery'].includes(o.statusProgress || o.status)
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
    };
    fetchDeliveryOrders();
  }, []);

  const FILTERS = [
    { key: "all", label: t('jadwalPengantaran.filters.all') },
    { key: "processing", label: t('jadwalPengantaran.filters.processing') },
    { key: "delivery", label: t('jadwalPengantaran.filters.completed') },
  ];

  const filteredData = orders.filter((o) => {
    const status = o.statusProgress || o.status;
    if (activeFilter === "all") return true;
    return status === activeFilter;
  });

  const handlePressCard = (item) => {
    router.push({
      pathname: "seller/DetailPengantaran",
      params: {
        orderId: item.id,
        name: buyerMap[item.buyerId] || "-",
        address: item.deliveryAddress || "-",
        date: item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }) : "-",
        time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "-",
        statusKey: item.statusProgress || item.status,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('jadwalPengantaran.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('jadwalPengantaran.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.filterBar}>
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
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.PRIMARY} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={{ marginTop: 12 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 10, paddingBottom: 24 }}>
              {filteredData.map((item) => (
                <Card
                  key={item.id}
                  name={buyerMap[item.buyerId] || "-"}
                  address={item.deliveryAddress || "-"}
                  date={item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }) : "-"}
                  time={item.createdAt ? new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "-"}
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
    </SafeAreaView>
  );
};

export default JadwalPengantaran;

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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filterBar: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  filterChipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  filterChipText: {
    fontSize: 13,
    color: "#888",
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#fff",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F5B342",
    justifyContent: "center",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#23272f",
    flex: 1,
    marginRight: 8,
  },
  statusChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusChipText: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: "#777",
  },
});