import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import axios from "axios";
import config from '../constants/config';
import COLORS from '../constants/color';
import { MaterialIcons } from "@expo/vector-icons";
import HeaderTitleBack from '../../components/HeaderTitleBack';

const DetailOrder = () => {
  const { orderId } = useLocalSearchParams(); // Only use orderId
  console.log('[DEBUG][DetailOrder] Received orderId:', orderId);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buyer, setBuyer] = useState(null);
  const [seller, setSeller] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        // Fetch order detail from API
        let orderRes = null;
        if (orderId) {
          console.log('[DEBUG][DetailOrder] Fetching order with orderId:', orderId);
          orderRes = await axios.get(
            `${config.API_URL}/seller/orders/${orderId}`
          );
        }
        if (orderRes && orderRes.data && orderRes.data.order) {
          setOrder(orderRes.data.order);
          // Fetch seller info if sellerId exists
          if (orderRes.data.order.sellerId) {
            try {
              const sellerRes = await axios.get(
                `${config.API_URL}/seller/detail/${orderRes.data.order.sellerId}`
              );
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
          }
          // Fetch buyer info
          if (orderRes.data.order.buyerId) {
            try {
              const res = await axios.get(
                `${config.API_URL}/buyer/profile/${orderRes.data.order.buyerId}`
              );
              setBuyer(res.data || null);
            } catch {
              setBuyer(null);
            }
          }
        } else {
          setOrder(null);
          setSeller(null);
          setBuyer(null);
        }
      } catch (e) {
        setOrder(null);
        setSeller(null);
        setBuyer(null);
      } finally {
        setLoading(false);
      }
    };
    if (orderId) fetchOrder();
  }, [orderId]);

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "pending":
        return "#BDBDBD";
      case "menunggu persetujuan":
      case "waiting_approval":
        return "#FFC107";
      case "diproses":
      case "processing":
        return "#9C27B0";
      case "pengiriman":
      case "delivery":
        return "#2196F3";
      case "selesai":
      case "completed":
      case "success":
        return "#4CAF50";
      case "dibatalkan":
      case "cancelled":
        return "#F44336";
      default:
        return "#BDBDBD";
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f6f7fb",
        }}
      >
        <Text style={{ color: "#aaa", fontSize: 16 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f6f7fb",
        }}
      >
        <Text style={{ color: "#aaa", fontSize: 16 }}>
          Order detail tidak ditemukan.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7fb" }}>
      <HeaderTitleBack title="Detail Order" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Order Summary Card */}
        <View style={[styles.card, { paddingBottom: 10 }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.orderId}>#{order.id}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(order.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {order.status || "Menunggu Pembayaran"}
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text style={styles.metaLabel}>Tanggal</Text>
            <Text style={styles.metaValue}>
              {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text style={styles.metaLabel}>Total</Text>
            <Text style={styles.metaValue}>
              Rp {order.totalAmount?.toLocaleString()}
            </Text>
          </View>
          <View style={styles.divider} />
          <View
            style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
          >
            {seller && seller.storeIcon ? (
              <Image
                source={{ uri: seller.storeIcon }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  marginRight: 8,
                  backgroundColor: "#eee",
                }}
              />
            ) : (
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  marginRight: 8,
                  backgroundColor: "#eee",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MaterialIcons name="store" size={20} color="#bbb" />
              </View>
            )}
            <Text
              style={{
                fontWeight: "600",
                fontSize: 15,
                color: "#23272f",
              }}
            >
              {seller?.outletName || "-"}
            </Text>
          </View>
          {buyer && (
            <View
              style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
            >
              <MaterialIcons
                name="person"
                size={20}
                color="#bbb"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontWeight: "500",
                  fontSize: 15,
                  color: "#23272f",
                }}
              >
                {buyer.name || "-"}
              </Text>
            </View>
          )}
        </View>
        {/* Delivery Address & Notes */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Alamat Pengantaran</Text>
          <Text style={styles.sectionValue}>{order.deliveryAddress || "-"}</Text>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Catatan</Text>
          <Text style={styles.sectionValue}>{order.notes || "-"}</Text>
        </View>
        {/* Items List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Item Pesanan</Text>
          {order.items && order.items.length > 0 ? (
            order.items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>Qty: {item.qty}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  Rp {item.price?.toLocaleString()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.sectionValue}>-</Text>
          )}
        </View>
        {/* Order Summary Footer */}
        <View
          style={[
            styles.sectionCard,
            {
              marginBottom: 24,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#e0e0e0",
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <Text style={{ fontWeight: "600", color: "#23272f" }}>Subtotal</Text>
            <Text style={{ color: "#23272f" }}>
              Rp {order.totalAmount?.toLocaleString()}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <Text style={{ fontWeight: "600", color: "#23272f" }}>Ongkir</Text>
            <Text style={{ color: "#23272f" }}>
              Rp{" "}
              {order.deliveryFee ? order.deliveryFee.toLocaleString() : "0"}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text
              style={{
                fontWeight: "700",
                color: "#388e3c",
                fontSize: 16,
              }}
            >
              Total Bayar
            </Text>
            <Text
              style={{
                fontWeight: "700",
                color: "#388e3c",
                fontSize: 16,
              }}
            >
              Rp{" "}
              {(order.totalAmount + (order.deliveryFee || 0)).toLocaleString()}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 18,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  orderId: {
    fontWeight: "700",
    fontSize: 18,
    color: "#23272f",
    flex: 1,
    letterSpacing: 0.2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 7,
    alignSelf: "flex-start",
  },
  statusText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    textTransform: "capitalize",
    letterSpacing: 0.1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 2,
  },
  metaLabel: {
    color: "#8a8f99",
    fontSize: 14,
    fontWeight: "400",
    marginRight: 6,
  },
  metaValue: {
    color: "#23272f",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 15,
    color: "#23272f",
    marginBottom: 2,
  },
  sectionValue: {
    color: "#555",
    fontSize: 14,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 10,
    borderRadius: 1,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemName: {
    fontWeight: "500",
    fontSize: 15,
    color: "#23272f",
  },
  itemQty: {
    color: "#888",
    fontSize: 13,
  },
  itemPrice: {
    color: "#23272f",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 10,
  },
});

export default DetailOrder;
