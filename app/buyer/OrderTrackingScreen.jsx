import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import HeaderTitleBack from '../../components/HeaderTitleBack';
import COLORS from '../constants/color';
import config from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../../components/ToastProvider';

const OrderTrackingScreen = () => {
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(null);
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    fetchOrderDetails();
    // Set up real-time tracking updates
    const interval = setInterval(fetchOrderDetails, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      const response = await fetch(`${config.API_URL}/buyer/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        
        // Simulate tracking data (in real app, this would come from delivery service API)
        if (data.order.statusProgress === 'delivery') {
          setTracking({
            driverName: 'Ahmad Kurniawan',
            driverPhone: '+6281234567890',
            vehicleType: 'Motor',
            plateNumber: 'B 1234 XYZ',
            estimatedArrival: '15 menit',
            currentLocation: 'Jl. Sudirman No. 45',
          });
        }
      } else {
        showError('Gagal memuat detail pesanan');
      }
    } catch (error) {
      showError('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'waiting_approval':
        return 'hourglass-empty';
      case 'processing':
        return 'restaurant';
      case 'delivery':
        return 'delivery-dining';
      case 'completed':
        return 'check-circle';
      default:
        return 'info';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting_approval':
        return '#FFC107';
      case 'processing':
        return '#FF9800';
      case 'delivery':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      default:
        return '#757575';
    }
  };

  const handleCallDriver = () => {
    if (tracking?.driverPhone) {
      Linking.openURL(`tel:${tracking.driverPhone}`);
    }
  };

  const handleChatWithSeller = () => {
    router.push({
      pathname: '/buyer/ChatRoom',
      params: {
        chatroomId: `${order.buyerId}_${order.sellerId}`,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        buyerName: order.buyerName || 'Buyer',
        sellerName: order.sellerName || 'Penjual',
        orderId: order.id,
      },
    });
  };

  const handleReportIssue = () => {
    // Navigate to issue reporting screen
    showSuccess('Fitur laporan masalah akan segera tersedia');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderTitleBack title="Lacak Pesanan" />
        <View style={styles.loadingContainer}>
          <Text>Memuat data pesanan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderTitleBack title="Lacak Pesanan" />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#ccc" />
          <Text style={styles.errorText}>Pesanan tidak ditemukan</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Lacak Pesanan" />
      
      <ScrollView style={styles.content}>
        {/* Order Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <MaterialIcons 
              name={getStatusIcon(order.statusProgress)} 
              size={32} 
              color={getStatusColor(order.statusProgress)} 
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {order.statusProgress === 'waiting_approval' && 'Menunggu Persetujuan'}
                {order.statusProgress === 'processing' && 'Sedang Diproses'}
                {order.statusProgress === 'delivery' && 'Dalam Pengiriman'}
                {order.statusProgress === 'completed' && 'Pesanan Selesai'}
              </Text>
              <Text style={styles.statusSubtitle}>
                Pesanan #{order.id.substring(0, 8)}
              </Text>
            </View>
          </View>
          
          <Text style={styles.statusDescription}>
            {order.statusProgress === 'waiting_approval' && 'Pesanan Anda sedang menunggu konfirmasi dari penjual'}
            {order.statusProgress === 'processing' && 'Makanan Anda sedang disiapkan dengan sepenuh hati'}
            {order.statusProgress === 'delivery' && 'Driver sedang dalam perjalanan menuju lokasi Anda'}
            {order.statusProgress === 'completed' && 'Pesanan telah selesai. Terima kasih!'}
          </Text>
        </View>

        {/* Driver Info (only show during delivery) */}
        {order.statusProgress === 'delivery' && tracking && (
          <View style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <MaterialIcons name="delivery-dining" size={24} color={COLORS.PRIMARY} />
              <Text style={styles.driverTitle}>Informasi Driver</Text>
            </View>
            
            <View style={styles.driverInfo}>
              <View style={styles.driverDetail}>
                <Text style={styles.driverName}>{tracking.driverName}</Text>
                <Text style={styles.driverVehicle}>
                  {tracking.vehicleType} • {tracking.plateNumber}
                </Text>
                <Text style={styles.estimatedTime}>
                  Estimasi tiba: {tracking.estimatedArrival}
                </Text>
              </View>
              
              <TouchableOpacity style={styles.callButton} onPress={handleCallDriver}>
                <MaterialIcons name="phone" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Order Details */}
        <View style={styles.orderCard}>
          <Text style={styles.cardTitle}>Detail Pesanan</Text>
          
          <View style={styles.orderInfo}>
            <Text style={styles.orderLabel}>Penjual:</Text>
            <Text style={styles.orderValue}>{order.sellerName || 'N/A'}</Text>
          </View>
          
          <View style={styles.orderInfo}>
            <Text style={styles.orderLabel}>Total:</Text>
            <Text style={styles.orderValue}>Rp {order.totalAmount?.toLocaleString()}</Text>
          </View>
          
          <View style={styles.orderInfo}>
            <Text style={styles.orderLabel}>Alamat Pengiriman:</Text>
            <Text style={styles.orderValue}>{order.deliveryAddress}</Text>
          </View>
          
          {order.notes && (
            <View style={styles.orderInfo}>
              <Text style={styles.orderLabel}>Catatan:</Text>
              <Text style={styles.orderValue}>{order.notes}</Text>
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.cardTitle}>Item Pesanan</Text>
          {order.items?.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>Rp {item.price?.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleChatWithSeller}>
            <MaterialIcons name="chat" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.actionButtonText}>Chat Penjual</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleReportIssue}>
            <MaterialIcons name="report-problem" size={20} color="#FF9800" />
            <Text style={styles.actionButtonText}>Laporkan Masalah</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusInfo: {
    marginLeft: 16,
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverDetail: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  driverVehicle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  estimatedTime: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    marginTop: 4,
  },
  callButton: {
    backgroundColor: COLORS.PRIMARY,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  orderInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  orderLabel: {
    fontSize: 14,
    color: '#666',
    width: 120,
  },
  orderValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default OrderTrackingScreen;
