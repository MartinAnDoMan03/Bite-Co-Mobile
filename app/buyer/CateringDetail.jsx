import { SafeAreaView } from "react-native-safe-area-context";
import HeaderTitleBack from '../../components/HeaderTitleBack';
import banner2 from "../../assets/images/banner2.png";
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, TextInput, Keyboard } from "react-native";
import starSolid from "../../assets/images/starSolid.png";
import COLORS from '../constants/color';
import menuImage from "../../assets/images/menuImage.png";
import { useLocalSearchParams } from "expo-router";
import axios from "axios";
import { useEffect, useState } from "react";
import config from '../constants/config';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import SkeletonLoader, { MenuItemSkeleton } from '../../components/SkeletonLoader';

const ListMenu = ({ menu, inCart, onAdd, onRemove, onImageLoad, onImageError }) => {
  return (
    <View style={{ backgroundColor: "white", padding: 20, borderRadius: 20, marginHorizontal: 30, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#E5E5E5", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3.84, elevation: 5 }}>
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: "bold"}}>{menu?.name || "-"}</Text>
        <Text style={{ fontSize: 10 }}>{menu?.description || "-"}</Text>
        <Text style={{ fontSize: 10 }}>Rp {menu?.price ? menu.price.toLocaleString() : "-"}</Text>
      </View>
      <View style={{ flexDirection: "column", alignItems: "center", gap: 5 }}>
        <Image
          source={menu?.image ? { uri: menu.image } : menuImage}
          style={{ width: 100, height: 100, borderRadius: 10 }}
          resizeMode="cover"
          onLoad={onImageLoad}
          onError={onImageError}
        />
        {inCart ? (
          <TouchableOpacity 
            style={{ borderWidth: 1, borderColor: "#E5E5E5", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginTop: -20, backgroundColor: "#ffeaea"}}
            onPress={onRemove}
          >
            <Text style={{ color: 'red' }}>Hapus</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={{ borderWidth: 1, borderColor: "#E5E5E5", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginTop: -20, backgroundColor: "white"}}
            onPress={onAdd}
          >
            <Text>Tambah</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const CateringDetail = () => {
  const { sellerid } = useLocalSearchParams();
  const [store, setStore] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState({ sellerId: null, items: [] });
  const [cartVisible, setCartVisible] = useState(false);
  const [bannerUrl, setBannerUrl] = useState(null);
  const [bannerImageLoaded, setBannerImageLoaded] = useState(false);
  const [menuImagesLoaded, setMenuImagesLoaded] = useState(0);
  const [menuImagesTotal, setMenuImagesTotal] = useState(0);
  const [allContentLoaded, setAllContentLoaded] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(null);
  const [pax, setPax] = useState('1');
  const [buyerLocation, setBuyerLocation] = useState(null);
  const router = useRouter();

  // Clear cart if seller changes
  useEffect(() => {
    setCart((prevCart) => {
      if (prevCart.sellerId !== sellerid) {
        return { sellerId: sellerid, items: [] };
      }
      return prevCart;
    });
  }, [sellerid]);

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
      // Reset all loading states when fetching new data
      setBannerImageLoaded(false);
      setMenuImagesLoaded(0);
      setAllContentLoaded(false);
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
      
      try {
        // Construct API URL with buyer location if available
        let apiUrl = `${config.API_URL}/seller/detail/${sellerid}`;
        if (buyerLocation) {
          apiUrl += `?buyerLat=${buyerLocation.lat}&buyerLng=${buyerLocation.lng}`;
        }

        const res = await axios.get(apiUrl);
        console.log("Detail Catering Response:", res.data);
        if (res.data && res.data.seller) {
          setStore(res.data.seller);
          setCategories(res.data.seller.categories || []);
          setBannerUrl(res.data.seller.banner || res.data.seller.storeBanner || null);
        } else {
          setError("Gagal memuat detail catering");
        }
      } catch (e) {
        setError("Gagal memuat detail catering");
      } finally {
        setLoading(false);
      }
    };
    if (sellerid) fetchDetail();
  }, [sellerid, buyerLocation]);

  // Load cart from AsyncStorage on first load
  useEffect(() => {
    const loadCartFromStorage = async () => {
      try {
        const cartData = await AsyncStorage.getItem('cart');
        const cartTotal = await AsyncStorage.getItem('cart_total');
        const cartStore = await AsyncStorage.getItem('cart_store');
        if (cartData && cartStore) {
          const parsedCart = JSON.parse(cartData);
          const parsedStore = JSON.parse(cartStore);
          setCart({
            sellerId: parsedStore?.id || null,
            items: Array.isArray(parsedCart) ? parsedCart : [],
          });
        }
      } catch (e) {
        // ignore error, fallback to default cart
      }
    };
    loadCartFromStorage();
  }, []);

  // Change addToCart/removeFromCart to only add/remove item (no qty)
  const addToCart = (menu) => {
    setCart((prevCart) => {
      let newCart;
      if (prevCart.sellerId !== sellerid) {
        newCart = {
          sellerId: sellerid,
          items: [{ ...menu }],
        };
      } else {
        const found = prevCart.items.find((item) => item.id === menu.id);
        if (!found) {
          newCart = {
            ...prevCart,
            items: [...prevCart.items, { ...menu }],
          };
        } else {
          newCart = prevCart;
        }
      }
      saveCartToStorage(newCart.items, store);
      return newCart;
    });
  };

  const removeFromCart = (menu) => {
    setCart((prevCart) => {
      if (prevCart.sellerId !== sellerid) return prevCart;
      let newCart = {
        ...prevCart,
        items: prevCart.items.filter((item) => item.id !== menu.id),
      };
      saveCartToStorage(newCart.items, store);
      return newCart;
    });
  };

  // Helper to check if item is in cart
  const isInCart = (menuId) => {
    if (cart.sellerId !== sellerid) return false;
    return cart.items.some((item) => item.id === menuId);
  };

  // Cart button text
  const cartButtonText = `Lihat Keranjang (${cart.items.length} item)`;

  // Total calculation: sum of item prices * pax
  const getTotal = () => {
    const sum = cart.items.reduce((total, item) => total + (item.price || 0), 0);
    const paxNum = parseInt(pax) || 1;
    return sum * paxNum;
  };

  const saveCartToStorage = async (cartItems, storeObj) => {
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
      await AsyncStorage.setItem('cart_total', JSON.stringify(getTotal()));
      await AsyncStorage.setItem('cart_store', JSON.stringify(storeObj));
    } catch (e) {
      // handle error if needed
    }
  };

  const handleLanjutPembayaran = async () => {
    setCartVisible(false);
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(cart.items));
      await AsyncStorage.setItem('cart_total', JSON.stringify(getTotal()));
      await AsyncStorage.setItem('cart_store', JSON.stringify(store));
      await AsyncStorage.setItem('cart_pax', pax); // Save pax amount
      await AsyncStorage.setItem('order_type', 'Catering'); // Pass OrderType
      router.push('/buyer/Pembayaran');
    } catch (e) {
      // handle error if needed
    }
  };

  // Track menu images loading
  // Update menuImagesTotal when categories change
  useEffect(() => {
    if (categories && categories.length > 0) {
      let total = 0;
      categories.forEach(cat => {
        if (Array.isArray(cat.items)) total += cat.items.length;
      });
      setMenuImagesTotal(total);
      setMenuImagesLoaded(0); // reset on new data
      console.log(`Menu images total set to: ${total}`);
    } else {
      setMenuImagesTotal(0);
      setMenuImagesLoaded(0);
      console.log('No menu items found, setting total to 0');
    }
  }, [categories]);

  // Handler for each menu image load/error
  const handleMenuImageLoad = () => {
    setMenuImagesLoaded((prev) => {
      const newCount = prev + 1;
      console.log(`Menu image loaded: ${newCount}/${menuImagesTotal}`);
      return newCount > menuImagesTotal ? menuImagesTotal : newCount;
    });
  };

  // Handler for banner image load
  const handleBannerImageLoad = () => {
    console.log('Banner image loaded');
    setBannerImageLoaded(true);
  };

  const handleBannerImageError = () => {
    console.log('Banner image load error, but marking as loaded');
    setBannerImageLoaded(true); // Still mark as loaded even on error
  };

  // Check if all content is loaded
  useEffect(() => {
    const dataLoaded = !loading && !error && store && categories !== null;
    const allMenuImagesLoaded = menuImagesTotal === 0 || menuImagesLoaded >= menuImagesTotal;
    const imagesLoaded = bannerImageLoaded && allMenuImagesLoaded;
    
    console.log('Loading states:', {
      loading,
      error: !!error,
      store: !!store,
      categories: categories?.length || 0,
      dataLoaded,
      bannerImageLoaded,
      allMenuImagesLoaded,
      menuImagesLoaded,
      menuImagesTotal,
      imagesLoaded,
      allContentLoaded
    });
    
    if (dataLoaded && imagesLoaded && !allContentLoaded) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        console.log('All content loaded, hiding skeleton');
        setAllContentLoaded(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, error, store, categories, bannerImageLoaded, menuImagesLoaded, menuImagesTotal, allContentLoaded]);

  // Fallback timeout to hide skeleton after maximum wait time
  useEffect(() => {
    if (!loading && !allContentLoaded) {
      const fallbackTimer = setTimeout(() => {
        console.log('Fallback timeout reached, hiding skeleton');
        setAllContentLoaded(true);
      }, 5000); // 5 second maximum wait
      
      setLoadingTimeout(fallbackTimer);
      
      return () => {
        if (fallbackTimer) clearTimeout(fallbackTimer);
      };
    }
  }, [loading, allContentLoaded]);

  // Clear timeout when content loads
  useEffect(() => {
    if (allContentLoaded && loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
  }, [allContentLoaded, loadingTimeout]);

  return (
    <>
      {/* Banner Image with Skeleton Loader */}
      {!bannerImageLoaded && (
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
        style={[styles.backgroundImage, { opacity: bannerImageLoaded ? 1 : 0 }]}
        resizeMode="cover"
        onLoad={handleBannerImageLoad}
        onError={handleBannerImageError}
      />
      <SafeAreaView style={styles.container}>
        <HeaderTitleBack />
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
          {!allContentLoaded ? (
            <>
              <View style={{ flex: 1 }}>
                <SkeletonLoader width="80%" height={16} style={{ marginBottom: 15 }} />
                <SkeletonLoader width="60%" height={12} />
              </View>
              <View style={{ alignItems: 'center' }}>
                <SkeletonLoader width={60} height={40} borderRadius={10} />
              </View>
            </>
          ) : (
            <>
              <View>
                <Text style={{ fontSize: 14 }}>{store ? `${store.name} - ${store.kelurahan}` : "-"}</Text>
                <Text style={{ fontSize: 10, paddingTop: 15 }}>
                  {store ? store.type : "Rantangan, Catering"}
                </Text>
              </View>
              <View style={{ borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: COLORS.GREEN3,
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 2,
                    justifyContent: "center",
                    gap: 2,
                  }}
                >
                  <Text style={{color: "white", fontSize: 10}}>{store ? store.rating : "4.7"}</Text>
                  <Image
                    source={starSolid}
                    style={{ width: 15, height: 15 }}
                    resizeMode="contain"
                  />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderBottomLeftRadius: 10,
                    borderBottomRightRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 2,
                    justifyContent: "center",
                    gap: 2,
                  }}
                >
                  <MaterialIcons name="location-on" size={12} color={COLORS.PRIMARY} />
                  <Text style={{color: "black", fontSize: 10}}>
                    {store && store.distance !== null ? `${store.distance} km` : "Jarak tidak diketahui"}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
          {!allContentLoaded || loading ? (
            <View style={{ paddingHorizontal: 30, gap: 10 }}>
              <MenuItemSkeleton />
              <MenuItemSkeleton />
              <MenuItemSkeleton />
              <MenuItemSkeleton />
              <MenuItemSkeleton />
            </View>
          ) : error ? (
            <Text style={{ marginHorizontal: 30, color: 'red' }}>{error}</Text>
          ) : categories.length === 0 ? (
            <Text style={{ marginHorizontal: 30 }}>Tidak ada menu</Text>
          ) : (
            categories.map((cat, idx) => (
              <View key={cat.name || idx} style={{ gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", marginHorizontal: 30, marginBottom: 10 }}>{cat.name}</Text>
                {cat.items && cat.items.length > 0 ? (
                  cat.items.map((menu, mIdx) => (
                    <ListMenu
                      key={menu.id || mIdx}
                      menu={menu}
                      inCart={isInCart(menu.id)}
                      onAdd={() => addToCart(menu)}
                      onRemove={() => removeFromCart(menu)}
                      onImageLoad={handleMenuImageLoad}
                      onImageError={handleMenuImageLoad}
                    />
                  ))
                ) : (
                  <Text style={{ marginHorizontal: 30, fontSize: 12, color: COLORS.GRAY }}>Tidak ada menu di kategori ini</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>

        {/* Floating Cart Button */}
        {allContentLoaded && cart.items.length > 0 && cart.sellerId === sellerid && (
          <TouchableOpacity
            style={{
              position: "absolute",
              bottom: 30,
              left: 0,
              right: 0,
              marginHorizontal: 30,
              backgroundColor: COLORS.GREEN3,
              borderRadius: 30,
              padding: 15,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3.84,
              elevation: 5,
            }}
            onPress={() => setCartVisible(true)}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>
              {cartButtonText}
            </Text>
          </TouchableOpacity>
        )}
        {/* Cart Modal */}
        <Modal visible={cartVisible} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}>
            <TouchableOpacity
              activeOpacity={1}
              style={{ flex: 1 }}
              onPress={() => {
                Keyboard.dismiss();
                setCartVisible(false);
              }}
            />
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, minHeight: 220, maxHeight: 350 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Keranjang</Text>
              <View style={{ maxHeight: 120, marginBottom: 10 }}>
                <ScrollView>
                  {cart.items.map((item) => (
                    <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ flex: 1 }}>{item.name}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold', marginRight: 10 }}>Jumlah Pax</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, padding: 8, width: 80, textAlign: 'center' }}
                  value={pax}
                  onChangeText={setPax}
                  keyboardType="numeric"
                  placeholder="1"
                  onBlur={Keyboard.dismiss}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold' }}>Total</Text>
                <Text style={{ fontWeight: 'bold' }}>Rp {getTotal().toLocaleString()}</Text>
              </View>
              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.GREEN3, borderRadius: 20, padding: 15, alignItems: 'center' }}
                  onPress={() => {
                    Keyboard.dismiss();
                    handleLanjutPembayaran();
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Lanjut Pembayaran</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: "grey", borderRadius: 20, padding: 15, alignItems: 'center' }}
                  onPress={() => {
                    Keyboard.dismiss();
                    setCartVisible(false);
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Tutup</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    zIndex: 1,
  },
  bannerSkeleton: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  container: {
    flex: 1,
    position: "relative", // This ensures SafeAreaView stays on top
  },
});

export default CateringDetail;
