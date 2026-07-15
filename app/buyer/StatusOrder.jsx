import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import COLORS from '../constants/color';
import { useRouter } from "expo-router";
import config from '../constants/config';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import axios from 'axios';
import { OrderCardSkeleton } from '../../components/SkeletonLoader';
import { useToast } from '../../components/ToastProvider';
import TrackingMap from '../../components/TrackingMap';

const { width, height } = Dimensions.get('window');

// Helper function to safely format dates
const formatDate = (dateValue, options = {}) => {
  if (!dateValue) return 'Tanggal tidak tersedia';

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'Tanggal tidak valid';
    }

    const defaultOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };

    return date.toLocaleDateString('id-ID', { ...defaultOptions, ...options });
  } catch (error) {
    console.warn('Date formatting error:', error, 'for value:', dateValue);
    return 'Tanggal tidak valid';
  }
};

// Helper function to safely format time
const formatTime = (dateValue, options = {}) => {
  if (!dateValue) return 'Waktu tidak tersedia';

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'Waktu tidak valid';
    }

    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit'
    };

    return date.toLocaleTimeString('id-ID', { ...defaultOptions, ...options });
  } catch (error) {
    console.warn('Time formatting error:', error, 'for value:', dateValue);
    return 'Waktu tidak valid';
  }
};

const STATUS_LABELS = {
  waiting_approval: "Menunggu Persetujuan",
  processing: "Dalam Proses",
  delivery: "Pengiriman",
  recurring: "Siklus Pengiriman Aktif",
  completed: "Pesanan Selesai",
  cancelled: "Pesanan Dibatalkan",
};

// Badge status pill config (warna & icon) — selaras dengan palet di halaman Pesanan penjual
const STATUS_BADGE = {
  waiting_approval: { color: "#B26A00", bg: "#FFF3E0", icon: "hourglass-empty" },
  processing: { color: "#B26A00", bg: "#FFF3E0", icon: "autorenew" },
  delivery: { color: "#2E7D32", bg: "#E8F5E9", icon: "local-shipping" },
  recurring: { color: "#2E7D32", bg: "#E8F5E9", icon: "autorenew" },
  completed: { color: "#2E7D32", bg: "#E8F5E9", icon: "check-circle" },
  cancelled: { color: "#C62828", bg: "#FFEBEE", icon: "close" },
};

// Filter tabs di bawah header — selaras dengan halaman Pesanan penjual
const FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "diproses", label: "Diproses" },
  { key: "pengiriman", label: "Pengiriman" },
  { key: "selesai", label: "Selesai" },
];

const matchesFilter = (statusProgress, filterKey) => {
  if (filterKey === "semua") return true;
  if (filterKey === "diproses") return statusProgress === "waiting_approval" || statusProgress === "processing";
  if (filterKey === "pengiriman") return statusProgress === "delivery" || statusProgress === "recurring";
  if (filterKey === "selesai") return statusProgress === "completed" || statusProgress === "cancelled";
  return true;
};

// Status badge pill — dipakai di atas kartu, selaras dengan StatusBadge di halaman penjual
const StatusBadge = ({ statusProgress }) => {
  const cfg = STATUS_BADGE[statusProgress] || STATUS_BADGE.waiting_approval;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <MaterialIcons name={cfg.icon} size={14} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>
        {STATUS_LABELS[statusProgress] || "-"}
      </Text>
    </View>
  );
};

// Default status steps for regular orders
const STATUS_STEPS = [
  {
    key: "waiting_approval",
    label: "Menunggu Persetujuan",
    icon: "hourglass-empty",
    color: COLORS.BLUE2,
  },
  {
    key: "processing",
    label: "Dalam Proses",
    icon: "autorenew",
    color: COLORS.ORANGE || "#FFA726",
  },
  {
    key: "delivery",
    label: "Pengiriman",
    icon: "local-shipping",
    color: COLORS.GREEN4,
  },
  {
    key: "completed",
    label: "Pesanan Selesai",
    icon: "check-circle",
    color: COLORS.GREEN3,
  },
];

// Rantangan Harian status steps
const RANTANGAN_HARIAN_STEPS = [
  {
    key: "waiting_approval",
    label: "Terima atau Tolak",
    icon: "hourglass-empty",
    color: COLORS.BLUE2,
  },
  {
    key: "processing",
    label: "Kirim Pesanan",
    icon: "local-shipping",
    color: COLORS.ORANGE || "#FFA726",
  },
  {
    key: "delivery",
    label: "Lacak Pesanan",
    icon: "location-on",
    color: COLORS.GREEN4,
  },
  {
    key: "completed",
    label: "Berikan Ulasan",
    icon: "star",
    color: COLORS.GREEN3,
  },
];

// Rantangan Mingguan/Bulanan status steps (cycles between processing and delivery)
const RANTANGAN_RECURRING_STEPS = [
  {
    key: "waiting_approval",
    label: "Terima atau Tolak",
    icon: "hourglass-empty",
    color: COLORS.BLUE2,
  },
  {
    key: "processing",
    label: "Siapkan Pesanan",
    icon: "restaurant",
    color: COLORS.ORANGE || "#FFA726",
  },
  {
    key: "delivery",
    label: "Lacak Pesanan",
    icon: "location-on",
    color: COLORS.GREEN4,
  },
  {
    key: "completed",
    label: "Semua Selesai",
    icon: "check-circle",
    color: COLORS.GREEN3,
  },
];

// Bite Eco status steps
const BITE_ECO_STEPS = [
  {
    key: "waiting_approval",
    label: "Menunggu Persetujuan",
    icon: "hourglass-empty",
    color: COLORS.BLUE2,
  },
  {
    key: "processing",
    label: "Disiapkan",
    icon: "eco",
    color: COLORS.GREEN4,
  },
  {
    key: "delivery",
    label: "Lacak Pesanan",
    icon: "location-on",
    color: COLORS.GREEN4,
  },
  {
    key: "completed",
    label: "Selesai",
    icon: "check-circle",
    color: COLORS.GREEN3,
  },
];

// Helper function to calculate days remaining for Rantangan orders
const calculateDaysRemaining = (startDate, endDate, dailyDeliveryLogs = []) => {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const completedDays = dailyDeliveryLogs ? dailyDeliveryLogs.length : 0;

  if (today < start) {
    return totalDays;
  }

  const remainingDays = totalDays - completedDays;
  return Math.max(0, remainingDays);
};

// Helper function to check if order can start today
const canStartToday = (startDate) => {
  if (!startDate) return true;
  const start = new Date(startDate);
  const today = new Date();

  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return today >= start;
};

// Helper function to get appropriate status steps based on order type
const getStatusSteps = (orderType, packageType) => {
  if (orderType === 'Bite Eco') {
    return BITE_ECO_STEPS;
  }
  if (orderType === 'Rantangan' || (orderType && orderType.includes('Rantangan'))) {
    if (packageType === 'Harian') {
      return RANTANGAN_HARIAN_STEPS;
    } else if (packageType === 'Mingguan' || packageType === 'Bulanan') {
      return RANTANGAN_RECURRING_STEPS;
    }
  }
  return STATUS_STEPS;
};

function getStepIndex(statusProgress, orderType, packageType, dailyDeliveryLogs = []) {
  const steps = getStatusSteps(orderType, packageType);

  if ((orderType === 'Rantangan' || (orderType && orderType.includes('Rantangan'))) &&
      (packageType === 'Mingguan' || packageType === 'Bulanan')) {
    switch (statusProgress) {
      case "waiting_approval":
        return 0;
      case "processing":
        return 1;
      case "delivery":
        return 2;
      case "completed":
        return 3;
      default:
        return -1;
    }
  }

  switch (statusProgress) {
    case "waiting_approval":
      return 0;
    case "processing":
      return 1;
    case "delivery":
      return 2;
    case "completed":
      return 3;
    default:
      return -1;
  }
}

const StatusStepper = ({ statusProgress, orderType, packageType, startDate, endDate, dailyDeliveryLogs = [] }) => {
  if (statusProgress === "cancelled") {
    return (
      <View style={{ alignItems: "center", marginTop: 14, marginBottom: 4 }}>
        <MaterialIcons
          name="close"
          size={28}
          color="#C62828"
          style={{ backgroundColor: "#fff", borderRadius: 14 }}
        />
        <Text
          style={{
            fontSize: 13,
            color: "#C62828",
            fontWeight: "700",
            marginTop: 4,
          }}
        >
          Dibatalkan
        </Text>
      </View>
    );
  }

  const steps = getStatusSteps(orderType, packageType);
  const activeStep = getStepIndex(statusProgress, orderType, packageType);

  const daysRemaining = (startDate && endDate) ? calculateDaysRemaining(startDate, endDate, dailyDeliveryLogs) : 0;
  const isRantangan = orderType === 'Rantangan' || (orderType && orderType.includes('Rantangan'));
  const isRecurring = packageType === 'Mingguan' || packageType === 'Bulanan';
  const orderCanStart = canStartToday(startDate);

  return (
    <View>
      <View style={styles.stepperContainer}>
        {steps.map((step, idx) => (
          <React.Fragment key={step.key}>
            <View style={styles.stepItem}>
              <MaterialIcons
                name={step.icon}
                size={24}
                color={
                  activeStep > idx
                    ? COLORS.GREEN3
                    : activeStep === idx
                    ? step.color
                    : "#e0e0e0"
                }
                style={{ backgroundColor: "#fff", borderRadius: 14 }}
              />
              <Text
                style={{
                  fontSize: 11,
                  color:
                    activeStep === idx
                      ? step.color
                      : activeStep > idx
                      ? COLORS.GREEN3
                      : "#bdbdbd",
                  fontWeight: activeStep === idx ? "700" : "400",
                  marginTop: 2,
                  textAlign: "center",
                  width: 66,
                }}
                numberOfLines={2}
              >
                {step.label}
              </Text>
            </View>
            {idx < steps.length - 1 && (
              <View
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: activeStep > idx ? COLORS.GREEN3 : "#e0e0e0",
                  alignSelf: "center",
                  marginHorizontal: 2,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Show additional info for Rantangan orders */}
      {isRantangan && startDate && endDate && (
        <View style={styles.rantanganBox}>
          <View style={styles.rantanganDates}>
            <View style={styles.rantanganDateItem}>
              <MaterialIcons name="calendar-today" size={13} color={COLORS.PRIMARY} />
              <Text style={styles.rantanganDateText}>
                Mulai: {new Date(startDate).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.rantanganDateItem}>
              <MaterialIcons name="event" size={13} color="#666" />
              <Text style={styles.rantanganDateText}>
                Selesai: {new Date(endDate).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
          </View>

          {isRecurring && (
            <View style={[
              styles.remainingPill,
              !orderCanStart && styles.remainingPillPending
            ]}>
              <MaterialIcons
                name="schedule"
                size={13}
                color={!orderCanStart ? "#B26A00" : COLORS.PRIMARY}
              />
              <Text style={[
                styles.remainingPillText,
                !orderCanStart && { color: "#B26A00" }
              ]}>
                {!orderCanStart
                  ? `Akan dimulai ${Math.ceil((new Date(startDate) - new Date()) / (1000 * 60 * 60 * 24))} hari lagi`
                  : `Sisa ${daysRemaining} hari lagi`
                }
              </Text>
            </View>
          )}

          {/* Show daily delivery logs for recurring orders */}
          {isRecurring && dailyDeliveryLogs && dailyDeliveryLogs.length > 0 && (
            <View style={styles.deliveryLogsContainer}>
              <View style={styles.deliveryLogsHeader}>
                <MaterialIcons name="history" size={13} color={COLORS.PRIMARY} />
                <Text style={styles.deliveryLogsHeaderText}>
                  Riwayat Pengiriman Harian
                </Text>
              </View>
              {dailyDeliveryLogs.map((log, index) => (
                <View key={index} style={styles.deliveryLogItem}>
                  <View style={styles.deliveryLogDate}>
                    <MaterialIcons name="calendar-today" size={12} color={COLORS.GREEN3} />
                    <Text style={styles.deliveryLogDateText}>
                      {new Date(log.deliveryDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={styles.deliveryLogStatus}>
                    <MaterialIcons name="check-circle" size={12} color={COLORS.GREEN3} />
                    <Text style={styles.deliveryLogStatusText}>
                      Dikirim: {new Date(log.deliveryTime).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    {log.completedTime && (
                      <Text style={styles.deliveryLogStatusText}>
                        Selesai: {new Date(log.completedTime).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Show current delivery status for recurring orders */}
          {isRecurring && orderCanStart && (statusProgress === 'processing' || statusProgress === 'delivery') && (
            <View style={styles.currentDeliveryContainer}>
              <MaterialIcons name="local-shipping" size={14} color="#B26A00" />
              <Text style={styles.currentDeliveryText}>
                {statusProgress === 'processing'
                  ? 'Sedang menyiapkan pesanan hari ini'
                  : 'Pesanan hari ini sedang dikirim'
                }
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// Helper function to render buyer tracking buttons (BUYERS ONLY GET TRACKING BUTTONS)
const renderProgressButtons = (statusProgress, orderType, packageType, onPressTrack, onPressReview, ulasan) => {
  const isRantangan = orderType === 'Rantangan' || (orderType && orderType.includes('Rantangan'));
  const isRecurring = packageType === 'Mingguan' || packageType === 'Bulanan';

  switch (statusProgress) {
    case 'delivery':
      return (
        <TouchableOpacity
          style={[styles.progressBtn, { backgroundColor: COLORS.GREEN4 }]}
          onPress={() => {
            if (onPressTrack) {
              onPressTrack();
            }
          }}
        >
          <MaterialIcons name="location-on" size={16} color="#fff" />
          <Text style={styles.progressBtnText}>
            {isRantangan && isRecurring ? 'Lacak Pengiriman Hari Ini' : 'Lacak Pesanan'}
          </Text>
        </TouchableOpacity>
      );

    case 'completed':
      return !ulasan ? (
        <TouchableOpacity
          style={styles.progressBtn}
          onPress={() => {
            if (onPressReview) {
              onPressReview();
            }
          }}
        >
          <MaterialIcons name="star" size={16} color="#fff" />
          <Text style={styles.progressBtnText}>Berikan Ulasan</Text>
        </TouchableOpacity>
      ) : null;

    default:
      return null;
  }
};

const CardStatus = ({
  date,
  total,
  outletName,
  storeIcon,
  statusProgress,
  onPressDetail,
  items,
  buyerId,
  sellerId,
  onPressChat,
  onPressTrack,
  onPressReview,
  pax,
  orderType,
  orderId,
  ulasan,
  startDate,
  endDate,
  packageType,
  dailyDeliveryLogs,
}) => {
  const handleChatPress = () => {
    const chatParams = {
      chatroomId: `${buyerId}_${sellerId}`,
      buyerId,
      sellerId,
      buyerName: "Buyer",
      sellerName: outletName || "Penjual",
      orderId: orderId
    };
    onPressChat(chatParams);
  };

  const progressButton = renderProgressButtons(statusProgress, orderType, packageType, onPressTrack, onPressReview, ulasan);

  return (
    <View style={styles.cardShadow}>
      <View style={styles.card}>
        <View style={styles.row}>
          {storeIcon ? (
            <Image source={{ uri: storeIcon }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <MaterialIcons name="store" size={22} color="#fff" />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name} numberOfLines={1}>{outletName}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {date && !isNaN(new Date(date))
                ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Tanggal tidak tersedia'}
              {orderType ? ` · ${orderType}${packageType ? ` ${packageType}` : ''}` : ''}
            </Text>
          </View>
          <Text style={styles.price}>{total}</Text>
        </View>

        <View style={styles.badgeRow}>
          <StatusBadge statusProgress={statusProgress} />
        </View>

        {/* Detail progres pesanan (tetap dipertahankan) */}
        <View style={styles.statusContainer}>
          <StatusStepper
            statusProgress={statusProgress}
            orderType={orderType}
            packageType={packageType}
            startDate={startDate}
            endDate={endDate}
            dailyDeliveryLogs={dailyDeliveryLogs}
          />
        </View>

        <View style={styles.actionRow}>
          {progressButton}
          <TouchableOpacity style={styles.iconBtn} onPress={onPressDetail} accessibilityLabel="Detail pesanan">
            <FontAwesome5 name="info-circle" size={16} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleChatPress} accessibilityLabel="Chat penjual">
            <Ionicons name="chatbubble-outline" size={16} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const StatusOrder = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sellerMap, setSellerMap] = useState({});
  const [buyerProfile, setBuyerProfile] = useState(null);
  const [error, setError] = useState(null);
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("semua");
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  // Fetch buyer profile on mount
  useEffect(() => {
    const fetchBuyerProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('buyerToken');
        if (!token) return;
        const response = await axios.get(`${config.API_URL}/buyer/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBuyerProfile({
          name: response.data.name,
          id: response.data.id || response.data.buyerId || response.data._id || null,
        });
      } catch (e) {
        setBuyerProfile(null);
        console.error('Error fetching buyer profile:', e);
      }
    };
    fetchBuyerProfile();
  }, []);

  const fetchOrdersAndSellers = useCallback(async () => {
    if (!refreshing) setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem("buyerToken");
      const res = await fetch(
        `${config.API_URL}/buyer/orders`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch orders`);
      }

      const data = await res.json();
      const ordersFetched = data.orders || [];
      setOrders(ordersFetched);

      const uniqueSellerIds = [
        ...new Set(ordersFetched.map((o) => o.sellerId).filter(Boolean)),
      ];
      const sellerMapTemp = {};

      await Promise.all(
        uniqueSellerIds.map(async (sellerId) => {
          try {
            const sellerRes = await fetch(
              `${config.API_URL}/seller/detail/${sellerId}`
            );
            if (sellerRes.ok) {
              const sellerData = await sellerRes.json();
              if (sellerData && sellerData.seller) {
                sellerMapTemp[sellerId] = {
                  outletName: sellerData.seller.outletName,
                  storeIcon: sellerData.seller.storeIcon,
                };
              }
            }
          } catch (sellerError) {
            console.warn(`Failed to fetch seller ${sellerId}:`, sellerError);
          }
        })
      );
      setSellerMap(sellerMapTemp);

      if (refreshing) {
        showSuccess('Data berhasil diperbarui');
      }
    } catch (e) {
      setOrders([]);
      setError(e.message || 'Gagal memuat data pesanan');
      console.error('Error fetching orders:', e);
      showError(e.message || 'Gagal memuat data pesanan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, showError, showSuccess]);

  useFocusEffect(
    useCallback(() => {
      fetchOrdersAndSellers();
    }, [fetchOrdersAndSellers])
  );

  const handleOpenChatRoom = (params) => {
    router.push({
      pathname: "/buyer/ChatRoom",
      params
    });
  };

  const handleTrackDelivery = async (order) => {
    try {
      setMapLoading(true);

      const token = await AsyncStorage.getItem("buyerToken");
      const orderResponse = await fetch(
        `${config.API_URL}/seller/orders/${order.id}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        const orderDetails = orderData.order;

        if (orderDetails.buyerLat && orderDetails.buyerLng && orderDetails.sellerLat && orderDetails.sellerLng) {
          setSelectedOrder(orderDetails);

          const directionsResponse = await fetch(
            `https://maps.googleapis.com/maps/api/directions/json?origin=${orderDetails.sellerLat},${orderDetails.sellerLng}&destination=${orderDetails.buyerLat},${orderDetails.buyerLng}&key=${config.GOOGLE_MAPS_API_KEY}`
          );

          if (directionsResponse.ok) {
            const directionsData = await directionsResponse.json();
            if (directionsData.routes && directionsData.routes.length > 0) {
              const points = decodePolyline(directionsData.routes[0].overview_polyline.points);
              setRouteCoordinates(points);
            }
          }

          setMapLoading(false);
          setTrackingModalVisible(true);
        } else {
          showError('Koordinat pengiriman tidak tersedia');
          setMapLoading(false);
        }
      } else {
        showError('Gagal memuat detail pesanan');
        setMapLoading(false);
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      showError('Gagal memuat data tracking');
      setMapLoading(false);
    }
  };

  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return points;
  };

  const visibleOrders = orders.filter((order) => matchesFilter(order.statusProgress, activeFilter));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F6FA" }}>
      {/* Header selaras dengan halaman Pesanan penjual */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Kembali">
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Status Order</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Filter tabs selaras dengan halaman Pesanan penjual */}
      <View style={styles.filterBar}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <OrderCardSkeleton />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={56} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchOrdersAndSellers()}
          >
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingVertical: 12, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchOrdersAndSellers();
              }}
              colors={[COLORS.PRIMARY]}
            />
          }
        >
          {visibleOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="assignment" size={56} color="#ccc" />
              <Text style={styles.emptyText}>Belum ada pesanan</Text>
              <Text style={styles.emptySubtext}>
                Mulai pesan makanan favorit Anda!
              </Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => router.push('/buyer/(tabs)')}
              >
                <Text style={styles.exploreButtonText}>Jelajahi Menu</Text>
              </TouchableOpacity>
            </View>
          ) : (
            visibleOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                activeOpacity={1}
                onLongPress={() => {
                  if (order.statusProgress === 'delivery') {
                    router.push({
                      pathname: '/buyer/OrderTrackingScreen',
                      params: { orderId: order.id }
                    });
                  }
                }}
              >
                <CardStatus
                  date={order.createdAt || order.orderDate}
                  total={`Rp ${order.totalAmount?.toLocaleString('id-ID')}`}
                  outletName={sellerMap[order.sellerId]?.outletName || "-"}
                  storeIcon={sellerMap[order.sellerId]?.storeIcon}
                  statusProgress={order.statusProgress}
                  items={order.items}
                  buyerId={order.buyerId || buyerProfile?.id}
                  sellerId={order.sellerId}
                  onPressDetail={() => {
                    router.push({
                      pathname: "/buyer/RiwayatDetail",
                      params: { orderId: order.id },
                    });
                  }}
                  onPressChat={handleOpenChatRoom}
                  onPressTrack={() => handleTrackDelivery(order)}
                  onPressReview={() => {
                    router.push({
                      pathname: "/buyer/DetailOrder",
                      params: { orderId: order.id },
                    });
                  }}
                  pax={order.pax}
                  orderType={order.orderType}
                  orderId={order.id}
                  ulasan={order.ulasan}
                  startDate={order.startDate}
                  endDate={order.endDate}
                  packageType={order.packageType}
                  dailyDeliveryLogs={order.dailyDeliveryLogs}
                />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Tracking Modal */}
      <Modal
        visible={trackingModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setTrackingModalVisible(false);
          setSelectedOrder(null);
          setRouteCoordinates([]);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F6FA" }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setTrackingModalVisible(false);
                setSelectedOrder(null);
                setRouteCoordinates([]);
              }}
            >
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Lacak Pengiriman</Text>
            <View style={{ width: 24 }} />
          </View>

          {mapLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Memuat peta...</Text>
            </View>
          ) : selectedOrder ? (
            <View style={{ flex: 1 }}>
              <TrackingMap selectedOrder={selectedOrder} routeCoordinates={routeCoordinates} primaryColor={COLORS.PRIMARY} />

              <View style={styles.orderInfoPanel}>
                <View style={styles.infoRow}>
                  <MaterialIcons name="store" size={20} color={COLORS.PRIMARY} />
                  <Text style={styles.infoText}>
                    {sellerMap[selectedOrder.sellerId]?.outletName || "Penjual"}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="location-on" size={20} color={COLORS.GREEN4} />
                  <Text style={styles.infoText}>
                    {selectedOrder.deliveryAddress || "Alamat pengiriman"}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons name="local-shipping" size={20} color="#B26A00" />
                  <Text style={styles.infoText}>
                    Status: Dalam Pengiriman
                  </Text>
                </View>
                {selectedOrder.distance && (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="straighten" size={20} color="#666" />
                    <Text style={styles.infoText}>
                      Jarak: {selectedOrder.distance} km
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default StatusOrder;

const styles = StyleSheet.create({
  // Header selaras dengan halaman Pesanan penjual
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

  // Filter tabs
  filterBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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

  // Card
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
    marginHorizontal: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
  },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 12 },
  avatarFallback: {
    backgroundColor: "#D9C2C9",
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontSize: 14.5, fontWeight: "700", color: "#23272f" },
  subtitle: { fontSize: 12, color: "#8a8f99", marginTop: 2 },
  price: { fontSize: 14, fontWeight: "700", color: COLORS.GREEN4, marginLeft: 8 },

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

  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
    marginHorizontal: 2,
  },
  stepItem: {
    alignItems: "center",
    width: 66,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  progressBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 10,
    borderRadius: 10,
  },
  progressBtnText: { color: "#fff", fontWeight: "700", fontSize: 13.5 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    justifyContent: "center",
    alignItems: "center",
  },

  storeIconImg: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#f6f7fb",
    resizeMode: "cover",
  },

  loadingContainer: {
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 18,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14.5,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#555',
    fontWeight: '700',
    marginTop: 14,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  exploreButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 30,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 14.5,
    fontWeight: '700',
  },
  // Tracking Modal Styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  orderInfoPanel: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  // Rantangan-specific styles — selaras dengan halaman Pesanan penjual
  rantanganBox: {
    backgroundColor: "#F7F5F1",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  rantanganDates: {
    flexDirection: "row",
    justifyContent: 'space-between',
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
    marginTop: 8,
  },
  remainingPillPending: { backgroundColor: "#FFF3E0" },
  remainingPillText: { fontSize: 11.5, fontWeight: "600", color: COLORS.PRIMARY },
  // Daily delivery logs styles
  deliveryLogsContainer: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
  },
  deliveryLogsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 5,
  },
  deliveryLogsHeaderText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.PRIMARY,
  },
  deliveryLogItem: {
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
  },
  deliveryLogDate: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 4,
  },
  deliveryLogDateText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.GREEN3,
  },
  deliveryLogStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  deliveryLogStatusText: {
    fontSize: 11.5,
    color: "#666",
    marginRight: 8,
  },
  currentDeliveryContainer: {
    backgroundColor: "#FFF3E0",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currentDeliveryText: {
    fontSize: 11.5,
    color: "#B26A00",
    fontWeight: "600",
  },
  statusContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
});