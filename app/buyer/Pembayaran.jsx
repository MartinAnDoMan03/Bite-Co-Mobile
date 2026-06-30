import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput } from "react-native";
import { useEffect, useState, useRef } from 'react';
import HeaderTitleBack from '../../components/HeaderTitleBack';
import COLORS from '../constants/color';
import axios from 'axios';
import config from '../constants/config';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useToast } from '../../components/ToastProvider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';

const Pembayaran = (props) => {
  const router = useRouter();
  const { showToast } = useToast();
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snapUrl, setSnapUrl] = useState(null);
  const [showWebView, setShowWebView] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [address, setAddress] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressFields, setAddressFields] = useState({
    address: '',
    kelurahan: '',
    kecamatan: '',
    provinsi: '',
    kodepos: '',
    catatan: '',
  });
  const [orderType, setOrderType] = useState('');
  const [buyerLocation, setBuyerLocation] = useState(null);
  const webViewRef = useRef(null);
  
  // Date selection states for Rantangan orders
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const cartData = await AsyncStorage.getItem('cart');
        const storeData = await AsyncStorage.getItem('cart_store');
        setCart(cartData ? JSON.parse(cartData) : []);
        setStore(storeData ? JSON.parse(storeData) : null);
        // Load OrderType
        const orderTypeData = await AsyncStorage.getItem('order_type');
        setOrderType(orderTypeData || '');
        console.log('Loaded orderType from AsyncStorage:', orderTypeData || ''); // Debug log
        // Load buyer location
        const buyerLocationData = await AsyncStorage.getItem('pinPoint');
        if (buyerLocationData) {
          const pinPoint = JSON.parse(buyerLocationData);
          if (pinPoint.lat && pinPoint.lng) {
            setBuyerLocation({
              lat: pinPoint.lat,
              lng: pinPoint.lng
            });
          }
        }
      } catch (e) {
        setCart([]);
        setStore(null);
        setOrderType('');
        setBuyerLocation(null);
      }
    };
    fetchCart();
  }, []);

  // Helper function to get package type from orderType
  const getPackageType = (orderType) => {
    if (!orderType) {
      console.log('getPackageType: orderType is empty or null'); // Debug log
      return null;
    }
    
    console.log('getPackageType called with:', orderType); // Debug log
    
    // Check if store has rantangan package type info
    if (store?.rantanganPackageType) {
      console.log('Using store rantanganPackageType:', store.rantanganPackageType); // Debug log
      return store.rantanganPackageType;
    }
    
    // For Rantangan orders, check the orderType string for specific package types
    if (orderType === 'Rantangan' || orderType.includes('Rantangan')) {
      // Check for specific package types in the orderType string
      if (orderType.includes('Harian')) {
        console.log('Detected Harian package from orderType'); // Debug log
        return 'Harian';
      }
      if (orderType.includes('Mingguan')) {
        console.log('Detected Mingguan package from orderType'); // Debug log
        return 'Mingguan';
      }
      if (orderType.includes('Bulanan')) {
        console.log('Detected Bulanan package from orderType'); // Debug log
        return 'Bulanan';
      }
      
      // Default to Harian if no specific package type found (fallback for old orders)
      console.log('No specific package type found, defaulting to Harian'); // Debug log
      return 'Harian';
    }
    
    console.log('Not a Rantangan order, returning null'); // Debug log
    return null;
  };

  // Date selection handlers
  const handleDateChange = (event, date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    
    if (date) {
      setSelectedDate(date);
      // Don't automatically close the picker when using the modal
      // The user will click "Pilih" to confirm
    }
  };

  const calculateEndDate = (startDate, packageType) => {
    if (!startDate || !packageType) return;
    
    const start = new Date(startDate);
    setStartDate(start);
    
    let end = new Date(start);
    
    switch (packageType) {
      case 'Harian':
        // For daily package, end date is the same as start date
        end = new Date(start);
        break;
      case 'Mingguan':
        // For weekly package, add 6 days (7 days total including start date)
        end.setDate(start.getDate() + 6);
        break;
      case 'Bulanan':
        // For monthly package, add 29 days (30 days total including start date)
        end.setDate(start.getDate() + 29);
        break;
      default:
        end = new Date(start);
    }
    
    setEndDate(end);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Calculate total based on cart
  useEffect(() => {
    const sum = cart.reduce((acc, item) => acc + (item.price || 0), 0);
    setTotal(sum);
  }, [cart]);

  // Resume payment if snapUrl exists in AsyncStorage
  useEffect(() => {
    const checkSnapUrl = async () => {
      const savedSnapUrl = await AsyncStorage.getItem('snap_url');
      if (savedSnapUrl) {
        setSnapUrl(savedSnapUrl);
        setShowWebView(true);
      }
    };
    checkSnapUrl();
  }, []);

  useEffect(() => {
    const fetchAddress = async () => {
      const saved = await AsyncStorage.getItem('addressFields');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAddressFields(parsed);
        setAddress(parsed.address || '');
      } else {
        setShowAddressModal(true);
      }
    };
    fetchAddress();
  }, []);

  const handlePay = async () => {
    if (!cart.length || !store) {
      showToast('Keranjang kosong atau toko tidak ditemukan', 'error');
      return;
    }
    
    // Validate date selection for Rantangan orders
    if ((orderType === 'Rantangan' || orderType.includes('Rantangan')) && !startDate) {
      showToast('Silakan pilih tanggal mulai untuk pesanan Rantangan', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      const addressData = await AsyncStorage.getItem('addressFields');
      const addressObj = addressData ? JSON.parse(addressData) : {};
      
      showToast('Membuat pesanan...', 'info');
      
      const res = await axios.post(
        `${config.API_URL}/buyer/orders`,
        {
          sellerId: store.id,
          items: cart,
          totalAmount: total,
          deliveryAddress: addressObj.address || '',
          kelurahan: addressObj.kelurahan || '',
          kecamatan: addressObj.kecamatan || '',
          provinsi: addressObj.provinsi || '',
          kodepos: addressObj.kodepos || '',
          notes: addressObj.catatan || '',
          orderType: orderType, // send OrderType to backend
          buyerLat: buyerLocation?.lat || null, // send buyer latitude
          buyerLng: buyerLocation?.lng || null, // send buyer longitude
          sellerLat: store?.pinLat || null, // send seller latitude from store data
          sellerLng: store?.pinLng || null, // send seller longitude from store data
          // Add date fields for Rantangan orders
          startDate: (orderType === 'Rantangan' || orderType.includes('Rantangan')) && startDate ? startDate.toISOString() : null,
          endDate: (orderType === 'Rantangan' || orderType.includes('Rantangan')) && endDate ? endDate.toISOString() : null,
          packageType: (orderType === 'Rantangan' || orderType.includes('Rantangan')) ? getPackageType(orderType) : null,
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      // FIX: match backend response structure (snapUrl and orderId at top level)
      if (res.data && res.data.snapUrl && res.data.orderId) {
        setOrderId(res.data.orderId);
        setSnapUrl(res.data.snapUrl);
        setShowWebView(true);
        await AsyncStorage.setItem('snap_url', res.data.snapUrl);
        await AsyncStorage.setItem('order_id', res.data.orderId);
        showToast('Pesanan berhasil dibuat', 'success');
      } else {
        showToast('Gagal mendapatkan link pembayaran', 'error');
      }
    } catch (e) {
      console.error('Payment error:', e);
      showToast('Gagal membuat pesanan atau mendapatkan link pembayaran', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewClose = async () => {
    setShowWebView(false);
    await AsyncStorage.removeItem('snap_url');
    await AsyncStorage.removeItem('cart');
    await AsyncStorage.removeItem('cart_total');
    await AsyncStorage.removeItem('cart_store');
    showToast('Pembayaran selesai', 'info');
    router.push('/buyer/(tabs)/riwayat');
  };

  const handleSaveAddress = async () => {
    if (addressFields.address.trim()) {
      await AsyncStorage.setItem('addressFields', JSON.stringify(addressFields));
      setAddress(addressFields.address.trim());
      setShowAddressModal(false);
      showToast('Alamat berhasil disimpan', 'success');
    } else {
      showToast('Alamat tidak boleh kosong', 'error');
    }
  };

  // Watch for WebView modal close and navigate to riwayat
  const prevShowWebView = useRef(showWebView);
  useEffect(() => {
    if (prevShowWebView.current && !showWebView) {
      // WebView just closed
      router.push('/buyer/(tabs)/riwayat');
    }
    prevShowWebView.current = showWebView;
  }, [showWebView]);

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Pembayaran" />
      <View style={styles.content}>
        {store && (
          <View style={styles.storeInfo}>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{store.name}</Text>
            <Text style={{ fontSize: 12, color: '#888' }}>{store.kelurahan}</Text>
            <Text style={{ fontSize: 12, color: '#888' }}>{store.type}</Text>
          </View>
        )}
        <Text style={styles.title}>Ringkasan Pembayaran</Text>
        {/* Address Row */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: 'bold' }}>Alamat Pengantaran</Text>
          <Text style={{ fontSize: 16, color: '#333' }}>{addressFields.address || '-'}</Text>
          <Text style={{ fontSize: 14, color: '#333' }}>{addressFields.kelurahan ? `Kelurahan: ${addressFields.kelurahan}` : ''}</Text>
          <Text style={{ fontSize: 14, color: '#333' }}>{addressFields.kecamatan ? `Kecamatan: ${addressFields.kecamatan}` : ''}</Text>
          <Text style={{ fontSize: 14, color: '#333' }}>{addressFields.provinsi ? `Provinsi: ${addressFields.provinsi}` : ''}</Text>
          <Text style={{ fontSize: 14, color: '#333' }}>{addressFields.kodepos ? `Kode Pos: ${addressFields.kodepos}` : ''}</Text>
          <Text style={{ fontSize: 14, color: '#333' }}>{addressFields.catatan ? `Catatan: ${addressFields.catatan}` : ''}</Text>
          <TouchableOpacity onPress={() => setShowAddressModal(true)} style={{ marginTop: 4 }}>
            <Text style={{ color: COLORS.GREEN3, fontSize: 13 }}>Ubah Alamat</Text>
          </TouchableOpacity>
        </View>
        {/* Divider and List Menu Dipesan label */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 12 }} />
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>List Menu Dipesan</Text>
        <ScrollView style={{ maxHeight: 300 }}>
          {cart && cart.length > 0 ? cart.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={{ flex: 1 }}>{item.name}</Text>
            </View>
          )) : <Text>Tidak ada item di keranjang.</Text>}
        </ScrollView>
        
        {/* Date Selection for Rantangan Orders */}
        {(orderType === 'Rantangan' || orderType.includes('Rantangan')) && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Jadwal Pengantaran</Text>
            
            <TouchableOpacity 
              style={styles.dateButton} 
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialIcons name="calendar-today" size={20} color={COLORS.GREEN3} />
              <Text style={styles.dateButtonText}>
                {startDate ? `Tanggal Mulai: ${formatDate(startDate)}` : 'Pilih Tanggal Mulai'}
              </Text>
            </TouchableOpacity>
            
            {startDate && endDate && getPackageType(orderType) !== 'Harian' && (
              <View style={styles.dateInfo}>
                <MaterialIcons name="event" size={16} color="#666" />
                <Text style={styles.dateInfoText}>
                  Berakhir: {formatDate(endDate)}
                </Text>
              </View>
            )}
            
            {getPackageType(orderType) && (
              <View style={styles.packageInfo}>
                <Text style={styles.packageInfoText}>
                  Paket: {getPackageType(orderType)} 
                  {getPackageType(orderType) === 'Mingguan' && ' (7 hari)'}
                  {getPackageType(orderType) === 'Bulanan' && ' (30 hari)'}
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={{ fontWeight: 'bold' }}>Total</Text>
          <Text style={{ fontWeight: 'bold' }}>Rp {total?.toLocaleString()}</Text>
        </View>
        <TouchableOpacity style={styles.payButton} onPress={handlePay} disabled={loading}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>{loading ? 'Memproses...' : 'Bayar Sekarang'}</Text>
        </TouchableOpacity>
      </View>
      {/* Modal WebView for Snap */}
      <Modal visible={showWebView} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: COLORS.GREEN3 }}>
            <TouchableOpacity onPress={handleWebViewClose} style={{ padding: 10 }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Tutup</Text>
            </TouchableOpacity>
            <Text style={{ color: 'white', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>Pembayaran</Text>
          </View>
          {snapUrl ? (
            <WebView
              ref={webViewRef}
              source={{ uri: snapUrl }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => <ActivityIndicator size="large" color={COLORS.GREEN3} style={{ marginTop: 20 }} />}
              onNavigationStateChange={async (navState) => {
                const url = navState.url;
                if (
                  url.includes('finish') ||
                  url.includes('success') ||
                  url.includes('pending') ||
                  url.includes('status') ||
                  url.includes('complete')
                ) {
                  await AsyncStorage.removeItem('snap_url');
                  await AsyncStorage.removeItem('cart');
                  await AsyncStorage.removeItem('cart_total');
                  await AsyncStorage.removeItem('cart_store');
                  setShowWebView(false);
                  router.push('/buyer/(tabs)/riwayat');
                }
              }}
              onMessage={async (event) => {
                setShowWebView(false);
                await AsyncStorage.removeItem('cart');
                await AsyncStorage.removeItem('cart_total');
                await AsyncStorage.removeItem('cart_store');
                router.push('/buyer/(tabs)/riwayat');
              }}
              onError={async () => {
                setShowWebView(false);
                await AsyncStorage.removeItem('cart');
                await AsyncStorage.removeItem('cart_total');
                await AsyncStorage.removeItem('cart_store');
                router.push('/buyer/(tabs)/riwayat');
              }}
              onHttpError={async () => {
                setShowWebView(false);
                await AsyncStorage.removeItem('cart');
                await AsyncStorage.removeItem('cart_total');
                await AsyncStorage.removeItem('cart_store');
                router.push('/buyer/(tabs)/riwayat');
              }}
              onLoadEnd={async (syntheticEvent) => {
                // Optionally, handle if WebView is closed by payment provider
              }}
            />
          ) : (
            <ActivityIndicator size="large" color={COLORS.GREEN3} style={{ marginTop: 20 }} />
          )}
        </SafeAreaView>
      </Modal>
      {/* Modal for Address Input */}
      <Modal visible={showAddressModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 16, width: '85%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>Masukkan Alamat Pengantaran</Text>
            <TextInput
              value={addressFields.address}
              onChangeText={v => setAddressFields(f => ({ ...f, address: v }))}
              placeholder="Alamat lengkap..."
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }}
              multiline
            />
            <TextInput
              value={addressFields.kelurahan}
              onChangeText={v => setAddressFields(f => ({ ...f, kelurahan: v }))}
              placeholder="Kelurahan"
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }}
            />
            <TextInput
              value={addressFields.kecamatan}
              onChangeText={v => setAddressFields(f => ({ ...f, kecamatan: v }))}
              placeholder="Kecamatan"
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }}
            />
            <TextInput
              value={addressFields.provinsi}
              onChangeText={v => setAddressFields(f => ({ ...f, provinsi: v }))}
              placeholder="Provinsi"
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }}
            />
            <TextInput
              value={addressFields.kodepos}
              onChangeText={v => setAddressFields(f => ({ ...f, kodepos: v }))}
              placeholder="Kode Pos"
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 }}
            />
            <TextInput
              value={addressFields.catatan}
              onChangeText={v => setAddressFields(f => ({ ...f, catatan: v }))}
              placeholder="Catatan (opsional)"
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 16 }}
              multiline
            />
            <TouchableOpacity
              style={{ backgroundColor: COLORS.GREEN3, borderRadius: 8, padding: 12, alignItems: 'center' }}
              onPress={handleSaveAddress}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Date Picker Modal for Rantangan Orders */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}>
            <View style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 20,
              margin: 20,
              width: '90%',
              maxWidth: 400,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 20,
                color: '#333'
              }}>
                Pilih Tanggal Mulai
              </Text>
              
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
                onChange={handleDateChange}
                style={{
                  backgroundColor: 'white',
                  height: 200,
                }}
                textColor="#000"
              />
              
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 20,
                gap: 10
              }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#ccc',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={{ color: '#333', fontWeight: '600' }}>Batal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.GREEN3,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    calculateEndDate(selectedDate, getPackageType(orderType));
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>Pilih</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  content: { margin: 30, backgroundColor: 'white', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3.84, elevation: 5 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 20 },
  payButton: { backgroundColor: COLORS.GREEN3, borderRadius: 20, padding: 15, alignItems: 'center' },
  storeInfo: { marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f7fb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  dateButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  dateInfoText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#2e7d32',
  },
  packageInfo: {
    backgroundColor: '#fff3e0',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  packageInfoText: {
    fontSize: 13,
    color: '#e65100',
    fontWeight: '500',
  },
});

export default Pembayaran;
