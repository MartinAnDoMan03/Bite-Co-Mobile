import { SafeAreaView } from "react-native-safe-area-context";
import HeaderTitleBack from '../../components/HeaderTitleBack';
import banner2 from "../../assets/images/banner2.png";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
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

const PackageItem = ({ title, description, price, onPress }) => {
  return (
    <TouchableOpacity 
      style={{ 
        backgroundColor: "white", 
        padding: 20, 
        borderRadius: 20, 
        marginBottom: 15, 
        marginHorizontal: 0, 
        flexDirection: "row", 
        alignItems: "center", 
        justifyContent: "space-between", 
        borderWidth: 1, 
        borderColor: "#E5E5E5", 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 3.84, 
        elevation: 5 
      }} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ fontSize: 14, fontWeight: "bold" }}>{title}</Text>
        <Text style={{ fontSize: 10 }}>{description}</Text>
        <Text style={{ fontSize: 10 }}>Rp {price?.toLocaleString() || "-"}</Text>
      </View>
      <View style={{ padding: 10 }}>
        <MaterialIcons name="arrow-forward-ios" size={20} color={COLORS.PRIMARY} />
      </View>
    </TouchableOpacity>
  );
};

const RantanganDetail = () => {
  const { sellerid } = useLocalSearchParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bannerUrl, setBannerUrl] = useState(null);
  const [bannerImageLoaded, setBannerImageLoaded] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [bannerError, setBannerError] = useState(false);
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

  // Load buyer location on component mount
  useEffect(() => {
    loadBuyerLocation();
  }, []);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      // Reset banner loading state
      setBannerImageLoaded(false);
      setBannerLoading(true);
      setBannerError(false);
      
      try {
        // Construct API URL with buyer location if available
        let apiUrl = `${config.API_URL}/seller/rantangan-list`;
        if (buyerLocation) {
          apiUrl += `?buyerLat=${buyerLocation.lat}&buyerLng=${buyerLocation.lng}`;
        }

        const res = await axios.get(apiUrl);
        
        if (res.data && res.data.sellers) {
          // Find the specific seller by ID
          const selectedSeller = res.data.sellers.find(seller => seller.id === sellerid);
          if (selectedSeller) {
            setStore(selectedSeller);
            setBannerUrl(selectedSeller.banner);
            
            // If no banner URL, mark as loaded immediately to show default banner
            if (!selectedSeller.banner) {
              setBannerImageLoaded(true);
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
      // Create a cart item for the selected package
      const cartItem = {
        id: `${packageType}-${sellerid}`,
        name: packageData.name,
        description: packageData.description,
        price: packageData.price,
        packageType: packageType,
        sellerId: sellerid
      };

      // Capitalize first letter of package type for consistent naming
      const capitalizedPackageType = packageType.charAt(0).toUpperCase() + packageType.slice(1);
      
      // Save to AsyncStorage with specific package type in orderType
      await AsyncStorage.setItem('cart', JSON.stringify([cartItem]));
      await AsyncStorage.setItem('cart_total', JSON.stringify(packageData.price));
      await AsyncStorage.setItem('cart_store', JSON.stringify(store));
      await AsyncStorage.setItem('cart_pax', '1'); // Default pax for rantangan
      await AsyncStorage.setItem('order_type', `Rantangan ${capitalizedPackageType}`); // Pass OrderType with specific package type
      
      console.log(`Selected package: Rantangan ${capitalizedPackageType}`); // Debug log
      
      // Navigate to Pembayaran
      router.push('/buyer/Pembayaran');
    } catch (error) {
      console.error('Error saving package selection:', error);
    }
  };

  // Handler for banner image load
  const handleBannerImageLoad = () => {
    setBannerImageLoaded(true);
    setBannerLoading(false);
  };

  const handleBannerImageError = () => {
    setBannerImageLoaded(true); // Still mark as loaded even on error
    setBannerLoading(false);
    setBannerError(true);
  };

  const getPackageData = (type) => {
    if (!store?.rantanganPackages || !Array.isArray(store.rantanganPackages)) {
      // Return default package structure if no packages from database
      const defaultPrices = {
        'harian': 50000,
        'mingguan': 300000,
        'bulanan': 1200000
      };
      
      return {
        name: `Paket ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        description: `Paket rantangan ${type} dengan menu bervariasi setiap hari`,
        price: defaultPrices[type] || 0
      };
    }
    
    // Try to find package by type name first
    let packageItem = store.rantanganPackages.find(pkg => 
      pkg.name?.toLowerCase().includes(type.toLowerCase())
    );
    
    // If not found by type name, try to map by index (assuming order: harian, mingguan, bulanan)
    if (!packageItem) {
      const typeIndex = {
        'harian': 0,
        'mingguan': 1, 
        'bulanan': 2
      };
      
      const index = typeIndex[type];
      if (index !== undefined && store.rantanganPackages[index]) {
        packageItem = store.rantanganPackages[index];
      }
    }
    
    // If found, return the actual database data
    if (packageItem && packageItem.name && packageItem.description && packageItem.price) {
      return {
        name: packageItem.name,
        description: packageItem.description,
        price: packageItem.price
      };
    }
    
    // Fallback to default if no valid package found
    const defaultPrices = {
      'harian': 50000,
      'mingguan': 300000,
      'bulanan': 1200000
    };
    
    return {
      name: `Paket ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      description: `Paket rantangan ${type} dengan menu bervariasi setiap hari`,
      price: defaultPrices[type] || 0
    };
  };

  if (loading) {
    return (
      <>
        {/* Banner Skeleton */}
        <View style={styles.bannerSkeletonContainer}>
          <SkeletonLoader 
            width="100%" 
            height={200} 
            style={styles.bannerSkeleton}
          />
        </View>
        
        <SafeAreaView style={styles.container}>
          <HeaderTitleBack title="Detail Rantangan" />
          <View style={styles.loadingContainer}>
            <SkeletonLoader width="80%" height={20} style={{ marginBottom: 10 }} />
            <SkeletonLoader width="60%" height={16} style={{ marginBottom: 20 }} />
            <SkeletonLoader width="100%" height={100} style={{ marginBottom: 15 }} />
            <SkeletonLoader width="100%" height={100} style={{ marginBottom: 15 }} />
            <SkeletonLoader width="100%" height={100} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (error) {
    return (
      <>
        {/* Default Banner Image */}
        <Image
          source={banner2}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <SafeAreaView style={styles.container}>
          <HeaderTitleBack title="Detail Rantangan" />
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                setLoading(true);
              }}
            >
              <Text style={styles.retryButtonText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!store) {
    return (
      <>
        {/* Default Banner Image */}
        <Image
          source={banner2}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <SafeAreaView style={styles.container}>
          <HeaderTitleBack title="Detail Rantangan" />
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Data rantangan tidak ditemukan</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      {/* Banner Image with Skeleton Loader */}
      {bannerLoading && (
        <View style={styles.bannerSkeletonContainer}>
          <SkeletonLoader 
            width="100%" 
            height="100%" 
            borderRadius={0}
            style={styles.bannerSkeleton}
          />
        </View>
      )}
      <Image
        source={bannerUrl ? { uri: bannerUrl } : banner2}
        style={[styles.backgroundImage, { opacity: bannerLoading ? 0 : 1 }]}
        resizeMode="cover"
        onLoad={handleBannerImageLoad}
        onError={handleBannerImageError}
      />
      <SafeAreaView style={styles.container}>
        <HeaderTitleBack />
        
        {/* Store Info Card */}
        <View
          style={{
            backgroundColor: "white",
            marginHorizontal: 30,
            marginVertical: 20,
            paddingHorizontal: 15,
            paddingVertical: 20,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#E5E5E5",
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.05,
            shadowRadius: 3.84,
            elevation: 5,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={{ fontSize: 14 }}>{store ? `${store.name} - ${store.kelurahan || ''}` : "-"}</Text>
            <Text style={{ fontSize: 10, paddingTop: 15 }}>Rantangan</Text>
          </View>
          <View style={{ borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 10,
                paddingVertical: 10,
              }}>
              <Image source={starSolid} style={{ width: 16, height: 16 }} />
              <Text style={{ fontSize: 14, paddingLeft: 5 }}>{store.rating || 0}</Text>
            </View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Package Options */}
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Pilih Paket Rantangan</Text>
            
            <PackageItem
              title={getPackageData('harian')?.name || "Paket Harian"}
              description={getPackageData('harian')?.description || "Paket rantangan untuk 1 hari dengan menu bergizi dan bervariasi"}
              price={getPackageData('harian')?.price}
              onPress={() => handlePackageSelect('harian', getPackageData('harian'))}
            />
            
            <PackageItem
              title={getPackageData('mingguan')?.name || "Paket Mingguan"}
              description={getPackageData('mingguan')?.description || "Paket rantangan untuk 1 minggu (7 hari) dengan menu berbeda setiap hari"}
              price={getPackageData('mingguan')?.price}
              onPress={() => handlePackageSelect('mingguan', getPackageData('mingguan'))}
            />
            
            <PackageItem
              title={getPackageData('bulanan')?.name || "Paket Bulanan"}
              description={getPackageData('bulanan')?.description || "Paket rantangan untuk 1 bulan (30 hari) dengan menu bergizi dan hemat"}
              price={getPackageData('bulanan')?.price}
              onPress={() => handlePackageSelect('bulanan', getPackageData('bulanan'))}
            />
          </View>

          {/* Additional Info */}
          <View style={{ 
            padding: 20, 
            backgroundColor: "white", 
            marginHorizontal: 20, 
            marginBottom: 20, 
            borderRadius: 15,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Informasi Rantangan</Text>
            <Text style={{ fontSize: 14, color: COLORS.TEXTSECONDARY, lineHeight: 20 }}>
              • Menu berganti setiap hari{'\n'}
              • Makanan sehat dan bergizi{'\n'}
              • Pengantaran tepat waktu{'\n'}
              • Kemasan aman dan higienis
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 200,
  },
  bannerSkeletonContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 200,
    zIndex: 0, // Behind the SafeAreaView content
  },
  bannerSkeleton: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  container: {
    flex: 1,
    position: "relative",
    zIndex: 1, // In front of the banner skeleton
  },
  loadingContainer: {
    padding: 20,
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.TEXTSECONDARY,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
});

export default RantanganDetail;
