import { SafeAreaView } from "react-native-safe-area-context";
import banner2 from "../../assets/images/banner2.png";
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, Keyboard } from "react-native";
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

const BANNER_HEIGHT = 150;
const OVERLAP = 30;
const FALLBACK_CARD_HEIGHT = 100;

const ListMenu = ({ menu, inCart, onAdd, onRemove, onImageLoad, onImageError }) => {
  return (
    <View style={styles.menuCard}>
      <Image
        source={menu?.image ? { uri: menu.image } : menuImage}
        style={styles.menuImage}
        resizeMode="cover"
        onLoad={onImageLoad}
        onError={onImageError}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.menuName} numberOfLines={1}>{menu?.name || "-"}</Text>
        <Text style={styles.menuDesc} numberOfLines={2}>{menu?.description || "-"}</Text>
        <View style={styles.menuBottomRow}>
          <Text style={styles.menuPrice}>Rp {menu?.price ? menu.price.toLocaleString() : "-"}</Text>
          {inCart ? (
            <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
              <MaterialIcons name="close" size={13} color="#D64545" />
              <Text style={styles.removeBtnText}>Hapus</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
              <MaterialIcons name="add" size={14} color="white" />
              <Text style={styles.addBtnText}>Tambah</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

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
  const [cardHeight, setCardHeight] = useState(FALLBACK_CARD_HEIGHT);
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

  const headerHeight = BANNER_HEIGHT - OVERLAP + cardHeight;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Fixed header: banner, does NOT scroll */}
      <View style={styles.bannerLayer}>
        {!bannerImageLoaded && (
          <View style={StyleSheet.absoluteFill}>
            <SkeletonLoader width="100%" height="100%" borderRadius={0} />
          </View>
        )}
        <Image
          source={bannerUrl ? { uri: bannerUrl } : banner2}
          style={[styles.bannerImage, { opacity: bannerImageLoaded ? 1 : 0 }]}
          resizeMode="cover"
          onLoad={handleBannerImageLoad}
          onError={handleBannerImageError}
        />
        <View style={styles.bannerScrim} pointerEvents="none" />
      </View>

      {/* Fixed store card, does NOT scroll */}
      <View
        style={[styles.storeCard, { top: BANNER_HEIGHT - OVERLAP }, !allContentLoaded && styles.storeCardLoading]}
        onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
      >
        {!allContentLoaded ? (
          <>
            <View style={{ flex: 1 }}>
              <SkeletonLoader width="70%" height={16} style={{ marginBottom: 10 }} />
              <SkeletonLoader width="50%" height={12} />
            </View>
            <SkeletonLoader width={54} height={40} borderRadius={12} />
          </>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <Text style={styles.storeName} numberOfLines={1}>{store ? store.name : "-"}</Text>
              {!!store?.kelurahan && (
                <View style={styles.locationRow}>
                  <MaterialIcons name="place" size={13} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.storeSub} numberOfLines={1}>{store.kelurahan}</Text>
                </View>
              )}
              <View style={styles.tagRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{store?.type || "Catering"}</Text>
                </View>
                {store?.distance !== null && store?.distance !== undefined && (
                  <View style={styles.tag}>
                    <MaterialIcons name="near-me" size={11} color="white" style={{ marginRight: 3 }} />
                    <Text style={styles.tagText}>{store.distance} km</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.ratingPill}>
              <Image source={starSolid} style={{ width: 20, height: 20 }} />
              <Text style={styles.ratingText}>{store ? store.rating : "4.7"}</Text>
            </View>
          </>
        )}
      </View>

      {/* Scrollable content, sits below the fixed header */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerHeight + 15, paddingBottom: 20, gap: 10 }}
      >
        {!allContentLoaded || loading ? (
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <MenuItemSkeleton />
            <MenuItemSkeleton />
            <MenuItemSkeleton />
            <MenuItemSkeleton />
            <MenuItemSkeleton />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={36} color={COLORS.TEXTSECONDARY} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="restaurant-menu" size={36} color={COLORS.TEXTSECONDARY} />
            <Text style={styles.errorText}>Tidak ada menu</Text>
          </View>
        ) : (
          categories.map((cat, idx) => (
            <View key={cat.name || idx} style={{ gap: 12, marginBottom: 6 }}>
              <Text style={styles.categoryTitle}>{cat.name}</Text>
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
                <Text style={styles.emptyCategoryText}>Tidak ada menu di kategori ini</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Cart Button */}
      {allContentLoaded && cart.items.length > 0 && cart.sellerId === sellerid && (
        <TouchableOpacity
          style={styles.floatingCartButton}
          onPress={() => setCartVisible(true)}
        >
          <MaterialIcons name="shopping-bag" size={18} color="white" />
          <Text style={styles.floatingCartText}>{cartButtonText}</Text>
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
          <View style={styles.cartSheet}>
            <View style={styles.cartHandle} />
            <Text style={styles.cartTitle}>Keranjang</Text>
            <View style={{ maxHeight: 120, marginBottom: 14 }}>
              <ScrollView>
                {cart.items.map((item) => (
                  <View key={item.id} style={styles.cartItemRow}>
                    <Text style={{ flex: 1, fontSize: 13 }}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: COLORS.TEXTSECONDARY }}>Rp {item.price?.toLocaleString()}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
            <View style={styles.paxRow}>
              <Text style={styles.paxLabel}>Jumlah Pax</Text>
              <TextInput
                style={styles.paxInput}
                value={pax}
                onChangeText={setPax}
                keyboardType="numeric"
                placeholder="1"
                onBlur={Keyboard.dismiss}
              />
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>Rp {getTotal().toLocaleString()}</Text>
            </View>
            <View style={{ gap: 10, marginTop: 6 }}>
              <TouchableOpacity
                style={styles.primaryCartBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  handleLanjutPembayaran();
                }}
              >
                <Text style={styles.primaryCartBtnText}>Lanjut Pembayaran</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryCartBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  setCartVisible(false);
                }}
              >
                <Text style={styles.secondaryCartBtnText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  storeCardLoading: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    alignItems: "center",
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
  tagRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
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
  categoryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginHorizontal: 20,
  },
  emptyCategoryText: {
    marginHorizontal: 20,
    fontSize: 12,
    color: COLORS.TEXTSECONDARY,
  },
  menuCard: {
    backgroundColor: "white",
    padding: 14,
    marginHorizontal: 20,
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  menuImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
  },
  menuName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  menuDesc: {
    fontSize: 11,
    color: COLORS.TEXTSECONDARY,
    marginTop: 3,
    lineHeight: 15,
  },
  menuBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  menuPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.PRIMARY,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addBtnText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFEAEA",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  removeBtnText: {
    color: "#D64545",
    fontSize: 11,
    fontWeight: "600",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.TEXTSECONDARY,
  },
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
  paxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "space-between",
    marginBottom: 14,
  },
  paxLabel: {
    fontWeight: '600',
    fontSize: 13,
    color: "#1A1A1A",
  },
  paxInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    padding: 8,
    width: 80,
    textAlign: 'center',
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
});

export default CateringDetail;