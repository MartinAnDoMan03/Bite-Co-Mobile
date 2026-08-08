import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import COLORS from '../constants/color';
import config from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../contexts/LanguageContext';

const UlasanSeller = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingsBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });

  const fetchReviews = async () => {
    try {
      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) return;

      // Fetch reviews from orders that have reviews
      const response = await fetch(`${config.API_URL}/seller/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.orders) {
        // Filter orders that have reviews
        const reviewedOrders = data.orders.filter(order => order.ulasan && order.ulasan.rating);

        // Calculate stats
        const totalReviews = reviewedOrders.length;
        const totalRating = reviewedOrders.reduce((sum, order) => sum + (order.ulasan.rating || 0), 0);
        const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;

        // Rating breakdown
        const ratingsBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviewedOrders.forEach(order => {
          const rating = order.ulasan.rating;
          if (rating >= 1 && rating <= 5) {
            ratingsBreakdown[Math.floor(rating)]++;
          }
        });

        setReviews(reviewedOrders);
        setStats({
          averageRating: parseFloat(averageRating),
          totalReviews,
          ratingsBreakdown,
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      Alert.alert(t('common.error'), t('ulasan.errors.fetchFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const renderStars = (rating, size = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <MaterialIcons
          key={i}
          name={i <= rating ? 'star' : 'star-border'}
          size={size}
          color={i <= rating ? '#F5B342' : '#E0E0E0'}
        />
      );
    }
    return stars;
  };

const ReviewCard = ({ order }) => (
    <View style={[styles.reviewCard, styles.shadow]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerAvatar}>
          <MaterialIcons name="person" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.buyerName} numberOfLines={1}>{order.buyerName || t('ulasan.buyerFallback')}</Text>
          <Text style={styles.reviewDate}>
            {/* PERBAIKAN: Ambil tanggal dari dalam ulasan */}
            {new Date(order.ulasan?.createdAt || order.updatedAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.ratingContainer}>
          <View style={styles.starsRow}>{renderStars(order.ulasan?.rating || 0, 13)}</View>
          <Text style={styles.ratingText}>{t('ulasan.ratingOutOf5', { rating: order.ulasan?.rating || 0 })}</Text>
        </View>
      </View>

      {order.ulasan?.review && (
        <View style={styles.reviewContent}>
          <Text style={styles.reviewText}>{order.ulasan.review}</Text>
        </View>
      )}

      <View style={styles.orderInfo}>
        <Text style={styles.orderLabel}>{t('ulasan.orderLabel')}</Text>
        <Text style={styles.orderDetails} numberOfLines={2}>
          {order.items?.map(item => item.name).join(', ') || t('ulasan.orderDetailsFallback')}
        </Text>
      </View>

      {order.orderType && (
        <View style={styles.orderTypeRow}>
          <MaterialIcons name="local-dining" size={13} color={COLORS.PRIMARY} />
          <Text style={styles.orderTypeText}>
            {order.orderType} {order.packageType && `• ${order.packageType}`}
          </Text>
        </View>
      )}
    </View>
  );

  const RatingBreakdown = () => (
    <View style={styles.breakdownContainer}>
      {[5, 4, 3, 2, 1].map(rating => {
        const count = stats.ratingsBreakdown[rating];
        const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

        return (
          <View key={rating} style={styles.breakdownRow}>
            <Text style={styles.breakdownRating}>{rating}</Text>
            <MaterialIcons name="star" size={12} color="#F5B342" />
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${percentage}%` }]} />
            </View>
            <Text style={styles.breakdownCount}>{count}</Text>
          </View>
        );
      })}
    </View>
  );

  const StatsHeader = () => (
    <View style={[styles.statsHeader, styles.shadow]}>
      <View style={styles.averageRatingContainer}>
        <Text style={styles.averageRating}>{stats.averageRating}</Text>
        <View style={styles.starsRow}>{renderStars(Math.round(stats.averageRating), 15)}</View>
        <Text style={styles.totalReviews}>{t('ulasan.totalReviews', { count: stats.totalReviews })}</Text>
      </View>
      <View style={styles.statsDivider} />
      <RatingBreakdown />
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <MaterialIcons name="rate-review" size={40} color="#bbb" />
      </View>
      <Text style={styles.emptyTitle}>{t('ulasan.empty.title')}</Text>
      <Text style={styles.emptyDescription}>
        {t('ulasan.empty.description')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('ulasan.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ulasan.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.PRIMARY}
          style={styles.loader}
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.PRIMARY]}
            />
          }
        >
          {reviews.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={{ padding: 16 }}>
              <StatsHeader />

              <View style={styles.reviewsList}>
                <Text style={styles.sectionTitle}>
                  {t('ulasan.allReviews', { count: stats.totalReviews })}
                </Text>
                {reviews.map((order, index) => (
                  <ReviewCard key={order.id || index} order={order} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default UlasanSeller;

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

  scrollView: {
    flex: 1,
  },
  loader: {
    marginTop: 60,
  },

  statsHeader: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 18,
  },
  averageRatingContainer: {
    alignItems: 'center',
  },
  averageRating: {
    fontSize: 40,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 6,
  },
  totalReviews: {
    fontSize: 13,
    color: '#888',
  },
  statsDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  breakdownContainer: {
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownRating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#23272f',
    width: 10,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#F5B342',
    borderRadius: 3,
  },
  breakdownCount: {
    fontSize: 11.5,
    color: '#999',
    width: 18,
    textAlign: 'right',
  },

  reviewsList: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5B342',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyerName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 11.5,
    color: '#999',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  ratingText: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  reviewContent: {
    backgroundColor: '#F5F6FA',
    padding: 11,
    borderRadius: 8,
    marginBottom: 10,
  },
  reviewText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 19,
  },
  orderInfo: {
    marginBottom: 6,
  },
  orderLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 3,
  },
  orderDetails: {
    fontSize: 13,
    color: '#333',
  },
  orderTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderTypeText: {
    fontSize: 11.5,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 19,
  },
});