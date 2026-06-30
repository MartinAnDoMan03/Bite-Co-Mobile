import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import HeaderTitleBack from '../../components/HeaderTitleBack';
import COLORS from '../constants/color';
import config from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BiteEcoBuyer = () => {
  const [wasteItems, setWasteItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buyerLocation, setBuyerLocation] = useState(null);
  const router = useRouter();

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
        console.log('Fetching Bite Eco items from:', `${config.API_URL}/buyer/bite-eco`);
        
        const response = await fetch(`${config.API_URL}/buyer/bite-eco`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          setWasteItems(result.data || []);
          return;
        } else {
          console.log('API endpoint not available, using mock data');
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
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setWasteItems(mockWasteItems);
      
    } catch (error) {
      console.error('Error fetching waste items:', error);
      Alert.alert('Info', 'Menggunakan data demo. Backend Bite Eco endpoint belum sepenuhnya tersedia.');
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
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in km
    return d;
  };

  const handleOrderItem = async (item) => {
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      if (!token) {
        Alert.alert('Error', 'Silakan login terlebih dahulu');
        return;
      }

      Alert.alert(
        'Konfirmasi Pesanan',
        `Apakah Anda yakin ingin memesan "${item.title}"?`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Pesan',
            onPress: async () => {
              try {
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
                  totalAmount: 0, // Bite Eco items are usually free or very cheap
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

                Alert.alert(
                  'Berhasil',
                  'Pesanan Bite Eco berhasil dibuat. Menunggu persetujuan seller.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.push('/buyer/(tabs)/order'),
                    },
                  ]
                );
              } catch (error) {
                console.error('Error creating order:', error);
                Alert.alert('Error', 'Gagal membuat pesanan');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error handling order:', error);
      Alert.alert('Error', 'Terjadi kesalahan');
    }
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

    return (
      <View style={styles.wasteCard}>
        <View style={styles.cardHeader}>
          <Image 
            source={{ uri: item.image || 'https://via.placeholder.com/100' }} 
            style={styles.wasteImage} 
          />
          <View style={styles.wasteInfo}>
            <Text style={styles.wasteTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.wasteQuantity}>Kuantitas: {item.quantity}</Text>
            <View style={styles.conditionContainer}>
              <MaterialIcons 
                name="info" 
                size={16} 
                color={
                  item.condition === 'Sangat Baik' ? '#4CAF50' :
                  item.condition === 'Baik' ? '#8BC34A' :
                  item.condition === 'Cukup Baik' ? '#FFC107' : '#FF9800'
                }
              />
              <Text style={[
                styles.wasteCondition,
                { color: 
                  item.condition === 'Sangat Baik' ? '#4CAF50' :
                  item.condition === 'Baik' ? '#8BC34A' :
                  item.condition === 'Cukup Baik' ? '#FFC107' : '#FF9800'
                }
              ]}>
                {item.condition}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.wasteDescription} numberOfLines={3}>{item.description}</Text>
        
        {/* Seller Info */}
        <View style={styles.sellerInfo}>
          <View style={styles.sellerDetails}>
            <MaterialIcons name="store" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.sellerName}>{item.seller?.name || 'Seller'}</Text>
            {distance && (
              <>
                <MaterialIcons name="location-on" size={16} color="#666" />
                <Text style={styles.distance}>{distance.toFixed(1)} km</Text>
              </>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.orderButton}
            onPress={() => handleOrderItem(item)}
          >
            <MaterialIcons name="shopping-cart" size={18} color="#fff" />
            <Text style={styles.orderButtonText}>Pesan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Bite Eco" />
      
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <MaterialIcons name="recycling" size={32} color={COLORS.GREEN4} />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Limbah Makanan Tersedia</Text>
              <Text style={styles.headerSubtitle}>
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
                <MaterialIcons name="recycling" size={64} color="#ccc" />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  itemsList: {
    flex: 1,
  },
  wasteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  wasteImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  wasteInfo: {
    flex: 1,
    marginLeft: 12,
  },
  wasteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#23272f',
    marginBottom: 6,
  },
  wasteQuantity: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
    marginBottom: 6,
  },
  conditionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wasteCondition: {
    fontSize: 14,
    fontWeight: '500',
  },
  wasteDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
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
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.PRIMARY,
    marginRight: 8,
  },
  distance: {
    fontSize: 14,
    color: '#666',
  },
  orderButton: {
    backgroundColor: COLORS.GREEN4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  orderButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#23272f',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default BiteEcoBuyer;
