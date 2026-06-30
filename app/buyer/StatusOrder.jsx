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
import HeaderTitleBack from '../../components/HeaderTitleBack';
import statusIcon from "../../assets/images/statusIcon.png";
import COLORS from '../constants/color';
import { useRouter } from "expo-router";
import config from '../constants/config';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import HeaderTitle from '../../components/HeaderTitle';
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
  
  // Set time to start of day for accurate comparison
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  // Calculate total days in the order period (inclusive of both start and end date)
  const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Calculate completed days from delivery logs
  const completedDays = dailyDeliveryLogs ? dailyDeliveryLogs.length : 0;
  
  // If order hasn't started yet, return total days
  if (today < start) {
    return totalDays;
  }
  
  // If order has started, return remaining days based on completion
  const remainingDays = totalDays - completedDays;
  return Math.max(0, remainingDays);
};

// Helper function to check if order can start today
const canStartToday = (startDate) => {
  if (!startDate) return true;
  const start = new Date(startDate);
  const today = new Date();
  
  // Set time to start of day for accurate comparison
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
  
  // Handle recurring Rantangan orders (cycles between processing and delivery)
  if ((orderType === 'Rantangan' || (orderType && orderType.includes('Rantangan'))) && 
      (packageType === 'Mingguan' || packageType === 'Bulanan')) {
    switch (statusProgress) {
      case "waiting_approval":
        return 0;
      case "processing":
        // Show processing step (cycles back here after each delivery)
        return 1;
      case "delivery":
        // Show delivery step
        return 2;
      case "completed":
        // Final completion when all deliveries are done
        return 3;
      default:
        return -1;
    }
  }
  
  // Handle regular orders and Harian Rantangan
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
      <View style={{ alignItems: "center", marginTop: 18, marginBottom: 8 }}>
        <MaterialIcons
          name="close"
          size={32}
          color="#F44336"
          style={{ backgroundColor: "#fff", borderRadius: 16 }}
        />
        <Text
          style={{
            fontSize: 14,
            color: "#F44336",
            fontWeight: "bold",
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
  
  // Calculate days remaining for Rantangan orders
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
                size={28}
                color={
                  activeStep > idx
                    ? COLORS.GREEN3
                    : activeStep === idx
                    ? step.color
                    : "#e0e0e0"
                }
                style={{ backgroundColor: "#fff", borderRadius: 16 }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color:
                    activeStep === idx
                      ? step.color
                      : activeStep > idx
                      ? COLORS.GREEN3
                      : "#bdbdbd",
                  fontWeight: activeStep === idx ? "bold" : "400",
                  marginTop: 2,
                  textAlign: "center",
                  width: 70,
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
        <View style={styles.rantanganInfo}>
          <View style={styles.dateInfoRow}>
            <View style={styles.dateInfoItem}>
              <MaterialIcons name="calendar-today" size={16} color={COLORS.GREEN3} />
              <Text style={styles.dateInfoText}>
                Mulai: {new Date(startDate).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.dateInfoItem}>
              <MaterialIcons name="event" size={16} color="#666" />
              <Text style={styles.dateInfoText}>
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
              styles.remainingDaysContainer,
              !orderCanStart && styles.pendingStartContainer
            ]}>
              <MaterialIcons 
                name={!orderCanStart ? "schedule" : "schedule"} 
                size={16} 
                color={!orderCanStart ? "#ff9800" : COLORS.PRIMARY} 
              />
              <Text style={[
                styles.remainingDaysText,
                !orderCanStart && styles.pendingStartText
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
                <MaterialIcons name="history" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.deliveryLogsHeaderText}>
                  Riwayat Pengiriman Harian
                </Text>
              </View>
              {dailyDeliveryLogs.map((log, index) => (
                <View key={index} style={styles.deliveryLogItem}>
                  <View style={styles.deliveryLogDate}>
                    <MaterialIcons name="calendar-today" size={14} color={COLORS.GREEN3} />
                    <Text style={styles.deliveryLogDateText}>
                      {new Date(log.deliveryDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={styles.deliveryLogStatus}>
                    <MaterialIcons name="check-circle" size={14} color={COLORS.GREEN3} />
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
              <MaterialIcons name="local-shipping" size={16} color={COLORS.ORANGE} />
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

  // BUYER BUTTONS: Only "Lacak Pesanan" for tracking and "Berikan Ulasan" when completed
  switch (statusProgress) {
    case 'delivery':
      // Show tracking button when order is being delivered
      return (
        <View style={styles.progressButtonsContainer}>
          <TouchableOpacity 
            style={[styles.progressButton, styles.trackButton]}
            onPress={() => {
              if (onPressTrack) {
                onPressTrack();
              }
            }}
          >
            <MaterialIcons name="location-on" size={16} color="#fff" />
            <Text style={styles.progressButtonText}>
              {isRantangan && isRecurring ? 'Lacak Pengiriman Hari Ini' : 'Lacak Pesanan'}
            </Text>
          </TouchableOpacity>
        </View>
      );

    case 'completed':
      // Show review button when order is completed (if not reviewed yet)
      return !ulasan ? (
        <View style={styles.progressButtonsContainer}>
          <TouchableOpacity 
            style={[styles.progressButton, styles.reviewButton]}
            onPress={() => {
              if (onPressReview) {
                onPressReview();
              }
            }}
          >
            <MaterialIcons name="star" size={16} color="#fff" />
            <Text style={styles.progressButtonText}>Berikan Ulasan</Text>
          </TouchableOpacity>
        </View>
      ) : null;

    default:
      // No buttons for other statuses (waiting_approval, processing, etc.)
      // Buyers just wait and see the status progress
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
  onPressTrack, // Add this prop
  onPressReview, // Add this prop for review functionality
  pax, // <-- Add pax prop
  orderType, // <-- Add orderType prop
  orderId, // <-- Add orderId prop for unique chat rooms
  ulasan, // Add ulasan prop to check if review exists
  startDate, // Add startDate prop for Rantangan orders
  endDate, // Add endDate prop for Rantangan orders
  packageType, // Add packageType prop for Rantangan orders
  dailyDeliveryLogs, // Add daily delivery logs for recurring orders
}) => {
  // Debug: log chat params when chat button pressed
  const handleChatPress = () => {
    const chatParams = {
      chatroomId: `${buyerId}_${sellerId}`, // This will be overridden in ChatRoom if orderId exists
      buyerId,
      sellerId,
      buyerName: "Buyer", // Replace with actual buyer name if available
      sellerName: outletName || "Penjual",
      orderId: orderId // Add orderId to create unique chat room
    };
    console.log('[DEBUG][ChatButton] Params sent to chatroom:', chatParams);
    onPressChat(chatParams);
  };
  return (
    <View style={styles.cardShadow}>
      <View style={styles.cardModern}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {storeIcon ? (
            <Image source={{ uri: storeIcon }} style={styles.storeIconImg} />
          ) : (
            <View
              style={[
                styles.storeIconImg,
                {
                  backgroundColor: "#eee",
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <MaterialIcons name="store" size={32} color="#bbb" />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.orderTitle}>{outletName}</Text>
            <Text style={styles.orderDate}>
              {date && !isNaN(new Date(date)) 
                ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Tanggal tidak tersedia'
              }
            </Text>
            <Text style={styles.orderTotal}>{total}</Text>
            {orderType && (
              <Text style={{ color: COLORS.PRIMARY, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                {orderType} {packageType && `• ${packageType}`}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "column", alignItems: "center", gap: 5, minWidth: 90 }}>
            <TouchableOpacity style={[styles.detailBtn, { flex: 1, minWidth: 90, marginLeft: 0 }]} onPress={onPressDetail}>
              <FontAwesome5 name="info-circle" size={18} color="#fff" />
              <Text style={styles.detailBtnText}>Detail</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.detailBtn,
                { backgroundColor: COLORS.GREEN4, flex: 1, minWidth: 90, marginLeft: 0 },
              ]}
              onPress={handleChatPress}
            >
              <MaterialIcons name="chat" size={18} color="#fff" />
              <Text style={styles.detailBtnText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Simplified Status Display */}
        <View style={styles.statusContainer}>
          <StatusStepper 
            statusProgress={statusProgress} 
            orderType={orderType}
            packageType={packageType}
            startDate={startDate}
            endDate={endDate}
            dailyDeliveryLogs={dailyDeliveryLogs}
          />
          
          <View style={styles.statusLabelRow}>
            <MaterialIcons name="info" size={16} color={COLORS.BLUE2} />
            <Text style={styles.statusLabelText}>
              {STATUS_LABELS[statusProgress] || "-"}
            </Text>
          </View>
          
          {/* Progress Action Buttons based on status and order type */}
          {renderProgressButtons(statusProgress, orderType, packageType, onPressTrack, onPressReview, ulasan)}
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
    const startTime = performance.now();
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
      
      // Fetch all unique sellerIds
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
      
      // Show success message if refreshing
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

  // Function to handle tracking delivery
  const handleTrackDelivery = async (order) => {
    try {
      setMapLoading(true);
      
      // Get order details with coordinates
      const token = await AsyncStorage.getItem("buyerToken");
      const orderResponse = await fetch(
        `${config.API_URL}/seller/orders/${order.id}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      
      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        const orderDetails = orderData.order;
        
        // Check if we have both buyer and seller coordinates
        if (orderDetails.buyerLat && orderDetails.buyerLng && orderDetails.sellerLat && orderDetails.sellerLng) {
          // Set the order with full details including coordinates
          setSelectedOrder(orderDetails);
          
          // Get directions from Google Maps Directions API
          const directionsResponse = await fetch(
            `https://maps.googleapis.com/maps/api/directions/json?origin=${orderDetails.sellerLat},${orderDetails.sellerLng}&destination=${orderDetails.buyerLat},${orderDetails.buyerLng}&key=${config.GOOGLE_MAPS_API_KEY}`
          );
          
          if (directionsResponse.ok) {
            const directionsData = await directionsResponse.json();
            if (directionsData.routes && directionsData.routes.length > 0) {
              // Decode polyline to get route coordinates
              const points = decodePolyline(directionsData.routes[0].overview_polyline.points);
              setRouteCoordinates(points);
            }
          }
          
          // Open modal after all data is ready
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

  // Function to decode Google Maps polyline
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7fb" }}>
      <HeaderTitle title="Status Order" />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <OrderCardSkeleton />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#ccc" />
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
          contentContainerStyle={{ paddingVertical: 18 }}
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
          {orders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="assignment" size={60} color="#ccc" />
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
            orders.map((order) => (
              <TouchableOpacity
                key={order.id}
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
                  total={`Rp ${order.totalAmount?.toLocaleString()}`}
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
                  onPressChat={() => {
                    handleOpenChatRoom({
                      chatroomId: `${order.buyerId || buyerProfile?.id}_${order.sellerId}`,
                      buyerId: order.buyerId || buyerProfile?.id,
                      sellerId: order.sellerId,
                      buyerName: order.buyerName || buyerProfile?.name || "Buyer",
                      sellerName: sellerMap[order.sellerId]?.outletName || "Penjual",
                      orderId: order.id
                    });
                  }}
                  onPressTrack={() => handleTrackDelivery(order)}
                  onPressReview={() => {
                    router.push({
                      pathname: "/buyer/DetailOrder",
                      params: { orderId: order.id },
                    });
                  }}
                  pax={order.pax}
                  orderType={order.orderType}
                  orderId={order.id} // Pass orderId for unique chat rooms
                  ulasan={order.ulasan} // Pass ulasan data to check if review exists
                  startDate={order.startDate} // Pass startDate for Rantangan orders
                  endDate={order.endDate} // Pass endDate for Rantangan orders
                  packageType={order.packageType} // Pass packageType for Rantangan orders
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
        <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7fb" }}>
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

              {/* Order Info Panel */}
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
                  <MaterialIcons name="local-shipping" size={20} color={COLORS.ORANGE || "#FFA726"} />
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
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 18,
    marginHorizontal: 10,
  },
  cardModern: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  orderTitle: {
    fontWeight: "700",
    fontSize: 17,
    color: "#23272f",
    marginBottom: 2,
  },
  orderDate: {
    color: "#8a8f99",
    fontSize: 13,
    marginBottom: 2,
  },
  orderTotal: {
    color: COLORS.GREEN4,
    fontWeight: "600",
    fontSize: 15,
    marginBottom: 2,
  },
  detailBtn: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 8,
    gap: 6,
  },
  detailBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 4,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 2,
  },
  stepItem: {
    alignItems: "center",
    width: 70,
  },
  itemsList: {
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "#f8fafd",
    borderRadius: 10,
    padding: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  itemName: {
    fontSize: 14,
    color: "#23272f",
    fontWeight: "500",
    flex: 1,
  },
  itemPrice: {
    color: COLORS.GREEN4,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  statusLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  statusLabelText: {
    fontSize: 14,
    color: COLORS.BLUE2,
    fontWeight: "600",
    marginLeft: 4,
  },
  storeIconImg: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#f6f7fb",
    resizeMode: "cover",
  },
  // New enhanced styles
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
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Rantangan-specific styles
  rantanganInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.GREEN3,
  },
  dateInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateInfoText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    marginLeft: 4,
  },
  remainingDaysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  remainingDaysText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  pendingStartContainer: {
    backgroundColor: '#fff3e0',
  },
  pendingStartText: {
    color: '#f57c00',
  },
  cycleStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  cycleStatusText: {
    fontSize: 11,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginLeft: 4,
    textAlign: 'center',
    flex: 1,
  },
  // Progress Buttons Styles (Simplified for Buyer)
  progressButtonsContainer: {
    marginTop: 12,
  },
  progressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  trackButton: {
    backgroundColor: COLORS.GREEN4,
  },
  reviewButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  statusContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  // Daily delivery logs styles
  deliveryLogsContainer: {
    marginTop: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
  },
  deliveryLogsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  deliveryLogsHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.PRIMARY,
  },
  deliveryLogItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  deliveryLogDate: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 4,
  },
  deliveryLogDateText: {
    fontSize: 13,
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
    fontSize: 12,
    color: "#666",
    marginRight: 8,
  },
  currentDeliveryContainer: {
    backgroundColor: "#fff3e0",
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currentDeliveryText: {
    fontSize: 12,
    color: "#f57c00",
    fontWeight: "500",
  },
});
