import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Easing,
  Dimensions,
  Platform,
  LayoutAnimation,
  ScrollView,
  RefreshControl,
  UIManager,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import HeaderTitleBack from "../../../components/HeaderTitleBack";
import { SafeAreaView } from "react-native-safe-area-context";
import COLORS from "../../constants/color";
import { MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import notif from "../../../assets/images/notif.png";
import pin from "../../../assets/images/pin.png";
import pelanggan from "../../../assets/images/pelanggan.png";
import menu from "../../../assets/images/menu.png";
import jadwal from "../../../assets/images/jadwal.png";
import laporan from "../../../assets/images/laporanmenu.png";
import riwayat from "../../../assets/images/riwayat.png";
import gizi from "../../../assets/images/gizipro.png";
import biteeco from "../../../assets/images/biteeco.png";
import ulasan from "../../../assets/images/ulasan.png";
import bantuan from "../../../assets/images/bantuan.png";
import { useRouter } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from "../../constants/config";
import { useLanguage } from "../../contexts/LanguageContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const scale = (size) => (SCREEN_WIDTH / 375) * size;

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MenuItem = ({
  icon,
  label,
  iconType = "image",
  iconName,
  color = "white",
  onPress,
}) => {
  const [pressed, setPressed] = useState(false);

  const handlePress = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    onPress && onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.menuItem, pressed && styles.menuItemPressed]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: color }]}>
        {iconType === "image" ? (
          <Image source={icon} style={styles.menuIcon} />
        ) : iconType === "material" ? (
          <MaterialIcons name={iconName} size={24} color={COLORS.PRIMARY} />
        ) : (
          <MaterialIcons name={iconName} size={24} color={COLORS.PRIMARY} />
        )}
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const StatsCard = ({ title, value, icon, color, subtitle }) => (
  <View style={[styles.statsCard, { borderLeftColor: color }]}>
    <View style={styles.statsContent}>
      <View style={styles.statsTextContainer}>
        <Text style={styles.statsTitle}>{title}</Text>
        <Text style={[styles.statsValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
      </View>
      <View
        style={[styles.statsIconContainer, { backgroundColor: color + "20" }]}
      >
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
    </View>
  </View>
);

const QuickActionCard = ({ title, description, icon, color, onPress }) => (
  <TouchableOpacity
    style={styles.quickActionCard}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.quickActionIcon, { backgroundColor: color + "20" }]}>
      <MaterialIcons name={icon} size={28} color={color} />
    </View>
    <View style={styles.quickActionContent}>
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionDescription}>{description}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={24} color="#ccc" />
  </TouchableOpacity>
);

const ExpandableMenu = () => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    subscribers: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    unreadNotifications: 0,
  });
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    await fetchStats(); // This now includes fetchNotificationCount
    setRefreshing(false);
  };
  
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("sellerToken");
      if (!token) return;
      const response = await axios.get(`${config.API_URL}/seller/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data;

      if (!data.address) {
        setIsProfileIncomplete(true);
      } else {
        setIsProfileIncomplete(false);
      }

      setStoreName(
        response.data.name || response.data.outletName || t("beranda.defaultStoreName")
      );
      setStoreAddress(
        response.data.address ||
          response.data.pinAddress ||
          t("beranda.defaultAddress")
      );
    } catch (err) {
      console.error("Error fetching profile:", err);
      setStoreName(t("beranda.defaultStoreName"));
      setStoreAddress(t("beranda.defaultAddress"));
    }
  };

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem("sellerToken");
      if (!token) return;

      // Fetch orders to calculate stats
      const ordersResponse = await axios.get(
        `${config.API_URL}/seller/orders`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const orders = ordersResponse.data.orders || [];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Calculate stats
      const completedOrders = orders.filter(
        (order) => order.statusProgress === "completed"
      );
      const pendingOrders = orders.filter(
        (order) => order.statusProgress === "awaiting_seller_approval"
      );

      const monthlyOrders = completedOrders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return (
          orderDate.getMonth() === currentMonth &&
          orderDate.getFullYear() === currentYear
        );
      });

      const monthlyRevenue = monthlyOrders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0
      );
      const subscribers = orders.filter(
        (order) =>
          order.orderType?.startsWith("Rantangan") &&
          (order.packageType === "Mingguan" || order.packageType === "Bulanan")
      ).length;

      setStats({
        subscribers,
        monthlyRevenue,
        totalOrders: orders.length,
        pendingOrders: pendingOrders.length,
        completedOrders: completedOrders.length,
        unreadNotifications: 0, // Will be updated by fetchNotificationCount
      });

      // Fetch notification count separately
      await fetchNotificationCount();
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };



  const fetchNotificationCount = async () => {
    // Always set notification count to 0 - empty notification screen
    setStats(prev => ({
      ...prev,
      unreadNotifications: 0
    }));
  };

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const mainMenuItems = [
    {
      icon: pelanggan,
      iconType: "image",
      label: t("beranda.menu.pelanggan"),
      onPress: () => router.push("seller/pelanggan"),
    },
    {
      icon: menu,
      iconType: "image",
      label: t("beranda.menu.menu"),
      onPress: () => router.push("seller/menu"),
    },
    {
      icon: jadwal,
      iconType: "image",
      label: t("beranda.menu.jadwal"),
      onPress: () => router.push("seller/JadwalPengantaran"),
    },
    {
      icon: laporan,
      iconType: "image",
      label: t("beranda.menu.laporan"),
      onPress: () => router.push("seller/Laporan"),
    },
  ];

  // Menu tambahan (muncul saat expanded). Digabung dengan mainMenuItems saat
  // dirender supaya semua icon berada dalam satu grid 4 kolom yang selaras.
  const additionalMenuItems = [
    {
      icon: riwayat,
      iconType: "image",
      label: t("beranda.menu.riwayat"),
      onPress: () => router.push("seller/riwayat"),
    },
    {
      icon: gizi,
      iconType: "image",
      label: t("beranda.menu.giziPro"),
      onPress: () => router.push("seller/gizipro"),
    },
    {
      icon: biteeco,
      iconType: "image",
      label: t("beranda.menu.biteEco"),
      onPress: () => router.push("seller/biteeco/management"),
    },
    {
      icon: ulasan,
      iconType: "image",
      label: t("beranda.menu.ulasan"),
      onPress: () => router.push("seller/ulasan"),
    },
    {
      iconType: "material",
      iconName: "help",
      label: t("beranda.menu.bantuan"),
      onPress: () => router.push("seller/bantuan"),
    },
    {
      iconType: "material",
      iconName: "settings",
      label: t("beranda.menu.pengaturan"),
      onPress: () => router.push("seller/settings"),
    },
  ];

  const quickActions = [
    {
      title: t("beranda.quickActions.addMenu.title"),
      description: t("beranda.quickActions.addMenu.description"),
      icon: "add-circle",
      color: COLORS.GREEN4,
      onPress: () => router.push("seller/menu/add"),
    },
    {
      title: t("beranda.quickActions.viewOrders.title"),
      description: t("beranda.quickActions.viewOrders.description").replace(
        "{{count}}",
        String(stats.pendingOrders)
      ),
      icon: "notifications",
      color: "#FF9800",
      onPress: () => router.push("seller/(tabs)/order"),
    },
    {
      title: t("beranda.quickActions.updateSchedule.title"),
      description: t("beranda.quickActions.updateSchedule.description"),
      icon: "schedule",
      color: COLORS.PRIMARY,
      onPress: () => router.push("seller/JadwalPengantaran"),
    },
  ];

  const AddressWarningBanner = ({ onPress }) => (
    <View style={styles.warningBanner}>
    <View style={styles.warningIconCircle}>
      <MaterialIcons name="location-off" size={24} color="#D32F2F" />
    </View>
    <View style={styles.warningTextContainer}>
      <Text style={styles.warningTitle}>Alamat Toko Belum Lengkap!</Text>
      <Text style={styles.warningSubtitle}>
        Toko kamu saat ini disembunyikan. Lengkapi alamat dan titik peta agar tokomu bisa dilihat pembeli.
      </Text>
    </View>
    <TouchableOpacity style={styles.warningButton} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.warningButtonText}>Lengkapi</Text>
    </TouchableOpacity>
  </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.PRIMARY]}
          tintColor={COLORS.PRIMARY}
        />
      }
    >
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <SafeAreaView style={styles.headerSafeArea}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={{ flex: 1, transform: [{ translateY: scale(24) }] }}>
              <Text style={styles.welcomeText}>{t("beranda.welcome")}</Text>
              <Text style={styles.storeNameText}>{storeName}!</Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => router.push('/seller/notifikasi')}
            >
              <MaterialIcons name="notifications" size={24} color="white" />
              {stats.unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {stats.unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Tanggal — diposisikan sendiri di pojok kanan bawah header */}
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </SafeAreaView>
      </View>

      {/* Warning - Jika profil belum lengkap maka akan diarahkan ke halaman profil (secara spesifik alamat) */}
      {isProfileIncomplete && (
        <AddressWarningBanner
        onPress={() => router.push('seller/(tabs)/profile?edit=true')}
        />
      )}

      {/* Menu Grid — di luar header burgundy, di atas background putih/abu-abu */}
      <View style={styles.menuSection}>
        <View style={styles.menuGrid}>
          {mainMenuItems.map((item, index) => (
            <MenuItem
              key={`main-${index}`}
              icon={item.icon}
              iconType={item.iconType}
              label={item.label}
              onPress={item.onPress}
            />
          ))}
          {expanded &&
            additionalMenuItems.map((item, index) => (
              <MenuItem
                key={`additional-${index}`}
                icon={item.icon}
                iconType={item.iconType}
                iconName={item.iconName}
                label={item.label}
                onPress={item.onPress}
              />
            ))}
        </View>

        {/* Expand Button */}
        <TouchableOpacity onPress={toggleExpand} style={styles.expandButton}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <MaterialIcons
              name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={22}
              color={COLORS.PRIMARY}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Dashboard Content */}
      <View style={styles.contentContainer}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>{t("beranda.sections.businessSummary")}</Text>
          <View style={styles.statsGrid}>
            <StatsCard
              title={t("beranda.stats.subscribers.title")}
              value={stats.subscribers.toString()}
              icon="people"
              color={COLORS.PRIMARY}
              subtitle={t("beranda.stats.subscribers.subtitle")}
            />
            <StatsCard
              title={t("beranda.stats.monthlyRevenue.title")}
              value={`Rp ${stats.monthlyRevenue.toLocaleString("id-ID")}`}
              icon="account-balance-wallet"
              color={COLORS.GREEN4}
              subtitle={t("beranda.stats.monthlyRevenue.subtitle").replace(
                "{{count}}",
                String(stats.completedOrders)
              )}
            />
          </View>
          <View style={styles.statsGrid}>
            <StatsCard
              title={t("beranda.stats.pendingOrders.title")}
              value={stats.pendingOrders.toString()}
              icon="pending-actions"
              color="#FF9800"
              subtitle={t("beranda.stats.pendingOrders.subtitle")}
            />
            <StatsCard
              title={t("beranda.stats.totalOrders.title")}
              value={stats.totalOrders.toString()}
              icon="receipt"
              color="#9C27B0"
              subtitle={t("beranda.stats.totalOrders.subtitle")}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>{t("beranda.sections.quickActions")}</Text>
          {quickActions.map((action, index) => (
            <QuickActionCard
              key={index}
              title={action.title}
              description={action.description}
              icon={action.icon}
              color={action.color}
              onPress={action.onPress}
            />
          ))}
        </View>

        {/* Today's Summary */}
        <View style={styles.todaySummaryContainer}>
          <Text style={styles.sectionTitle}>{t("beranda.sections.todaySummary")}</Text>
          <View style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <MaterialIcons name="today" size={24} color={COLORS.PRIMARY} />
              <Text style={styles.todayTitle}>
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Text>
            </View>
            <View style={styles.todayStats}>
              <View style={styles.todayStatItem}>
                <Text style={styles.todayStatValue}>{stats.pendingOrders}</Text>
                <Text style={styles.todayStatLabel}>{t("beranda.today.newOrders")}</Text>
              </View>
              <View style={styles.todayStatDivider} />
              <View style={styles.todayStatItem}>
                <Text style={styles.todayStatValue}>0</Text>
                <Text style={styles.todayStatLabel}>{t("beranda.today.readyToDeliver")}</Text>
              </View>
              <View style={styles.todayStatDivider} />
              <View style={styles.todayStatItem}>
                <Text style={styles.todayStatValue}>0</Text>
                <Text style={styles.todayStatLabel}>{t("beranda.today.completed")}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerContainer: {
    backgroundColor: COLORS.PRIMARY,
    borderBottomLeftRadius: scale(30),
    borderBottomRightRadius: scale(30),
    minHeight: SCREEN_HEIGHT * 0.16,
    paddingBottom: scale(14),
  },
  headerSafeArea: {
    flex: 1,
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(20),
  },
  welcomeText: {
    color: "white",
    fontSize: scale(18),
    fontWeight: "600",
  },
  storeNameText: {
    color: "white",
    fontSize: scale(24),
    fontWeight: "bold",
    marginTop: scale(2),
  },
  dateText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: scale(12.5),
    textAlign: "right",
    paddingHorizontal: scale(20),
    marginTop: scale(14),
    transform: [{ translateY: scale(14) }]
  },
  notificationButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: scale(25),
    padding: scale(12),
    position: "relative",
    transform: [{ translateY: scale(18) }],
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  menuSection: {
    backgroundColor: "#f8f9fa",
    paddingTop: 18,
    paddingBottom: 6,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingHorizontal: 14,
  },
  menuItem: {
    alignItems: "center",
    width: "25%",
    marginVertical: 8,
    paddingHorizontal: 6,
  },
  menuItemPressed: {
    transform: [{ scale: 0.95 }],
  },
  menuIconContainer: {
    padding: 12,
    borderRadius: 20,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIcon: {
    width: 26,
    height: 26,
  },
  menuLabel: {
    textAlign: "center",
    color: COLORS.PRIMARY,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  expandButton: {
    alignSelf: "center",
    backgroundColor: COLORS.PRIMARY + "15",
    borderRadius: 20,
    padding: 8,
    marginTop: 2,
    marginBottom: 6,
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  statsContainer: {
    marginBottom: 25,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statsCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flex: 1,
    marginHorizontal: 6,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statsContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsTextContainer: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  statsSubtitle: {
    fontSize: 10,
    color: "#999",
  },
  statsIconContainer: {
    borderRadius: 12,
    padding: 8,
  },
  quickActionsContainer: {
    marginBottom: 25,
  },
  quickActionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIcon: {
    borderRadius: 12,
    padding: 12,
    marginRight: 15,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 13,
    color: "#666",
  },
  todaySummaryContainer: {
    marginBottom: 20,
  },
  todayCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  todayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  todayTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 10,
  },
  todayStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  todayStatItem: {
    alignItems: "center",
    flex: 1,
  },
  todayStatValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.PRIMARY,
    marginBottom: 4,
  },
  todayStatLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  todayStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 10,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: -6,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    zIndex: 10,
  },
  warningIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFCDD2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  warningTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B71C1C',
    marginBottom: 4,
  },
  warningSubtitle: {
    fontSize: 12,
    color: '#C62828',
    lineHeight: 16,
  },
  warningButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  warningButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ExpandableMenu;