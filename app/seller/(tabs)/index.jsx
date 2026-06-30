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

const { width } = Dimensions.get("window");

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

const MenuSection = ({ router }) => {
  const additionalMenus = [
    {
      icon: riwayat,
      iconType: "image",
      label: "Riwayat",
      onPress: () => router.push("seller/riwayat"),
    },
    {
      icon: gizi,
      iconType: "image",
      label: "GiziPro",
      onPress: () => router.push("seller/gizipro"),
    },
    {
      icon: biteeco,
      iconType: "image",
      label: "Bite Eco",
      onPress: () => router.push("seller/biteeco/management"),
    },
    {
      icon: ulasan,
      iconType: "image",
      label: "Ulasan",
      onPress: () => router.push("seller/ulasan"),
    },
    {
      iconType: "material",
      iconName: "help",
      label: "Bantuan",
      color: "#FF9800",
      onPress: () => router.push("seller/bantuan"),
    },
    {
      iconType: "material",
      iconName: "settings",
      label: "Pengaturan",
      color: "#607D8B",
      onPress: () => router.push("seller/settings"),
    },
  ];

  return (
    <View style={styles.additionalMenuContainer}>
      {additionalMenus.map((item, index) => (
        <MenuItem
          key={index}
          icon={item.icon}
          iconType={item.iconType}
          iconName={item.iconName}
          label={item.label}
          color={item.color || "white"}
          onPress={item.onPress}
        />
      ))}
    </View>
  );
};

const ExpandableMenu = () => {
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

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("sellerToken");
      if (!token) return;
      const response = await axios.get(`${config.API_URL}/seller/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStoreName(
        response.data.name || response.data.outletName || "Warung Saya"
      );
      setStoreAddress(
        response.data.address ||
          response.data.pinAddress ||
          "Alamat belum diatur"
      );
    } catch (err) {
      console.error("Error fetching profile:", err);
      setStoreName("Warung Saya");
      setStoreAddress("Alamat belum diatur");
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
        (order) =>
          order.statusProgress === "waiting_approval" ||
          order.statusProgress === "processing"
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
          order.orderType === "Rantangan" &&
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
      label: "Pelanggan",
      onPress: () => router.push("seller/pelanggan"),
    },
    {
      icon: menu,
      iconType: "image",
      label: "Menu",
      onPress: () => router.push("seller/menu"),
    },
    {
      icon: jadwal,
      iconType: "image",
      label: "Jadwal",
      onPress: () => router.push("seller/JadwalPengantaran"),
    },
    {
      icon: laporan,
      iconType: "image",
      label: "Laporan",
      onPress: () => router.push("seller/Laporan"),
    },
  ];

  const quickActions = [
    {
      title: "Tambah Menu Baru",
      description: "Tambahkan menu makanan ke katalog Anda",
      icon: "add-circle",
      color: COLORS.GREEN4,
      onPress: () => router.push("seller/menu/add"),
    },
    {
      title: "Lihat Pesanan Baru",
      description: `${stats.pendingOrders} pesanan menunggu konfirmasi`,
      icon: "notifications",
      color: "#FF9800",
      onPress: () => router.push("seller/(tabs)/order"),
    },
    {
      title: "Update Jadwal",
      description: "Atur jadwal pengantaran mingguan",
      icon: "schedule",
      color: COLORS.PRIMARY,
      onPress: () => router.push("seller/JadwalPengantaran"),
    },
  ];

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
        <SafeAreaView>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.welcomeText}>Selamat Datang!</Text>
              <Text style={styles.timeText}>
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
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

          {/* Restaurant Info Card */}
          <View style={styles.restaurantCard}>
            <View style={styles.restaurantInfo}>
              <View style={styles.restaurantIconContainer}>
                <MaterialIcons
                  name="restaurant"
                  size={32}
                  color={COLORS.PRIMARY}
                />
              </View>
              <View style={styles.restaurantDetails}>
                <Text style={styles.restaurantName}>{storeName}</Text>
                <View style={styles.addressContainer}>
                  <MaterialIcons name="location-on" size={16} color="#666" />
                  <Text style={styles.restaurantAddress}>{storeAddress}</Text>
                </View>
                <View style={styles.statusContainer}>
                  <View style={styles.onlineIndicator} />
                  <Text style={styles.onlineText}>Online</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Main Menu Grid */}
          <View style={styles.mainMenuContainer}>
            {mainMenuItems.map((item, index) => (
              <MenuItem
                key={index}
                icon={item.icon}
                iconType={item.iconType}
                label={item.label}
                onPress={item.onPress}
              />
            ))}
          </View>

          {/* Expandable Section */}
          {expanded && <MenuSection router={router} />}
        </SafeAreaView>

        {/* Expand Button */}
        <TouchableOpacity onPress={toggleExpand} style={styles.expandButton}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <MaterialIcons
              name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={24}
              color="white"
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Dashboard Content */}
      <View style={styles.contentContainer}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Ringkasan Bisnis</Text>
          <View style={styles.statsGrid}>
            <StatsCard
              title="Berlangganan"
              value={stats.subscribers.toString()}
              icon="people"
              color={COLORS.PRIMARY}
              subtitle="Pelanggan rantangan"
            />
            <StatsCard
              title="Pendapatan Bulan Ini"
              value={`Rp ${stats.monthlyRevenue.toLocaleString("id-ID")}`}
              icon="account-balance-wallet"
              color={COLORS.GREEN4}
              subtitle={`Dari ${stats.completedOrders} pesanan`}
            />
          </View>
          <View style={styles.statsGrid}>
            <StatsCard
              title="Pesanan Pending"
              value={stats.pendingOrders.toString()}
              icon="pending-actions"
              color="#FF9800"
              subtitle="Perlu konfirmasi"
            />
            <StatsCard
              title="Total Pesanan"
              value={stats.totalOrders.toString()}
              icon="receipt"
              color="#9C27B0"
              subtitle="Semua waktu"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Aksi Cepat</Text>
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
          <Text style={styles.sectionTitle}>Ringkasan Hari Ini</Text>
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
                <Text style={styles.todayStatLabel}>Pesanan Baru</Text>
              </View>
              <View style={styles.todayStatDivider} />
              <View style={styles.todayStatItem}>
                <Text style={styles.todayStatValue}>0</Text>
                <Text style={styles.todayStatLabel}>Siap Kirim</Text>
              </View>
              <View style={styles.todayStatDivider} />
              <View style={styles.todayStatItem}>
                <Text style={styles.todayStatValue}>0</Text>
                <Text style={styles.todayStatLabel}>Selesai</Text>
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
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 10,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  welcomeText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  timeText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginTop: 2,
  },
  notificationButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 25,
    padding: 12,
    position: "relative",
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
  restaurantCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  restaurantInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  restaurantIconContainer: {
    backgroundColor: COLORS.PRIMARY + "20",
    borderRadius: 15,
    padding: 12,
    marginRight: 15,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  restaurantAddress: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
    flex: 1,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  mainMenuContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  additionalMenuContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  menuItem: {
    alignItems: "center",
    width: "22%",
    marginVertical: 8,
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
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  expandButton: {
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    padding: 8,
    marginTop: 5,
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
});

export default ExpandableMenu;
