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
} from "react-native";
import HeaderTitle from '../../../components/HeaderTitle';
import COLORS from '../../constants/color';
import { useRouter } from "expo-router";
import config from '../../constants/config';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import axios from "axios";

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
    label: "Siapkan Pesanan",
    icon: "restaurant",
    color: COLORS.ORANGE || "#FFA726",
  },
  {
    key: "delivery",
    label: "Kirim Pesanan",
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
    label: "Kirim Pesanan",
    icon: "local-shipping",
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
    label: "Terima atau Tolak",
    icon: "hourglass-empty",
    color: COLORS.BLUE2,
  },
  {
    key: "processing",
    label: "Siapkan Item",
    icon: "eco",
    color: COLORS.GREEN4,
  },
  {
    key: "delivery",
    label: "Kirim Item",
    icon: "local-shipping",
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
  end.setHours(23, 59, 59, 999);
  today.setHours(0, 0, 0, 0);
  
  // Calculate total days in the order period (inclusive)
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
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

function getStepIndex(statusProgress, orderType, packageType) {
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
  if (statusProgress === "pending") {
    return (
      <View style={{ alignItems: "center", marginTop: 18, marginBottom: 8 }}>
        <MaterialIcons
          name="hourglass-empty"
          size={32}
          color={COLORS.BLUE2}
          style={{ backgroundColor: "#fff", borderRadius: 16 }}
        />
        <Text
          style={{
            fontSize: 14,
            color: COLORS.BLUE2,
            fontWeight: "bold",
            marginTop: 4,
          }}
        >
          Menunggu Pembayaran
        </Text>
      </View>
    );
  }
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

const CardStatus = ({
  date,
  total,
  buyerName,
  buyerIcon,
  statusProgress,
  onPressDetail,
  items,
  buyerId,
  sellerId,
  onPressChat,
  pax,
  onAccept,
  onCancel,
  onSendOrder,
  onCompleteOrder,
  orderType, // Order type prop
  packageType, // Package type prop for Rantangan orders
  startDate, // Start date for Rantangan orders
  endDate, // End date for Rantangan orders
  dailyDeliveryLogs = [], // Daily delivery logs for recurring orders
}) => {
  const [actionLoading, setActionLoading] = React.useState(false);

  // Helper to wrap async actions
  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      await action();
    } finally {
      setActionLoading(false);
    }
  };

  // Helper function to check if today's delivery is already completed
  const isTodayDeliveryCompleted = (dailyDeliveryLogs = []) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return dailyDeliveryLogs.some(log => log.deliveryDate === today);
  };

  // Helper function to render action buttons for Bite Eco orders
  const renderBiteEcoActionButtons = () => {
    switch (statusProgress) {
      case "waiting_approval":
        return (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 4 }}>
            <TouchableOpacity
              style={{ 
                flex: 1, 
                backgroundColor: "#4CAF50", 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: actionLoading ? 0.6 : 1 
              }}
              onPress={() => handleAction(onAccept)}
              disabled={actionLoading}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {actionLoading ? "Mohon Tunggu..." : "Terima Pesanan"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ 
                flex: 1, 
                backgroundColor: "#F44336", 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: actionLoading ? 0.6 : 1 
              }}
              onPress={() => handleAction(onCancel)}
              disabled={actionLoading}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {actionLoading ? "Mohon Tunggu..." : "Tolak Pesanan"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "processing":
        return (
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <TouchableOpacity
              style={{ 
                backgroundColor: COLORS.GREEN4, 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: actionLoading ? 0.6 : 1 
              }}
              onPress={() => handleAction(onSendOrder)}
              disabled={actionLoading}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {actionLoading ? "Mohon Tunggu..." : "Kirim Pesanan"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "delivery":
        return (
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <TouchableOpacity
              style={{ 
                backgroundColor: "#4CAF50", 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: actionLoading ? 0.6 : 1 
              }}
              onPress={() => handleAction(onCompleteOrder)}
              disabled={actionLoading}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {actionLoading ? "Mohon Tunggu..." : "Selesaikan Orderan"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "completed":
        return (
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <TouchableOpacity
              style={{ 
                backgroundColor: "#4CAF50", 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: 0.6 
              }}
              disabled={true}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Pesanan Selesai
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  // Helper function to render action buttons for Rantangan orders
  const renderRantanganActionButtons = () => {
    const isRantangan = orderType === 'Rantangan' || (orderType && orderType.includes('Rantangan'));
    const isBiteEco = orderType === 'Bite Eco';
    const isHarian = packageType === 'Harian';
    const isRecurring = packageType === 'Mingguan' || packageType === 'Bulanan';
    const orderCanStart = canStartToday(startDate);

    if (isBiteEco) {
      // Bite Eco specific buttons
      return renderBiteEcoActionButtons();
    }

    if (!isRantangan) {
      // Regular order buttons (existing logic)
      return renderRegularActionButtons();
    }

    // Rantangan-specific buttons
    switch (statusProgress) {
      case "waiting_approval":
        return (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 4 }}>
            <TouchableOpacity
              style={{ 
                flex: 1, 
                backgroundColor: "#4CAF50", 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: actionLoading ? 0.6 : 1 
              }}
              onPress={() => handleAction(onAccept)}
              disabled={actionLoading}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {actionLoading ? "Mohon Tunggu..." : "Terima Pesanan"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ 
                flex: 1, 
                backgroundColor: "#F44336", 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: actionLoading ? 0.6 : 1 
              }}
              onPress={() => handleAction(onCancel)}
              disabled={actionLoading}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {actionLoading ? "Mohon Tunggu..." : "Tolak Pesanan"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "processing":
        return (
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <TouchableOpacity
              style={{ 
                backgroundColor: orderCanStart ? "#FF9800" : "#BDBDBD", 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: (actionLoading || !orderCanStart) ? 0.6 : 1 
              }}
              onPress={() => orderCanStart && handleAction(onSendOrder)}
              disabled={actionLoading || !orderCanStart}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {!orderCanStart 
                  ? `Akan dimulai ${Math.ceil((new Date(startDate) - new Date()) / (1000 * 60 * 60 * 24))} hari lagi`
                  : actionLoading 
                    ? "Mohon Tunggu..." 
                    : isHarian 
                      ? "Siapkan & Kirim" 
                      : "Siapkan Pesanan Hari Ini"
                }
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "delivery":
        // Check if today's delivery is completed for recurring rantangan orders
        const todayCompleted = !isHarian && isRantangan && isTodayDeliveryCompleted(dailyDeliveryLogs);
        
        return (
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <TouchableOpacity
              style={{ 
                backgroundColor: "#4CAF50", 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: (actionLoading || todayCompleted) ? 0.6 : 1 
              }}
              onPress={() => handleAction(onCompleteOrder)}
              disabled={actionLoading || todayCompleted}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {actionLoading 
                  ? "Mohon Tunggu..." 
                  : todayCompleted 
                    ? "Selesai Pengiriman Hari Ini"
                    : isHarian 
                      ? "Selesaikan Pesanan" 
                      : "Pesanan Hari Ini Selesai"
                }
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "completed":
        return (
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <TouchableOpacity
              style={{ 
                backgroundColor: "#4CAF50", 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: 0.6 
              }}
              disabled={true}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {isHarian ? "Pesanan Selesai" : "Semua Pengiriman Selesai"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  // Regular order action buttons (existing logic)
  const renderRegularActionButtons = () => {
    switch (statusProgress) {
      case "waiting_approval":
        return (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 4 }}>
            <TouchableOpacity
              style={{ 
                flex: 1, 
                backgroundColor: "#4CAF50", 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: actionLoading ? 0.6 : 1 
              }}
              onPress={() => handleAction(onAccept)}
              disabled={actionLoading}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {actionLoading ? "Mohon Tunggu..." : "Terima"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ 
                flex: 1, 
                backgroundColor: "#F44336", 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: actionLoading ? 0.6 : 1 
              }}
              onPress={() => handleAction(onCancel)}
              disabled={actionLoading}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {actionLoading ? "Mohon Tunggu..." : "Batalkan"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "processing":
        return (
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <TouchableOpacity
              style={{ 
                backgroundColor: "#4CAF50", 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: actionLoading ? 0.6 : 1 
              }}
              onPress={() => handleAction(onSendOrder)}
              disabled={actionLoading}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {actionLoading ? "Mohon Tunggu..." : "Kirim Pesanan"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "delivery":
        return (
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <TouchableOpacity
              style={{ 
                backgroundColor: "#4CAF50", 
                paddingVertical: 12, 
                borderRadius: 8, 
                alignItems: "center", 
                opacity: actionLoading ? 0.6 : 1 
              }}
              onPress={() => handleAction(onCompleteOrder)}
              disabled={actionLoading}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                {actionLoading ? "Mohon Tunggu..." : "Selesaikan Pesanan"}
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.cardShadow}>
      <View style={styles.cardModern}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {buyerIcon ? (
            <Image source={{ uri: buyerIcon }} style={styles.storeIconImg} />
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
              <MaterialIcons name="person" size={32} color="#bbb" />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.orderTitle}>{buyerName}</Text>
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
          <View
            style={{
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              minWidth: 90,
            }}
          >
            <TouchableOpacity
              style={[
                styles.detailBtn,
                { flex: 1, minWidth: 90, marginLeft: 0 },
              ]}
              onPress={onPressDetail}
            >
              <FontAwesome5 name="info-circle" size={18} color="#fff" />
              <Text style={styles.detailBtnText}>Detail</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.detailBtn,
                {
                  backgroundColor: COLORS.GREEN4,
                  flex: 1,
                  minWidth: 90,
                  marginLeft: 0,
                },
              ]}
              onPress={onPressChat}
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
          
          {/* Render action buttons based on order type */}
          {renderRantanganActionButtons()}
        </View>
      </View>
    </View>
  );
};

const SellerOrder = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buyerMap, setBuyerMap] = useState({});
  const [sellerProfile, setSellerProfile] = useState(null);
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
          id:
            response.data.id ||
            response.data.sellerId ||
            response.data._id ||
            null,
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
      // Fetch all unique buyerIds
      const uniqueBuyerIds = [
        ...new Set(ordersFetched.map((o) => o.buyerId).filter(Boolean)),
      ];
      // Set initial buyerMap with loading state
      const initialBuyerMap = {};
      uniqueBuyerIds.forEach((buyerId) => {
        initialBuyerMap[buyerId] = { buyerName: "...", buyerIcon: undefined };
      });
      setBuyerMap(initialBuyerMap);
      // Fetch each buyer and update buyerMap incrementally
      uniqueBuyerIds.forEach(async (buyerId) => {
        try {
          const buyerRes = await fetch(
            `${config.API_URL}/buyer/profile/${buyerId}`
          );
          const buyerData = await buyerRes.json();
          if (buyerData && buyerData.name) {
            setBuyerMap((prev) => ({
              ...prev,
              [buyerId]: {
                buyerName: buyerData.name,
                buyerIcon: undefined, // No avatar in response
              },
            }));
          }
        } catch {}
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

  // Add update order status handler
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = await AsyncStorage.getItem("sellerToken");
      await fetch(`${config.API_URL}/seller/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ statusProgress: newStatus }),
      });
      fetchOrdersAndBuyers(); // Refresh orders
    } catch (e) {
      // Optionally show error
    }
  };

  // Add daily delivery completion handler for rantangan orders
  const completeDailyDelivery = async (orderId) => {
    try {
      const token = await AsyncStorage.getItem("sellerToken");
      const response = await fetch(`${config.API_URL}/seller/orders/${orderId}/complete-daily-delivery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          deliveryDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
          deliveryTime: new Date().toISOString()
        }),
      });
      
      if (response.ok) {
        fetchOrdersAndBuyers(); // Refresh orders
      } else {
        console.error("Failed to complete daily delivery");
      }
    } catch (e) {
      console.error("Error completing daily delivery:", e);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7fb" }}>
      <HeaderTitle title="Pesanan" />
      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.PRIMARY}
          style={{ marginTop: 40 }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingVertical: 18 }}
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
          {orders.length === 0 ? (
            <Text style={{ textAlign: "center", color: "#aaa", marginTop: 40 }}>
              Tidak ada pesanan.
            </Text>
          ) : (
            orders.map((order) => {
              if (order.status === "pending" || order.statusProgress === "pending") {
                return (
                  <CardStatus
                    key={order.id}
                    date={order.createdAt || order.orderDate}
                    total={`Rp ${order.totalAmount?.toLocaleString()}`}
                    buyerName={buyerMap[order.buyerId]?.buyerName || "-"}
                    buyerIcon={buyerMap[order.buyerId]?.buyerIcon}
                    statusProgress={"pending"}
                    items={order.items}
                    buyerId={order.buyerId}
                    sellerId={order.sellerId}
                    onPressDetail={() =>
                      router.push({
                        pathname: "/seller/DetailOrder",
                        params: { orderId: order.id },
                      })
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
                    pax={order.pax}
                    orderType={order.orderType}
                    packageType={order.packageType}
                    startDate={order.startDate}
                    endDate={order.endDate}
                    dailyDeliveryLogs={order.dailyDeliveryLogs || []}
                    // No action buttons for pending
                  />
                );
              }
              return (
                <CardStatus
                  key={order.id}
                  date={order.createdAt || order.orderDate}
                  total={`Rp ${order.totalAmount?.toLocaleString()}`}
                  buyerName={buyerMap[order.buyerId]?.buyerName || "-"}
                  buyerIcon={buyerMap[order.buyerId]?.buyerIcon}
                  statusProgress={order.statusProgress}
                  items={order.items}
                  buyerId={order.buyerId}
                  sellerId={order.sellerId}
                  onPressDetail={() =>
                    router.push({
                      pathname: "/seller/DetailOrder",
                      params: { orderId: order.id },
                    })
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
                  pax={order.pax}
                  onAccept={() => updateOrderStatus(order.id, "processing")}
                  onCancel={() => updateOrderStatus(order.id, "cancelled")}
                  onSendOrder={() => updateOrderStatus(order.id, "delivery")}
                  onCompleteOrder={() => {
                    // Use daily delivery completion for recurring rantangan orders
                    if ((order.orderType === 'Rantangan' || order.orderType?.includes('Rantangan')) && 
                        (order.packageType === 'Mingguan' || order.packageType === 'Bulanan')) {
                      completeDailyDelivery(order.id);
                    } else {
                      // Use regular completion for other orders
                      updateOrderStatus(order.id, "completed");
                    }
                  }}
                  orderType={order.orderType}
                  packageType={order.packageType}
                  startDate={order.startDate}
                  endDate={order.endDate}
                  dailyDeliveryLogs={order.dailyDeliveryLogs || []}
                />
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default SellerOrder;

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
  storeIconImg: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#f6f7fb",
    resizeMode: "cover",
  },
  // Rantangan-specific styles
  rantanganInfo: {
    backgroundColor: "#f0f8ff",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
  },
  dateInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  dateInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateInfoText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  remainingDaysContainer: {
    backgroundColor: "#e8f5e8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  remainingDaysText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: "600",
  },
  pendingStartContainer: {
    backgroundColor: "#fff3e0",
  },
  pendingStartText: {
    color: "#f57c00",
  },
  cycleStatusContainer: {
    backgroundColor: "#fff3e0",
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#ff9800",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cycleStatusText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    flex: 1,
  },
  progressButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginHorizontal: 2,
    minWidth: 80,
    alignItems: "center",
  },
  progressButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f44336",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
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
