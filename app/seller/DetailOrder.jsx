import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import config from '../constants/config';
import COLORS from '../constants/color';
import { MaterialIcons } from "@expo/vector-icons";
import { useLanguage } from "../contexts/LanguageContext";

// Status -> warna pill (bg tint + teks), selaras dengan pola di JadwalPengantaran/PelangganDetails
const STATUS_STYLES = {
  pending: { bg: "#FFFDE7", color: "#F9A825" },
  waiting_approval: { bg: "#FFF3E0", color: "#B26A00" },
  processing: { bg: "#F3E5F5", color: "#7B1FA2" },
  delivery: { bg: "#E3F2FD", color: "#1976D2" },
  completed: { bg: "#E8F5E9", color: "#2E7D32" },
  cancelled: { bg: "#FFEBEE", color: "#C62828" },
};

const STATUS_KEY_MAP = {
  "pending": "pending",
  "menunggu persetujuan": "waiting_approval",
  "waiting_approval": "waiting_approval",
  "diproses": "processing",
  "processing": "processing",
  "pengiriman": "delivery",
  "delivery": "delivery",
  "selesai": "completed",
  "completed": "completed",
  "success": "completed",
  "dibatalkan": "cancelled",
  "cancelled": "cancelled",
};

const getStatusStyle = (status) => {
  const key = STATUS_KEY_MAP[(status || "").toLowerCase()] || "pending";
  return STATUS_STYLES[key];
};

const DetailOrder = () => {
  const router = useRouter();
  const { t } = useLanguage();
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

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t("common.back")}>
        <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t("detailOrder.header")}</Text>
      <View style={{ width: 26 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.centerStateText}>{t("detailOrder.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.centerState}>
          <View style={styles.emptyIconBox}>
            <MaterialIcons name="receipt-long" size={44} color="#9AA0A6" />
          </View>
          <Text style={styles.emptyTitle}>{t("detailOrder.notFound")}</Text>
          <Text style={styles.centerStateText}>{t("detailOrder.notFoundDesc")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = getStatusStyle(order.status);

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Order Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.orderId}>#{order.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {order.status || t("detailOrder.waitingPayment")}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t("detailOrder.date")}</Text>
            <Text style={styles.metaValue}>
              {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t("detailOrder.total")}</Text>
            <Text style={styles.metaValue}>
              Rp {order.totalAmount?.toLocaleString()}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.entityRow}>
            {seller && seller.storeIcon ? (
              <Image source={{ uri: seller.storeIcon }} style={styles.entityIcon} />
            ) : (
              <View style={styles.entityIconPlaceholder}>
                <MaterialIcons name="store" size={18} color={COLORS.PRIMARY} />
              </View>
            )}
            <Text style={styles.entityName}>{seller?.outletName || "-"}</Text>
          </View>

          {buyer && (
            <View style={styles.entityRow}>
              <View style={styles.entityIconPlaceholder}>
                <MaterialIcons name="person" size={18} color={COLORS.PRIMARY} />
              </View>
              <Text style={styles.entityName}>{buyer.name || "-"}</Text>
            </View>
          )}
        </View>

        {/* Delivery Address & Notes */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="location-on" size={18} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>{t("detailOrder.deliveryAddress")}</Text>
          </View>
          <Text style={styles.sectionValue}>{order.deliveryAddress || "-"}</Text>
          <View style={styles.divider} />
          <View style={styles.sectionHeader}>
            <MaterialIcons name="sticky-note-2" size={18} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>{t("detailOrder.notes")}</Text>
          </View>
          <Text style={[styles.sectionValue, { marginBottom: 0 }]}>{order.notes || "-"}</Text>
        </View>

        {/* Items List */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="shopping-bag" size={18} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>{t("detailOrder.items")}</Text>
          </View>
          {order.items && order.items.length > 0 ? (
            order.items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>{t("detailOrder.qty")} {item.qty}</Text>
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
        <View style={[styles.card, styles.footerCard]}>
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>{t("detailOrder.subtotal")}</Text>
            <Text style={styles.footerValue}>
              Rp {order.totalAmount?.toLocaleString()}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.footerRow}>
            <Text style={styles.footerTotalLabel}>{t("detailOrder.totalPayment")}</Text>
            <Text style={styles.footerTotalValue}>
              Rp {order.totalAmount?.toLocaleString()}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
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

  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  centerStateText: {
    marginTop: 12,
    fontSize: 13.5,
    color: '#888',
    textAlign: 'center',
  },
  emptyIconBox: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F5F6FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 6,
  },

  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  orderId: {
    fontWeight: "700",
    fontSize: 17,
    color: "#23272f",
    letterSpacing: 0.2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  statusText: {
    fontWeight: "700",
    fontSize: 11.5,
    textTransform: "capitalize",
    letterSpacing: 0.1,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metaLabel: {
    color: "#8a8f99",
    fontSize: 13.5,
  },
  metaValue: {
    color: "#23272f",
    fontSize: 13.5,
    fontWeight: "600",
  },
  entityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  entityIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#eee",
  },
  entityIconPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#F7EAEF",
    justifyContent: "center",
    alignItems: "center",
  },
  entityName: {
    fontWeight: "600",
    fontSize: 14,
    color: "#23272f",
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: "#23272f",
  },
  sectionValue: {
    color: "#777",
    fontSize: 13.5,
    marginBottom: 8,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemName: {
    fontWeight: "600",
    fontSize: 14,
    color: "#23272f",
  },
  itemQty: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  itemPrice: {
    color: "#23272f",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 10,
  },
  footerCard: {
    marginBottom: 24,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  footerLabel: {
    fontWeight: "600",
    color: "#23272f",
    fontSize: 13.5,
  },
  footerValue: {
    color: "#23272f",
    fontSize: 13.5,
  },
  footerTotalLabel: {
    fontWeight: "700",
    color: COLORS.PRIMARY,
    fontSize: 15.5,
  },
  footerTotalValue: {
    fontWeight: "700",
    color: COLORS.PRIMARY,
    fontSize: 15.5,
  },
});

export default DetailOrder;