import { 
  Image, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  Alert 
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HeaderTitleBack from '../../components/HeaderTitleBack';
import profileBlack from "../../assets/images/profile-black.png";
import config from '../constants/config';

const COLORS = {
  PRIMARY: "#2E7D32",
  SECONDARY: "#4CAF50", 
  ACCENT: "#8BC34A",
  BACKGROUND: "#F8F9FA",
  WHITE: "#FFFFFF",
  TEXT_PRIMARY: "#212121",
  TEXT_SECONDARY: "#757575",
  BORDER: "#E0E0E0",
  SUCCESS: "#4CAF50",
  WARNING: "#FF9800",
  ERROR: "#F44336",
  BLUE: "#2196F3",
  LIGHT_GRAY: "#F5F5F5"
};

const pelangganDetails = () => {
  const router = useRouter();
  const { customerId, customerName } = useLocalSearchParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch customer details from backend
  const fetchCustomerDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) {
        setError('Token tidak ditemukan. Silakan login kembali.');
        return;
      }

      console.log('Fetching customer details from:', `${config.API_URL}/seller/customers/${customerId}`);
      
      const response = await fetch(`${config.API_URL}/seller/customers/${customerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Customer details response status:', response.status);

      // Get response text first to handle non-JSON responses
      const responseText = await response.text();
      console.log('Customer details response text:', responseText.substring(0, 200));

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          setCustomer(data.customer);
          setError(null);
        } catch (parseError) {
          console.error('JSON Parse Error in customer details:', parseError);
          setError('Gagal memproses data detail pelanggan dari server.');
        }
      } else {
        console.error('HTTP Error in customer details:', response.status, responseText);
        
        try {
          const errorData = JSON.parse(responseText);
          setError(errorData.error || `Server error: ${response.status}`);
        } catch {
          if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
            setError(`Server error: Received HTML instead of JSON (Status: ${response.status})`);
          } else {
            setError(`Server error: ${response.status} - ${responseText.substring(0, 100)}`);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      setError('Gagal memuat detail pelanggan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
    }
  }, [customerId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCustomerDetails();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Tidak diketahui';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return COLORS.SUCCESS;
      case 'delivery': return COLORS.BLUE;
      case 'processing': return COLORS.WARNING;
      case 'waiting_approval': return COLORS.WARNING;
      default: return COLORS.TEXT_SECONDARY;
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'Selesai';
      case 'delivery': return 'Dikirim';
      case 'processing': return 'Diproses';
      case 'waiting_approval': return 'Menunggu';
      default: return 'Pending';
    }
  };

  const handleContactCustomer = () => {
    if (customer?.phone) {
      Alert.alert(
        "Hubungi Pelanggan",
        `Apakah Anda ingin menghubungi ${customer.name}?`,
        [
          { text: "Batal", style: "cancel" },
          { 
            text: "WhatsApp", 
            onPress: () => {
              // Open WhatsApp (you can implement this)
              console.log(`Open WhatsApp to ${customer.phone}`);
            }
          },
          { 
            text: "Telepon", 
            onPress: () => {
              // Open phone dialer (you can implement this)
              console.log(`Call ${customer.phone}`);
            }
          }
        ]
      );
    } else {
      Alert.alert("Informasi", "Nomor telepon pelanggan tidak tersedia");
    }
  };

  // Calculate customer insights
  const getCustomerInsights = (customer) => {
    if (!customer) return {};
    
    const avgOrderValue = customer.totalSpent / (customer.totalOrders || 1);
    const isHighValue = avgOrderValue > 200000; // Above 200k average
    const isFrequent = customer.totalOrders >= 5;
    const isRecent = new Date(customer.lastOrderDate) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // Within 14 days
    
    let customerType = 'Pelanggan Baru';
    if (isHighValue && isFrequent) customerType = 'Pelanggan Premium';
    else if (isFrequent) customerType = 'Pelanggan Setia';
    else if (isHighValue) customerType = 'Pelanggan Bernilai Tinggi';
    
    const loyaltyLevel = customer.totalOrders >= 10 ? 'Sangat Setia' : 
                        customer.totalOrders >= 5 ? 'Setia' : 
                        customer.totalOrders >= 2 ? 'Berkembang' : 'Baru';
    
    return {
      customerType,
      loyaltyLevel,
      isHighValue,
      isFrequent,
      isRecent,
      avgOrderValue
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderTitleBack title={customerName || "Detail Pelanggan"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Memuat detail pelanggan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderTitleBack title={customerName || "Detail Pelanggan"} />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={80} color={COLORS.ERROR} />
          <Text style={styles.errorTitle}>Terjadi Kesalahan</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCustomerDetails}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderTitleBack title={customerName || "Detail Pelanggan"} />
        <View style={styles.errorContainer}>
          <MaterialIcons name="person-off" size={80} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.errorTitle}>Pelanggan Tidak Ditemukan</Text>
          <Text style={styles.errorSubtitle}>Data pelanggan tidak dapat dimuat</Text>
        </View>
      </SafeAreaView>
    );
  }

  const insights = getCustomerInsights(customer);

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title={customer.name} />
      
      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.PRIMARY]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <Image
              source={profileBlack}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.customerName}>{customer.name}</Text>
              <View style={styles.contactInfo}>
                {customer.email && (
                  <View style={styles.contactRow}>
                    <MaterialIcons name="email" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.contactText}>{customer.email}</Text>
                  </View>
                )}
                {customer.phone && (
                  <View style={styles.contactRow}>
                    <MaterialIcons name="phone" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.contactText}>{customer.phone}</Text>
                    <TouchableOpacity style={styles.contactButton} onPress={handleContactCustomer}>
                      <MaterialIcons name="phone" size={20} color={COLORS.WHITE} />
                    </TouchableOpacity>
                  </View>
                )}
                {customer.address && (
                  <View style={styles.contactRow}>
                    <MaterialIcons name="location-on" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.contactText} numberOfLines={2}>
                      {customer.address}
                      {customer.kelurahan && `, ${customer.kelurahan}`}
                      {customer.kecamatan && `, ${customer.kecamatan}`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Statistics Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{customer.totalOrders}</Text>
              <Text style={styles.statLabel}>Total Pesanan</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{formatCurrency(customer.totalSpent)}</Text>
              <Text style={styles.statLabel}>Total Belanja</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{formatCurrency(customer.averageOrderValue || 0)}</Text>
              <Text style={styles.statLabel}>Rata-rata Pesanan</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{formatDate(customer.customerSince)}</Text>
              <Text style={styles.statLabel}>Pelanggan Sejak</Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.infoSection}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="info" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>Informasi Pelanggan</Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={20} color={COLORS.TEXT_SECONDARY} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Pesanan Terakhir</Text>
              <Text style={styles.infoValue}>{formatDate(customer.lastOrderDate)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="restaurant" size={20} color={COLORS.TEXT_SECONDARY} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Layanan Favorit</Text>
              <Text style={styles.infoValue}>{customer.mostPreferredService}</Text>
            </View>
          </View>

          {customer.stats && (
            <View style={styles.infoRow}>
              <MaterialIcons name="assessment" size={20} color={COLORS.TEXT_SECONDARY} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Status Pesanan</Text>
                <Text style={styles.infoValue}>
                  {customer.stats.completedOrders} selesai, {customer.stats.processingOrders} diproses
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Customer Insights Section */}
        <View style={styles.insightsSection}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="insights" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>Analisis Pelanggan</Text>
          </View>
          
          <View style={styles.insightsGrid}>
            <View style={styles.insightCard}>
              <MaterialIcons name="star" size={20} color={COLORS.SUCCESS} />
              <Text style={styles.insightLabel}>Tipe Pelanggan</Text>
              <Text style={styles.insightValue}>{getCustomerInsights(customer).customerType}</Text>
            </View>
            
            <View style={styles.insightCard}>
              <MaterialIcons name="favorite" size={20} color={COLORS.ERROR} />
              <Text style={styles.insightLabel}>Tingkat Loyalitas</Text>
              <Text style={styles.insightValue}>{getCustomerInsights(customer).loyaltyLevel}</Text>
            </View>
          </View>
        </View>

        {/* Allergy/Special Notes */}
        {customer.allergyNotes && customer.allergyNotes.length > 0 && (
          <View style={styles.allergySection}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="warning" size={20} color={COLORS.WARNING} />
              <Text style={styles.sectionTitle}>Catatan Khusus</Text>
            </View>
            {customer.allergyNotes.map((note, index) => (
              <View key={index} style={styles.allergyNote}>
                <MaterialIcons name="info" size={16} color={COLORS.WARNING} />
                <Text style={styles.allergyText}>{note}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Service Preferences */}
        {customer.servicePreferences && Object.keys(customer.servicePreferences).length > 0 && (
          <View style={styles.preferencesSection}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="favorite" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.sectionTitle}>Preferensi Layanan</Text>
            </View>
            <View style={styles.preferencesGrid}>
              {Object.entries(customer.servicePreferences).map(([service, count]) => (
                <View key={service} style={styles.preferenceCard}>
                  <Text style={styles.preferenceService}>{service}</Text>
                  <Text style={styles.preferenceCount}>{count} pesanan</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Orders */}
        <View style={styles.ordersSection}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="receipt" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>Riwayat Pesanan</Text>
          </View>
          
          {customer.orders && customer.orders.length > 0 ? (
            customer.orders.map((order, index) => (
              <View key={order.id || index} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderType}>{order.type}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.date)}</Text>
                  </View>
                  <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.orderDetails}>
                  <Text style={styles.orderAmount}>{formatCurrency(order.amount)}</Text>
                  <Text style={styles.orderPax}>• {order.pax} porsi</Text>
                </View>
                
                {order.notes && (
                  <Text style={styles.orderNotes}>{order.notes}</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noOrdersText}>Belum ada riwayat pesanan</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default pelangganDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.ERROR,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  profileSection: {
    backgroundColor: COLORS.WHITE,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  contactInfo: {
    gap: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  contactButton: {
    backgroundColor: COLORS.PRIMARY,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.LIGHT_GRAY,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  insightsSection: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    backgroundColor: COLORS.LIGHT_GRAY,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  insightLabel: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  allergySection: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 8,
  },
  allergyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.WARNING + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.WARNING,
  },
  allergyText: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  preferencesSection: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preferenceCard: {
    backgroundColor: COLORS.PRIMARY + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY + '30',
  },
  preferenceService: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  preferenceCount: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  ordersSection: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderCard: {
    backgroundColor: COLORS.LIGHT_GRAY,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderInfo: {
    flex: 1,
  },
  orderType: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  orderPax: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 8,
  },
  orderNotes: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
    marginTop: 4,
  },
  noOrdersText: {
    textAlign: 'center',
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
    paddingVertical: 20,
  },
});