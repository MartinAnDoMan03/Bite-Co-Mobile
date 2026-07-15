import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import COLORS from '../constants/color';
import config from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALERT_TYPE_STYLES = {
  info: { icon: 'info', color: COLORS.PRIMARY, bg: '#F7EAEF' },
  success: { icon: 'check-circle', color: '#2E7D32', bg: '#E8F5E9' },
  error: { icon: 'error', color: '#C62828', bg: '#FFEBEE' },
  warning: { icon: 'warning', color: '#B26A00', bg: '#FFF3E0' },
};

const CustomAlert = ({ visible, title, message, buttons, type = 'info', onClose }) => {
  const typeStyle = ALERT_TYPE_STYLES[type] || ALERT_TYPE_STYLES.info;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.alertOverlay}>
        <View style={styles.alertContent}>
          <View style={[styles.alertIconCircle, { backgroundColor: typeStyle.bg }]}>
            <MaterialIcons name={typeStyle.icon} size={26} color={typeStyle.color} />
          </View>
          <Text style={styles.alertTitle}>{title}</Text>
          {!!message && <Text style={styles.alertMessage}>{message}</Text>}
          <View style={styles.alertButtons}>
            {buttons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.alertButton,
                    isCancel ? styles.alertButtonOutline : styles.alertButtonSolid,
                    isDestructive && styles.alertButtonDestructive,
                  ]}
                  onPress={() => {
                    onClose();
                    btn.onPress && btn.onPress();
                  }}
                >
                  <Text style={[styles.alertButtonText, isCancel ? styles.alertButtonTextOutline : styles.alertButtonTextSolid]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const BiteEcoBuyer = () => {
  const [wasteItems, setWasteItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buyerLocation, setBuyerLocation] = useState(null);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', buttons: [], type: 'info' });
  const router = useRouter();

  const showAlert = (title, message, buttons = [{ text: 'OK' }], type = 'info') => {
    setCustomAlert({ visible: true, title, message, buttons, type });
  };
  const closeAlert = () => setCustomAlert((prev) => ({ ...prev, visible: false }));

  // Load buyer's location for distance calculation
  const loadBuyerLocation = async () => {
    try {
      const savedPinPoint = await AsyncStorage.getItem('pinPoint');
      if (savedPinPoint) {
        const pinPoint = JSON.parse(savedPinPoint);
        if (pinPoint.lat && pinPoint.lng) {
          setBuyerLocation({
            lat: pinPoint.lat,
            lng: pinPoint.lng
          });
        }
      }
    } catch (error) {
      console.error('Error loading buyer location:', error);
    }
  };

  const fetchWasteItems = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);

      // Try to fetch from real API first
      try {
        const response = await fetch(`${config.API_URL}/buyer/bite-eco`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          setWasteItems(result.data || []);
          return;
        }
      } catch (apiError) {
        console.log('API error, using mock data:', apiError.message);
      }

      // Fallback to mock data if API is not available
      const mockWasteItems = [
        {
          id: '1',
          sellerId: 'seller1',
          title: 'Sayuran Segar',
          description: 'Sayuran segar yang masih layak konsumsi',
          quantity: '2 kg',
          condition: 'Sangat Baik',
          image: 'https://via.placeholder.com/200x150/4CAF50/FFFFFF?text=Sayuran',
          seller: {
            outletName: 'Warung Sehat',
            latitude: -6.200000,
            longitude: 106.816666,
            address: 'Jakarta Pusat'
          },
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          sellerId: 'seller2',
          title: 'Roti Kemarin',
          description: 'Roti masih fresh, diproduksi kemarin',
          quantity: '5 buah',
          condition: 'Baik',
          image: 'https://via.placeholder.com/200x150/FF9800/FFFFFF?text=Roti',
          seller: {
            outletName: 'Toko Roti Manis',
            latitude: -6.175110,
            longitude: 106.827153,
            address: 'Jakarta Selatan'
          },
          createdAt: new Date().toISOString()
        }
      ];

      await new Promise(resolve => setTimeout(resolve, 800));
      setWasteItems(mockWasteItems);

    } catch (error) {
      console.error('Error fetching waste items:', error);
      showAlert('Info', 'Menggunakan data demo. Backend Bite Eco endpoint belum sepenuhnya tersedia.', [{ text: 'OK' }], 'info');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useFocusEffect(
    useCallback(() => {
      loadBuyerLocation();
      fetchWasteItems();
    }, [fetchWasteItems])
  );

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const submitOrder = async (item) => {
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      const orderData = {
        sellerId: item.sellerId,
        wasteItemId: item.id,
        orderType: 'Bite Eco',
        items: [{
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          condition: item.condition,
          image: item.image
        }],
        totalAmount: 0,
      };

      const response = await fetch(`${config.API_URL}/buyer/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      showAlert(
        'Berhasil',
        'Pesanan Bite Eco berhasil dibuat. Menunggu persetujuan seller.',
        [{ text: 'OK', onPress: () => router.push('/buyer/(tabs)/order') }],
        'success'
      );
    } catch (error) {
      console.error('Error creating order:', error);
      showAlert('Error', 'Gagal membuat pesanan', [{ text: 'OK' }], 'error');
    }
  };

  const handleOrderItem = async (item) => {
    const token = await AsyncStorage.getItem('buyerToken');
    if (!token) {
      showAlert('Error', 'Silakan login terlebih dahulu', [{ text: 'OK' }], 'error');
      return;
    }

    showAlert(
      'Konfirmasi Pesanan',
      `Apakah Anda yakin ingin memesan "${item.title}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Pesan', onPress: () => submitOrder(item) },
      ],
      'warning'
    );
  };

  const WasteItemCard = ({ item }) => {
    const distance = buyerLocation && item.seller?.latitude && item.seller?.longitude
      ? calculateDistance(
          buyerLocation.lat,
          buyerLocation.lng,
          item.seller.latitude,
          item.seller.longitude
        )
      : null;

    const conditionColor =
      item.condition === 'Sangat Baik' ? '#4CAF50' :
      item.condition === 'Baik' ? '#8BC34A' :
      item.condition === 'Cukup Baik' ? '#FFC107' : '#FF9800';

    return (
      <View style={[styles.wasteCard, styles.shadow]}>
        <View style={styles.cardHeader}>
          <Image
            source={{ uri: item.image || 'https://via.placeholder.com/80' }}
            style={styles.wasteImage}
          />
          <View style={styles.wasteInfo}>
            <Text style={styles.wasteTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.wasteMetaRow}>
              <MaterialIcons name="inventory-2" size={12} color="#999" />
              <Text style={styles.wasteMetaText}>Kuantitas: {item.quantity}</Text>
            </View>
            <View style={styles.wasteMetaRow}>
              <MaterialIcons name="verified" size={12} color={conditionColor} />
              <Text style={[styles.wasteMetaText, { color: conditionColor, fontWeight: '600' }]}>
                {item.condition}
              </Text>
            </View>
            <Text style={styles.wasteDescription} numberOfLines={2}>{item.description}</Text>
          </View>
        </View>

        <View style={styles.sellerRow}>
          <View style={styles.sellerDetails}>
            <MaterialIcons name="store" size={14} color={COLORS.PRIMARY} />
            <Text style={styles.sellerName} numberOfLines={1}>
              {item.seller?.outletName || item.seller?.name || 'Seller'}
            </Text>
            {distance !== null && (
              <View style={styles.distancePill}>
                <MaterialIcons name="location-on" size={12} color="#666" />
                <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.orderButton}
          onPress={() => handleOrderItem(item)}
          activeOpacity={0.85}
        >
          <MaterialIcons name="shopping-cart" size={15} color="#fff" />
          <Text style={styles.orderButtonText}>Pesan</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Kembali">
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bite Eco</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.content}>
        {/* Intro Section */}
        <View style={[styles.introCard, styles.shadow]}>
          <View style={styles.headerInfo}>
            <View style={styles.introIconBox}>
              <MaterialIcons name="recycling" size={24} color={COLORS.GREEN4} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.introTitle}>Limbah Makanan Tersedia</Text>
              <Text style={styles.introSubtitle}>
                Dapatkan limbah makanan untuk pengolahan lebih lanjut
              </Text>
            </View>
          </View>
        </View>

        {/* Items List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Memuat data...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.itemsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchWasteItems();
                }}
                colors={[COLORS.PRIMARY]}
              />
            }
          >
            {wasteItems.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <MaterialIcons name="recycling" size={40} color="#bbb" />
                </View>
                <Text style={styles.emptyTitle}>Belum Ada Item Tersedia</Text>
                <Text style={styles.emptySubtitle}>
                  Belum ada seller yang memposting limbah makanan
                </Text>
              </View>
            ) : (
              wasteItems.map((item) => (
                <WasteItemCard key={item.id} item={item} />
              ))
            )}
          </ScrollView>
        )}
      </View>

      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        type={customAlert.type}
        onClose={closeAlert}
      />
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.PRIMARY },

  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Intro card
  introCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    marginBottom: 14,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  introIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E9F5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  introTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 3,
  },
  introSubtitle: {
    fontSize: 12,
    color: '#888',
  },

  itemsList: {
    flex: 1,
  },
  wasteCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  wasteImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  wasteInfo: {
    flex: 1,
    marginLeft: 12,
  },
  wasteTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 4,
  },
  wasteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  wasteMetaText: {
    fontSize: 11.5,
    color: '#888',
  },
  wasteDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sellerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sellerName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    flexShrink: 1,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 3,
    marginLeft: 4,
  },
  distanceText: {
    fontSize: 11.5,
    color: '#666',
  },
  orderButton: {
    backgroundColor: COLORS.GREEN4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
  },
  orderButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12.5,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13.5,
    color: '#888',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 19,
  },

  // CustomAlert
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  alertContent: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  alertIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23272f',
    textAlign: 'center',
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 13.5,
    color: '#777',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  alertButtonSolid: {
    backgroundColor: COLORS.PRIMARY,
  },
  alertButtonOutline: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
  },
  alertButtonDestructive: {
    backgroundColor: '#C62828',
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertButtonTextSolid: {
    color: '#fff',
  },
  alertButtonTextOutline: {
    color: '#777',
  },
});

export default BiteEcoBuyer;