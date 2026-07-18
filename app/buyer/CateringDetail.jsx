import { SafeAreaView } from "react-native-safe-area-context";
import banner2 from "../../assets/images/banner2.png";
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, Keyboard } from "react-native";
import starSolid from "../../assets/images/starSolid.png";
import COLORS from '../constants/color';
import menuImage from "../../assets/images/menuImage.png";
import { useLocalSearchParams } from "expo-router";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import config from '../constants/config';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import SkeletonLoader, { MenuItemSkeleton } from '../../components/SkeletonLoader';

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
  const [buyerLocation, setBuyerLocation] = useState(null);
  const [cardHeight, setCardHeight] = useState(FALLBACK_CARD_HEIGHT);
  const router = useRouter();

  // Keranjang global (dibaca dari AsyncStorage, tidak terikat sellerid halaman ini).
  // Dipakai buat nentuin apakah tombol "Lihat Keranjang" harus muncul, dan buat
  // nampilin isi cart walau item-nya bukan milik seller yang lagi dibuka.
  const [globalCart, setGlobalCart] = useState({ items: [], store: null, orderType: null, total: 0 });

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

  // Refresh keranjang tiap halaman ini kembali fokus.
  useFocusEffect(
    useCallback(() => {
      loadGlobalCart();
    }, [])
  );

  // Cart di AsyncStorage ini beneran "punya" halaman Catering seller ini atau bukan.
  const isOwnCart = globalCart.store?.id === sellerid && globalCart.orderType === 'Catering';

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

  // Nentuin isi cart LOKAL (state `cart`) untuk seller ini saja -- tanpa nge-alert
  // apa pun. Kalau cart di storage memang punya seller & tipe (Catering) yang
  // sama, di-load. Kalau bukan, state lokal mulai kosong (alert-nya baru muncul
  // nanti pas user benar-benar nge-klik "Tambah").
  useEffect(() => {
    const resolveCart = async () => {
      if (!sellerid) return;
      try {
        const existingOrderType = await AsyncStorage.getItem('order_type');
        const existingCartRaw = await AsyncStorage.getItem('cart');
        const existingStoreRaw = await AsyncStorage.getItem('cart_store');
        const parsedCart = existingCartRaw ? JSON.parse(existingCartRaw) : [];
        const existingStore = existingStoreRaw ? JSON.parse(existingStoreRaw) : null;
        const hasExistingCart = Array.isArray(parsedCart) && parsedCart.length > 0;
        const sameSellerSameType = hasExistingCart && existingOrderType === 'Catering' && existingStore?.id === sellerid;

        setCart(sameSellerSameType ? { sellerId: sellerid, items: parsedCart } : { sellerId: sellerid, items: [] });
      } catch (e) {
        setCart({ sellerId: sellerid, items: [] });
      }
    };
    resolveCart();
  }, [sellerid]);

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

  const saveCartToStorage = async (cartItems, storeObj) => {
    try {
      const total = cartItems.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 0)), 0);
      await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
      await AsyncStorage.setItem('cart_total', JSON.stringify(total));
      await AsyncStorage.setItem('cart_store', JSON.stringify(storeObj));
      setGlobalCart({ items: cartItems, store: storeObj, orderType: 'Catering', total });
    } catch (e) {
      // handle error if needed
    }
  };

  // Cek konflik di titik klik (bukan pas halaman dibuka). Kalau ada pesanan lain
  // yang beda seller/tipe, tanya dulu -- baru dihapus & diganti kalau user setuju.
  const addToCart = async (menu) => {
    const existingOrderType = await AsyncStorage.getItem('order_type');
    const existingStoreRaw = await AsyncStorage.getItem('cart_store');
    const existingStore = existingStoreRaw ? JSON.parse(existingStoreRaw) : null;
    const sameSellerSameType = existingStore?.id === sellerid && existingOrderType === 'Catering';

    const doAdd = async () => {
      setCart((prevCart) => {
        let newCart;
        if (prevCart.sellerId !== sellerid) {
          newCart = { sellerId: sellerid, items: [{ ...menu, qty: 1 }] };
        } else {
          const found = prevCart.items.find((item) => item.id === menu.id);
          if (!found) {
            newCart = { ...prevCart, items: [...prevCart.items, { ...menu, qty: 1 }] };
          } else {
            newCart = prevCart;
          }
        }
        saveCartToStorage(newCart.items, store);
        return newCart;
      });
      await AsyncStorage.setItem('order_type', 'Catering');
    };

    if (existingOrderType && !sameSellerSameType) {
      showAlert(
        'Ganti Pesanan?',
        `Kamu masih punya pesanan ${existingOrderType} yang belum diselesaikan. Menambah menu di sini akan menghapus pesanan tersebut.`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Ya, Ganti',
            onPress: async () => {
              await AsyncStorage.multiRemove(['cart', 'cart_total', 'cart_store', 'cart_pax', 'order_type']);
              setCart({ sellerId: sellerid, items: [] });
              await doAdd();
            },
          },
        ],
        'warning'
      );
      return;
    }

    await doAdd();
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

  // Function for updating pax for items
  const updateItemPax = (menuId, newQty) => {
    setCart((prevCart) => {
      // Pax cant be less than 1
      const safeQty = Math.max(1, newQty);

      const updatedItems = prevCart.items.map(item => 
        item.id === menuId ? { ...item, qty: safeQty } : item
      );

      const newCart = { ...prevCart, items: updatedItems };
      saveCartToStorage(updatedItems, store);
      return newCart;
    });
  };


  // Helper to check if item is in cart
  const isInCart = (menuId) => {
    if (cart.sellerId !== sellerid) return false;
    return cart.items.some((item) => item.id === menuId);
  };

  // Cart button text
  const cartButtonText = `Lihat Keranjang (${globalCart.items.length} item)`;

  // Total calculation: sum of item price * pax
  const getTotal = () => {
    return cart.items.reduce((total, item) => {
      const itemPrice = item.price || 0;
      const itemQty = item.qty || 0;
      return total + (itemPrice * itemQty);
    }, 0);
  };

  const handleLanjutPembayaran = async () => {
    setCartVisible(false);
    if (!isOwnCart) {
      // Cart yang ditampilkan berasal dari seller/tipe lain (mis. dari Rantangan),
      // jadi langsung lanjut pakai apa yang sudah ada di storage.
      router.push('/buyer/Pembayaran');
      return;
    }
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(cart.items));
      await AsyncStorage.setItem('cart_total', JSON.stringify(getTotal()));
      await AsyncStorage.setItem('cart_store', JSON.stringify(store));
      await AsyncStorage.setItem('order_type', 'Catering');
      router.push('/buyer/Pembayaran');
    } catch (e) {
      // handle error if needed
    }
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
            await AsyncStorage.multiRemove(['cart', 'cart_total', 'cart_store', 'cart_pax', 'order_type']);
            setCart({ sellerId: sellerid, items: [] });
            setGlobalCart({ items: [], store: null, orderType: null, total: 0 });
            setCartVisible(false);
          },
        },
      ],
      'warning'
    );
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
    } else {
      setMenuImagesTotal(0);
      setMenuImagesLoaded(0);
    }
  }, [categories]);

  // Handler for each menu image load/error
  const handleMenuImageLoad = () => {
    setMenuImagesLoaded((prev) => {
      const newCount = prev + 1;
      return newCount > menuImagesTotal ? menuImagesTotal : newCount;
    });
  };

  // Handler for banner image load
  const handleBannerImageLoad = () => {
    setBannerImageLoaded(true);
  };

  const handleBannerImageError = () => {
    setBannerImageLoaded(true); // Still mark as loaded even on error
  };

  // Check if all content is loaded
  useEffect(() => {
    const dataLoaded = !loading && !error && store && categories !== null;
    const allMenuImagesLoaded = menuImagesTotal === 0 || menuImagesLoaded >= menuImagesTotal;
    const imagesLoaded = bannerImageLoaded && allMenuImagesLoaded;

    if (dataLoaded && imagesLoaded && !allContentLoaded) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setAllContentLoaded(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, error, store, categories, bannerImageLoaded, menuImagesLoaded, menuImagesTotal, allContentLoaded]);

  // Fallback timeout to hide skeleton after maximum wait time
  useEffect(() => {
    if (!loading && !allContentLoaded) {
      const fallbackTimer = setTimeout(() => {
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
          categories.filter(cat => cat.items && cat.items.length > 0).map((cat, idx) => (
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

      {/* Floating Cart Button - global, tetap muncul walau cart bukan punya seller ini */}
      {allContentLoaded && globalCart.items.length > 0 && (
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
            {!isOwnCart && !!globalCart.store?.name && (
              <Text style={{ fontSize: 12, color: COLORS.TEXTSECONDARY, marginBottom: 10 }}>
                {globalCart.store.name} · {globalCart.orderType}
              </Text>
            )}
            <View style={{ maxHeight: 120, marginBottom: 14 }}>
              <ScrollView>
                {(isOwnCart ? cart.items : globalCart.items).map((item) => (
                  <View key={item.id} style={styles.cartItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13 }}>{item.name}</Text>
                      <Text style={{ fontSize: 12, color: COLORS.TEXTSECONDARY }}>Rp {item.price?.toLocaleString()}</Text>
                    </View>

                    {/* Kontrol Pax per Item - cuma bisa diubah kalau ini memang cart Catering seller ini */}
                    {isOwnCart && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => updateItemPax(item.id, (item.qty || 1) - 1)}>
                          <MaterialIcons name="remove-circle-outline" size={22} color={COLORS.PRIMARY} />
                        </TouchableOpacity>

                        <Text style={{ fontSize: 14, fontWeight: '600', minWidth: 20, textAlign: 'center'}}>
                          {item.qty || 1}
                        </Text>

                        <TouchableOpacity onPress={() => updateItemPax(item.id, (item.qty || 1) + 1)}>
                          <MaterialIcons name="add-circle-outline" size={22} color={COLORS.PRIMARY} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>Rp {(isOwnCart ? getTotal() : globalCart.total).toLocaleString()}</Text>
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
                  handleCancelCart();
                }}
              >
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

export default CateringDetail;