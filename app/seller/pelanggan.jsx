import { 
  Image, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl,
  TextInput,
  Alert 
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HeaderTitleBack from '../../components/HeaderTitleBack';
import profileBlack from "../../assets/images/profile-black.png";
import { useRouter } from "expo-router";
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
  BLUE: "#2196F3"
};

const CustomerCard = ({ customer, onPress }) => {
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
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => onPress(customer)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={profileBlack}
            style={styles.avatar}
          />
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(customer.lastOrderStatus) }]}>
            <MaterialIcons name="circle" size={8} color={COLORS.WHITE} />
          </View>
        </View>
        
        <View style={styles.customerInfo}>
          <Text style={styles.customerName} numberOfLines={1}>
            {customer.name || 'Customer'}
          </Text>
          <View style={styles.serviceRow}>
            <MaterialIcons name="restaurant" size={14} color={COLORS.PRIMARY} />
            <Text style={styles.serviceText}>
              Layanan: {customer.mostPreferredService || 'Catering'}
            </Text>
          </View>
          <View style={styles.orderStatsRow}>
            <MaterialIcons name="shopping-bag" size={14} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.statsText}>
              {customer.totalOrders} pesanan • {formatCurrency(customer.totalSpent)}
            </Text>
          </View>
          {customer.allergyNotes && customer.allergyNotes.length > 0 && (
            <View style={styles.allergyRow}>
              <MaterialIcons name="warning" size={14} color={COLORS.WARNING} />
              <Text style={styles.allergyText} numberOfLines={1}>
                {customer.allergyNotes[0]}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          {/* Priority Customer Badge */}
          {(customer.totalSpent > 1000000 || customer.totalOrders > 10) && (
            <View style={styles.priorityBadge}>
              <MaterialIcons name="star" size={12} color={COLORS.WARNING} />
              <Text style={styles.priorityText}>VIP</Text>
            </View>
          )}
          
          <View style={[styles.statusChip, { backgroundColor: getStatusColor(customer.lastOrderStatus) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(customer.lastOrderStatus) }]}>
              {getStatusText(customer.lastOrderStatus)}
            </Text>
          </View>
          <Text style={styles.lastOrderDate}>
            {formatDate(customer.lastOrderDate)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const pelanggan = () => {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [error, setError] = useState(null);

  // Fetch customers data from backend
  const fetchCustomers = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) {
        setError('Token tidak ditemukan. Silakan login kembali.');
        return;
      }

      console.log('Fetching customers from:', `${config.API_URL}/seller/customers`);
      
      const response = await fetch(`${config.API_URL}/seller/customers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Get response text first to handle non-JSON responses
      const responseText = await response.text();
      console.log('Response text:', responseText.substring(0, 200)); // Log first 200 chars

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          setCustomers(data.customers || []);
          setFilteredCustomers(data.customers || []);
          setError(null);
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          console.error('Response was:', responseText);
          setError('Gagal memproses data dari server. Response bukan JSON.');
        }
      } else {
        console.error('HTTP Error:', response.status, responseText);
        
        // Try to parse error response if it's JSON
        try {
          const errorData = JSON.parse(responseText);
          setError(errorData.error || `Server error: ${response.status}`);
        } catch {
          // If it's not JSON, it might be HTML error page
          if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
            setError(`Server error: Received HTML instead of JSON (Status: ${response.status})`);
          } else {
            setError(`Server error: ${response.status} - ${responseText.substring(0, 100)}`);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Gagal memuat data pelanggan');
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Refocus effect
  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
    }, [fetchCustomers])
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  }, [fetchCustomers]);

  // Handle search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.includes(searchQuery) ||
        customer.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  // Handle loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [customers]);

  // Navigate to customer details
  const handleCustomerPress = (customer) => {
    router.push({
      pathname: "seller/pelangganDetails",
      params: { 
        customerId: customer.id,
        customerName: customer.name 
      }
    });
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="people-outline" size={80} color={COLORS.TEXT_SECONDARY} />
      <Text style={styles.emptyTitle}>Belum Ada Pelanggan</Text>
      <Text style={styles.emptySubtitle}>
        Pelanggan akan muncul setelah mereka melakukan pemesanan
      </Text>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={80} color={COLORS.ERROR} />
      <Text style={styles.errorTitle}>Terjadi Kesalahan</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchCustomers}>
        <Text style={styles.retryButtonText}>Coba Lagi</Text>
      </TouchableOpacity>
    </View>
  );

  // Render loading state
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      <Text style={styles.loadingText}>Memuat data pelanggan...</Text>
    </View>
  );

  // Render customer item
  const renderCustomer = ({ item }) => (
    <CustomerCard customer={item} onPress={handleCustomerPress} />
  );

  // Format numbers with proper formatting
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'Jt';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'rb';
    }
    return num.toString();
  };

  // Calculate customer growth metrics
  const getCustomerGrowthMetrics = () => {
    if (!customers.length) return { newCustomers: 0, returningCustomers: 0 };
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const newCustomers = customers.filter(customer => {
      const customerSince = new Date(customer.customerSince || customer.lastOrderDate);
      return customerSince >= thirtyDaysAgo;
    }).length;
    
    const returningCustomers = customers.filter(customer => customer.totalOrders > 1).length;
    
    return { newCustomers, returningCustomers };
  };

  const { newCustomers, returningCustomers } = getCustomerGrowthMetrics();

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Pelanggan" />
      
      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={COLORS.TEXT_SECONDARY} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari pelanggan..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="clear" size={20} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          )}
        </View>

        {/* Enhanced Statistics Header with Growth Metrics */}
        {!loading && !error && customers.length > 0 && (
          <View style={styles.enhancedStatsContainer}>
            <View style={styles.primaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{customers.length}</Text>
                <Text style={styles.statLabel}>Total Pelanggan</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {customers.reduce((sum, customer) => sum + customer.totalOrders, 0)}
                </Text>
                <Text style={styles.statLabel}>Total Pesanan</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {formatNumber(customers.reduce((sum, customer) => sum + customer.totalSpent, 0))}
                </Text>
                <Text style={styles.statLabel}>Total Pendapatan</Text>
              </View>
            </View>
            
            {/* Growth Metrics */}
            <View style={styles.growthMetrics}>
              <View style={styles.growthItem}>
                <MaterialIcons name="trending-up" size={16} color={COLORS.SUCCESS} />
                <Text style={styles.growthNumber}>{getCustomerGrowthMetrics().newCustomers}</Text>
                <Text style={styles.growthLabel}>Pelanggan Baru (30 hari)</Text>
              </View>
              <View style={styles.growthItem}>
                <MaterialIcons name="repeat" size={16} color={COLORS.BLUE} />
                <Text style={styles.growthNumber}>{getCustomerGrowthMetrics().returningCustomers}</Text>
                <Text style={styles.growthLabel}>Pelanggan Setia</Text>
              </View>
            </View>
          </View>
        )}

        {/* Content */}
        {loading ? (
          renderLoadingState()
        ) : error ? (
          renderErrorState()
        ) : filteredCustomers.length === 0 ? (
          searchQuery ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={80} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyTitle}>Tidak Ditemukan</Text>
              <Text style={styles.emptySubtitle}>
                Tidak ada pelanggan yang sesuai dengan pencarian "{searchQuery}"
              </Text>
            </View>
          ) : (
            renderEmptyState()
          )
        ) : (
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.id}
            renderItem={renderCustomer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.PRIMARY]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default pelanggan;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
  enhancedStatsContainer: {
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
  primaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.BORDER,
    marginHorizontal: 8,
  },
  growthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  growthItem: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  growthNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 4,
    marginRight: 4,
  },
  growthLabel: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    flex: 1,
  },
  customerCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  statusBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.WHITE,
  },
  customerInfo: {
    flex: 1,
    marginRight: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 6,
  },
  orderStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statsText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 6,
  },
  allergyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  allergyText: {
    fontSize: 12,
    color: COLORS.WARNING,
    marginLeft: 6,
    fontStyle: 'italic',
    flex: 1,
  },
  cardActions: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WARNING + '20',
    borderColor: COLORS.WARNING,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.WARNING,
    marginLeft: 2,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lastOrderDate: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
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
});
