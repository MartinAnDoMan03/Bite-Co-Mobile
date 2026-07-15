import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, ScrollView, RefreshControl } from 'react-native'
import React, { useEffect, useState, useCallback } from 'react'
import config from '../../constants/config';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../../contexts/LanguageContext';
import PaymentWebViewModal from '../../../components/PaymentWebViewModal';
import { OrderCardSkeleton } from '../../../components/SkeletonLoader';
import COLORS from '../../constants/color';

const LOCALE_MAP = { en: 'en-US', id: 'id-ID', ms: 'ms-MY' };

const Riwayat = () => {
  const { t, language } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSnapUrl, setPaymentSnapUrl] = useState(null);
  const [paymentCheckLoading, setPaymentCheckLoading] = useState(false);
  const router = useRouter();

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending':
        return '#BDBDBD'; // Grey (Pending)
      case 'menunggu persetujuan':
      case 'waiting_approval':
        return '#FFC107'; // Yellow (Waiting Approval)
      case 'diproses':
      case 'processing':
        return '#9C27B0'; // Purple (Processing)
      case 'pengiriman':
      case 'delivery':
        return '#2196F3'; // Blue (Delivery)
      case 'selesai':
      case 'completed':
      case 'success':
        return '#4CAF50'; // Green (Completed/Success)
      case 'dibatalkan':
      case 'cancelled':
        return '#F44336'; // Red (Cancelled)
      default:
        return '#BDBDBD'; // Grey (Unknown)
    }
  };

  // Metadata tambahan untuk tampilan (ikon, warna lembut, teks) — tidak mengubah logika status manapun
  const getStatusMeta = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return { icon: 'schedule', bg: '#F1F1F3', text: '#757575', isFailed: false };
      case 'menunggu persetujuan':
      case 'waiting_approval':
        return { icon: 'hourglass-empty', bg: '#FFF6DE', text: '#B7860B', isFailed: false };
      case 'diproses':
      case 'processing':
        return { icon: 'autorenew', bg: '#F3E7FB', text: '#8E24AA', isFailed: false };
      case 'pengiriman':
      case 'delivery':
        return { icon: 'local-shipping', bg: '#E3F1FE', text: '#1976D2', isFailed: false };
      case 'selesai':
      case 'completed':
      case 'success':
        return { icon: 'check-circle', bg: '#E8F5E9', text: '#2E7D32', isFailed: false };
      case 'dibatalkan':
      case 'cancelled':
        return { icon: 'cancel', bg: '#FDE8E8', text: '#D32F2F', isFailed: true };
      default:
        return { icon: 'help-outline', bg: '#F1F1F3', text: '#757575', isFailed: false };
    }
  };

  // Check payment status in Midtrans before showing payment button
  const checkMidtransStatusAndPay = async (order) => {
    if (!order.snapUrl || !order.id) return;
    setPaymentCheckLoading(true);
    try {
      const res = await axios.get(`${config.API_URL}/midtrans/status/${order.id}`);
      if (res.data && res.data.transaction_status === 'pending') {
        setPaymentSnapUrl(order.snapUrl);
        setShowPaymentModal(true);
      } else if (res.data && (res.data.transaction_status === 'settlement' || res.data.transaction_status === 'capture')) {
        // Pembayaran berhasil — cukup update status pembayaran.
        // statusProgress TIDAK diubah di sini, biar tetap ikut alur
        // Terima -> Proses -> Kirim -> Selesai yang dikontrol seller.
        await axios.patch(`${config.API_URL}/buyer/orders/${order.id}`, { status: 'success' });
        // Optionally, refresh orders list
        fetchOrders();
        alert(t('buyerRiwayat.alerts.paymentSuccess'));
      } else {
        alert(t('buyerRiwayat.alerts.alreadyPaidOrNotPending'));
      }
    } catch (e) {
      alert(t('buyerRiwayat.alerts.checkStatusFailed'));
    } finally {
      setPaymentCheckLoading(false);
    }
  };

  const initiatePayment = async (order) => {
  const token = await AsyncStorage.getItem('buyerToken');
  const res = await axios.post(
    `${config.API_URL}/buyer/orders/${order.id}/payment`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.data?.snapUrl) {
    setPaymentSnapUrl(res.data.snapUrl);
    setShowPaymentModal(true);
  }
};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F6FA" }}>
      {/* Header selaras dengan halaman Pesanan penjual */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('buyerRiwayat.header.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('buyerRiwayat.header.title')}</Text>
        <View style={{ width: 26 }} />
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
            <Text style={styles.sectionTitle}>{t('buyerRiwayat.sectionTitle', { count: orders.length })}</Text>
            {orders.map(order => {
              const meta = getStatusMeta(order.status);
              return (
                <TouchableOpacity
                  key={order.id}
                  style={[
                    styles.orderCard,
                    styles.shadow,
                    { borderLeftWidth: 4, borderLeftColor: getStatusColor(order.status) },
                    meta.isFailed && styles.orderCardFailed,
                  ]}
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
                      <Text style={[styles.amount, meta.isFailed && styles.amountFailed]}>
                        Rp {order.totalAmount?.toLocaleString('id-ID')}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                        <MaterialIcons name={meta.icon} size={12} color={meta.text} />
                        <Text style={[styles.statusText, { color: meta.text }]}>
                          {order.status || t('buyerRiwayat.statusFallback')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Show button if status is pending and snapUrl exists */}
                  {((order.status === 'pending' && order.snapUrl) || (order.statusProgress === 'approved_awaiting_payment' &&
                  !order.snapUrl)) && (
                    <TouchableOpacity
                      onPress={() =>
                        order.snapUrl ? checkMidtransStatusAndPay(order) : initiatePayment(order)
                      }
                      style={[styles.payButton, { opacity: paymentCheckLoading ? 0.6 : 1 }]}
                      disabled={paymentCheckLoading}
                    >
                      <MaterialIcons name="payment" size={16} color="#fff" />
                      <Text style={styles.payButtonText}>
                        {paymentCheckLoading ? t('buyerRiwayat.payButton.checking') : t('buyerRiwayat.payButton.continuePayment')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <PaymentWebViewModal
            visible={showPaymentModal}
            snapUrl={paymentSnapUrl}
            onClose={() => setShowPaymentModal(false)}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  // Header
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
  orderCardFailed: {
    backgroundColor: '#FFF9F9',
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
  amountFailed: {
    color: '#B71C1C',
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
    backgroundColor: '#FF9800',
    paddingVertical: 11,
    borderRadius: 12,
  },
  payButtonText: {
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