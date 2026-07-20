import { Image, Text, TextInput, TouchableOpacity, View, ScrollView, StyleSheet, Animated, Easing, Platform, LayoutAnimation, UIManager } from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../../contexts/LanguageContext";
import COLORS from "../../constants/color";
import banner1 from "../../../assets/images/banner1.png";
import gizipro from "../../../assets/images/gizipro.png";
import iconBiteEco from "../../../assets/images/icon-biteeco.png";
import iconCatering from "../../../assets/images/icon-catering.png";
import iconRantangan from "../../../assets/images/icon-rantangan.png";
import storeIcon from "../../../assets/images/store.png";
import { useRouter } from "expo-router";
import config from "../../constants/config";
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { StoreCardSkeleton } from '../../../components/SkeletonLoader';
import OutletStatusBadge from '../../../components/OutletStatusBadge';
import { getOutletStatus } from '../../services/OutletStatusService';
// Aktifkan LayoutAnimation di Android (sama seperti di halaman seller)
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Batas waktu tunggu approval seller sebelum buyer ditawari opsi batal —
// disamakan dengan APPROVAL_TIMEOUT_MINUTES di Riwayat.jsx.
const APPROVAL_TIMEOUT_MINUTES = 30;

const isApprovalOverdue = (order, nowTs) => {
  if (order.statusProgress !== 'awaiting_seller_approval') return false;
  if (!order.createdAt) return false;
  const createdTs = new Date(order.createdAt).getTime();
  if (isNaN(createdTs)) return false;
  const elapsedMinutes = (nowTs - createdTs) / (1000 * 60);
  return elapsedMinutes >= APPROVAL_TIMEOUT_MINUTES;
};

// ---------------------------------------------------------------------------
// Floating banner — muncul dari bawah kalau ada order yang belum dikonfirmasi
// penjual lewat 30 menit. Ringkas & bisa handle beberapa order sekaligus,
// tap buat ke Riwayat lihat detailnya satu-satu.
// ---------------------------------------------------------------------------
const OverdueOrderBanner = ({ count, onPress, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
  }, []);

  const message = count > 1
    ? `Kamu punya ${count} pesanan yang belum dikonfirmasi penjual`
    : 'Yah, pesanan kamu belum dikonfirmasi penjual';

  return (
    <Animated.View style={[styles.overdueBanner, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity style={styles.overdueBannerContent} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.overdueBannerIconCircle}>
          <MaterialIcons name="hourglass-empty" size={20} color="#B26A00" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.overdueBannerTitle}>{message}</Text>
          <Text style={styles.overdueBannerSubtitle}>Ketuk untuk lihat & atur pesananmu</Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={COLORS.PRIMARY} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.overdueBannerDismiss} onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialIcons name="close" size={16} color="#aaa" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// CircleButton mendukung 2 jenis icon:
// - iconType="image" (default) -> pakai gambar PNG seperti sebelumnya
// - iconType="material" -> pakai MaterialIcons
// bgColor/iconColor/bordered dipakai untuk varian terbalik (mis. tombol Bantuan: bg putih, icon maroon)
const CircleButton = ({
  icon,
  onPress,
  text,
  navigateTo,
  iconStyle,
  iconType = "image",
  iconName,
  bgColor,
  iconColor,
  bordered,
}) => {
  const router = useRouter();
  return (
    <View style={{ alignItems: "center" }}>
      <TouchableOpacity
        onPress={() => {
          if (navigateTo) {
            router.push(navigateTo);
          } else if (onPress) {
            onPress();
          }
        }}
        style={{
          backgroundColor: bgColor || COLORS.PRIMARY,
          padding: 10,
          borderRadius: 16,
          width: 56,
          height: 56,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: bordered ? 1.5 : 0,
          borderColor: bordered ? "#eee" : "transparent",
        }}
      >
        {iconType === "material" ? (
          <MaterialIcons name={iconName} size={28} color={iconColor || "white"} />
        ) : (
          <Image source={icon} style={[{ width: 28, height: 28 }, iconStyle]} />
        )}
      </TouchableOpacity>
      <Text
        style={{
          fontSize: 14,
          textAlign: "center",
          marginTop: 5,
        }}
      >
        {text}
      </Text>
    </View>
  );
};

// Header baris untuk tiap section: judul di kiri, "Lihat Lainnya" di kanan
const SectionHeader = ({ title, onSeeAllPress }) => {
  const { t } = useLanguage();
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onSeeAllPress} activeOpacity={0.7} style={styles.seeAllButton}>
        <Text style={styles.seeAllText}>{t('buyerBeranda.seeAll')}</Text>
        <MaterialIcons name="chevron-right" size={18} color={COLORS.PRIMARY} />
      </TouchableOpacity>
    </View>
  );
};

const StoreList = ({ StoreName, storeKelurahan, Rating, Distance, Logo, onPress, seller }) => {
  const { t } = useLanguage();
  return (
    <TouchableOpacity style={styles.storeCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.storeLogoWrapperFull}>
        <Image source={Logo} style={styles.storeLogoFull} />
        <View style={styles.ratingBadgeFull}>
          <Text style={styles.ratingBadgeText}>⭐ {Rating}</Text>
        </View>
        <View style={styles.outletStatusBadgeWrap}>
         <OutletStatusBadge seller={seller} />
       </View>
      </View>
      <Text style={styles.storeName} numberOfLines={2}>
        {StoreName}{storeKelurahan ? ` - ${storeKelurahan}` : ''}
      </Text>
      <View style={styles.storeInfoRow}>
        <MaterialIcons name="location-on" size={16} color={COLORS.PRIMARY} style={{ marginRight: 2 }} />
        <Text style={styles.distanceText}>
          {Distance === "-" ? t('buyerBeranda.distanceUnknown') : t('buyerBeranda.distanceUnit', { distance: Distance })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const ExpandableMenu = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const [stores, setStores] = useState([]);
  const [rantanganStores, setRantanganStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rantanganLoading, setRantanganLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rantanganError, setRantanganError] = useState(null);
  const [buyerLocation, setBuyerLocation] = useState(null);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // State buat banner order yang overdue
  const [overdueOrders, setOverdueOrders] = useState([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const toggleMenuExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMenuExpanded((prev) => !prev);
  };

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: menuExpanded ? 1 : 0,
      duration: 300,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [menuExpanded]);

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // Cek order buyer yang overdue (belum dikonfirmasi seller lewat 30 menit).
  // Dijalankan tiap kali Home difokuskan, biar kalau buyer habis pesan lalu
  // balik ke Home, banner-nya bisa langsung muncul kalau relevan.
const checkOverdueOrders = useCallback(async () => {
  try {
    const token = await AsyncStorage.getItem('buyerToken');
    if (!token) return;
    const res = await axios.get(`${config.API_URL}/buyer/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const orders = res.data.orders || [];
    const now = Date.now();
    const overdue = orders.filter((o) => isApprovalOverdue(o, now));
    setOverdueOrders(overdue);
  } catch (e) {
      // Gagal diam-diam — banner cuma nice-to-have, jangan ganggu Home kalau gagal fetch
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkOverdueOrders();
      setBannerDismissed(false); // reset dismiss tiap kali Home dibuka ulang
    }, [checkOverdueOrders])
  );

  // Load buyer's pinpoint location from AsyncStorage
  const loadBuyerLocation = async () => {
    try {
      const savedPinPoint = await AsyncStorage.getItem('pinPoint');

      if (savedPinPoint) {
        const pinPoint = JSON.parse(savedPinPoint);

        if (pinPoint.lat && pinPoint.lng) {
          const location = {
            lat: pinPoint.lat,
            lng: pinPoint.lng
          };
          setBuyerLocation(location);
        }
      }
    } catch (error) {
      console.error('Error loading buyer location:', error);
    }
  };

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Construct API URL with buyer location if available
      let apiUrl = `${config.API_URL}/seller/list`;
      if (buyerLocation) {
        apiUrl += `?buyerLat=${buyerLocation.lat}&buyerLng=${buyerLocation.lng}`;
      }

      const res = await fetch(apiUrl);
      const data = await res.json();
      if (res.ok && data.sellers) {
        setStores(
          data.sellers.map((s) => ({
            id: s.id,
            StoreName: s.name || "-",
            storeKelurahan: s.kelurahan || "",
            Logo: s.logo ? { uri: s.logo } : storeIcon,
            Rating: s.rating ? s.rating.toString() : "-",
            Distance: s.distance !== null ? s.distance.toString() : "-",
            openTime: s.openTime || null,
            closeTime: s.closeTime || null,
            isManuallyClosed: s.isManuallyClosed || false,
          }))
        );
      } else {
        setError(t('buyerBeranda.sections.catering.fetchFailed'));
      }
    } catch (e) {
      setError(t('buyerBeranda.sections.catering.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [buyerLocation, t]);

  const fetchRantanganStores = useCallback(async () => {
    setRantanganLoading(true);
    setRantanganError(null);
    try {
      // Construct API URL with buyer location if available
      let apiUrl = `${config.API_URL}/seller/rantangan-list`;
      if (buyerLocation) {
        apiUrl += `?buyerLat=${buyerLocation.lat}&buyerLng=${buyerLocation.lng}`;
      }

      const res = await fetch(apiUrl);
      const data = await res.json();
      if (res.ok && data.sellers) {
        setRantanganStores(
          data.sellers.map((s) => ({
            id: s.id,
            StoreName: s.name || "-",
            storeKelurahan: s.kelurahan || "",
            Logo: s.logo ? { uri: s.logo } : storeIcon,
            Rating: s.rating ? s.rating.toString() : "-",
            Distance: s.distance !== null ? s.distance.toString() : "-",
            rantanganPackages: s.rantanganPackages || [],
            openTime: s.openTime || null,
            closeTime: s.closeTime || null,
            isManuallyClosed: s.isManuallyClosed || false,
          }))
        );
      } else {
        setRantanganError(t('buyerBeranda.sections.rantangan.fetchFailed'));
      }
    } catch (e) {
      setRantanganError(t('buyerBeranda.sections.rantangan.fetchFailed'));
    } finally {
      setRantanganLoading(false);
    }
  }, [buyerLocation, t]);

  // Load buyer location on component mount
  useEffect(() => {
    loadBuyerLocation();
  }, []);

  // Fetch stores when buyer location changes
  useEffect(() => {
    // Always fetch stores, even if buyer location is not available
    fetchStores();
    fetchRantanganStores();
  }, [buyerLocation, fetchStores, fetchRantanganStores]);

  useFocusEffect(
    useCallback(() => {
      loadBuyerLocation();
    }, [])
  );

  // Ambil sebagian data saja untuk preview di home (maksimal 4 toko per section)
  const previewStores = stores.slice(0, 4);
  const previewRantanganStores = rantanganStores.slice(0, 4);

  const showBanner = overdueOrders.length > 0 && !bannerDismissed;

  const [promos, setPromos] = useState([]);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await axios.get(`${config.API_URL.replace('/api/v1', '')}/api/v1/promos`);
        if (res.data.success && res.data.data.length > 0) {
          setPromos(res.data.data);
        }
      } catch (e) {
        // Default banner, silent failure
      }
    };
    fetchPromos();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.bannerContainer}>
            {promos.length > 0 ? (
              promos.map((promo) => (
                <Image key={promo.id} source={{ uri: promo.imageUrl }} style={styles.bannerImage} />
              ))
            ) : (
              <Image source={banner1} style={styles.bannerImage} /> // hardcode version fallback
            )}
          </View>
        </SafeAreaView>

        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={COLORS.TEXTSECONDARY} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('buyerBeranda.searchPlaceholder')}
            placeholderTextColor={COLORS.TEXTSECONDARY}
          />
        </View>

        {/* Baris menu utama - selalu tampil */}
        <View style={styles.categoriesSection}>
          <View style={styles.categories}>
            <CircleButton icon={iconCatering} text={t('buyerBeranda.categories.catering')} navigateTo="buyer/CateringList" />
            <CircleButton icon={iconRantangan} text={t('buyerBeranda.categories.rantangan')} navigateTo="buyer/RantanganList" />
            <CircleButton icon={gizipro} text={t('buyerBeranda.categories.giziPro')} navigateTo="buyer/GiziPro" iconStyle={{ tintColor: "white" }} />
            <CircleButton icon={iconBiteEco} text={t('buyerBeranda.categories.biteCo')} navigateTo="buyer/BiteEco" iconStyle={{ tintColor: "white" }} />
          </View>

          {/* Baris menu tambahan - hanya tampil saat expanded */}
          {menuExpanded && (
            <View style={[styles.categories, styles.categoriesSecondRow]}>
              <CircleButton
                iconType="material"
                iconName="live-help"
                text={t('buyerBeranda.categories.bantuan')}
                navigateTo="buyer/bantuan"
              />
              <CircleButton
                iconType="material"
                iconName="settings"
                text={t('buyerBeranda.categories.pengaturan')}
                navigateTo="buyer/settings"
              />
            </View>
          )}

          {/* Tombol expand/collapse */}
          <TouchableOpacity onPress={toggleMenuExpand} style={styles.expandButton}>
            <Animated.View style={[styles.expandButtonCircle, { transform: [{ rotate: chevronRotate }] }]}>
              <MaterialIcons name="keyboard-arrow-down" size={22} color={COLORS.PRIMARY} />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Notice lokasi ditampilkan sekali saja untuk seluruh halaman */}
        {!buyerLocation && (
          <View style={styles.locationNotice}>
            <MaterialIcons name="info" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.locationNoticeText}>
              {t('buyerBeranda.locationNotice')}
            </Text>
          </View>
        )}

        <View style={styles.storeSection}>
          <SectionHeader
            title={t('buyerBeranda.sections.catering.title')}
            onSeeAllPress={() => router.push("buyer/CateringList")}
          />
          <View style={styles.divider} />
          {loading ? (
            <View style={styles.storeGrid}>
              <StoreCardSkeleton />
              <StoreCardSkeleton />
              <StoreCardSkeleton />
              <StoreCardSkeleton />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color="#ccc" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchStores()}
              >
                <Text style={styles.retryButtonText}>{t('buyerBeranda.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : previewStores.length === 0 ? (
            <Text style={styles.emptyText}>{t('buyerBeranda.sections.catering.empty')}</Text>
          ) : (
            <View style={styles.storeGrid}>
              {previewStores.map(store => (
                <StoreList
                  key={store.id}
                  StoreName={store.StoreName}
                  storeKelurahan={store.storeKelurahan}
                  Logo={store.Logo}
                  Rating={store.Rating}
                  Distance={store.Distance}
                  seller={store}
                  onPress={() => {
                    router.push({
                      pathname: "buyer/CateringDetail",
                      params: { sellerid: store.id },
                    });
                  }}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.storeSection}>
          <SectionHeader
            title={t('buyerBeranda.sections.rantangan.title')}
            onSeeAllPress={() => router.push("buyer/RantanganList")}
          />
          <View style={styles.divider} />
          {rantanganLoading ? (
            <View style={styles.storeGrid}>
              <StoreCardSkeleton />
              <StoreCardSkeleton />
              <StoreCardSkeleton />
              <StoreCardSkeleton />
            </View>
          ) : rantanganError ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color="#ccc" />
              <Text style={styles.errorText}>{rantanganError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchRantanganStores()}
              >
                <Text style={styles.retryButtonText}>{t('buyerBeranda.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : previewRantanganStores.length === 0 ? (
            <Text style={styles.emptyText}>{t('buyerBeranda.sections.rantangan.empty')}</Text>
          ) : (
            <View style={styles.storeGrid}>
              {previewRantanganStores.map(store => (
                <StoreList
                  key={store.id}
                  StoreName={store.StoreName}
                  storeKelurahan={store.storeKelurahan}
                  Logo={store.Logo}
                  Rating={store.Rating}
                  Distance={store.Distance}
                  seller={store}
                  onPress={() => {
                    router.push({
                      pathname: "buyer/RantanganDetail",
                      params: { sellerid: store.id },
                    });
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {showBanner && (
  <OverdueOrderBanner
    count={overdueOrders.length}
    onPress={() => {
      if (overdueOrders.length === 1) {
        // Cuma 1 order overdue -> langsung ke halaman detail/proses order itu
        router.push({ pathname: '/buyer/RiwayatDetail', params: { orderId: overdueOrders[0].id } });
      } else {
        // Lebih dari 1 -> ke Riwayat dulu, biar buyer pilih mana yang mau ditindak
        router.push('buyer/(tabs)/riwayat');
      }
    }}
    onDismiss={() => setBannerDismissed(true)}
  />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    backgroundColor: COLORS.PRIMARY,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  bannerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  bannerImage: {
    width: "90%",
    aspectRatio: 16 / 9,
    resizeMode: "contain",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 14,
  },
  searchIcon: {
    position: "absolute",
    left: 34,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "white",
    paddingVertical: 12,
    paddingLeft: 40,
    paddingRight: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  categoriesSection: {
    marginVertical: 22,
  },
  categories: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: 20,
  },
  categoriesSecondRow: {
    justifyContent: "center",
    columnGap: 32,
    marginTop: 16,
  },
  expandButton: {
    alignSelf: "center",
    marginTop: 14,
  },
  expandButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3E9EC",
    justifyContent: "center",
    alignItems: "center",
  },
  locationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  locationNoticeText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    marginLeft: 8,
    flex: 1,
  },
  storeSection: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#23272f",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.PRIMARY,
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "#eee",
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.TEXTSECONDARY,
    paddingVertical: 20,
  },
  storeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    marginTop: 4,
  },
  storeCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 14,
    alignItems: "center",
    width: "47%",
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: 0,
    overflow: 'hidden',
  },
  storeLogoWrapperFull: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    marginBottom: 8,
  },
  storeLogoFull: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: '#f6f7fb',
    resizeMode: 'cover',
  },
  ratingBadgeFull: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.GREEN3,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 2,
  },
  ratingBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  outletStatusBadgeWrap: {
   position: 'absolute',
   top: 8,
   left: 8,
   zIndex: 2,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#23272f',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 6,
    minHeight: 32,
    paddingHorizontal: 6,
  },
  storeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 6,
  },
  distanceText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '500',
    marginLeft: 2,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // ---------------- Floating banner order overdue ----------------
  overdueBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#FFE8C2',
  },
  overdueBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingRight: 30,
    gap: 12,
  },
  overdueBannerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overdueBannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#23272f',
    lineHeight: 18,
  },
  overdueBannerSubtitle: {
    fontSize: 11.5,
    color: '#999',
    marginTop: 2,
  },
  overdueBannerDismiss: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ExpandableMenu;