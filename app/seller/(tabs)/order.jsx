import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback
} from "react-native";
import HeaderTitle from '../../../components/HeaderTitle';
import COLORS from '../../constants/color';
import { useRouter, useLocalSearchParams } from "expo-router";
import config from '../../constants/config';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useLanguage } from '../../contexts/LanguageContext';

// FILTER PERIODE CONFIGURATION
const PERIOD_OPTIONS = [
  { key: '1hari', label: '1 Hari', days: 1 },
  { key: '7hari', label: '7 Hari', days: 7 },
  { key: '30hari', label: '30 Hari', days: 30 },
  { key: 'semua', label: 'Semua', days: null },
];
const DEFAULT_PERIOD = '30hari'; // Default riwayat 30 hari agar tidak berat

const matchesPeriod = (dateStr, periodKey) => {
  const option = PERIOD_OPTIONS.find((p) => p.key === periodKey);
  if (!option || option.days === null) return true; // "Semua" = true
  if (!dateStr) return false;
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return false;
  return ts >= Date.now() - option.days * 24 * 60 * 60 * 1000;
};

// ---------------------------------------------------------------------------
// Status -> badge config (label, color, icon) shown on each order card
// ---------------------------------------------------------------------------
const getStatusBadgeConfig = (t) => ({
  awaiting_seller_approval: { label: t('pesanan.status.awaitingApproval'), color: "#B26A00", bg: "#FFF3E0", icon: "hourglass-empty" },
  approved_awaiting_payment: { label: t('pesanan.status.awaitingPayment'), color: "#1976D2", bg: "#E3F2FD", icon: "schedule" },
  processing: { label: t('pesanan.status.processing'), color: "#B26A00", bg: "#FFF3E0", icon: "autorenew" },
  delivery: { label: t('pesanan.status.delivery'), color: "#2E7D32", bg: "#E8F5E9", icon: "local-shipping" },
  recurring: { label: t('pesanan.status.recurring'), color: "#2E7D32", bg: "#E8F5E9", icon: "autorenew" },
  completed: { label: t('pesanan.status.completed'), color: "#2E7D32", bg: "#E8F5E9", icon: "check-circle" },
  cancelled: { label: t('pesanan.status.cancelled'), color: "#C62828", bg: "#FFEBEE", icon: "close" },
});

// Filter tabs shown under the header
const FILTERS = [
  { key: "semua", labelKey: 'pesanan.filters.all' },
  { key: "diproses", labelKey: 'pesanan.filters.processing' },
  { key: "pembayaran", labelKey: 'pesanan.filters.payment' },
  { key: "selesai", labelKey: 'pesanan.filters.completed' },
];

// Maps a raw statusProgress value to the filter bucket it belongs to
const matchesFilter = (statusProgress, filterKey) => {
  if (filterKey === "semua") return true;
  if (filterKey === "pembayaran") return statusProgress === "approved_awaiting_payment";
  if (filterKey === "selesai") return statusProgress === "completed" || statusProgress === "cancelled";
  if (filterKey === "diproses") {
    return (
      statusProgress === "awaiting_seller_approval" ||
      statusProgress === "processing" ||
      statusProgress === "delivery" ||
      statusProgress === "recurring"
    );
  }
  return true;
};

// Helper: can a Rantangan order start today
const canStartToday = (startDate) => {
  if (!startDate) return true;
  const start = new Date(startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return today >= start;
};

const isTodayDeliveryCompleted = (dailyDeliveryLogs = []) => {
  const today = new Date().toISOString().split('T')[0];
  return dailyDeliveryLogs.some((log) => log.deliveryDate === today);
};

// Days remaining in a Rantangan Mingguan/Bulanan cycle
const calculateDaysRemaining = (startDate, endDate, dailyDeliveryLogs = []) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  today.setHours(0, 0, 0, 0);

  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const completedDays = dailyDeliveryLogs ? dailyDeliveryLogs.length : 0;

  if (today < start) return totalDays;
  return Math.max(0, totalDays - completedDays);
};

// ---------------------------------------------------------------------------
// Status badge pill
// ---------------------------------------------------------------------------
const StatusBadge = ({ statusProgress }) => {
  const { t } = useLanguage();
  const STATUS_BADGE = getStatusBadgeConfig(t);
  const cfg = STATUS_BADGE[statusProgress] || STATUS_BADGE.awaiting_seller_approval;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <MaterialIcons name={cfg.icon} size={14} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Rantangan info
// ---------------------------------------------------------------------------
const RantanganInfo = ({ startDate, endDate, packageType, dailyDeliveryLogs = [] }) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  if (!startDate || !endDate) return null;

  const isRecurring = packageType === 'Mingguan' || packageType === 'Bulanan';
  const orderCanStart = canStartToday(startDate);
  const daysRemaining = calculateDaysRemaining(startDate, endDate, dailyDeliveryLogs);

  const fmt = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={styles.rantanganBox}>
      <View style={styles.rantanganDates}>
        <View style={styles.rantanganDateItem}>
          <MaterialIcons name="calendar-today" size={13} color={COLORS.PRIMARY} />
          <Text style={styles.rantanganDateText}>{fmt(startDate)}</Text>
        </View>
        <MaterialIcons name="arrow-forward" size={13} color="#aaa" />
        <View style={styles.rantanganDateItem}>
          <MaterialIcons name="event" size={13} color="#666" />
          <Text style={styles.rantanganDateText}>{fmt(endDate)}</Text>
        </View>
      </View>

      {isRecurring && (
        <View style={[styles.remainingPill, !orderCanStart && styles.remainingPillPending]}>
          <MaterialIcons name="schedule" size={13} color={!orderCanStart ? "#B26A00" : COLORS.PRIMARY} />
          <Text style={[styles.remainingPillText, !orderCanStart && { color: "#B26A00" }]}>
            {!orderCanStart
              ? t('pesanan.startsInDays').replace('{{count}}', String(Math.ceil((new Date(startDate) - new Date()) / (1000 * 60 * 60 * 24))))
              : t('pesanan.remainingDays').replace('{{count}}', String(daysRemaining))}
          </Text>
        </View>
      )}

      {isRecurring && dailyDeliveryLogs.length > 0 && (
        <TouchableOpacity style={styles.logsToggle} onPress={() => setExpanded((v) => !v)}>
          <MaterialIcons name="history" size={13} color={COLORS.PRIMARY} />
          <Text style={styles.logsToggleText}>
            {t('pesanan.deliveryHistory').replace('{{count}}', String(dailyDeliveryLogs.length))}
          </Text>
          <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={16} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      )}

      {expanded && dailyDeliveryLogs.map((log, idx) => (
        <View key={idx} style={styles.logRow}>
          <Text style={styles.logDate}>{fmt(log.deliveryDate)}</Text>
          <Text style={styles.logTime}>
            {new Date(log.deliveryTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            {log.completedTime
              ? ` – ${new Date(log.completedTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </Text>
        </View>
      ))}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Order card
// ---------------------------------------------------------------------------

const CateringEventInfo = ({ eventDateTime }) => {
  if (!eventDateTime) return null;
  const date = new Date(eventDateTime);
  const fmtDate = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtTime = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.rantanganBox}>
      <View style={styles.rantanganDateItem}>
        <MaterialIcons name="event" size={13} color={COLORS.PRIMARY} />
        <Text style={styles.rantanganDateText}>Antar: {fmtDate}, {fmtTime}</Text>
      </View>
    </View>
  );
};

const CardStatus = ({
  date,
  total,
  buyerName,
  buyerIcon,
  statusProgress,
  onPressDetail,
  onPressChat,
  onAccept,
  onCancel,
  onSendOrder,
  onCompleteOrder,
  orderType,
  packageType,
  startDate,
  endDate,
  eventDateTime,
  dailyDeliveryLogs = [],
}) => {
  const { t } = useLanguage();
  const [actionLoading, setActionLoading] = useState(false);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      await action();
    } finally {
      setActionLoading(false);
    }
  };

  const isRantangan = orderType === 'Rantangan' || (orderType && orderType.includes('Rantangan'));
  const isCatering = orderType === 'Catering' || (orderType && orderType.includes('Catering'));
  const isBiteEco = orderType === 'Bite Eco';
  const isRecurring = packageType === 'Mingguan' || packageType === 'Bulanan';
  const orderCanStart = canStartToday(startDate);

  const showAcceptReject = statusProgress === "awaiting_seller_approval";

  const renderProgressAction = () => {
    if (statusProgress === "processing") {
      const disabled = actionLoading || (isRantangan && !orderCanStart);
      const label = isRantangan && !orderCanStart
        ? t('pesanan.startsInDays').replace('{{count}}', String(Math.ceil((new Date(startDate) - new Date()) / (1000 * 60 * 60 * 24))))
        : actionLoading ? t('pesanan.actions.pleaseWait') : t('pesanan.actions.sendOrder');
      return (
        <TouchableOpacity
          style={[styles.progressBtn, disabled && styles.btnDisabled]}
          onPress={() => !disabled && handleAction(onSendOrder)}
          disabled={disabled}
        >
          <Text style={styles.progressBtnText}>{label}</Text>
        </TouchableOpacity>
      );
    }
    if (statusProgress === "delivery") {
      const todayDone = isRantangan && isRecurring && isTodayDeliveryCompleted(dailyDeliveryLogs);
      const disabled = actionLoading || todayDone;
      const label = todayDone
        ? t('pesanan.actions.completedToday')
        : actionLoading ? t('pesanan.actions.pleaseWait') : isBiteEco ? t('pesanan.actions.completeOrderBiteEco') : t('pesanan.actions.completeOrder');
      return (
        <TouchableOpacity
          style={[styles.progressBtn, disabled && styles.btnDisabled]}
          onPress={() => !disabled && handleAction(onCompleteOrder)}
          disabled={disabled}
        >
          <Text style={styles.progressBtnText}>{label}</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <View style={styles.cardShadow}>
      <View style={styles.card}>
        <View style={styles.row}>
          {buyerIcon ? (
            <Image source={{ uri: buyerIcon }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <MaterialIcons name="person" size={22} color="#fff" />
            </View>
          )}

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name} numberOfLines={1}>{buyerName}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {date && !isNaN(new Date(date))
                ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : t('pesanan.dateNotAvailable')}
              {orderType ? ` · ${orderType}${packageType ? ` ${packageType}` : ''}` : ''}
            </Text>
          </View>

          <Text style={styles.price}>{total}</Text>
        </View>

        <View style={styles.badgeRow}>
          <StatusBadge statusProgress={statusProgress} />
        </View>

        {isRantangan && (
          <RantanganInfo
            startDate={startDate}
            endDate={endDate}
            packageType={packageType}
            dailyDeliveryLogs={dailyDeliveryLogs}
          />
        )}

      {isCatering && <CateringEventInfo eventDateTime={eventDateTime} />}

        <View style={styles.actionRow}>
          {showAcceptReject ? (
            <>
              <TouchableOpacity
                style={[styles.acceptBtn, actionLoading && styles.btnDisabled]}
                onPress={() => handleAction(onAccept)}
                disabled={actionLoading}
              >
                <Text style={styles.acceptBtnText}>
                  {actionLoading ? t('pesanan.actions.pleaseWait') : t('pesanan.actions.accept')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectBtn, actionLoading && styles.btnDisabled]}
                onPress={() => handleAction(onCancel)}
                disabled={actionLoading}
              >
                <Text style={styles.rejectBtnText}>
                  {actionLoading ? t('pesanan.actions.pleaseWait') : t('pesanan.actions.reject')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            renderProgressAction()
          )}

          <TouchableOpacity style={styles.iconBtn} onPress={onPressDetail} accessibilityLabel={t('pesanan.accessibility.orderDetail')}>
            <MaterialIcons name="info-outline" size={18} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onPressChat} accessibilityLabel={t('pesanan.accessibility.chatBuyer')}>
            <Ionicons name="chatbubble-outline" size={17} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
const SellerOrder = () => {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buyerMap, setBuyerMap] = useState({});
  const [sellerProfile, setSellerProfile] = useState(null);
  
  // State untuk tab filter
  const { filter: filterParam } = useLocalSearchParams();
  const [activeFilter, setActiveFilter] = useState(filterParam || "semua");

  const [activePeriod, setActivePeriod] = useState(DEFAULT_PERIOD);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [tempPeriod, setTempPeriod] = useState(DEFAULT_PERIOD);



  const router = useRouter();

  useEffect(() => {
    const fetchSellerProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("sellerToken");
        if (!token) return;
        const response = await axios.get(`${config.API_URL}/seller/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSellerProfile({
          name: response.data.name,
          id: response.data.id || response.data.sellerId || response.data._id || null,
        });
      } catch (e) {
        setSellerProfile(null);
      }
    };
    fetchSellerProfile();
  }, []);

  const fetchOrdersAndBuyers = useCallback(async () => {
    if (!refreshing) setLoading(true);
    try {
      const token = await AsyncStorage.getItem("sellerToken");
      const res = await fetch(
        `${config.API_URL}/seller/orders`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      const data = await res.json();
      const ordersFetched = data.orders || [];
      setOrders(ordersFetched);

      const uniqueBuyerIds = [...new Set(ordersFetched.map((o) => o.buyerId).filter(Boolean))];
      const initialBuyerMap = {};
      uniqueBuyerIds.forEach((buyerId) => {
        initialBuyerMap[buyerId] = { buyerName: "...", buyerIcon: undefined };
      });
      setBuyerMap(initialBuyerMap);

    uniqueBuyerIds.forEach(async (buyerId) => {
      try {
        const buyerRes = await fetch(`${config.API_URL}/buyer/profile/${buyerId}`);
        const buyerData = await buyerRes.json();
        if (buyerData && buyerData.name) {
          setBuyerMap((prev) => ({
            ...prev,
            [buyerId]: { buyerName: buyerData.name, buyerIcon: undefined },
          }));
        } else {
          setBuyerMap((prev) => ({
            ...prev,
            [buyerId]: { buyerName: t('pesanan.buyerFallback', 'Pembeli'), buyerIcon: undefined },
          }));
        }
      } catch {
        setBuyerMap((prev) => ({
          ...prev,
          [buyerId]: { buyerName: t('pesanan.buyerFallback', 'Pembeli'), buyerIcon: undefined },
        }));
      }
    });
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchOrdersAndBuyers();
  }, [fetchOrdersAndBuyers]);

  const handleOpenChatRoom = (params) => {
    router.push({ pathname: "/seller/ChatRoom", params });
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = await AsyncStorage.getItem("sellerToken");
      await fetch(`${config.API_URL}/seller/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statusProgress: newStatus }),
      });
      fetchOrdersAndBuyers();
    } catch (e) {}
  };

  const approveOrder = async (orderId) => {
    try {
      const token = await AsyncStorage.getItem("sellerToken");
      await axios.post(
        `${config.API_URL}/seller/orders/approve`,
        { orderId, action: 'approve' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchOrdersAndBuyers();
    } catch (e) {}
  };

  const completeDailyDelivery = async (orderId) => {
    try {
      const token = await AsyncStorage.getItem("sellerToken");
      const response = await fetch(`${config.API_URL}/seller/orders/${orderId}/complete-daily-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          deliveryDate: new Date().toISOString().split('T')[0],
          deliveryTime: new Date().toISOString(),
        }),
      });
      if (response.ok) fetchOrdersAndBuyers();
    } catch (e) {}
  };

  const resolveStatus = (order) => order.statusProgress || order.status;

// Filter gabungan: Tab Filter + Period Filter (Berlaku untuk semua tab)
  const visibleOrders = orders.filter((order) => {
    // 1. Cek kecocokan Tab (Semua, Diproses, dsb)
    const matchesTab = matchesFilter(resolveStatus(order), activeFilter);
    if (!matchesTab) return false;

    // 2. Cek kecocokan rentang hari (selalu dicek)
    const dateToCheck = order.completedAt || order.createdAt || order.orderDate;
    return matchesPeriod(dateToCheck, activePeriod);
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F6FA" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('pesanan.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('pesanan.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

    {/* FILTER SECTION */}
      <View style={styles.filtersContainer}>
        {/* Full-width scrollable chips di sebelah kiri */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }} // Agar ScrollView mengambil sisa ruang kiri
          contentContainerStyle={styles.filterScrollContent}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {t(f.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tombol Periode */}
        <View style={styles.iconFilterWrapper}>
          <TouchableOpacity
            // Jika filter bukan "semua", tombol berubah warna jadi PRIMARY menandakan filter sedang aktif
            style={[styles.iconFilterBtn, activePeriod !== 'semua' && styles.iconFilterBtnActive]}
            onPress={() => {
              setTempPeriod(activePeriod);
              setShowPeriodModal(true);
            }}
          >
            <MaterialIcons 
              name="tune" 
              size={20} 
              color={activePeriod !== 'semua' ? "#fff" : COLORS.PRIMARY} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingVertical: 4, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchOrdersAndBuyers();
              }}
              colors={[COLORS.PRIMARY]}
            />
          }
        >
          {visibleOrders.length === 0 ? (
            <Text style={{ textAlign: "center", color: "#aaa", marginTop: 40 }}>
              {t('pesanan.emptyState')}
            </Text>
          ) : (
            visibleOrders.map((order) => (
              <CardStatus
                key={order.id}
                date={order.createdAt || order.orderDate}
                total={`Rp ${order.totalAmount?.toLocaleString('id-ID')}`}
                buyerName={buyerMap[order.buyerId]?.buyerName || "-"}
                buyerIcon={buyerMap[order.buyerId]?.buyerIcon}
                statusProgress={resolveStatus(order)}
                onPressDetail={() =>
                  router.push({ pathname: "/seller/DetailOrder", params: { orderId: order.id } })
                }
                onPressChat={() =>
                  handleOpenChatRoom({
                    chatroomId: `${order.buyerId}_${order.sellerId}`,
                    buyerId: order.buyerId,
                    sellerId: order.sellerId,
                    buyerName: buyerMap[order.buyerId]?.buyerName || "Buyer",
                    sellerName: sellerProfile?.name || "Penjual",
                    orderId: order.id,
                  })
                }
                onAccept={() => approveOrder(order.id)}
                onCancel={() => updateOrderStatus(order.id, "cancelled")}
                onSendOrder={() => updateOrderStatus(order.id, "delivery")}
                onCompleteOrder={() => {
                  if (
                    (order.orderType === 'Rantangan' || order.orderType?.includes('Rantangan')) &&
                    (order.packageType === 'Mingguan' || order.packageType === 'Bulanan')
                  ) {
                    completeDailyDelivery(order.id);
                  } else {
                    updateOrderStatus(order.id, "completed");
                  }
                }}
                orderType={order.orderType}
                packageType={order.packageType}
                startDate={order.startDate}
                endDate={order.endDate}
                eventDateTime={order.eventDateTime}
                dailyDeliveryLogs={order.dailyDeliveryLogs || []}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* MODAL FILTER PERIODE */}
      <Modal
        visible={showPeriodModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPeriodModal(false)}>
          <View style={styles.sheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheetCard}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Filter Periode</Text>

                {PERIOD_OPTIONS.map((p) => {
                  const isSelected = tempPeriod === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={styles.sheetOption}
                      onPress={() => setTempPeriod(p.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.sheetOptionLabel}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.sheetApplyBtn}
                  onPress={() => {
                    setActivePeriod(tempPeriod);
                    setShowPeriodModal(false);
                  }}
                >
                  <Text style={styles.sheetApplyBtnText}>Terapkan</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default SellerOrder;

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.PRIMARY },

  // Filter Section
  filtersContainer: {
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 12,
  },
  filterScrollContent: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 16,
    paddingRight: 8, 
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  filterChipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  filterChipText: { fontSize: 13, color: "#888", fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },

  // Period Trigger Btn (under chips)
  periodContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 10,
  },
  periodTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  periodTriggerText: { 
    fontSize: 12.5, 
    color: COLORS.PRIMARY, 
    fontWeight: "600" 
  },

  // Modal / Bottom Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e0e0e0",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#23272f",
    marginBottom: 12,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#d9c3cc",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: { borderColor: COLORS.PRIMARY },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.PRIMARY,
  },
  sheetOptionLabel: { fontSize: 14.5, color: "#23272f", fontWeight: "500" },
  sheetApplyBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 18,
  },
  sheetApplyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14.5 },
  
  iconFilterWrapper: {
    marginLeft: 12, 
    paddingRight: 16, 
  },
  iconFilterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18, 
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    justifyContent: "center",
    alignItems: "center",
  },
  iconFilterBtnActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },

  // Card
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
    marginHorizontal: 16, // Mengikuti margin horizontal default
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
  },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    backgroundColor: "#D9C2C9",
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontSize: 14, fontWeight: "700", color: "#23272f" },
  subtitle: { fontSize: 12, color: "#8a8f99", marginTop: 2 },
  price: { fontSize: 14, fontWeight: "700", color: "#23272f", marginLeft: 8 },

  badgeRow: { marginTop: 10 },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  }, 
  acceptBtn: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: COLORS.PRIMARY,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  rejectBtnText: { color: COLORS.PRIMARY, fontWeight: "700", fontSize: 14 },
  progressBtn: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  progressBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    justifyContent: "center",
    alignItems: "center",
  },

  // Rantangan info block
  rantanganBox: {
    backgroundColor: "#F7F5F1",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  rantanganDates: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rantanganDateItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  rantanganDateText: { fontSize: 11.5, color: "#555", fontWeight: "500" },
  remainingPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EDE3E7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  remainingPillPending: { backgroundColor: "#FFF3E0" },
  remainingPillText: { fontSize: 11.5, fontWeight: "600", color: COLORS.PRIMARY },
  logsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  logsToggleText: { fontSize: 11.5, color: COLORS.PRIMARY, fontWeight: "600", flex: 1 },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#EAEAEA",
    marginTop: 4,
  },
  logDate: { fontSize: 11, color: "#2E7D32", fontWeight: "600" },
  logTime: { fontSize: 11, color: "#888" },
});