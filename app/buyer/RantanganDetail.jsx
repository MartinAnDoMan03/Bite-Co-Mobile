import { SafeAreaView } from "react-native-safe-area-context";
import banner2 from "../../assets/images/banner2.png";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import starSolid from "../../assets/images/starSolid.png";
import COLORS from '../constants/color';
import { useLocalSearchParams } from "expo-router";
import axios from "axios";
import { useEffect, useState } from "react";
import config from '../constants/config';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import SkeletonLoader from '../../components/SkeletonLoader';

const BANNER_HEIGHT = 150;
const OVERLAP = 30;
const FALLBACK_CARD_HEIGHT = 100;

const PACKAGE_ICONS = {
  harian: "today",
  mingguan: "date-range",
  bulanan: "event-repeat",
};

const PackageItem = ({ type, title, description, price, onPress }) => {
  return (
    <TouchableOpacity style={styles.packageCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.packageIconWrap}>
        <MaterialIcons name={PACKAGE_ICONS[type] || "event"} size={22} color={COLORS.PRIMARY} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.packageTitle}>{title}</Text>
        <Text style={styles.packageDesc} numberOfLines={2}>{description}</Text>
        <Text style={styles.packagePrice}>Rp {price?.toLocaleString() || "-"}</Text>
      </View>
      <MaterialIcons name="arrow-forward-ios" size={16} color={COLORS.TEXTSECONDARY} />
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

  const handlePackageSelect = async (packageType, packageData) => {
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
    }
  };

  const handleBannerImageLoad = () => setBannerLoading(false);
  const handleBannerImageError = () => setBannerLoading(false);

  const getPackageData = (type) => {
    const defaultPrices = { harian: 50000, mingguan: 300000, bulanan: 1200000 };
    const defaultDescriptions = {
      harian: "Paket rantangan untuk 1 hari dengan menu bergizi dan bervariasi",
      mingguan: "Paket rantangan untuk 1 minggu (7 hari) dengan menu berbeda setiap hari",
      bulanan: "Paket rantangan untuk 1 bulan (30 hari) dengan menu bergizi dan hemat",
    };

    if (!store?.rantanganPackages || !Array.isArray(store.rantanganPackages)) {
      return {
        name: `Paket ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        description: defaultDescriptions[type],
        price: defaultPrices[type] || 0
      };
    }

    let packageItem = store.rantanganPackages.find(pkg =>
      pkg.name?.toLowerCase().includes(type.toLowerCase())
    );

    if (!packageItem) {
      const typeIndex = { harian: 0, mingguan: 1, bulanan: 2 };
      const index = typeIndex[type];
      if (index !== undefined && store.rantanganPackages[index]) {
        packageItem = store.rantanganPackages[index];
      }
    }

    if (packageItem && packageItem.name && packageItem.description && packageItem.price) {
      return {
        name: packageItem.name,
        description: packageItem.description,
        price: packageItem.price
      };
    }

    return {
      name: `Paket ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      description: defaultDescriptions[type],
      price: defaultPrices[type] || 0
    };
  };

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
        contentContainerStyle={{ paddingTop: headerHeight + 10, paddingBottom: 30 }}
      >
        {/* Package Options */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={styles.sectionTitle}>Pilih Paket Rantangan</Text>
          <Text style={styles.sectionSubtitle}>Sesuaikan durasi langganan dengan kebutuhanmu</Text>

          <View style={{ marginTop: 16 }}>
            {['harian', 'mingguan', 'bulanan'].map((type) => {
              const pkg = getPackageData(type);
              return (
                <PackageItem
                  key={type}
                  type={type}
                  title={pkg.name}
                  description={pkg.description}
                  price={pkg.price}
                  onPress={() => handlePackageSelect(type, pkg)}
                />
              );
            })}
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
});

export default RantanganDetail;