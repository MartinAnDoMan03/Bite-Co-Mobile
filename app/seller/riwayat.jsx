import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import COLORS from '../constants/color';
import config from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../contexts/LanguageContext';

// FILTER PERIODE CONFIGURATION
const PERIOD_OPTIONS = [
  { key: '7hari', label: '7 Hari', days: 7 },
  { key: '30hari', label: '30 Hari', days: 30 },
  { key: '3bulan', label: '3 Bulan', days: 90 },
  { key: 'semua', label: 'Semua', days: null },
];
const DEFAULT_PERIOD = '30hari';

const matchesPeriod = (createdAt, periodKey) => {
  const option = PERIOD_OPTIONS.find((p) => p.key === periodKey);
  if (!option || option.days === null) return true; // "Semua" → tidak difilter
  if (!createdAt) return false;
  const createdTs = new Date(createdAt).getTime();
  if (isNaN(createdTs)) return false;
  const cutoff = Date.now() - option.days * 24 * 60 * 60 * 1000;
  return createdTs >= cutoff;
};

const RiwayatSeller = () => {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // State untuk Filter Modal
  const [activePeriod, setActivePeriod] = useState(DEFAULT_PERIOD);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [tempPeriod, setTempPeriod] = useState(DEFAULT_PERIOD);

  const filteredOrders = orders.filter((order) => matchesPeriod(order.createdAt, activePeriod));
  const router = useRouter();

  const fetchOrderHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) return;

      const response = await fetch(`${config.API_URL}/seller/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.orders) {
        // Filter completed orders for history
        const completedOrders = data.orders.filter(
          order => order.statusProgress === 'completed'
        );
        setOrders(completedOrders);
      }
    } catch (error) {
      console.error('Error fetching order history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrderHistory();
  };

  const OrderHistoryCard = ({ order }) => (
    <TouchableOpacity
      style={[styles.orderCard, styles.shadow]}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/seller/DetailOrder',
          params: { orderId: order.id },
        })
      }
    >
      <View style={styles.orderHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <Text style={styles.orderType}>
            {order.orderType} {order.packageType && `• ${order.packageType}`}
          </Text>
        </View>
        <View style={styles.orderAmount}>
          <Text style={styles.amount}>
            Rp {order.totalAmount?.toLocaleString('id-ID')}
          </Text>
          <View style={styles.statusBadge}>
            <MaterialIcons name="check-circle" size={13} color="#2E7D32" />
            <Text style={styles.statusText}>{t('riwayat.statusCompleted')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.orderInfo}>
        <MaterialIcons name="person" size={14} color="#999" />
        <Text style={styles.buyerName}>{order.buyerName || t('riwayat.buyerFallback')}</Text>
      </View>

      {order.items && order.items.length > 0 && (
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsLabel}>{t('riwayat.itemsLabel')}</Text>
          <Text style={styles.itemsList} numberOfLines={2}>
            {order.items.map(item => item.name).join(', ')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <MaterialIcons name="history" size={40} color="#bbb" />
      </View>
      <Text style={styles.emptyTitle}>{t('riwayat.empty.title')}</Text>
      <Text style={styles.emptyDescription}>
        {t('riwayat.empty.description')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('riwayat.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('riwayat.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* FILTER BAR SECTION */}
      <View style={styles.filtersContainer}>
        <Text style={styles.activePeriodText}>
          Periode: <Text style={{ fontWeight: '700', color: COLORS.PRIMARY }}>
            {PERIOD_OPTIONS.find(p => p.key === activePeriod)?.label}
          </Text>
        </Text>
        <View style={styles.iconFilterWrapper}>
          <TouchableOpacity
            style={styles.iconFilterBtn}
            onPress={() => {
              setTempPeriod(activePeriod);
              setShowPeriodModal(true);
            }}
          >
            <MaterialIcons name="tune" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.PRIMARY}
          style={styles.loader}
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.PRIMARY]}
            />
          }
        >
        {orders.length === 0 ? (
          <EmptyState />
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="filter-list-off" size={40} color="#bbb" />
            </View>
            <Text style={styles.emptyTitle}>Tidak ada pesanan</Text>
            <Text style={styles.emptyDescription}>Tidak ada pesanan selesai pada periode ini.</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>
              {t('riwayat.sectionTitle', { count: filteredOrders.length })}
            </Text>
            {filteredOrders.map((order, index) => (
              <OrderHistoryCard key={order.id || index} order={order} />
            ))}
          </View>
        )}
        </ScrollView>
      )}

      {/* MODAL FILTER PERIODE */}
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

export default RiwayatSeller;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  // Header
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

  // Filter Bar Styles
  filtersContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activePeriodText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  iconFilterWrapper: {
    // Tidak butuh margin berlebihan karena diposisikan dengan 'space-between'
  },
  iconFilterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal / Bottom Sheet Styles
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

  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  loader: {
    marginTop: 60,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderDate: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 3,
  },
  orderType: {
    fontSize: 11.5,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  orderAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  statusText: {
    fontSize: 10.5,
    color: '#2E7D32',
    fontWeight: '600',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  buyerName: {
    fontSize: 12.5,
    color: '#777',
  },
  itemsContainer: {
    backgroundColor: '#F5F6FA',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  itemsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 3,
  },
  itemsList: {
    fontSize: 12.5,
    color: '#444',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 19,
  },
});