import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, ScrollView, RefreshControl } from 'react-native'
import React, { useEffect, useState, useCallback } from 'react'
import config from '../../constants/config';
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import PaymentWebViewModal from '../../../components/PaymentWebViewModal';
import { OrderCardSkeleton } from '../../../components/SkeletonLoader';

const Riwayat = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSnapUrl, setPaymentSnapUrl] = useState(null);
  const [paymentCheckLoading, setPaymentCheckLoading] = useState(false);
  const router = useRouter();

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
        // If payment is actually success, update order status in backend
        await axios.patch(`${config.API_URL}/buyer/orders/${order.id}`, { status: 'success', statusProgress: 'completed' });
        // Optionally, refresh orders list
        fetchOrders();
        alert('Pembayaran sudah berhasil. Status pesanan diperbarui.');
      } else {
        alert('Pesanan ini sudah dibayar atau tidak dalam status pending.');
      }
    } catch (e) {
      alert('Gagal memeriksa status pembayaran.');
    } finally {
      setPaymentCheckLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f7fb' }}>
      <View style={styles.container}>
        <Text style={styles.title}>Riwayat Pesanan</Text>
        {loading ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </ScrollView>
        ) : orders.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="history" size={48} color="#e0e0e0" />
            <Text style={styles.emptyText}>Tidak ada pesanan.</Text>
          </View>
        ) : (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          >
            {orders.map(order => (
              <TouchableOpacity
                key={order.id}
                style={styles.cardTouchable}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/buyer/RiwayatDetail', params: { orderId: order.id } })}
              >
                <View style={[styles.card, { borderLeftColor: getStatusColor(order.status) }]}> 
                  <View style={styles.cardTopRow}>
                    <Text style={styles.orderId}>#{order.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}> 
                      <Text style={styles.statusText}>{order.status || 'Menunggu Pembayaran'}</Text>
                    </View>
                  </View>
                  <View style={styles.cardInfoRow}>
                    <Text style={styles.cardLabel}>Total</Text>
                    <Text style={styles.cardValue}>Rp {order.totalAmount?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.cardInfoRow}>
                    <Text style={styles.cardLabel}>Tanggal</Text>
                    <Text style={styles.cardValue}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}</Text>
                  </View>
                  {/* Show button if status is pending and snapUrl exists */}
                  {order.status === 'pending' && order.snapUrl && (
                    <TouchableOpacity
                      style={{
                        marginTop: 12,
                        backgroundColor: '#FF9800',
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                        opacity: paymentCheckLoading ? 0.6 : 1,
                      }}
                      disabled={paymentCheckLoading}
                      onPress={() => checkMidtransStatusAndPay(order)}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                        {paymentCheckLoading ? 'Memeriksa...' : 'Lanjutkan Pembayaran'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            <PaymentWebViewModal
              visible={showPaymentModal}
              snapUrl={paymentSnapUrl}
              onClose={() => setShowPaymentModal(false)}
            />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
  },
  title: {
    fontWeight: '700',
    fontSize: 22,
    marginBottom: 18,
    color: '#23272f',
    letterSpacing: 0.2,
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#bbb',
    fontSize: 16,
    marginTop: 10,
  },
  cardTouchable: {
    marginBottom: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderLeftWidth: 6,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId: {
    fontWeight: '600',
    fontSize: 16,
    color: '#23272f',
    flex: 1,
    letterSpacing: 0.2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 7,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'capitalize',
    letterSpacing: 0.1,
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 2,
  },
  cardLabel: {
    color: '#8a8f99',
    fontSize: 14,
    fontWeight: '400',
  },
  cardValue: {
    color: '#23272f',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Riwayat;