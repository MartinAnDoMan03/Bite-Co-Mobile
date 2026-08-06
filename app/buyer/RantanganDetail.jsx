import { SafeAreaView } from "react-native-safe-area-context";
import banner2 from "../../assets/images/banner2.png";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal } from "react-native";
import starSolid from "../../assets/images/starSolid.png";
import COLORS from '../constants/color';
import { useLocalSearchParams } from "expo-router";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import config from '../constants/config';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import SkeletonLoader from '../../components/SkeletonLoader';
import { getOutletStatus, isOutletOrderable } from '../services/OutletStatusService';

const BANNER_HEIGHT = 150;
const OVERLAP = 30;
const FALLBACK_CARD_HEIGHT = 100;

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

const PACKAGE_ICONS = {
  harian: "today",
  mingguan: "date-range",
  bulanan: "event-repeat",
};

const PackageItem = ({ type, title, description, price, onPress, disabled }) => {
  return (
    <TouchableOpacity
      style={[styles.packageCard, disabled && styles.packageCardDisabled]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.8}
      disabled={disabled}
    >
      <View style={styles.packageIconWrap}>
        <MaterialIcons name={PACKAGE_ICONS[type] || "event"} size={22} color={COLORS.PRIMARY} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.packageTitle}>{title}</Text>
        <Text style={styles.packageDesc} numberOfLines={2}>{description}</Text>
        <Text style={styles.packagePrice}>Rp {price?.toLocaleString() || "-"}</Text>
      </View>
      {disabled ? (
        <Text style={styles.packageClosedText}>Tutup</Text>
      ) : (
        <MaterialIcons name="arrow-forward-ios" size={16} color={COLORS.TEXTSECONDARY} />
      )}
    </TouchableOpacity>
  );
};

const InfoRow = ({ icon, text }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <MaterialIcons name={icon} size={16} color={COLORS.PRIMARY} />
    </View>
    <Text style={styles.infoText}>{text}</Text>
  </View>
);

const RantanganDetail = () => {
  const { sellerid } = useLocalSearchParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bannerUrl, setBannerUrl] = useState(null);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [buyerLocation, setBuyerLocation] = useState(null);
  const [cardHeight, setCardHeight] = useState(FALLBACK_CARD_HEIGHT);
  const router = useRouter();

  // Dihitung ulang tiap kali `store` berubah (setelah fetch detail selesai)
  const outletStatus = store ? getOutletStatus(store) : null;
  const orderable = store ? isOutletOrderable(store) : true;

  // Keranjang global (dibaca dari AsyncStorage, tidak terikat sellerid halaman ini).
  // Ini yang bikin tombol "Lihat Keranjang" tetap muncul walau user pindah dari
  // Catering ke Rantangan tanpa nge-checkout dulu.
  const [globalCart, setGlobalCart] = useState({ items: [], store: null, orderType: null, total: 0 });
  const [cartModalVisible, setCartModalVisible] = useState(false);

  const [alert, setAlert] = useState({ visible: false, title: '', message: '', buttons: [{ text: 'OK' }], type: 'info' });
  const showAlert = (title, message, buttons = [{ text: 'OK' }], type = 'info') => {
    setAlert({ visible: true, title, message, buttons, type });
  };
  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const loadGlobalCart = async () => {
    try {
      const cartRaw = await AsyncStorage.getItem('cart');
      const storeRaw = await AsyncStorage.getItem('cart_store');
      const totalRaw = await AsyncStorage.getItem('cart_total');
      const orderType = await AsyncStorage.getItem('order_type');
      setGlobalCart({
        items: cartRaw ? JSON.parse(cartRaw) : [],
        store: storeRaw ? JSON.parse(storeRaw) : null,
        orderType,
        total: totalRaw ? JSON.parse(totalRaw) : 0,
      });
    } catch (e) {
      setGlobalCart({ items: [], store: null, orderType: null, total: 0 });
    }
  };

  useEffect(() => {
    loadGlobalCart();
  }, []);

  // Refresh keranjang tiap halaman ini kembali fokus (misal user habis nambah
  // item di Catering lalu balik/pindah ke sini lewat tab).
  useFocusEffect(
    useCallback(() => {
      loadGlobalCart();
    }, [])
  );

  const loadBuyerLocation = async () => {
    try {
      const savedPinPoint = await AsyncStorage.getItem('pinPoint');
      if (savedPinPoint) {
        const pinPoint = JSON.parse(savedPinPoint);
        if (pinPoint.lat && pinPoint.lng) {
          setBuyerLocation({ lat: pinPoint.lat, lng: pinPoint.lng });
        }
      }
    } catch (error) {
      console.error('Error loading buyer location:', error);
    }
  };

  useEffect(() => {
    loadBuyerLocation();
  }, []);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      setBannerLoading(true);

      try {
        let apiUrl = `${config.API_URL}/seller/rantangan-list`;
        if (buyerLocation) {
          apiUrl += `?buyerLat=${buyerLocation.lat}&buyerLng=${buyerLocation.lng}`;
        }

        const res = await axios.get(apiUrl);

        if (res.data && res.data.sellers) {
          const selectedSeller = res.data.sellers.find(seller => seller.id === sellerid);
          if (selectedSeller) {
            setStore(selectedSeller);
            setBannerUrl(selectedSeller.banner);
            if (!selectedSeller.banner) {
              setBannerLoading(false);
            }
          } else {
            setError("Seller tidak ditemukan");
          }
        } else {
          setError("Gagal memuat detail rantangan");
        }
      } catch (e) {
        console.error("Error fetching rantangan detail:", e);
        setError("Gagal memuat detail rantangan");
      } finally {
        setLoading(false);
      }
    };

    if (sellerid) {
      fetchDetail();
    }
  }, [sellerid, buyerLocation]);

  // Nyimpen pilihan paket ke AsyncStorage dan lanjut ke pembayaran.
  const savePackageSelection = async (packageType, packageData) => {
    try {
      const cartItem = {
        id: `${packageType}-${sellerid}`,
        name: packageData.name,
        description: packageData.description,
        price: packageData.price,
        packageType: packageType,
        sellerId: sellerid
      };
      const capitalizedPackageType = packageType.charAt(0).toUpperCase() + packageType.slice(1);
      await AsyncStorage.setItem('cart', JSON.stringify([cartItem]));
      await AsyncStorage.setItem('cart_total', JSON.stringify(packageData.price));
      await AsyncStorage.setItem('cart_store', JSON.stringify(store));
      await AsyncStorage.setItem('cart_pax', '1');
      await AsyncStorage.setItem('order_type', `Rantangan ${capitalizedPackageType}`);
      router.push('/buyer/Pembayaran');
    } catch (error) {
      console.error('Error saving package selection:', error);
      showAlert('Gagal Menyimpan', 'Terjadi kendala saat menyimpan pilihan paket. Coba lagi.', [{ text: 'OK' }], 'error');
    }
  };

  // Ceknya sekarang di titik klik (bukan pas halaman baru dibuka). Kalau ada
  // pesanan lain yang beda seller/tipe, tanya dulu sebelum di-overwrite.
  const handlePackageSelect = async (packageType, packageData) => {
    if (!orderable) {
      showAlert('Outlet Tutup', outletStatus?.nextOpenLabel || 'Outlet sedang tutup, coba lagi nanti.', [{ text: 'OK' }], 'warning');
      return;
    }

    const existingOrderType = await AsyncStorage.getItem('order_type');
    const existingCartRaw = await AsyncStorage.getItem('cart');
    const existingStoreRaw = await AsyncStorage.getItem('cart_store');
    const hasExistingCart = existingCartRaw && JSON.parse(existingCartRaw).length > 0;
    const existingStore = existingStoreRaw ? JSON.parse(existingStoreRaw) : null;
    const sameSellerSameType = existingStore?.id === sellerid && existingOrderType?.startsWith('Rantangan');

    if (hasExistingCart && existingOrderType && !sameSellerSameType) {
      showAlert(
        'Ganti Pesanan?',
        `Kamu masih punya pesanan ${existingOrderType} yang belum diselesaikan. Melanjutkan di sini akan menghapus pesanan tersebut.`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Ya, Ganti',
            onPress: async () => {
              // Bersihin juga sisa lokasi custom Catering (delivery_location_override,
              // catering_delivery_location) — kalau tidak, Pembayaran.jsx bisa salah
              // pakai alamat Catering lama untuk order Rantangan yang baru ini.
              await AsyncStorage.multiRemove([
                'cart', 'cart_total', 'cart_store', 'cart_pax', 'order_type',
                'delivery_location_override', 'catering_delivery_location',
              ]);
              await savePackageSelection(packageType, packageData);
              loadGlobalCart();
            },
          },
        ],
        'warning'
      );
      return;
    }

    await savePackageSelection(packageType, packageData);
    loadGlobalCart();
  };

  const handleCancelCart = () => {
    showAlert(
      'Batalkan Pesanan?',
      'Semua item di keranjang akan dihapus.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          onPress: async () => {
            // Sama seperti di atas: bersihin juga sisa lokasi custom Catering.
            await AsyncStorage.multiRemove([
              'cart', 'cart_total', 'cart_store', 'cart_pax', 'order_type',
              'delivery_location_override', 'catering_delivery_location',
            ]);
            setGlobalCart({ items: [], store: null, orderType: null, total: 0 });
            setCartModalVisible(false);
          },
        },
      ],
      'warning'
    );
  };

  const handleBannerImageLoad = () => setBannerLoading(false);
  const handleBannerImageError = () => setBannerLoading(false);

  const headerHeight = BANNER_HEIGHT - OVERLAP + cardHeight;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <View style={styles.bannerLayer}>
          <SkeletonLoader width="100%" height={BANNER_HEIGHT} borderRadius={0} />
        </View>
        <ScrollView contentContainerStyle={{ paddingTop: BANNER_HEIGHT + 20, paddingBottom: 30 }}>
          <View style={styles.loadingContainer}>
            <SkeletonLoader width="80%" height={20} style={{ marginBottom: 10 }} />
            <SkeletonLoader width="60%" height={16} style={{ marginBottom: 20 }} />
            <SkeletonLoader width="100%" height={90} style={{ marginBottom: 15, borderRadius: 20 }} />
            <SkeletonLoader width="100%" height={90} style={{ marginBottom: 15, borderRadius: 20 }} />
            <SkeletonLoader width="100%" height={90} style={{ borderRadius: 20 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !store) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <View style={styles.bannerLayer}>
          <Image source={banner2} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.bannerScrim} pointerEvents="none" />
        </View>
        <View style={[styles.errorContainer, { paddingTop: BANNER_HEIGHT + 20 }]}>
          <MaterialIcons name="error-outline" size={40} color={COLORS.TEXTSECONDARY} />
          <Text style={styles.errorText}>{error || "Data rantangan tidak ditemukan"}</Text>
          {!!error && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                setLoading(true);
              }}
            >
              <Text style={styles.retryButtonText}>Coba Lagi</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Fixed header: banner + store card, does NOT scroll */}
      <View style={styles.bannerLayer}>
        {bannerLoading && (
          <View style={StyleSheet.absoluteFill}>
            <SkeletonLoader width="100%" height="100%" borderRadius={0} />
          </View>
        )}
        <Image
          source={bannerUrl ? { uri: bannerUrl } : banner2}
          style={[styles.bannerImage, { opacity: bannerLoading ? 0 : 1 }]}
          resizeMode="cover"
          onLoad={handleBannerImageLoad}
          onError={handleBannerImageError}
        />
        <View style={styles.bannerScrim} pointerEvents="none" />
      </View>

      <View
        style={[styles.storeCard, { top: BANNER_HEIGHT - OVERLAP }]}
        onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
          {!!store.kelurahan && (
            <View style={styles.locationRow}>
              <MaterialIcons name="place" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.storeSub} numberOfLines={1}>{store.kelurahan}</Text>
            </View>
          )}
          <View style={styles.tag}>
            <Text style={styles.tagText}>Rantangan</Text>
          </View>
        </View>
        <View style={styles.ratingPill}>
          <Image source={starSolid} style={{ width: 20, height: 20 }} />
          <Text style={styles.ratingText}>{store.rating || 0}</Text>
        </View>
      </View>

      {/* Scrollable content, sits below the fixed header */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, marginTop: headerHeight }}
        contentContainerStyle={{ paddingTop: 15, paddingBottom: 30 }}
      >
        {/* Package Options */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={styles.sectionTitle}>Pilih Paket Rantangan</Text>
          <Text style={styles.sectionSubtitle}>Sesuaikan durasi langganan dengan kebutuhanmu</Text>

          {!orderable && outletStatus && (
            <View style={styles.closedNotice}>
              <MaterialIcons name="info" size={16} color="#B26A00" />
              <Text style={styles.closedNoticeText}>
                {outletStatus.label}{outletStatus.nextOpenLabel ? ` — ${outletStatus.nextOpenLabel}` : ''}
              </Text>
            </View>
          )}

        <View style={{ marginTop: 16 }}>
            {store?.rantanganPackages && store.rantanganPackages.length > 0 ? (
              store.rantanganPackages.map((pkg, index) => {
                const nameLower = pkg.name?.toLowerCase() || "";
                let iconType = "lainnya";
                if (nameLower.includes("harian")) iconType = "harian";
                else if (nameLower.includes("mingguan")) iconType = "mingguan";
                else if (nameLower.includes("bulanan")) iconType = "bulanan";

                return (
                  <PackageItem
                    key={pkg.id || index}
                    type={iconType}
                    title={pkg.name}
                    description={pkg.description}
                    price={pkg.price}
                    onPress={() => handlePackageSelect(pkg.id || pkg.name, pkg)}
                    disabled={!orderable}
                  />
                );
              })
            ) : (
              <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>
                Belum ada paket rantangan yang tersedia.
              </Text>
            )}
          </View>
        </View>

        {/* Additional Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Informasi Rantangan</Text>
          <InfoRow icon="restaurant-menu" text="Menu berganti setiap hari" />
          <InfoRow icon="favorite-border" text="Makanan sehat dan bergizi" />
          <InfoRow icon="schedule" text="Pengantaran tepat waktu" />
          <InfoRow icon="verified" text="Kemasan aman dan higienis" />
        </View>
      </ScrollView>

      {/* Floating Cart Button - global, tetap muncul walau cart bukan punya seller ini */}
      {globalCart.items.length > 0 && (
        <TouchableOpacity style={styles.floatingCartButton} onPress={() => setCartModalVisible(true)}>
          <MaterialIcons name="shopping-bag" size={18} color="white" />
          <Text style={styles.floatingCartText}>Lihat Keranjang ({globalCart.items.length} item)</Text>
        </TouchableOpacity>
      )}

      {/* Global Cart Modal */}
      <Modal visible={cartModalVisible} animationType="slide" transparent onRequestClose={() => setCartModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={() => setCartModalVisible(false)} />
          <View style={styles.cartSheet}>
            <View style={styles.cartHandle} />
            <Text style={styles.cartTitle}>Keranjang</Text>
            {!!globalCart.store?.name && (
              <Text style={{ fontSize: 12, color: COLORS.TEXTSECONDARY, marginBottom: 10 }}>
                {globalCart.store.name} · {globalCart.orderType}
              </Text>
            )}
            <View style={{ maxHeight: 120, marginBottom: 14 }}>
              <ScrollView>
                {globalCart.items.map((item) => (
                  <View key={item.id} style={styles.cartItemRow}>
                    <Text style={{ fontSize: 13 }}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: COLORS.TEXTSECONDARY }}>Rp {item.price?.toLocaleString()}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>Rp {globalCart.total?.toLocaleString()}</Text>
            </View>
            <View style={{ gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={styles.primaryCartBtn}
                onPress={() => { setCartModalVisible(false); router.push('/buyer/Pembayaran'); }}
              >
                <Text style={styles.primaryCartBtnText}>Lanjut Pembayaran</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryCartBtn} onPress={handleCancelCart}>
                <Text style={{ color: '#D64545', fontWeight: '700' }}>Batalkan Pesanan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  bannerLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: BANNER_HEIGHT,
    overflow: "hidden",
    zIndex: 0,
    elevation: 0,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  storeCard: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: COLORS.PRIMARY,
    padding: 18,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    zIndex: 5,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  storeSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
  },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.TEXTSECONDARY,
    marginTop: 3,
  },
  packageCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  packageCardDisabled: {
    opacity: 0.55,
  },
  packageClosedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B26A00',
  },
  closedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  closedNoticeText: {
    flex: 1,
    fontSize: 12.5,
    color: '#B26A00',
    fontWeight: '600',
  },
  packageIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  packageTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  packageDesc: {
    fontSize: 11,
    color: COLORS.TEXTSECONDARY,
    marginTop: 2,
    lineHeight: 15,
  },
  packagePrice: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.PRIMARY,
    marginTop: 5,
  },
  infoCard: {
    padding: 20,
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 5,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  infoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    fontSize: 13,
    color: COLORS.TEXTSECONDARY,
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.TEXTSECONDARY,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  // ---- Floating cart + cart sheet ----
  floatingCartButton: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 18,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingCartText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
  cartSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    minHeight: 260,
    maxHeight: 380,
  },
  cartHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E5E5",
    alignSelf: "center",
    marginBottom: 14,
  },
  cartTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
    color: "#1A1A1A",
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  totalLabel: {
    fontWeight: '700',
    fontSize: 14,
    color: "#1A1A1A",
  },
  totalValue: {
    fontWeight: '700',
    fontSize: 14,
    color: COLORS.PRIMARY,
  },
  primaryCartBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
  },
  primaryCartBtnText: {
    color: 'white',
    fontWeight: '700',
  },
  secondaryCartBtn: {
    backgroundColor: "#F0F0F0",
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
  },
  secondaryCartBtnText: {
    color: '#555',
    fontWeight: '700',
  },
  // ---- CustomAlert ----
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

export default RantanganDetail;