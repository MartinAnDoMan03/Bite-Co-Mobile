import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  isDesktop,
  isTablet,
  horizontalPadding,
  contentMaxWidth,
} from '../constants/responsive';
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
import PinPointMapModal from '../../components/PinPointMapModal';
import { getOutletStatus, isOutletOrderable } from '../services/OutletStatusService';

const BANNER_HEIGHT = 150;
const OVERLAP = 30;
const FALLBACK_CARD_HEIGHT = 130;

// Key AsyncStorage khusus buat lokasi antar Catering — TERPISAH dari 'pinPoint'
// (lokasi profil) supaya milih lokasi custom di sini tidak menimpa alamat
// rumah/default buyer yang tersimpan di profilnya.
const CATERING_LOCATION_KEY = 'catering_delivery_location';
// Key yang dibaca Pembayaran.jsx untuk tahu "pakai lokasi custom ini, bukan
// pinPoint profil" — cuma di-set kalau buyer benar-benar pilih "Lokasi Lain".
const DELIVERY_LOCATION_OVERRIDE_KEY = 'delivery_location_override';
// Catatan buyer untuk pesanan Catering ini (mis. permintaan khusus ke seller).
// Disimpan generic (gak per-seller) sama kayak 'cart'/'cart_total'/'cart_store',
// dibaca ulang sama Pembayaran.jsx pas bikin order lalu dikirim sebagai field `notes`.
const CART_NOTES_KEY = 'cart_notes';

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

const ListMenu = ({ menu, inCart, onAdd, onRemove, onImageLoad, onImageError, orderable }) => {
  return (
    <View style={[styles.menuCard, !orderable && styles.menuCardClosed]}>
      <Image
        source={menu?.image ? { uri: menu.image } : menuImage}
        style={[styles.menuImage, !orderable && styles.menuImageClosed]}
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
           ) : orderable ? (
            <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
              <MaterialIcons name="add" size={14} color="white" />
              <Text style={styles.addBtnText}>Tambah</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.addBtnDisabled}>
              <Text style={styles.addBtnDisabledText}>Tutup</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const PackageCard = ({ pkg, inCart, onAdd, onRemove, orderable }) => (
  <View style={[styles.menuCard, !orderable && styles.menuCardClosed]}>
    <View style={[styles.menuImage, styles.packageIconWrap]}>
      <MaterialIcons name="inventory-2" size={28} color={COLORS.PRIMARY} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.menuName} numberOfLines={1}>{pkg?.name || "-"}</Text>
      <Text style={styles.menuDesc} numberOfLines={2}>{pkg?.description || "-"}</Text>
      <Text style={styles.packageMinPax}>Min. {pkg?.min_pax || "-"} pax</Text>
      <View style={styles.menuBottomRow}>
        <Text style={styles.menuPrice}>
          Rp {pkg?.price_per_pax ? pkg.price_per_pax.toLocaleString() : "-"} / pax
        </Text>
        {inCart ? (
          <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
            <MaterialIcons name="close" size={13} color="#D64545" />
            <Text style={styles.removeBtnText}>Hapus</Text>
          </TouchableOpacity>
        ) : orderable ? (
          <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
            <MaterialIcons name="add" size={14} color="white" />
            <Text style={styles.addBtnText}>Tambah</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addBtnDisabled}>
            <Text style={styles.addBtnDisabledText}>Tutup</Text>
          </View>
        )}
      </View>
    </View>
  </View>
);

// Modal pilihan slot menu untuk 1 paket catering.
// Buyer harus milih tepat `max_pick` item di tiap slot sebelum bisa konfirmasi.
const PackageSlotModal = ({ visible, pkg, categories, onConfirm, onClose }) => {
  const [selections, setSelections] = useState({}); // { [slotIndex]: [itemId, itemId, ...] }

  useEffect(() => {
    if (visible) {
      setSelections({});
    }
  }, [visible, pkg]);

  if (!pkg) return null;

  const slots = pkg.slots || [];

  const toggleItem = (slotIndex, item, maxPick) => {
    setSelections((prev) => {
      const current = prev[slotIndex] || [];
      const alreadySelected = current.some((i) => i.id === item.id);

      if (alreadySelected) {
        return { ...prev, [slotIndex]: current.filter((i) => i.id !== item.id) };
      }
      if (current.length >= maxPick) {
        // Kalau max_pick == 1, perilakunya kayak radio: ganti pilihan lama.
        if (maxPick === 1) {
          return { ...prev, [slotIndex]: [item] };
        }
        return prev; // sudah penuh, abaikan
      }
      return { ...prev, [slotIndex]: [...current, item] };
    });
  };

  const isSlotComplete = (slotIndex, maxPick) => (selections[slotIndex]?.length || 0) === maxPick;
  const allSlotsComplete = slots.every((slot, idx) => isSlotComplete(idx, slot.max_pick));

  const handleConfirm = () => {
    if (!allSlotsComplete) return;
    const selectedSlots = slots.map((slot, idx) => ({
      slot_label: slot.label,
      category_id: slot.category_id,
      category_name: slot.category_name,
      max_pick: slot.max_pick,
      selected_items: (selections[idx] || []).map((i) => ({ id: i.id, name: i.name })),
    }));
    onConfirm(selectedSlots);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}>
        <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.cartSheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.cartHandle} />
            <Text style={styles.cartTitle}>{pkg.name}</Text>
            <Text style={{ fontSize: 12.5, color: COLORS.TEXTSECONDARY, marginBottom: 14 }}>
              Pilih menu untuk setiap kategori di bawah ini
            </Text>

            {slots.map((slot, slotIndex) => {
              const items = getSlotItems(slot, categories);
              const selectedCount = selections[slotIndex]?.length || 0;

              return (
                <View key={slotIndex} style={{ marginBottom: 18 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{slot.label}</Text>
                    <Text style={{ fontSize: 12, color: selectedCount === slot.max_pick ? '#2E7D32' : COLORS.TEXTSECONDARY }}>
                      {selectedCount}/{slot.max_pick} dipilih
                    </Text>
                  </View>

                  {items.length === 0 ? (
                    <Text style={{ fontSize: 12.5, color: '#aaa', fontStyle: 'italic' }}>
                      Tidak ada menu di kategori ini
                    </Text>
                  ) : (
                    items.map((item) => {
                      const isSelected = (selections[slotIndex] || []).some((i) => i.id === item.id);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 10,
                            borderBottomWidth: 1,
                            borderBottomColor: '#f0f0f0',
                          }}
                          onPress={() => toggleItem(slotIndex, item, slot.max_pick)}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                            size={20}
                            color={isSelected ? COLORS.PRIMARY : '#c9c9c9'}
                          />
                          <Text style={{ marginLeft: 10, fontSize: 13.5, color: '#23272f' }}>{item.name}</Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.primaryCartBtn, !allSlotsComplete && { opacity: 0.5 }]}
              onPress={handleConfirm}
              disabled={!allSlotsComplete}
            >
              <Text style={styles.primaryCartBtnText}>
                {allSlotsComplete ? 'Konfirmasi Pilihan' : 'Lengkapi pilihan dulu'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Input pax yang bisa diketik langsung, selain lewat tombol +/-.
// Nyimpen text lokal supaya user bisa kosongin dulu pas lagi ngetik ulang
// angkanya, dan baru divalidasi/dikomit pas blur atau submit.
const QtyInput = ({ value, onChange }) => {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseInt(text, 10);
    if (!text || isNaN(parsed) || parsed < 1) {
      setText(String(value)); // balikin ke nilai valid terakhir kalau input kosong/invalid
      onChange(value);
    } else {
      onChange(parsed);
      setText(String(parsed));
    }
  };

  return (
    <TextInput
      style={styles.qtyInput}
      value={text}
      onChangeText={(t) => setText(t.replace(/[^0-9]/g, ''))}
      onBlur={commit}
      onSubmitEditing={commit}
      keyboardType="number-pad"
      maxLength={3}
      selectTextOnFocus
      textAlign="center"
    />
  );
};

// Cocokin slot (dari pkg.slots) dengan daftar item aktual di kategori terkait.
// categories di sini adalah state `categories` yang sudah di-fetch dari /seller/detail.
const getSlotItems = (slot, categories) => {
  const matchedCategory = categories.find((cat) => cat.id === slot.category_id);
  return matchedCategory?.items || [];
};

const CateringDetail = () => {
  const { sellerid } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
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
  const [buyerAddress, setBuyerAddress] = useState(null);
  const [cardHeight, setCardHeight] = useState(FALLBACK_CARD_HEIGHT);
  const router = useRouter();
  // Dihitung ulang tiap kali `store` berubah (setelah fetch detail selesai)
  const outletStatus = store ? getOutletStatus(store) : null;
  const orderable = store ? isOutletOrderable(store) : true;
  const [packages, setPackages] = useState([]);
  const [viewMode, setViewMode] = useState('menu');
  const [slotModalPackage, setSlotModalPackage] = useState(null); // pkg yang lagi dipilih slotnya
  // Keranjang global (dibaca dari AsyncStorage, tidak terikat sellerid halaman ini).
  const [globalCart, setGlobalCart] = useState({ items: [], store: null, orderType: null, total: 0 });

  // --- Lokasi pengantaran khusus untuk order Catering ---
  // customLocation: titik yang pernah dipilih lewat PinPointMapModal (kalau ada)
  // useCustomLocation: toggle "pakai lokasi tersimpan" vs "pakai lokasi lain"
  const [customLocation, setCustomLocation] = useState(null);
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Catatan buyer untuk pesanan Catering ini (opsional).
  const [orderNotes, setOrderNotes] = useState('');

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

  // Load buyer's pinpoint location from AsyncStorage (lokasi default/profil)
  const loadBuyerLocation = async () => {
    try {
      const savedPinPoint = await AsyncStorage.getItem('pinPoint');
      if (savedPinPoint) {
        const pinPoint = JSON.parse(savedPinPoint);
        if (pinPoint.lat && pinPoint.lng) {
          setBuyerLocation({ lat: pinPoint.lat, lng: pinPoint.lng, address: pinPoint.address || '' });
        }
      }
    } catch (error) {
      console.error('Error loading buyer location:', error);
    }
  };
// Load alamat manual buyer (diisi lewat form di profil) — ini yang ditampilkan
// di card "Lokasi Tersimpan", BUKAN pinPoint.address yang bisa berupa hasil
// reverse-geocode/plus code.
const loadBuyerAddress = async () => {
  try {
    const savedAddress = await AsyncStorage.getItem('addressFields');
    if (savedAddress) {
      const parsed = JSON.parse(savedAddress);
      setBuyerAddress(parsed.address || null);
    }
  } catch (error) {
    console.error('Error loading buyer address:', error);
  }
};
  // Load lokasi custom Catering yang pernah dipilih sebelumnya (kalau ada),
  // supaya kalau buyer keluar-masuk halaman ini, pilihannya tidak hilang.
  const loadCateringLocation = async () => {
    try {
      const raw = await AsyncStorage.getItem(CATERING_LOCATION_KEY);
      if (raw) {
        const loc = JSON.parse(raw);
        if (loc.lat && loc.lng) setCustomLocation(loc);
      }
      const overrideRaw = await AsyncStorage.getItem(DELIVERY_LOCATION_OVERRIDE_KEY);
      setUseCustomLocation(!!overrideRaw);
    } catch (e) {
      // biarkan default (pakai lokasi profil)
    }
  };

  // Catatan pesanan Catering ini ikut di-load/di-reset di dalam resolveCart
  // di bawah, supaya scoped ke seller+tipe order yang sama — bukan cuma dibaca
  // begitu saja dari storage tanpa pengecekan (itu sebabnya sebelumnya catatan
  // pesanan lama bisa "nempel" ke pesanan baru).

  useEffect(() => {
    loadBuyerLocation();
    loadCateringLocation();
    loadBuyerAddress();
  }, []);

  // Nentuin isi cart LOKAL (state `cart`) untuk seller ini saja.
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

        // Catatan cuma relevan kalau cart aktif itu beneran punya seller & tipe
        // yang sama dengan halaman ini. Kalau enggak (cart lain, cart kosong,
        // atau sisa dari pesanan yang sudah selesai), reset ke kosong — biar
        // gak "nempel" ke pesanan baru.
        if (sameSellerSameType) {
          const notesRaw = await AsyncStorage.getItem(CART_NOTES_KEY);
          setOrderNotes(notesRaw || '');
        } else {
          setOrderNotes('');
          await AsyncStorage.removeItem(CART_NOTES_KEY);
        }
      } catch (e) {
        setCart({ sellerId: sellerid, items: [] });
        setOrderNotes('');
      }
    };
    resolveCart();
  }, [sellerid]);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      setBannerImageLoaded(false);
      setMenuImagesLoaded(0);
      setAllContentLoaded(false);
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }

      try {
        let apiUrl = `${config.API_URL}/seller/detail/${sellerid}`;
        if (buyerLocation) {
          apiUrl += `?buyerLat=${buyerLocation.lat}&buyerLng=${buyerLocation.lng}`;
        }

        const res = await axios.get(apiUrl);
        console.log("Detail Catering Response:", res.data);
        if (res.data && res.data.seller) {
          setStore(res.data.seller);
          setCategories(res.data.seller.categories || []);

          const rawPackages = res.data.seller.cateringPackages || [];
          const validPackages = rawPackages.filter(pkg =>
            pkg.name &&
            pkg.price_per_pax && pkg.price_per_pax > 0 &&
            pkg.min_pax && pkg.min_pax > 0
          );
          setPackages(validPackages);

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

  const addToCart = async (menu) => {
    if (!orderable) return;
    const existingOrderType = await AsyncStorage.getItem('order_type');
    const existingStoreRaw = await AsyncStorage.getItem('cart_store');
    const existingStore = existingStoreRaw ? JSON.parse(existingStoreRaw) : null;
    const sameSellerSameType = existingStore?.id === sellerid && existingOrderType === 'Catering';

const doAdd = async () => {
  setCart((prevCart) => {
    let newCart;
    const initialQty = menu.isPackage ? (menu.min_pax || 1) : 1;
    if (prevCart.sellerId !== sellerid) {
      newCart = { sellerId: sellerid, items: [{ ...menu, qty: initialQty }] };
    } else {
      const found = prevCart.items.find((item) => item.id === menu.id);
      if (!found) {
        newCart = { ...prevCart, items: [...prevCart.items, { ...menu, qty: initialQty }] };
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
              await AsyncStorage.multiRemove(['cart', 'cart_total', 'cart_store', 'cart_pax', 'order_type', CATERING_LOCATION_KEY, DELIVERY_LOCATION_OVERRIDE_KEY, CART_NOTES_KEY]);
              setCart({ sellerId: sellerid, items: [] });
              setCustomLocation(null);
              setUseCustomLocation(false);
              setOrderNotes('');
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

const updateItemPax = (menuId, newQty) => {
  setCart((prevCart) => {
    const target = prevCart.items.find((item) => item.id === menuId);

    if (!target) return prevCart;

    const minAllowed = target.isPackage
      ? (target.min_pax || 1)
      : 1;

    // Normal menu: kalau tekan "-" dari qty 1, hapus item
    if (!target.isPackage && newQty < 1) {
      const updatedItems = prevCart.items.filter(
        (item) => item.id !== menuId
      );

      const newCart = {
        ...prevCart,
        items: updatedItems,
      };

      saveCartToStorage(updatedItems, store);

      return newCart;
    }

    // Package: tidak boleh kurang dari min_pax
    const safeQty = Math.max(minAllowed, newQty);

    const updatedItems = prevCart.items.map((item) =>
      item.id === menuId
        ? { ...item, qty: safeQty }
        : item
    );

    const newCart = {
      ...prevCart,
      items: updatedItems,
    };

    saveCartToStorage(updatedItems, store);

    return newCart;
  });
};

  const isInCart = (menuId) => {
    if (cart.sellerId !== sellerid) return false;
    return cart.items.some((item) => item.id === menuId);
  };

  const cartButtonText = `Lihat Keranjang (${globalCart.items.length} item)`;

  const getTotal = () => {
    return cart.items.reduce((total, item) => {
      const itemPrice = item.price || 0;
      const itemQty = item.qty || 0;
      return total + (itemPrice * itemQty);
    }, 0);
  };

  // Dipanggil dari PinPointMapModal setelah buyer pilih titik lokasi acara.
  const handleCateringLocationSelect = async (point) => {
    const newLocation = { lat: point.latitude, lng: point.longitude, address: point.address || '', addressComponents: point.addressComponents || null,};
    setCustomLocation(newLocation);
    setUseCustomLocation(true);
    try {
      await AsyncStorage.setItem(CATERING_LOCATION_KEY, JSON.stringify(newLocation));
    } catch (e) {
      // biarkan, state lokal tetap ke-set walau gagal simpan
    }
    setShowLocationPicker(false);
  };

  const handleLanjutPembayaran = async () => {
    if (!orderable) {
     showAlert('Outlet Tutup', outletStatus?.nextOpenLabel || 'Outlet sedang tutup, coba lagi nanti.', [{ text: 'OK' }], 'warning');
     return;
   }
    setCartVisible(false);
    if (!isOwnCart) {
      router.push('/buyer/Pembayaran');
      return;
    }
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(cart.items));
      await AsyncStorage.setItem('cart_total', JSON.stringify(getTotal()));
      await AsyncStorage.setItem('cart_store', JSON.stringify(store));
      await AsyncStorage.setItem('order_type', 'Catering');

      // Simpan pilihan lokasi pengantaran khusus untuk order Catering ini.
      // Kalau buyer pilih "Lokasi Lain", override ini dibaca Pembayaran.jsx
      // menggantikan pinPoint profil. Kalau tetap pakai lokasi tersimpan,
      // hapus override lama supaya otomatis fallback ke profil.
      if (useCustomLocation && customLocation) {
        await AsyncStorage.setItem(DELIVERY_LOCATION_OVERRIDE_KEY, JSON.stringify(customLocation));
      } else {
        await AsyncStorage.removeItem(DELIVERY_LOCATION_OVERRIDE_KEY);
      }

      // Simpan catatan buyer supaya bisa dibaca & dikirim sebagai field
      // `notes` pas Pembayaran.jsx bikin order.
      await AsyncStorage.setItem(CART_NOTES_KEY, orderNotes || '');

      router.push('/buyer/Pembayaran');
    } catch (e) {
      // handle error if needed
    }
  };

  // ------------------------------------------------------------------
  // Dipanggil khusus dari PackageSlotModal.onConfirm. Beda dari addToCart
  // biasa: di sini kita TIDAK bergantung ke state `cart` (yang update-nya
  // async lewat setCart) untuk nentuin isi final sebelum navigate — supaya
  // gak ada race condition antara "nambah ke cart" dan "baca cart buat pergi
  // ke Pembayaran". Semua dihitung dari array lokal, baru disimpan sekali,
  // baru redirect. Efeknya: klik "Konfirmasi Pilihan" langsung ke halaman
  // Pembayaran, gak balik dulu ke List Menu/keranjang.
  // ------------------------------------------------------------------
  const confirmPackageAndPay = async (pkg, selectedSlots) => {
    if (!orderable) {
      showAlert('Outlet Tutup', outletStatus?.nextOpenLabel || 'Outlet sedang tutup, coba lagi nanti.', [{ text: 'OK' }], 'warning');
      return;
    }

    const newItem = {
      ...pkg,
      price: pkg.price_per_pax,
      isPackage: true,
      selectedSlots,
      qty: pkg.min_pax || 1,
    };

    const proceed = async (baseItems) => {
      const items = baseItems.some((i) => i.id === newItem.id) ? baseItems : [...baseItems, newItem];

      setCart({ sellerId: sellerid, items });
      await saveCartToStorage(items, store);
      await AsyncStorage.setItem('order_type', 'Catering');

      // Sama seperti handleLanjutPembayaran: simpan lokasi & catatan
      // sebelum pindah halaman supaya Pembayaran.jsx bisa langsung baca.
      if (useCustomLocation && customLocation) {
        await AsyncStorage.setItem(DELIVERY_LOCATION_OVERRIDE_KEY, JSON.stringify(customLocation));
      } else {
        await AsyncStorage.removeItem(DELIVERY_LOCATION_OVERRIDE_KEY);
      }
      await AsyncStorage.setItem(CART_NOTES_KEY, orderNotes || '');

      setSlotModalPackage(null);
      router.push('/buyer/Pembayaran');
    };

    // Cek dulu apakah ada cart aktif punya seller/tipe lain — kalau ada,
    // konfirmasi dulu ke buyer sebelum menimpanya (perilaku sama seperti
    // addToCart biasa).
    const existingOrderType = await AsyncStorage.getItem('order_type');
    const existingStoreRaw = await AsyncStorage.getItem('cart_store');
    const existingStore = existingStoreRaw ? JSON.parse(existingStoreRaw) : null;
    const sameSellerSameType = existingStore?.id === sellerid && existingOrderType === 'Catering';

    if (existingOrderType && !sameSellerSameType) {
      setSlotModalPackage(null);
      showAlert(
        'Ganti Pesanan?',
        `Kamu masih punya pesanan ${existingOrderType} yang belum diselesaikan. Menambah menu di sini akan menghapus pesanan tersebut.`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Ya, Ganti',
            onPress: async () => {
              await AsyncStorage.multiRemove(['cart', 'cart_total', 'cart_store', 'cart_pax', 'order_type', CATERING_LOCATION_KEY, DELIVERY_LOCATION_OVERRIDE_KEY, CART_NOTES_KEY]);
              setCustomLocation(null);
              setUseCustomLocation(false);
              setOrderNotes('');
              await proceed([]);
            },
          },
        ],
        'warning'
      );
      return;
    }

    const baseItems = sameSellerSameType && cart.sellerId === sellerid ? cart.items : [];
    await proceed(baseItems);
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
            await AsyncStorage.multiRemove(['cart', 'cart_total', 'cart_store', 'cart_pax', 'order_type', CATERING_LOCATION_KEY, DELIVERY_LOCATION_OVERRIDE_KEY, CART_NOTES_KEY]);
            setCart({ sellerId: sellerid, items: [] });
            setGlobalCart({ items: [], store: null, orderType: null, total: 0 });
            setCustomLocation(null);
            setUseCustomLocation(false);
            setOrderNotes('');
            setCartVisible(false);
          },
        },
      ],
      'warning'
    );
  };

  useEffect(() => {
    if (categories && categories.length > 0) {
      let total = 0;
      categories.forEach(cat => {
        if (Array.isArray(cat.items)) total += cat.items.length;
      });
      setMenuImagesTotal(total);
      setMenuImagesLoaded(0);
    } else {
      setMenuImagesTotal(0);
      setMenuImagesLoaded(0);
    }
  }, [categories]);

  const handleMenuImageLoad = () => {
    setMenuImagesLoaded((prev) => {
      const newCount = prev + 1;
      return newCount > menuImagesTotal ? menuImagesTotal : newCount;
    });
  };

  const handleBannerImageLoad = () => {
    setBannerImageLoaded(true);
  };

  const handleBannerImageError = () => {
    setBannerImageLoaded(true);
  };

  useEffect(() => {
    const dataLoaded = !loading && !error && store && categories !== null;
    const allMenuImagesLoaded = menuImagesTotal === 0 || menuImagesLoaded >= menuImagesTotal;
    const imagesLoaded = bannerImageLoaded && allMenuImagesLoaded;

    if (dataLoaded && imagesLoaded && !allContentLoaded) {
      const timer = setTimeout(() => {
        setAllContentLoaded(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, error, store, categories, bannerImageLoaded, menuImagesLoaded, menuImagesTotal, allContentLoaded]);

  useEffect(() => {
    if (!loading && !allContentLoaded) {
      const fallbackTimer = setTimeout(() => {
        setAllContentLoaded(true);
      }, 5000);

      setLoadingTimeout(fallbackTimer);

      return () => {
        if (fallbackTimer) clearTimeout(fallbackTimer);
      };
    }
  }, [loading, allContentLoaded]);

  useEffect(() => {
    if (allContentLoaded && loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
  }, [allContentLoaded, loadingTimeout]);

  const headerHeight = BANNER_HEIGHT - OVERLAP + cardHeight;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
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

      <TouchableOpacity
        style={[styles.backButtonFloating, { top: insets.top + 16 }]}
        onPress={() => router.back()}
        accessibilityLabel="Kembali"
      >
        <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
      </TouchableOpacity>

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, marginTop: headerHeight }}
        contentContainerStyle={{ paddingTop: 15, paddingBottom: 20, gap: 10 }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
          }}
        >
        {allContentLoaded && !orderable && outletStatus && (
          <View style={styles.closedNotice}>
            <MaterialIcons name="info" size={16} color="#B26A00" />
            <Text style={styles.closedNoticeText}>
              {outletStatus.label}{outletStatus.nextOpenLabel ? ` — ${outletStatus.nextOpenLabel}` : ''}
            </Text>
          </View>
        )}

        {allContentLoaded && packages.length > 0 && (
          <View style={styles.viewModeRow}>
            <TouchableOpacity
              style={[styles.viewModeChip, viewMode === 'menu' && styles.viewModeChipActive]}
              onPress={() => setViewMode('menu')}
            >
              <Text style={[styles.viewModeChipText, viewMode === 'menu' && styles.viewModeChipTextActive]}>
                Menu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeChip, viewMode === 'paket' && styles.viewModeChipActive]}
              onPress={() => setViewMode('paket')}
            >
              <Text style={[styles.viewModeChipText, viewMode === 'paket' && styles.viewModeChipTextActive]}>
                Paket
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
        
          ) : viewMode === 'paket' ? (
              packages.length === 0 ? (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="inventory-2" size={36} color={COLORS.TEXTSECONDARY} />
                  <Text style={styles.errorText}>Belum ada paket catering</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <Text style={styles.categoryTitle}>Paket Catering</Text>
                  {packages.map((pkg) => (
                    <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    inCart={isInCart(pkg.id)}
                    onAdd={() => {
                      if (pkg.slots && pkg.slots.length > 0) {
                        setSlotModalPackage(pkg);
                      } else {
                        addToCart({ ...pkg, price: pkg.price_per_pax, isPackage: true });
                      }
                    }}
                    onRemove={() => removeFromCart(pkg)}
                    orderable={orderable}
                  />
                  ))}
                </View>
              )

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
                    orderable={orderable}
                  />
                ))
              ) : (
                <Text style={styles.emptyCategoryText}>Tidak ada menu di kategori ini</Text>
              )}
            </View>
          ))
        )}
        </View>
      </ScrollView>

      {allContentLoaded && globalCart.items.length > 0 && (
        <TouchableOpacity
          style={styles.floatingCartButton}
          onPress={() => setCartVisible(true)}
        >
          <MaterialIcons name="shopping-bag" size={18} color="white" />
          <Text style={styles.floatingCartText}>{cartButtonText}</Text>
        </TouchableOpacity>
      )}

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
            <ScrollView showsVerticalScrollIndicator={false}>
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
                        <Text style={{ fontSize: 12, color: COLORS.TEXTSECONDARY }}>
                          Rp {item.price?.toLocaleString()}{item.isPackage ? ' / pax' : ''}
                        </Text>
                        {item.isPackage && (
                        <Text style={{ fontSize: 10.5, color: COLORS.PRIMARY, marginTop: 2 }}>
                          Min. {item.min_pax} pax
                        </Text>
                      )}
                      {item.isPackage && item.selectedSlots && item.selectedSlots.length > 0 && (
                        <View style={{ marginTop: 4 }}>
                          {item.selectedSlots.map((slot, idx) => (
                            <Text key={idx} style={{ fontSize: 10.5, color: '#888' }} numberOfLines={1}>
                              {slot.slot_label}: {slot.selected_items.map(i => i.name).join(', ')}
                            </Text>
                          ))}
                        </View>
                      )}
                      </View>  

                      {isOwnCart && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <TouchableOpacity
                            onPress={() =>
                              updateItemPax(item.id, (item.qty || 1) - 1)
                            }
                          >
                            <MaterialIcons
                              name="remove-circle-outline"
                              size={22}
                              color={COLORS.PRIMARY}
                            />
                          </TouchableOpacity>

                          <QtyInput
                            value={item.qty || 1}
                            onChange={(newQty) =>
                              updateItemPax(item.id, newQty)
                            }
                          />

                          <TouchableOpacity
                            onPress={() =>
                              updateItemPax(item.id, (item.qty || 1) + 1)
                            }
                          >
                            <MaterialIcons
                              name="add-circle-outline"
                              size={22}
                              color={COLORS.PRIMARY}
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => removeFromCart(item)}
                          >
                            <MaterialIcons
                              name="delete-outline"
                              size={21}
                              color="#D64545"
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* ---------------- Lokasi Pengantaran (khusus Catering) ---------------- */}
              {isOwnCart && (
                <View style={styles.locationSection}>
                  <Text style={styles.locationSectionTitle}>Lokasi Pengantaran</Text>
                  <View style={styles.locationToggleRow}>
                    <TouchableOpacity
                      style={[styles.locationToggleBtn, !useCustomLocation && styles.locationToggleBtnActive]}
                      onPress={() => setUseCustomLocation(false)}
                    >
                      <Text style={[styles.locationToggleText, !useCustomLocation && styles.locationToggleTextActive]}>
                        Lokasi Tersimpan
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.locationToggleBtn, useCustomLocation && styles.locationToggleBtnActive]}
                      onPress={() => setUseCustomLocation(true)}
                    >
                      <Text style={[styles.locationToggleText, useCustomLocation && styles.locationToggleTextActive]}>
                        Lokasi Lain
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {useCustomLocation ? (
                    <TouchableOpacity style={styles.locationPickBox} onPress={() => setShowLocationPicker(true)}>
                      <MaterialIcons name="place" size={16} color={COLORS.PRIMARY} />
                      <Text style={styles.locationPickText} numberOfLines={2}>
                        {customLocation?.address || 'Ketuk untuk pilih titik lokasi acara'}
                      </Text>
                      <MaterialIcons name="chevron-right" size={18} color="#c9c9c9" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.locationPickBox}>
                    <MaterialIcons name="home" size={16} color={COLORS.PRIMARY} />
                    <Text style={styles.locationPickText} numberOfLines={2}>
                      {buyerAddress || 'Alamat tersimpan di profil'}
                    </Text>
                  </View>
                  )}
                </View>
              )}

              {/* ---------------- Catatan (khusus Catering) ---------------- */}
              {isOwnCart && (
                <View style={styles.notesSection}>
                  <Text style={styles.locationSectionTitle}>Catatan (opsional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={orderNotes}
                    onChangeText={setOrderNotes}
                    placeholder="Contoh: pedas level 2, jangan pakai bawang, dll"
                    placeholderTextColor="#AAA"
                    multiline
                    numberOfLines={3}
                    maxLength={300}
                    textAlignVertical="top"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
              )}

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
            </ScrollView>
          </View>
        </View>
      </Modal>

      <PinPointMapModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelect={handleCateringLocationSelect}
        initialPin={customLocation ? { latitude: customLocation.lat, longitude: customLocation.lng } : null}
      />

      <PackageSlotModal
        visible={!!slotModalPackage}
        pkg={slotModalPackage}
        categories={categories}
        onClose={() => setSlotModalPackage(null)}
        onConfirm={(selectedSlots) => {
          confirmPackageAndPay(slotModalPackage, selectedSlots);
        }}
      />

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
  backButtonFloating: {
    position: "absolute",
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5, 
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
    menuCardClosed: {
    opacity: 0.5,
  },
  menuImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
  },
   menuImageClosed: {
   opacity: 0.7,
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
    addBtnDisabled: {
    backgroundColor: "#E5E5E5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addBtnDisabledText: {
    color: "#999",
    fontSize: 11,
    fontWeight: "600",
  },
  closedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
  },
  closedNoticeText: {
    flex: 1,
    fontSize: 12.5,
    color: '#B26A00',
    fontWeight: '600',
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
    maxHeight: 520,
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
  // ---------------- Qty input di keranjang ----------------
  qtyInput: {
    minWidth: 34,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 6,
    backgroundColor: '#F7F5F1',
  },
  // ---------------- Lokasi Pengantaran ----------------
  locationSection: {
    marginBottom: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  locationSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: "#1A1A1A",
    marginBottom: 8,
  },
  locationToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  locationToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  locationToggleBtnActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  locationToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  locationToggleTextActive: {
    color: '#fff',
  },
  locationPickBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F7F5F1',
    padding: 12,
    borderRadius: 12,
  },
  locationPickText: {
    flex: 1,
    fontSize: 12.5,
    color: '#23272f',
    fontWeight: '500',
  },
  // ---------------- Catatan ----------------
  notesSection: {
    marginBottom: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  notesInput: {
    backgroundColor: '#F7F5F1',
    borderRadius: 12,
    padding: 12,
    fontSize: 12.5,
    color: '#23272f',
    minHeight: 70,
    borderWidth: 1,
    borderColor: '#EAEAEA',
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
    viewModeRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 4,
    gap: 8,
  },
  viewModeChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  viewModeChipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  viewModeChipText: { fontSize: 13, fontWeight: '700', color: '#888' },
  viewModeChipTextActive: { color: '#fff' },
  packageIconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7EAEF',
  },
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