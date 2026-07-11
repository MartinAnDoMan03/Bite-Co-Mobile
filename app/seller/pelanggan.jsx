import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import config from '../constants/config';
import BRAND from '../constants/color';
import { useLanguage } from '../contexts/LanguageContext';

const COLORS = {
  PRIMARY: BRAND.PRIMARY,
  ACCENT: "#F5B342",
  BACKGROUND: "#F5F6FA",
  WHITE: "#FFFFFF",
  TEXT_PRIMARY: "#212121",
  TEXT_SECONDARY: "#757575",
  BORDER: "#EFEFEF",
  SUCCESS: "#2E7D32",
  WARNING: "#FF9800",
  ERROR: "#F44336",
  BLUE: "#2196F3",
};

// Style badge status pesanan terakhir - bg tint + warna teks senada
// label diambil lewat t() di dalam komponen, di sini cuma simpan key-nya
const STATUS_STYLES = {
  completed: { bg: "#E8F5E9", color: "#2E7D32", key: "completed" },
  delivery: { bg: "#E3F2FD", color: "#1976D2", key: "delivery" },
  processing: { bg: "#FFF3E0", color: "#B26A00", key: "processing" },
  waiting_approval: { bg: "#FFF3E0", color: "#B26A00", key: "waitingApproval" },
};
const getStatusStyle = (status) =>
  STATUS_STYLES[status?.toLowerCase()] || { bg: "#F0F0F0", color: COLORS.TEXT_SECONDARY, key: "pending" };

const CustomerCard = ({ customer, onPress }) => {
  const { t } = useLanguage();
  const statusStyle = getStatusStyle(customer.lastOrderStatus);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('pelanggan.card.dateUnknown');
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const isVip = customer.totalSpent > 1000000 || customer.totalOrders > 10;

  return (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => onPress(customer)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={22} color="#fff" />
        </View>
        <View style={[styles.statusDot, { backgroundColor: statusStyle.color }]} />
      </View>

      <View style={styles.customerInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.customerName} numberOfLines={1}>
            {customer.name || t('pelanggan.card.customerFallback')}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusChipText, { color: statusStyle.color }]}>
              {t(`pelanggan.status.${statusStyle.key}`)}
            </Text>
          </View>
        </View>

        <View style={styles.serviceRow}>
          <MaterialIcons name="restaurant" size={13} color={COLORS.SUCCESS} />
          <Text style={styles.serviceText}>
            {t('pelanggan.card.serviceLabel', { service: customer.mostPreferredService || t('pelanggan.card.serviceFallback') })}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.orderStatsRow}>
            <MaterialIcons name="shopping-bag" size={13} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.statsText}>
              {t('pelanggan.card.ordersStats', { count: customer.totalOrders, amount: formatCurrency(customer.totalSpent) })}
            </Text>
          </View>
          <Text style={styles.lastOrderDate}>{formatDate(customer.lastOrderDate)}</Text>
        </View>

        {isVip && (
          <View style={styles.priorityBadge}>
            <MaterialIcons name="star" size={11} color={COLORS.WARNING} />
            <Text style={styles.priorityText}>{t('pelanggan.card.vip')}</Text>
          </View>
        )}

        {customer.allergyNotes && customer.allergyNotes.length > 0 && (
          <View style={styles.allergyRow}>
            <MaterialIcons name="warning" size={13} color={COLORS.WARNING} />
            <Text style={styles.allergyText} numberOfLines={1}>
              {customer.allergyNotes[0]}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const pelanggan = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [error, setError] = useState(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) {
        setError(t('pelanggan.errors.noToken'));
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

      const responseText = await response.text();
      console.log('Response text:', responseText.substring(0, 200));

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          setCustomers(data.customers || []);
          setFilteredCustomers(data.customers || []);
          setError(null);
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          console.error('Response was:', responseText);
          setError(t('pelanggan.errors.parseFailed'));
        }
      } else {
        console.error('HTTP Error:', response.status, responseText);

        try {
          const errorData = JSON.parse(responseText);
          setError(errorData.error || t('pelanggan.errors.serverErrorGeneric', { status: response.status }));
        } catch {
          if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
            setError(t('pelanggan.errors.serverErrorHtml', { status: response.status }));
          } else {
            setError(t('pelanggan.errors.serverErrorWithBody', { status: response.status, body: responseText.substring(0, 100) }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError(t('pelanggan.errors.fetchFailed'));
    }
  }, [t]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
    }, [fetchCustomers])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  }, [fetchCustomers]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [customers]);

  const handleCustomerPress = (customer) => {
    router.push({
      pathname: "seller/pelangganDetails",
      params: {
        customerId: customer.id,
        customerName: customer.name
      }
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="people-outline" size={72} color={COLORS.TEXT_SECONDARY} />
      <Text style={styles.emptyTitle}>{t('pelanggan.empty.title')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('pelanggan.empty.subtitle')}
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={72} color={COLORS.ERROR} />
      <Text style={styles.errorTitle}>{t('pelanggan.error.title')}</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchCustomers}>
        <Text style={styles.retryButtonText}>{t('pelanggan.error.retry')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      <Text style={styles.loadingText}>{t('pelanggan.loading')}</Text>
    </View>
  );

  const renderCustomer = ({ item }) => (
    <CustomerCard customer={item} onPress={handleCustomerPress} />
  );

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + t('pelanggan.numberFormat.million');
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + t('pelanggan.numberFormat.thousand');
    }
    return num.toString();
  };

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('pelanggan.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('pelanggan.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={19} color="#c2c2c2" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('pelanggan.search.placeholder')}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="clear" size={18} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          )}
        </View>

        {!loading && !error && customers.length > 0 && (
          <View style={styles.enhancedStatsContainer}>
            <View style={styles.primaryStats}>
              <View style={styles.statItem}>
                <MaterialIcons name="people" size={15} color={COLORS.SUCCESS} />
                <Text style={styles.statNumber}>{customers.length}</Text>
                <Text style={styles.statLabel}>{t('pelanggan.stats.totalCustomers')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialIcons name="shopping-bag" size={15} color={COLORS.SUCCESS} />
                <Text style={styles.statNumber}>
                  {customers.reduce((sum, customer) => sum + customer.totalOrders, 0)}
                </Text>
                <Text style={styles.statLabel}>{t('pelanggan.stats.totalOrders')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialIcons name="payments" size={15} color={COLORS.SUCCESS} />
                <Text style={styles.statNumber}>
                  {formatNumber(customers.reduce((sum, customer) => sum + customer.totalSpent, 0))}
                </Text>
                <Text style={styles.statLabel}>{t('pelanggan.stats.totalRevenue')}</Text>
              </View>
            </View>

            <View style={styles.growthMetrics}>
              <View style={[styles.growthChip, { backgroundColor: "#EAF3DE" }]}>
                <MaterialIcons name="trending-up" size={14} color="#27500A" />
                <Text style={[styles.growthChipText, { color: "#27500A" }]}>
                  {t('pelanggan.growth.newCustomers', { count: newCustomers })}
                </Text>
              </View>
              <View style={[styles.growthChip, { backgroundColor: "#E6F1FB" }]}>
                <MaterialIcons name="repeat" size={14} color="#0C447C" />
                <Text style={[styles.growthChipText, { color: "#0C447C" }]}>
                  {t('pelanggan.growth.returningCustomers', { count: returningCustomers })}
                </Text>
              </View>
            </View>
          </View>
        )}

        {loading ? (
          renderLoadingState()
        ) : error ? (
          renderErrorState()
        ) : filteredCustomers.length === 0 ? (
          searchQuery ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={72} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyTitle}>{t('pelanggan.notFound.title')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('pelanggan.notFound.subtitle', { query: searchQuery })}
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
  container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.PRIMARY },
  content: { flex: 1, paddingHorizontal: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 16,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14.5, color: COLORS.TEXT_PRIMARY },
  enhancedStatsContainer: {
    backgroundColor: COLORS.WHITE,
    marginBottom: 14,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statNumber: { fontSize: 19, fontWeight: '700', color: COLORS.SUCCESS },
  statLabel: { fontSize: 11, color: COLORS.TEXT_SECONDARY, textAlign: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: COLORS.BORDER, marginHorizontal: 8 },
  growthMetrics: { flexDirection: 'row', gap: 8 },
  growthChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  growthChipText: { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  customerCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.ACCENT, justifyContent: 'center', alignItems: 'center' },
  statusDot: { position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: COLORS.WHITE },
  customerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  customerName: { fontSize: 15, fontWeight: '700', color: COLORS.TEXT_PRIMARY, flex: 1, marginRight: 8 },
  statusChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  statusChipText: { fontSize: 10.5, fontWeight: '600' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  serviceText: { fontSize: 12.5, color: COLORS.TEXT_SECONDARY },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statsText: { fontSize: 12, color: COLORS.TEXT_SECONDARY },
  lastOrderDate: { fontSize: 11, color: '#aaa' },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    marginTop: 5,
    gap: 3,
  },
  priorityText: { fontSize: 10, fontWeight: '700', color: COLORS.WARNING },
  allergyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  allergyText: { fontSize: 11.5, color: COLORS.WARNING, fontStyle: 'italic', flex: 1 },
  listContainer: { paddingBottom: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.TEXT_PRIMARY, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 13.5, color: COLORS.TEXT_SECONDARY, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  errorTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.ERROR, marginTop: 16, marginBottom: 8 },
  errorSubtitle: { fontSize: 13.5, color: COLORS.TEXT_SECONDARY, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20, marginBottom: 24 },
  retryButton: { backgroundColor: COLORS.PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
  retryButtonText: { color: COLORS.WHITE, fontSize: 15, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 15, color: COLORS.TEXT_SECONDARY, marginTop: 16 },
});