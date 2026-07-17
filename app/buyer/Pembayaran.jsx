import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, Platform, Image } from "react-native";
import { useEffect, useState } from 'react';
import HeaderTitleBack from '../../components/HeaderTitleBack';
import COLORS from '../constants/color';
import axios from 'axios';
import config from '../constants/config';
import { useRouter } from 'expo-router';
import { useToast } from '../../components/ToastProvider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import logo from "../../assets/images/logo.png";

const VALID_PACKAGE_TYPES = ['Harian', 'Mingguan', 'Bulanan'];
const CANCEL_WINDOW_SECONDS = 15;

// -----------------------------------------------------------------------
// ASUMSI BACKEND: pembatalan memanggil PATCH /buyer/orders/:id dengan
// body { statusProgress: 'cancelled' } — pola sama seperti update status
// pembayaran yang sudah ada di Riwayat.jsx. Kalau kontrak endpoint ini
// berbeda, sesuaikan di handleCancelOrder di bawah.
// -----------------------------------------------------------------------

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
            {buttons.map((btn, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.alertButton, btn.style === 'cancel' ? styles.alertButtonOutline : styles.alertButtonSolid]}
                onPress={() => { onClose(); btn.onPress && btn.onPress(); }}
              >
                <Text style={[styles.alertButtonText, btn.style === 'cancel' ? styles.alertButtonTextOutline : styles.alertButtonTextSolid]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Layar konfirmasi — burgundy penuh di atas (logo + judul), card putih rounded
// menempel di bawah (subtitle, countdown, tombol batal)
// ---------------------------------------------------------------------------
const ConfirmationScreen = ({ countdown, onCancel, cancelling }) => {
  const windowOpen = countdown > 0;
  return (
    <View style={styles.confirmContainer}>
      <SafeAreaView style={styles.confirmTopSection}>
        <Image source={logo} style={styles.confirmLogo} resizeMode="contain" />
        <Text style={styles.confirmTitle}>
          {windowOpen ? 'Pesanan Diterima !' : 'Menunggu Konfirmasi Penjual'}
        </Text>
      </SafeAreaView>

      <View style={styles.confirmCard}>
        <Text style={styles.confirmSubtitle}>
          {windowOpen
            ? 'Pesanan Anda akan diproses dan dikirim ke penjual.'
            : 'Pesanan Anda telah dikirim ke penjual. Kamu akan diarahkan ke halaman Pesanan.'}
        </Text>

        {windowOpen ? (
          <>
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
            </View>

            <TouchableOpacity
              style={[styles.cancelOrderButton, cancelling && { opacity: 0.6 }]}
              onPress={onCancel}
              disabled={cancelling}
              activeOpacity={0.85}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.cancelOrderButtonText}>Batalkan Pesanan</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator size="small" color={COLORS.PRIMARY} style={{ marginTop: 12 }} />
        )}
      </View>
    </View>
  );
};

const Pembayaran = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [store, setStore] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressFields, setAddressFields] = useState({
    address: '', kelurahan: '', kecamatan: '', provinsi: '', kodepos: '', catatan: '',
  });
  const [orderType, setOrderType] = useState('');
  const [buyerLocation, setBuyerLocation] = useState(null);

  const [stage, setStage] = useState('form');
  const [orderId, setOrderId] = useState(null);
  const [countdown, setCountdown] = useState(CANCEL_WINDOW_SECONDS);
  const [cancelling, setCancelling] = useState(false);

  const [alert, setAlert] = useState({ visible: false, title: '', message: '', buttons: [{ text: 'OK' }], type: 'info' });
  const showAlert = (title, message, buttons = [{ text: 'OK' }], type = 'info') => {
    setAlert({ visible: true, title, message, buttons, type });
  };
  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

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
        const orderTypeData = await AsyncStorage.getItem('order_type');
        setOrderType(orderTypeData || '');
        const buyerLocationData = await AsyncStorage.getItem('pinPoint');
        if (buyerLocationData) {
          const pinPoint = JSON.parse(buyerLocationData);
          if (pinPoint.lat && pinPoint.lng) {
            setBuyerLocation({ lat: pinPoint.lat, lng: pinPoint.lng });
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

  const isRantanganOrder = orderType === 'Rantangan' || orderType.includes('Rantangan');

  const getPackageType = (orderType) => {
    if (!orderType) return null;
    if (store?.rantanganPackageType && VALID_PACKAGE_TYPES.includes(store.rantanganPackageType)) {
      return store.rantanganPackageType;
    }
    if (orderType === 'Rantangan' || orderType.includes('Rantangan')) {
      if (orderType.includes('Harian')) return 'Harian';
      if (orderType.includes('Mingguan')) return 'Mingguan';
      if (orderType.includes('Bulanan')) return 'Bulanan';
      return 'Harian';
    }
    return null;
  };

  const calculateEndDate = (fromDate, packageType) => {
    if (!fromDate || !packageType) return;
    const start = new Date(fromDate);
    setStartDate(start);
    let end = new Date(start);
    switch (packageType) {
      case 'Harian': end = new Date(start); break;
      case 'Mingguan': end.setDate(start.getDate() + 6); break;
      case 'Bulanan': end.setDate(start.getDate() + 29); break;
      default: end = new Date(start);
    }
    setEndDate(end);
  };

  const confirmDateSelection = (date) => {
    const packageType = getPackageType(orderType);
    if (!packageType) {
      showAlert('Tidak Bisa Menentukan Paket', 'Jenis paket rantangan tidak dikenali. Coba pilih ulang paket dari halaman sebelumnya.', [{ text: 'OK' }], 'error');
      return;
    }
    setSelectedDate(date);
    calculateEndDate(date, packageType);
  };

  const handleAndroidDateChange = (event, date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && date) {
      confirmDateSelection(date);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    const sum = cart.reduce((acc, item) => acc + (item.price || 0), 0);
    setTotal(sum);
  }, [cart]);

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

  useEffect(() => {
    if (stage !== 'confirming' || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [stage, countdown]);

  useEffect(() => {
    if (stage === 'confirming' && countdown === 0) {
      const redirectTimer = setTimeout(() => {
        router.replace('/buyer/(tabs)/riwayat');
      }, 1800);
      return () => clearTimeout(redirectTimer);
    }
  }, [stage, countdown]);

  const handlePesan = async () => {
    if (!cart.length || !store) {
      showAlert('Tidak Bisa Melanjutkan', 'Keranjang kosong atau toko tidak ditemukan.', [{ text: 'OK' }], 'error');
      return;
    }

    if (isRantanganOrder && !startDate) {
      showAlert(
        'Pilih Tanggal Dulu',
        'Silakan pilih tanggal mulai untuk pesanan Rantangan sebelum melanjutkan.',
        [{ text: 'Pilih Tanggal', onPress: () => setShowDatePicker(true) }],
        'warning'
      );
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      const addressData = await AsyncStorage.getItem('addressFields');
      const addressObj = addressData ? JSON.parse(addressData) : {};

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
          orderType: orderType,
          buyerLat: buyerLocation?.lat || null,
          buyerLng: buyerLocation?.lng || null,
          sellerLat: store?.pinLat || null,
          sellerLng: store?.pinLng || null,
          startDate: isRantanganOrder && startDate ? startDate.toISOString() : null,
          endDate: isRantanganOrder && endDate ? endDate.toISOString() : null,
          packageType: isRantanganOrder ? getPackageType(orderType) : null,
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      if (res.data && res.data.orderId) {
        setOrderId(res.data.orderId);

        await AsyncStorage.removeItem('cart');
        await AsyncStorage.removeItem('cart_total');
        await AsyncStorage.removeItem('cart_store');
        await AsyncStorage.removeItem('order_type');

        setCountdown(CANCEL_WINDOW_SECONDS);
        setStage('confirming');
      } else {
        showAlert('Gagal Membuat Pesanan', 'Pesanan tidak berhasil dibuat. Coba lagi beberapa saat.', [{ text: 'OK' }], 'error');
      }
    } catch (e) {
      console.error('Create order error:', e);
      showAlert('Gagal Membuat Pesanan', 'Terjadi kendala saat membuat pesanan. Coba lagi.', [{ text: 'OK' }], 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId) return;
    setCancelling(true);
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      await axios.patch(
        `${config.API_URL}/buyer/orders/${orderId}`,
        { statusProgress: 'cancelled' },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      showToast('Pesanan dibatalkan', 'info');
      router.back();
    } catch (e) {
      console.error('Cancel order error:', e);
      showAlert(
        'Gagal Membatalkan',
        'Terjadi kendala saat membatalkan pesanan. Kamu masih bisa membatalkannya dari halaman Pesanan Saya.',
        [{ text: 'OK' }],
        'error'
      );
    } finally {
      setCancelling(false);
    }
  };

  const handleSaveAddress = async () => {
    if (addressFields.address.trim()) {
      await AsyncStorage.setItem('addressFields', JSON.stringify(addressFields));
      setAddress(addressFields.address.trim());
      setShowAddressModal(false);
      showToast('Alamat berhasil disimpan', 'success');
    } else {
      showAlert('Alamat Kosong', 'Alamat tidak boleh kosong.', [{ text: 'OK' }], 'error');
    }
  };

  const maxDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1));

  if (stage === 'confirming') {
    return (
      <>
        <ConfirmationScreen countdown={countdown} onCancel={handleCancelOrder} cancelling={cancelling} />
        <CustomAlert
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          buttons={alert.buttons}
          type={alert.type}
          onClose={closeAlert}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Pesanan" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.content}>
          {store && (
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.storeSub}>{store.kelurahan}</Text>
              <Text style={styles.storeSub}>{store.type}</Text>
            </View>
          )}
          <Text style={styles.title}>Ringkasan Pesanan</Text>

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Alamat Pengantaran</Text>
            <Text style={styles.addressMain}>{addressFields.address || '-'}</Text>
            {!!addressFields.kelurahan && <Text style={styles.addressLine}>Kelurahan: {addressFields.kelurahan}</Text>}
            {!!addressFields.kecamatan && <Text style={styles.addressLine}>Kecamatan: {addressFields.kecamatan}</Text>}
            {!!addressFields.provinsi && <Text style={styles.addressLine}>Provinsi: {addressFields.provinsi}</Text>}
            {!!addressFields.kodepos && <Text style={styles.addressLine}>Kode Pos: {addressFields.kodepos}</Text>}
            {!!addressFields.catatan && <Text style={styles.addressLine}>Catatan: {addressFields.catatan}</Text>}
            <TouchableOpacity onPress={() => setShowAddressModal(true)} style={{ marginTop: 6 }}>
              <Text style={styles.linkText}>Ubah Alamat</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>List Menu Dipesan</Text>
          <View style={{ maxHeight: 260 }}>
            <ScrollView>
              {cart && cart.length > 0 ? cart.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={{ flex: 1, color: '#23272f' }}>{item.name}</Text>
                </View>
              )) : <Text style={{ color: '#888' }}>Tidak ada item di keranjang.</Text>}
            </ScrollView>
          </View>

          {isRantanganOrder && (
            <View style={{ marginTop: 16, marginBottom: 4 }}>
              <Text style={styles.sectionLabel}>Jadwal Pengantaran</Text>

              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                <MaterialIcons name="calendar-today" size={18} color={COLORS.PRIMARY} />
                <Text style={styles.dateButtonText}>
                  {startDate ? `Tanggal Mulai: ${formatDate(startDate)}` : 'Pilih Tanggal Mulai'}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#c9c9c9" />
              </TouchableOpacity>

              {startDate && endDate && getPackageType(orderType) !== 'Harian' && (
                <View style={styles.dateInfo}>
                  <MaterialIcons name="event" size={15} color="#2E7D32" />
                  <Text style={styles.dateInfoText}>Berakhir: {formatDate(endDate)}</Text>
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
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rp {total?.toLocaleString('id-ID')}</Text>
          </View>

          <TouchableOpacity style={[styles.submitButton, submitting && { opacity: 0.6 }]} onPress={handlePesan} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={styles.submitButtonText}>Pesan</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.paymentNote}>
            Pembayaran dilakukan setelah penjual mengonfirmasi pesananmu.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={showAddressModal} transparent animationType="slide">
        <View style={styles.centerModalOverlay}>
          <View style={styles.addressModalCard}>
            <Text style={styles.modalTitle}>Masukkan Alamat Pengantaran</Text>
            <TextInput
              value={addressFields.address}
              onChangeText={v => setAddressFields(f => ({ ...f, address: v }))}
              placeholder="Alamat lengkap..."
              placeholderTextColor="#aaa"
              style={styles.input}
              multiline
            />
            <TextInput
              value={addressFields.kelurahan}
              onChangeText={v => setAddressFields(f => ({ ...f, kelurahan: v }))}
              placeholder="Kelurahan"
              placeholderTextColor="#aaa"
              style={styles.input}
            />
            <TextInput
              value={addressFields.kecamatan}
              onChangeText={v => setAddressFields(f => ({ ...f, kecamatan: v }))}
              placeholder="Kecamatan"
              placeholderTextColor="#aaa"
              style={styles.input}
            />
            <TextInput
              value={addressFields.provinsi}
              onChangeText={v => setAddressFields(f => ({ ...f, provinsi: v }))}
              placeholder="Provinsi"
              placeholderTextColor="#aaa"
              style={styles.input}
            />
            <TextInput
              value={addressFields.kodepos}
              onChangeText={v => setAddressFields(f => ({ ...f, kodepos: v }))}
              placeholder="Kode Pos"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              value={addressFields.catatan}
              onChangeText={v => setAddressFields(f => ({ ...f, catatan: v }))}
              placeholder="Catatan (opsional)"
              placeholderTextColor="#aaa"
              style={[styles.input, { marginBottom: 16 }]}
              multiline
            />
            <TouchableOpacity style={styles.saveAddressButton} onPress={handleSaveAddress}>
              <Text style={styles.saveAddressButtonText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          maximumDate={maxDate}
          onChange={handleAndroidDateChange}
        />
      )}

      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.centerModalOverlay}>
            <View style={styles.dateModalCard}>
              <Text style={styles.modalTitle}>Pilih Tanggal Mulai</Text>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                maximumDate={maxDate}
                onChange={(event, date) => { if (date) setSelectedDate(date); }}
                style={{ backgroundColor: 'white', height: 200 }}
                textColor="#000"
              />
              <View style={styles.dateModalButtonRow}>
                <TouchableOpacity style={styles.dateModalCancelButton} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.dateModalCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateModalConfirmButton}
                  onPress={() => { confirmDateSelection(selectedDate); setShowDatePicker(false); }}
                >
                  <Text style={styles.dateModalConfirmText}>Pilih</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        type={alert.type}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  content: {
    margin: 20, backgroundColor: 'white', borderRadius: 18, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  storeInfo: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  storeName: { fontWeight: '700', fontSize: 15, color: '#23272f' },
  storeSub: { fontSize: 12, color: '#888', marginTop: 2 },
  title: { fontSize: 17, fontWeight: '700', color: '#23272f', marginBottom: 18 },
  label: { fontWeight: '700', fontSize: 13.5, color: '#23272f', marginBottom: 6 },
  addressMain: { fontSize: 14.5, color: '#23272f', marginBottom: 2 },
  addressLine: { fontSize: 12.5, color: '#888' },
  linkText: { color: COLORS.PRIMARY, fontSize: 13, fontWeight: '600' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 14 },
  sectionLabel: { fontWeight: '700', fontSize: 14.5, color: '#23272f', marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F7EAEF', padding: 13, borderRadius: 12, marginBottom: 8 },
  dateButtonText: { flex: 1, fontSize: 13.5, color: '#23272f', fontWeight: '600' },
  dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', padding: 9, borderRadius: 8, marginBottom: 8 },
  dateInfoText: { fontSize: 12.5, color: '#2E7D32', fontWeight: '600' },
  packageInfo: { backgroundColor: '#FFF3E0', padding: 9, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#B26A00' },
  packageInfoText: { fontSize: 12.5, color: '#8a5a10', fontWeight: '600' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 18 },
  totalLabel: { fontWeight: '700', fontSize: 15, color: '#23272f' },
  totalValue: { fontWeight: '700', fontSize: 15, color: COLORS.PRIMARY },

  submitButton: {
    backgroundColor: COLORS.PRIMARY, borderRadius: 30, paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitButtonText: { color: 'white', fontWeight: '700', fontSize: 15 },
  paymentNote: { fontSize: 11.5, color: '#999', textAlign: 'center', marginTop: 10 },

  centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  addressModalCard: { backgroundColor: 'white', padding: 22, borderRadius: 18, width: '87%' },
  modalTitle: { fontWeight: '700', fontSize: 16, color: '#23272f', marginBottom: 14, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 14, color: '#23272f' },
  saveAddressButton: { backgroundColor: COLORS.PRIMARY, borderRadius: 30, padding: 13, alignItems: 'center' },
  saveAddressButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },

  dateModalCard: { backgroundColor: 'white', borderRadius: 18, padding: 20, width: '90%', maxWidth: 400 },
  dateModalButtonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  dateModalCancelButton: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e5e5', paddingVertical: 12, borderRadius: 30, alignItems: 'center' },
  dateModalCancelText: { color: '#777', fontWeight: '700', fontSize: 14 },
  dateModalConfirmButton: { flex: 1, backgroundColor: COLORS.PRIMARY, paddingVertical: 12, borderRadius: 30, alignItems: 'center' },
  dateModalConfirmText: { color: 'white', fontWeight: '700', fontSize: 14 },

  // ---------------- Layar konfirmasi (selaras dengan referensi gambar) ----------------
  confirmContainer: { flex: 1, backgroundColor: COLORS.PRIMARY },
  confirmTopSection: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 32,
  paddingBottom: 40,
},
  confirmLogo: { width: 120, height: 120, marginBottom: 20, tintColor: '#fff' },
  confirmTitle: { fontSize: 23, fontWeight: '700', color: '#fff', textAlign: 'center' },
  confirmCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 28,
    paddingBottom: 36,
    alignItems: 'center',
  },
  confirmSubtitle: { fontSize: 13.5, color: COLORS.PRIMARY, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  countdownCircle: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: COLORS.PRIMARY,
    justifyContent: 'center', alignItems: 'center', marginBottom: 22,
  },
  countdownNumber: { fontSize: 22, fontWeight: '700', color: COLORS.PRIMARY },
  cancelOrderButton: {
    backgroundColor: COLORS.PRIMARY, borderRadius: 30, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', width: '100%',
  },
  cancelOrderButtonText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },

  alertOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  alertContent: { backgroundColor: 'white', borderRadius: 18, padding: 22, width: '100%', maxWidth: 340, alignItems: 'center' },
  alertIconCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  alertTitle: { fontSize: 16, fontWeight: '700', color: '#23272f', textAlign: 'center', marginBottom: 6 },
  alertMessage: { fontSize: 13.5, color: '#777', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  alertButtons: { flexDirection: 'row', gap: 10, width: '100%' },
  alertButton: { flex: 1, paddingVertical: 12, borderRadius: 30, alignItems: 'center' },
  alertButtonSolid: { backgroundColor: COLORS.PRIMARY },
  alertButtonOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e5e5' },
  alertButtonText: { fontSize: 14, fontWeight: '700' },
  alertButtonTextSolid: { color: '#fff' },
  alertButtonTextOutline: { color: '#777' },
});

export default Pembayaran;