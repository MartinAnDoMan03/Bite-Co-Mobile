import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, ScrollView, RefreshControl, ActivityIndicator, Platform, Modal, TouchableWithoutFeedback } from 'react-native'
import React, { useEffect, useState, useCallback } from 'react'
import config from '../../constants/config';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../../contexts/LanguageContext';
import PaymentWebViewModal from '../../../components/PaymentWebViewModal';
import QRISPaymentModal from '../../../components/QRISPaymentModal';
import { OrderCardSkeleton } from '../../../components/SkeletonLoader';
import COLORS from '../../constants/color';

const LOCALE_MAP = { en: 'en-US', id: 'id-ID', ms: 'ms-MY' };

const APPROVAL_TIMEOUT_MINUTES = 30;

const STATUS_PROGRESS_META = {
  awaiting_seller_approval: { icon: 'hourglass-empty', bg: '#F1F1F3', text: '#3A3F47', label: 'Menunggu Persetujuan Penjual', isFailed: false },
  approved_awaiting_payment: { icon: 'schedule', bg: '#F1F1F3', text: '#3A3F47', label: 'Menunggu Pembayaran', isFailed: false },
  processing: { icon: 'autorenew', bg: '#F1F1F3', text: '#3A3F47', label: 'Diproses', isFailed: false },
  delivery: { icon: 'local-shipping', bg: '#F1F1F3', text: '#3A3F47', label: 'Pengiriman', isFailed: false },
  completed: { icon: 'check-circle', bg: '#F1F1F3', text: '#3A3F47', label: 'Selesai', isFailed: false },
  cancelled: { icon: 'cancel', bg: '#FDECEA', text: '#D32F2F', label: 'Dibatalkan', isFailed: true },
  payment_expired: { icon: 'schedule', bg: '#FDECEA', text: '#D32F2F', label: 'Pembayaran Kadaluarsa', isFailed: true },
};

const getStatusMeta = (statusProgress) => {
  return STATUS_PROGRESS_META[statusProgress] || { icon: 'help-outline', bg: '#F1F1F3', text: '#3A3F47', label: 'Menunggu', isFailed: false };
};

const getFilters = (t) => [
  { key: 'semua', label: t('buyerRiwayat.filters.all', 'Semua') },
  { key: 'diproses', label: t('buyerRiwayat.filters.processing', 'Diproses') },
  { key: 'pembayaran', label: t('buyerRiwayat.filters.payment', 'Pembayaran') },
  { key: 'pengiriman', label: t('buyerRiwayat.filters.delivery', 'Pengiriman') },
  { key: 'selesai', label: t('buyerRiwayat.filters.completed', 'Selesai') },
  { key: 'batal', label: t('buyerRiwayat.filters.cancelled', 'Batal') },
];

const matchesFilter = (statusProgress, filterKey) => {
  if (filterKey === 'semua') return true;
  if (filterKey === 'diproses') return statusProgress === 'awaiting_seller_approval' || statusProgress === 'processing';
  if (filterKey === 'pembayaran') return statusProgress === 'approved_awaiting_payment';
  if (filterKey === 'pengiriman') return statusProgress === 'delivery' || statusProgress === 'recurring';
  if (filterKey === 'selesai') return statusProgress === 'completed';
  if (filterKey === 'batal') return statusProgress === 'cancelled';
  return true;
};

const PERIOD_OPTIONS = [
  { key: '7hari', label: '7 Hari', days: 7 },
  { key: '30hari', label: '30 Hari', days: 30 },
  { key: '3bulan', label: '3 Bulan', days: 90 },
  { key: 'semua', label: 'Semua', days: null },
];

const DEFAULT_PERIOD = '30hari';

const matchesPeriod = (createdAt, periodKey) => {
  const option = PERIOD_OPTIONS.find((p) => p.key === periodKey);
  if (!option || option.days === null) return true;
  if (!createdAt) return false;
  const createdTs = new Date(createdAt).getTime();
  if (isNaN(createdTs)) return false;
  const cutoff = Date.now() - option.days * 24 * 60 * 60 * 1000;
  return createdTs >= cutoff;
};

const isApprovalOverdue = (order, nowTs) => {
  if (order.statusProgress !== 'awaiting_seller_approval') return false;
  if (!order.createdAt) return false;
  const createdTs = new Date(order.createdAt).getTime();
  if (isNaN(createdTs)) return false;
  const elapsedMinutes = (nowTs - createdTs) / (1000 * 60);
  return elapsedMinutes >= APPROVAL_TIMEOUT_MINUTES;
};

const PAYMENT_EXPIRY_HOURS = 24;

const isPaymentExpired = (order, nowTs) => {
  if (order.statusProgress !== 'approved_awaiting_payment') return false;
  if (!order.createdAt) return false;
  const createdTs = new Date(order.createdAt).getTime();
  if (isNaN(createdTs)) return false;
  const elapsedHours = (nowTs - createdTs) / (1000 * 60 * 60);
  return elapsedHours >= PAYMENT_EXPIRY_HOURS;
};

const Riwayat = () => {
  const { t, language } = useLanguage();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSnapUrl, setPaymentSnapUrl] = useState(null);
  const [paymentCheckLoading, setPaymentCheckLoading] = useState(false);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [qrisOrder, setQrisOrder] = useState(null);
  const { filter: filterParam } = useLocalSearchParams();
  const [activeFilter, setActiveFilter] = useState(filterParam || 'semua');
  const [now, setNow] = useState(Date.now());
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [activePeriod, setActivePeriod] = useState(DEFAULT_PERIOD);
  const router = useRouter();
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [tempPeriod, setTempPeriod] = useState(DEFAULT_PERIOD);

  const dateLocale = LOCALE_MAP[language] || 'id-ID';

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      const res = await axios.get(`${config.API_URL}/buyer/orders`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      setOrders(res.data.orders || []);
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchOrders();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchOrders]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const openPaymentWebView = (order) => {
    if (!order.snapUrl) return;
    if (Platform.OS === 'web') {
      window.open(order.snapUrl, '_blank');
      return;
    }
    setPaymentSnapUrl(order.snapUrl);
    setShowPaymentModal(true);
  };

  const openQrisPayment = (order) => {
    setQrisOrder(order);
    setShowQrisModal(true);
  };

  const initiatePayment = async (order) => {
    setPaymentCheckLoading(true);
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      const res = await axios.post(
        `${config.API_URL}/buyer/orders/${order.id}/payment`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.snapUrl) {
        if (Platform.OS === 'web') {
          window.open(res.data.snapUrl, '_blank');
        } else {
          setPaymentSnapUrl(res.data.snapUrl);
          setShowPaymentModal(true);
        }
      }
    } catch (e) {
      alert(t('buyerRiwayat.alerts.checkStatusFailed'));
    } finally {
      setPaymentCheckLoading(false);
    }
  };

  // Dipanggil begitu upload bukti QRIS sukses. Update state lokal LANGSUNG
  // (optimistic update) biar tombol "Bayar via QRIS" langsung berganti jadi
  // box "sedang diverifikasi" tanpa nunggu round-trip fetchOrders() —
  // mencegah buyer sempat tap upload lagi selagi network masih jalan
  // (yang sebelumnya bisa bikin buyer transfer 2-3x).
  const handleProofUploaded = (orderId) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, paymentStatus: 'pending_verification' } : o
      )
    );
    fetchOrders(); // tetap refetch di background buat sinkronisasi penuh
  };

  const handleCancelOverdueOrder = async (order) => {
    setCancellingOrderId(order.id);
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      await axios.patch(
        `${config.API_URL}/buyer/orders/${order.id}/cancel`,
        {},
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      fetchOrders();
    } catch (e) {
      alert(t('buyerRiwayat.alerts.cancelFailed', 'Gagal membatalkan pesanan. Coba lagi.'));
    } finally {
      setCancellingOrderId(null);
    }
  };

  const filteredOrders = orders.filter(
    (order) =>
      matchesFilter(order.statusProgress, activeFilter) &&
      matchesPeriod(order.createdAt, activePeriod)
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F6FA" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('buyerRiwayat.header.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('buyerRiwayat.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={styles.filterScrollContent}
        >
          {getFilters(t).map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text
                  style={[styles.filterChipText, active && styles.filterChipTextActive]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.iconFilterWrapper}>
          <TouchableOpacity
            style={[styles.iconFilterBtn, activePeriod !== DEFAULT_PERIOD && styles.iconFilterBtnActive]}
            onPress={() => {
              setTempPeriod(activePeriod);
              setShowPeriodModal(true);
            }}
          >
            <MaterialIcons
              name="tune"
              size={20}
              color={activePeriod !== DEFAULT_PERIOD ? "#fff" : COLORS.PRIMARY}
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </View>
        </ScrollView>
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <MaterialIcons name="history" size={40} color={COLORS.PRIMARY} />
          </View>
          <Text style={styles.emptyTitle}>{t('buyerRiwayat.empty.title')}</Text>
          <Text style={styles.emptyDescription}>
            {t('buyerRiwayat.empty.description')}
          </Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <MaterialIcons name="filter-list-off" size={40} color={COLORS.PRIMARY} />
          </View>
          <Text style={styles.emptyTitle}>{t('buyerRiwayat.emptyFilter.title', 'Belum ada pesanan')}</Text>
          <Text style={styles.emptyDescription}>
            {t('buyerRiwayat.emptyFilter.description', 'Tidak ada pesanan yang cocok dengan filter ini.')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.PRIMARY]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>{t('buyerRiwayat.sectionTitle', { count: filteredOrders.length })}</Text>
            {filteredOrders.map(order => {
              const expired = isPaymentExpired(order, now);
              const meta = expired ? STATUS_PROGRESS_META.payment_expired : getStatusMeta(order.statusProgress);
              const overdue = isApprovalOverdue(order, now);
              return (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.orderCard, styles.shadow, overdue && styles.orderCardOverdue]}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/buyer/RiwayatDetail', params: { orderId: order.id } })}
                >
                  <View style={styles.orderHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderId}>#{order.id}</Text>
                      <View style={styles.dateRow}>
                        <MaterialIcons name="event" size={12} color="#9AA0AC" />
                        <Text style={styles.orderDate}>
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString(dateLocale, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          }) : '-'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.orderAmount}>
                      <Text style={styles.amount}>
                        Rp {order.totalAmount?.toLocaleString('id-ID')}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                        <MaterialIcons name={meta.icon} size={12} color={meta.text} />
                        <Text style={[styles.statusText, { color: meta.text }]}>
                          {meta.label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {overdue && (
                    <View style={styles.overdueBox}>
                      <View style={styles.overdueRow}>
                        <MaterialIcons name="error-outline" size={18} color="#B26A00" />
                        <Text style={styles.overdueText}>
                          Yah, pesanan kamu belum dikonfirmasi penjual. Mau coba temukan outlet lainnya?
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCancelOverdueOrder(order);
                        }}
                        style={[styles.overdueCancelButton, cancellingOrderId === order.id && { opacity: 0.6 }]}
                        disabled={cancellingOrderId === order.id}
                      >
                        {cancellingOrderId === order.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.overdueCancelButtonText}>Batalkan Pesanan</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {!overdue && isPaymentExpired(order, now) && (
                    <View style={styles.overdueBox}>
                      <View style={styles.overdueRow}>
                        <MaterialIcons name="error-outline" size={18} color="#B26A00" />
                        <Text style={styles.overdueText}>
                          Sesi pembayaran untuk pesanan ini sudah kadaluarsa.
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCancelOverdueOrder(order);
                        }}
                        style={[styles.overdueCancelButton, cancellingOrderId === order.id && { opacity: 0.6 }]}
                        disabled={cancellingOrderId === order.id}
                      >
                        {cancellingOrderId === order.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.overdueCancelButtonText}>Batalkan Pesanan</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {!overdue &&
                    order.statusProgress === 'approved_awaiting_payment' &&
                    !isPaymentExpired(order, now) && (
                      order.paymentMethod === 'manual_qris' &&
                      (order.paymentStatus === 'pending_verification' || !!order.paymentProofUrl) ? (
                        <View style={styles.overdueBox}>
                          <View style={styles.overdueRow}>
                            <MaterialIcons name="hourglass-empty" size={18} color="#1976D2" />
                            <Text style={[styles.overdueText, { color: '#1976D2' }]}>
                              Bukti pembayaran sedang diverifikasi. Mohon tunggu konfirmasi kami.
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            if (order.paymentMethod === 'manual_qris') {
                              openQrisPayment(order);
                            } else {
                              order.snapUrl ? openPaymentWebView(order) : initiatePayment(order);
                            }
                          }}
                          style={[styles.payButton, { opacity: paymentCheckLoading ? 0.6 : 1 }]}
                          disabled={paymentCheckLoading}
                        >
                          <MaterialIcons name="payment" size={16} color="#fff" />
                          <Text style={styles.payButtonText}>
                            {order.paymentMethod === 'manual_qris'
                              ? 'Bayar via QRIS'
                              : (paymentCheckLoading ? t('buyerRiwayat.payButton.checking') : t('buyerRiwayat.payButton.continuePayment'))}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}

                  {!overdue && isPaymentExpired(order, now) && (
                    <View style={styles.overdueBox}>
                      <View style={styles.overdueRow}>
                        <MaterialIcons name="error-outline" size={18} color="#B26A00" />
                        <Text style={styles.overdueText}>
                          Sesi pembayaran untuk pesanan ini sudah kadaluarsa.
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <PaymentWebViewModal
            visible={showPaymentModal}
            snapUrl={paymentSnapUrl}
            onClose={() => {
              setShowPaymentModal(false);
              fetchOrders();
            }}
          />
          <QRISPaymentModal
            visible={showQrisModal}
            order={qrisOrder}
            onClose={() => setShowQrisModal(false)}
            onUploadSuccess={handleProofUploaded}
          />
        </ScrollView>
      )}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  backBtn: { width: 26 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.PRIMARY },

  filtersContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  filterScrollContent: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 16,
    paddingRight: 8,
  },
  iconFilterWrapper: {
    marginLeft: 12,
    paddingRight: 16,
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
  filterChip: {
    flexShrink: 0,
    minWidth: 90,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  filterChipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  filterChipText: { fontSize: 13, color: '#888', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },

  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  orderCardOverdue: {
    borderWidth: 1.5,
    borderColor: '#FFD9A0',
    backgroundColor: '#FFFCF7',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderDate: {
    fontSize: 11.5,
    color: '#9AA0AC',
    fontWeight: '500',
  },
  orderAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  payButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 11,
    borderRadius: 12,
  },
  payButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  overdueBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#FFE8C2',
  },
  overdueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  overdueText: {
    flex: 1,
    fontSize: 12.5,
    color: '#8a5a10',
    fontWeight: '600',
    lineHeight: 18,
  },
  overdueCancelButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueCancelButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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

export default Riwayat;