import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import HeaderTitleBack from '../../components/HeaderTitleBack';
import COLORS from '../constants/color';
import config from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RiwayatSeller = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      style={styles.orderCard}
      onPress={() =>
        router.push({
          pathname: '/seller/DetailOrder',
          params: { orderId: order.id },
        })
      }
    >
      <View style={styles.orderHeader}>
        <View>
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
            <MaterialIcons name="check-circle" size={16} color={COLORS.GREEN3} />
            <Text style={styles.statusText}>Selesai</Text>
          </View>
        </View>
      </View>

      <View style={styles.orderInfo}>
        <MaterialIcons name="person" size={16} color="#666" />
        <Text style={styles.buyerName}>{order.buyerName || 'Pelanggan'}</Text>
      </View>

      {order.items && order.items.length > 0 && (
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsLabel}>Menu:</Text>
          <Text style={styles.itemsList}>
            {order.items.map(item => item.name).join(', ')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="history" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>
      <Text style={styles.emptyDescription}>
        Riwayat pesanan yang sudah selesai akan muncul di sini
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Riwayat Pesanan" />
      
      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.PRIMARY}
          style={styles.loader}
        />
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
        >
          {orders.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.content}>
              <Text style={styles.sectionTitle}>
                Total {orders.length} pesanan selesai
              </Text>
              {orders.map((order, index) => (
                <OrderHistoryCard key={order.id || index} order={order} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default RiwayatSeller;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loader: {
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  orderType: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  orderAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.GREEN4,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.GREEN3,
    fontWeight: '600',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  buyerName: {
    fontSize: 14,
    color: '#666',
  },
  itemsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  itemsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  itemsList: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
