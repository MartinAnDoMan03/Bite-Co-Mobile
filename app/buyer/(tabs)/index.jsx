import { Image, Text, TextInput, TouchableOpacity, View, ScrollView, StyleSheet } from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import COLORS from "../../constants/color";
import banner1 from "../../../assets/images/banner1.png";
import recycle from "../../../assets/images/recycle.png";
import iconBiteEco from "../../../assets/images/icon-biteeco.png";
import iconCatering from "../../../assets/images/icon-catering.png";
import iconRantangan from "../../../assets/images/icon-rantangan.png";
import storeIcon from "../../../assets/images/store.png";
import { useRouter } from "expo-router";
import config from "../../constants/config";
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoreCardSkeleton } from '../../../components/SkeletonLoader';

const CircleButton = ({ icon, onPress, text, navigateTo }) => {
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
          backgroundColor: COLORS.PRIMARY,
          padding: 10,
          borderRadius: 99,
          width: 50,
          height: 50,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Image source={icon} style={{ width: 40, height: 40 }} />
      </TouchableOpacity>
      <Text
        style={{
          fontSize: 16,
          textAlign: "center",
          marginTop: 5,
        }}
      >
        {text}
      </Text>
    </View>
  );
};

const StoreList = ({ StoreName, storeKelurahan, Rating, Distance, Logo, onPress }) => {
  return (
    <TouchableOpacity style={styles.storeCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.storeLogoWrapperFull}>
        <Image source={Logo} style={styles.storeLogoFull} />
        <View style={styles.ratingBadgeFull}>
          <Text style={styles.ratingBadgeText}>⭐ {Rating}</Text>
        </View>
      </View>
      <Text style={styles.storeName} numberOfLines={2}>
        {StoreName}{storeKelurahan ? ` - ${storeKelurahan}` : ''}
      </Text>
      <View style={styles.storeInfoRow}>
        <MaterialIcons name="location-on" size={16} color={COLORS.PRIMARY} style={{ marginRight: 2 }} />
        <Text style={styles.distanceText}>
          {Distance === "-" ? "Jarak tidak diketahui" : `${Distance} km`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const ExpandableMenu = () => {
  const [stores, setStores] = useState([]);
  const [rantanganStores, setRantanganStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rantanganLoading, setRantanganLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rantanganError, setRantanganError] = useState(null);
  const [buyerLocation, setBuyerLocation] = useState(null);
  const router = useRouter();

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
          }))
        );
      } else {
        setError("Gagal memuat data toko");
      }
    } catch (e) {
      setError("Gagal memuat data toko");
    } finally {
      setLoading(false);
    }
  }, [buyerLocation]);

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
          }))
        );
      } else {
        setRantanganError("Gagal memuat data rantangan");
      }
    } catch (e) {
      setRantanganError("Gagal memuat data rantangan");
    } finally {
      setRantanganLoading(false);
    }
  }, [buyerLocation]);

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

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.bannerContainer}>
          <Image
            source={banner1}
            style={styles.bannerImage}
          />
        </View>
      </SafeAreaView>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Mau mam apa hari ini?"
        />
      </View>

      <View style={styles.categories}>
        <CircleButton icon={recycle} text={"Catering"} navigateTo="buyer/CateringList" />
        <CircleButton icon={recycle} text={"Rantangan"} navigateTo="buyer/RantanganList" />
        <CircleButton icon={recycle} text={"Gizi Pro"} navigateTo="buyer/GiziPro" />
        <CircleButton icon={recycle} text={"Bite Eco"} navigateTo="buyer/BiteEco" />
      </View>

      <View style={styles.storeSection}>
        <Text style={styles.sectionTitle}>Rekomendasi Catering</Text>
        {!buyerLocation && (
          <View style={styles.locationNotice}>
            <MaterialIcons name="info" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.locationNoticeText}>
              Set lokasi Anda di Profile untuk melihat jarak ke catering
            </Text>
          </View>
        )}
        <View style={styles.divider} />
        {loading ? (
          <View style={styles.storeGrid}>
            <StoreCardSkeleton />
            <StoreCardSkeleton />
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
              <Text style={styles.retryButtonText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.storeGrid}>
            {stores.map(store => (
              <StoreList
                key={store.id}
                StoreName={store.StoreName}
                storeKelurahan={store.storeKelurahan}
                Logo={store.Logo}
                Rating={store.Rating}
                Distance={store.Distance}
                type="catering"
                onPress={() => {
                  if ("catering" === "catering") {
                    router.push({
                      pathname: "buyer/CateringDetail",
                      params: { sellerid: store.id },
                    });
                  }
                }}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.storeSection}>
        <Text style={styles.sectionTitle}>Rekomendasi Rantangan</Text>
        {!buyerLocation && (
          <View style={styles.locationNotice}>
            <MaterialIcons name="info" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.locationNoticeText}>
              Set lokasi Anda di Profile untuk melihat jarak ke rantangan
            </Text>
          </View>
        )}
        <View style={styles.divider} />
        {rantanganLoading ? (
          <View style={styles.storeGrid}>
            <StoreCardSkeleton />
            <StoreCardSkeleton />
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
              <Text style={styles.retryButtonText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : rantanganStores.length === 0 ? (
          <Text style={{ textAlign: 'center', color: COLORS.TEXTSECONDARY, paddingVertical: 20 }}>
            Belum ada rantangan tersedia
          </Text>
        ) : (
          <View style={styles.storeGrid}>
            {rantanganStores.map(store => (
              <StoreList
                key={store.id}
                StoreName={store.StoreName}
                storeKelurahan={store.storeKelurahan}
                Logo={store.Logo}
                Rating={store.Rating}
                Distance={store.Distance}
                type="rantangan"
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
    paddingHorizontal: 20,
    marginTop: 10,
  },
  searchInput: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.TEXTSECONDARY,
    width: "100%",
  },
  categories: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  storeSection: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: COLORS.TEXTSECONDARY,
    marginBottom: 16,
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
    borderRadius: 16,
    marginBottom: 18,
    alignItems: "center",
    width: "48%",
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
    marginBottom: 10,
  },
  storeLogoFull: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: '#f6f7fb',
    resizeMode: 'cover',
  },
  ratingBadgeFull: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.GREEN3,
    borderRadius: 10,
    paddingHorizontal: 8,
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
    fontSize: 13,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23272f',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
    minHeight: 38,
    paddingHorizontal: 8,
  },
  storeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 8,
  },
  distanceText: {
    fontSize: 13,
    color: COLORS.PRIMARY,
    fontWeight: '500',
    marginLeft: 2,
  },
  locationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
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
});

export default ExpandableMenu;