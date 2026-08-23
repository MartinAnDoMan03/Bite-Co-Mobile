import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import COLORS from '../constants/color';
import config from '../constants/config';
import { useLanguage } from '../contexts/LanguageContext';


const StatCard = ({ title, value, percentage, isPositive, loading, comparedText, widthPercent }) => (
  <View style={{ width: `${widthPercent}%`, paddingHorizontal: 5, marginBottom: 10 }}>
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.PRIMARY} />
      ) : (
        <>
          <Text style={styles.statValue}>{value}</Text>
          {percentage !== null && (
            <View style={styles.percentageContainer}>
              <MaterialIcons name={isPositive ? "arrow-upward" : "arrow-downward"} size={12} color={isPositive ? "#2E7D32" : "#C62828"} />
              <Text style={[styles.percentageText, { color: isPositive ? "#2E7D32" : "#C62828" }]}>{percentage}%</Text>
              <Text style={styles.comparedText}>{comparedText}</Text>
            </View>
          )}
        </>
      )}
    </View>
  </View>
);

const SimpleChart = ({ data, labels, loading, title, loadingText }) => {
  if (loading) {
    return (
      <View style={[styles.chartContainer, styles.shadow, { justifyContent: 'center', alignItems: 'center', minHeight: 220 }]}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data, 1); // Ensure we don't divide by 0

  return (
    <View style={[styles.chartContainer, styles.shadow]}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chart}>
        <View style={styles.chartBars}>
          {data.map((value, index) => (
            <View key={index} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  { height: Math.max((value / maxValue) * 120, 2) }
                ]}
              />
              <Text style={styles.barLabel}>{labels[index]}</Text>
            </View>
          ))}
        </View>
        <View style={styles.chartValues}>
          <Text style={styles.chartValue}>{formatCurrency(maxValue)}</Text>
          <Text style={styles.chartValue}>{formatCurrency(maxValue * 0.75)}</Text>
          <Text style={styles.chartValue}>{formatCurrency(maxValue * 0.5)}</Text>
          <Text style={styles.chartValue}>{formatCurrency(maxValue * 0.25)}</Text>
          <Text style={styles.chartValue}>0</Text>
        </View>
      </View>
    </View>
  );
};

const formatCurrency = (amount) => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
};

const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const Laporan = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const { width: liveWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && liveWidth >= 1024;
  const contentMaxWidth = 700;
  const effectiveWidth = isDesktop ? Math.min(liveWidth, contentMaxWidth) : liveWidth;

  const statColumns = isDesktop ? 4 : 2;
  const STAT_GAP = 10;
  const statCardWidth = (effectiveWidth - 32 - STAT_GAP * (statColumns - 1)) / statColumns;

  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState({
    revenue: { current: 0, previous: 0 },
    orders: { current: 0, previous: 0 },
    averageOrder: { current: 0, previous: 0 },
    customers: { current: 0, previous: 0 },
    chartData: [],
    chartLabels: [],
    topItems: [],
  });

  useEffect(() => {
    fetchReportData();
  }, [timeRange]);

  const fetchReportData = async () => {
    try {
      if (!refreshing) setLoading(true);

      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) {
        Alert.alert(t('common.error'), t('laporan.errors.loginRequired'));
        return;
      }

      // Get seller ID from token
      const payload = JSON.parse(atob(token.split('.')[1]));
      const sellerId = payload.sellerId;

      const [ordersResponse, menuResponse] = await Promise.all([
        fetch(`${config.API_URL}/seller/orders`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${config.API_URL}/seller/menu`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!ordersResponse.ok || !menuResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const ordersData = await ordersResponse.json();
      const menuData = await menuResponse.json();

      // Process the data based on time range
      const processedData = processReportData(ordersData.orders || [], menuData.menu || [], timeRange);
      setReportData(processedData);

    } catch (error) {
      console.error('Error fetching report data:', error);
      Alert.alert(t('common.error'), t('laporan.errors.fetchFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  

  const processReportData = (orders, menuItems, period) => {
    const now = new Date();
    let startDate, endDate, previousStartDate, previousEndDate, labels;

    // Define date ranges based on period
    switch (period) {
      case 'week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate = new Date(weekStart.setHours(0, 0, 0, 0));
        endDate = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        endDate.setHours(23, 59, 59, 999);

        previousEndDate = new Date(startDate.getTime() - 1);
        previousStartDate = new Date(previousEndDate.getTime() - 6 * 24 * 60 * 60 * 1000);

        labels = t('laporan.chartLabels.week');
        break;

      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Get weeks in month
        labels = [];
        const weeksInMonth = Math.ceil((endDate.getDate() + startDate.getDay()) / 7);
        for (let i = 1; i <= weeksInMonth; i++) {
          labels.push(`${t('laporan.chartLabels.monthPrefix')}${i}`);
        }
        break;

      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

        labels = t('laporan.chartLabels.year');
        break;
    }

    // Filter orders for current and previous periods
    const currentOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt || order.orderDate);
      return orderDate >= startDate && orderDate <= endDate && (order.status === 'success' || order.statusProgress === 'completed');
    });

    const previousOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt || order.orderDate);
      return orderDate >= previousStartDate && orderDate <= previousEndDate && (order.status === 'success' || order.statusProgress === 'completed');
    });

    // Calculate metrics
    const currentRevenue = currentOrders.reduce((sum, order) => sum + (parseFloat(order.totalAmount) || 0), 0);
    const previousRevenue = previousOrders.reduce((sum, order) => sum + (parseFloat(order.totalAmount) || 0), 0);

    const currentOrderCount = currentOrders.length;
    const previousOrderCount = previousOrders.length;

    const currentAvgOrder = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;
    const previousAvgOrder = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;

    // Get unique customers
    const currentCustomers = new Set(currentOrders.map(order => order.buyerId || order.customerId)).size;
    const previousCustomers = new Set(previousOrders.map(order => order.buyerId || order.customerId)).size;

    // Generate chart data
    const chartData = labels.map((label, index) => {
      let dayRevenue = 0;

      if (period === 'week') {
        const dayOrders = currentOrders.filter(order => {
          const orderDate = new Date(order.createdAt || order.orderDate);
          return orderDate.getDay() === index;
        });
        dayRevenue = dayOrders.reduce((sum, order) => sum + (parseFloat(order.totalAmount) || 0), 0);
      } else if (period === 'month') {
        const weekStart = index * 7 + 1;
        const weekEnd = Math.min((index + 1) * 7, endDate.getDate());
        const weekOrders = currentOrders.filter(order => {
          const orderDate = new Date(order.createdAt || order.orderDate);
          const dayOfMonth = orderDate.getDate();
          return dayOfMonth >= weekStart && dayOfMonth <= weekEnd;
        });
        dayRevenue = weekOrders.reduce((sum, order) => sum + (parseFloat(order.totalAmount) || 0), 0);
      } else if (period === 'year') {
        const monthOrders = currentOrders.filter(order => {
          const orderDate = new Date(order.createdAt || order.orderDate);
          return orderDate.getMonth() === index;
        });
        dayRevenue = monthOrders.reduce((sum, order) => sum + (parseFloat(order.totalAmount) || 0), 0);
      }

      return dayRevenue;
    });

    // Calculate top items
    const itemCounts = {};
    const itemRevenue = {};

    currentOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const itemName = item.name || item.menuName || 'Unknown Item';
          const quantity = parseInt(item.qty) || 1;
          const price = parseFloat(item.price) || 0;

          itemCounts[itemName] = (itemCounts[itemName] || 0) + quantity;
          itemRevenue[itemName] = (itemRevenue[itemName] || 0) + (price * quantity);
        });
      }
    });

    const topItems = Object.keys(itemCounts)
      .map(itemName => ({
        name: itemName,
        orders: itemCounts[itemName],
        revenue: itemRevenue[itemName],
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate percentage changes
    const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const ordersChange = previousOrderCount > 0 ? ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100 : 0;
    const avgOrderChange = previousAvgOrder > 0 ? ((currentAvgOrder - previousAvgOrder) / previousAvgOrder) * 100 : 0;
    const customersChange = previousCustomers > 0 ? ((currentCustomers - previousCustomers) / previousCustomers) * 100 : 0;

    return {
      revenue: {
        current: currentRevenue,
        previous: previousRevenue,
        change: revenueChange,
        hasComparison: previousRevenue > 0,
      },
      orders: {
        current: currentOrderCount,
        previous: previousOrderCount,
        change: ordersChange,
        hasComparison: previousOrderCount > 0,
      },
      averageOrder: {
        current: currentAvgOrder,
        previous: previousAvgOrder,
        change: avgOrderChange,
        hasComparison: previousAvgOrder > 0,
      },
      customers: {
        current: currentCustomers,
        previous: previousCustomers,
        change: customersChange,
        hasComparison: previousCustomers > 0,
      },
      chartData,
      chartLabels: labels,
      topItems,
    };
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReportData();
  };

  const TIME_RANGES = [
    { key: 'week', label: t('laporan.timeRanges.week') },
    { key: 'month', label: t('laporan.timeRanges.month') },
    { key: 'year', label: t('laporan.timeRanges.year') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('laporan.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('laporan.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.timeRangeWrapper}>
        <View style={styles.timeRangeContainer}>
          {TIME_RANGES.map((t2) => {
            const active = timeRange === t2.key;
            return (
              <TouchableOpacity
                key={t2.key}
                style={[styles.timeRangeButton, active && styles.activeTimeRange]}
                onPress={() => setTimeRange(t2.key)}
              >
                <Text style={[styles.timeRangeText, active && styles.activeTimeRangeText]}>
                  {t2.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.PRIMARY]} />
        }
      >
        <View style={isDesktop ? { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' } : undefined}>
        <SimpleChart
          data={reportData.chartData}
          labels={reportData.chartLabels}
          loading={loading}
          title={t('laporan.chart.title')}
          loadingText={t('laporan.chart.loading')}
        />

        <View style={styles.statsGrid}>
          <StatCard
            title={t('laporan.stats.totalRevenue')}
            value={loading ? t('laporan.stats.loadingValue') : formatRupiah(reportData.revenue.current)}
            percentage={loading || !reportData.revenue.hasComparison ? null : Math.abs(reportData.revenue.change).toFixed(1)}
            isPositive={reportData.revenue.change >= 0}
            loading={loading}
            comparedText={t('laporan.stats.comparedToLastPeriod')}
            widthPercent={100 / statColumns}
          />
          <StatCard
            title={t('laporan.stats.totalOrders')}
            value={loading ? t('laporan.stats.loadingValue') : reportData.orders.current.toString()}
            percentage={loading || !reportData.orders.hasComparison ? null : Math.abs(reportData.orders.change).toFixed(1)}
            isPositive={reportData.orders.change >= 0}
            loading={loading}
            comparedText={t('laporan.stats.comparedToLastPeriod')}
            widthPercent={100 / statColumns}
          />
          <StatCard
            title={t('laporan.stats.averageOrder')}
            value={loading ? t('laporan.stats.loadingValue') : formatRupiah(reportData.averageOrder.current)}
            percentage={loading || !reportData.averageOrder.hasComparison ? null : Math.abs(reportData.averageOrder.change).toFixed(1)}
            isPositive={reportData.averageOrder.change >= 0}
            loading={loading}
            comparedText={t('laporan.stats.comparedToLastPeriod')}
            widthPercent={100 / statColumns}
          />
          <StatCard
            title={t('laporan.stats.customers')}
            value={loading ? t('laporan.stats.loadingValue') : reportData.customers.current.toString()}
            percentage={loading || !reportData.customers.hasComparison ? null : Math.abs(reportData.customers.change).toFixed(1)}
            isPositive={reportData.customers.change >= 0}
            loading={loading}
            comparedText={t('laporan.stats.comparedToLastPeriod')}
            widthPercent={100 / statColumns}
          />
        </View>

        <View style={[styles.topItemsContainer, styles.shadow]}>
          <Text style={styles.sectionTitle}>{t('laporan.topItems.title')}</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>{t('laporan.topItems.loading')}</Text>
            </View>
          ) : reportData.topItems.length > 0 ? (
            reportData.topItems.map((item, index) => (
              <View
                key={index}
                style={[styles.topItemRow, index === reportData.topItems.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={styles.topItemLeft}>
                  <View style={styles.itemRankBadge}>
                    <Text style={styles.itemRankText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                </View>
                <View style={styles.topItemRight}>
                  <Text style={styles.itemRevenue}>{formatRupiah(item.revenue)}</Text>
                  <Text style={styles.itemOrders}>{t('laporan.topItems.ordersSuffix', { count: item.orders })}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="bar-chart" size={40} color="#ccc" />
              <Text style={styles.emptyText}>{t('laporan.topItems.empty')}</Text>
            </View>
          )}
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Laporan;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
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

  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  timeRangeWrapper: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  activeTimeRange: {
    backgroundColor: '#F7EAEF',
  },
  timeRangeText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#999',
  },
  activeTimeRangeText: {
    color: COLORS.PRIMARY,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: '#888',
    fontSize: 13,
  },
  chartContainer: {
    backgroundColor: '#fff',
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 18,
    color: '#23272f',
  },
  chart: {
    height: 150,
    flexDirection: 'row',
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    backgroundColor: COLORS.PRIMARY,
    width: 16,
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  chartValues: {
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  chartValue: {
    fontSize: 10,
    color: '#aaa',
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    marginHorizontal: -5,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statTitle: {
    fontSize: 12.5,
    color: '#888',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 19,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 6,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  percentageText: {
    fontSize: 11.5,
    fontWeight: '700',
    marginRight: 4,
  },
  comparedText: {
    fontSize: 10,
    color: '#aaa',
  },
  topItemsContainer: {
    backgroundColor: '#fff',
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    color: '#23272f',
  },
  topItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  itemRankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F7EAEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  itemName: {
    fontSize: 14,
    color: '#23272f',
    flex: 1,
  },
  topItemRight: {
    alignItems: 'flex-end',
  },
  itemOrders: {
    fontSize: 11.5,
    color: '#999',
    marginTop: 2,
  },
  itemRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#23272f',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
  },
});