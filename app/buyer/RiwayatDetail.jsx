import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../constants/config';
import COLORS from '../constants/color';
import { MaterialIcons } from '@expo/vector-icons';

const RiwayatDetail = () => {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState(null); // Add seller state

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('buyerToken');
        const res = await axios.get(`${config.API_URL}/buyer/orders`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
        const found = (res.data.orders || []).find(o => o.id === orderId);
        setOrder(found || null);
        // Fetch seller detail if sellerId exists
        if (found && found.sellerId) {
          try {
            const sellerRes = await axios.get(`${config.API_URL}/seller/detail/${found.sellerId}`);
            if (sellerRes.data && sellerRes.data.seller) {
              setSeller({
                outletName: sellerRes.data.seller.outletName,
                storeIcon: sellerRes.data.seller.storeIcon,
              });
            } else {
              setSeller(null);
            }
          } catch {
            setSeller(null);
          }
        } else {
          setSeller(null);
        }
      } catch (e) {
        setOrder(null);
        setSeller(null);
      } finally {
        setLoading(false);
      }
    };
    if (orderId) fetchOrder();
  }, [orderId]);

  // FIX: badge status sekarang netral (abu-abu + teks gelap) untuk semua status,
  // kecuali "cancelled" yang tetap merah karena satu-satunya status kritikal
  // yang memang perlu nonjol. Selaras dengan skema warna di Riwayat.jsx.
  const STATUS_PROGRESS_META = {
  awaiting_seller_approval: { bg: '#F1F1F3', text: '#3A3F47', label: 'Menunggu Persetujuan Penjual' },
  approved_awaiting_payment: { bg: '#F1F1F3', text: '#3A3F47', label: 'Menunggu Pembayaran' },
  processing: { bg: '#F1F1F3', text: '#3A3F47', label: 'Diproses' },
  delivery: { bg: '#F1F1F3', text: '#3A3F47', label: 'Pengiriman' },
  completed: { bg: '#F1F1F3', text: '#3A3F47', label: 'Selesai' },
  cancelled: { bg: '#FDECEA', text: '#D32F2F', label: 'Dibatalkan' },
};

const getStatusMeta = (statusProgress) => {
  return STATUS_PROGRESS_META[statusProgress] || { bg: '#F1F1F3', text: '#3A3F47', label: 'Menunggu' };
};

  // Header selaras dengan halaman lain
  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Kembali">
        <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Detail Pesanan</Text>
      <View style={{ width: 26 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.centerBox}>
          <Text style={{ color: '#aaa', fontSize: 16 }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.centerBox}>
          <Text style={{ color: '#aaa', fontSize: 16 }}>Order detail tidak ditemukan.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusMeta = getStatusMeta(order.statusProgress);

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Order id + status */}
        <View style={styles.topRow}>
          <Text style={styles.orderId}>#{order.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Text style={[styles.statusText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Tanggal</Text>
          <Text style={styles.metaValue}>{order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Total</Text>
          <Text style={styles.metaValue}>Rp {order.totalAmount?.toLocaleString()}</Text>
        </View>

        <View style={styles.divider} />

        {/* Seller */}
        <View style={styles.sellerRow}>
          {seller && seller.storeIcon ? (
            <Image source={{ uri: seller.storeIcon }} style={styles.sellerIcon} />
          ) : (
            <View style={[styles.sellerIcon, styles.sellerIconFallback]}>
              <MaterialIcons name="store" size={20} color="#bbb" />
            </View>
          )}
          <Text style={styles.sellerName}>{seller?.outletName || '-'}</Text>
        </View>

        <View style={styles.divider} />

        {/* Delivery Address & Notes */}
        <Text style={styles.sectionTitle}>Alamat Pengantaran</Text>
        <Text style={styles.sectionValue}>{order.deliveryAddress || '-'}</Text>

        {!!order.eventDateTime && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Tanggal & Waktu Pengantaran</Text>
            <Text style={styles.sectionValue}>
              {new Date(order.eventDateTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              {', '}
              {new Date(order.eventDateTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Catatan</Text>
        <Text style={styles.sectionValue}>{order.notes || '-'}</Text>

        <View style={styles.divider} />

        {/* Items List */}
        <Text style={styles.sectionTitle}>Item Pesanan</Text>
        {order.items && order.items.length > 0 ? (
          order.items.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.itemRow,
                idx === order.items.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>Qty: {item.qty}</Text>
                {item.selectedSlots && item.selectedSlots.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  {item.selectedSlots.map((slot, slotIdx) => (
                    <Text key={slotIdx} style={styles.itemSlotText} numberOfLines={1}>
                      {slot.slot_label}: {slot.selected_items.map(i => i.name).join(', ')}
                    </Text>
                  ))}
                </View>
              )}
              </View>
              <Text style={styles.itemPrice}>Rp {item.price?.toLocaleString()}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.sectionValue}>-</Text>
        )}

        <View style={styles.divider} />

        {/* Payment Summary */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>Rp {(order.subtotal ?? order.totalAmount)?.toLocaleString()}</Text>
        </View>

        {order.discountAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: '#2E7D32' }]}>
              Diskon{order.promoApplied?.title ? ` (${order.promoApplied.title})` : ''}
            </Text>
            <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>
              - Rp {order.discountAmount.toLocaleString()}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total Bayar</Text>
          <Text style={styles.totalValue}>Rp {order.totalAmount?.toLocaleString()}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.PRIMARY },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderId: {
    fontWeight: '700',
    fontSize: 19,
    color: '#23272f',
    letterSpacing: 0.2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 11.5,
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    color: '#8a8f99',
    fontSize: 14,
  },
  metaValue: {
    color: '#23272f',
    fontSize: 14,
    fontWeight: '500',
  },

  divider: {
    height: 1,
    backgroundColor: '#EFEFEF',
    marginVertical: 16,
  },

  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  sellerIconFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerName: {
    fontWeight: '600',
    fontSize: 15,
    color: '#23272f',
  },

  sectionTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: '#23272f',
    marginBottom: 4,
  },
  sectionValue: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  itemName: {
    fontWeight: '500',
    fontSize: 14.5,
    color: '#23272f',
  },
  itemQty: {
    color: '#9AA0AC',
    fontSize: 12.5,
    marginTop: 1,
  },
  itemSlotText: {
  color: '#8a8f99',
  fontSize: 11.5,
  marginTop: 1,
},
  itemPrice: {
    color: '#23272f',
    fontSize: 14.5,
    fontWeight: '600',
    marginLeft: 10,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#666',
    fontSize: 14,
  },
  summaryValue: {
    color: '#23272f',
    fontSize: 14,
    fontWeight: '500',
  },
  totalLabel: {
    fontWeight: '700',
    fontSize: 16,
    color: '#23272f',
  },
  totalValue: {
    fontWeight: '700',
    fontSize: 16,
    color: COLORS.PRIMARY,
  },
});

export default RiwayatDetail;