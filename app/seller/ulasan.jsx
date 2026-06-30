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
import HeaderTitleBack from '../../components/HeaderTitleBack';
import COLORS from '../constants/color';
import config from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UlasanSeller = () => {
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
        const reviewedOrders = data.orders.filter(order => order.review && order.rating);
        
        // Calculate stats
        const totalReviews = reviewedOrders.length;
        const totalRating = reviewedOrders.reduce((sum, order) => sum + (order.rating || 0), 0);
        const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;
        
        // Rating breakdown
        const ratingsBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviewedOrders.forEach(order => {
          if (order.rating >= 1 && order.rating <= 5) {
            ratingsBreakdown[Math.floor(order.rating)]++;
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
      Alert.alert('Error', 'Gagal memuat ulasan');
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

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <MaterialIcons
          key={i}
          name={i <= rating ? 'star' : 'star-border'}
          size={16}
          color={i <= rating ? '#FFD700' : '#E0E0E0'}
        />
      );
    }
    return stars;
  };

  const ReviewCard = ({ order }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View>
          <Text style={styles.buyerName}>{order.buyerName || 'Pelanggan'}</Text>
          <Text style={styles.reviewDate}>
            {new Date(order.reviewDate || order.updatedAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.ratingContainer}>
          <View style={styles.starsContainer}>
            {renderStars(order.rating)}
          </View>
          <Text style={styles.ratingText}>{order.rating}/5</Text>
        </View>
      </View>

      {order.review && (
        <View style={styles.reviewContent}>
          <Text style={styles.reviewText}>{order.review}</Text>
        </View>
      )}

      <View style={styles.orderInfo}>
        <Text style={styles.orderLabel}>Pesanan:</Text>
        <Text style={styles.orderDetails}>
          {order.items?.map(item => item.name).join(', ') || 'Detail tidak tersedia'}
        </Text>
      </View>

      {order.orderType && (
        <View style={styles.orderType}>
          <MaterialIcons name="local-dining" size={14} color={COLORS.PRIMARY} />
          <Text style={styles.orderTypeText}>
            {order.orderType} {order.packageType && `• ${order.packageType}`}
          </Text>
        </View>
      )}
    </View>
  );

  const RatingBreakdown = () => (
    <View style={styles.breakdownContainer}>
      <Text style={styles.breakdownTitle}>Breakdown Rating</Text>
      {[5, 4, 3, 2, 1].map(rating => {
        const count = stats.ratingsBreakdown[rating];
        const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
        
        return (
          <View key={rating} style={styles.breakdownRow}>
            <Text style={styles.breakdownRating}>{rating}</Text>
            <MaterialIcons name="star" size={14} color="#FFD700" />
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
    <View style={styles.statsHeader}>
      <View style={styles.averageRatingContainer}>
        <Text style={styles.averageRating}>{stats.averageRating}</Text>
        <View style={styles.starsContainer}>
          {renderStars(Math.round(stats.averageRating))}
        </View>
        <Text style={styles.totalReviews}>
          {stats.totalReviews} ulasan
        </Text>
      </View>
      <RatingBreakdown />
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="rate-review" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Belum Ada Ulasan</Text>
      <Text style={styles.emptyDescription}>
        Ulasan dari pelanggan akan muncul di sini setelah mereka menyelesaikan pesanan
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Ulasan Pelanggan" />
      
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
            <>
              <StatsHeader />
              
              <View style={styles.reviewsList}>
                <Text style={styles.sectionTitle}>
                  Semua Ulasan ({stats.totalReviews})
                </Text>
                {reviews.map((order, index) => (
                  <ReviewCard key={order.id || index} order={order} />
                ))}
              </View>
            </>
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
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  loader: {
    marginTop: 40,
  },
  statsHeader: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 16,
  },
  averageRatingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  totalReviews: {
    fontSize: 14,
    color: '#666',
  },
  breakdownContainer: {
    marginTop: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  breakdownRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 12,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  breakdownCount: {
    fontSize: 12,
    color: '#666',
    width: 20,
    textAlign: 'right',
  },
  reviewsList: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  buyerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  reviewContent: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  orderInfo: {
    marginBottom: 8,
  },
  orderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  orderDetails: {
    fontSize: 14,
    color: '#333',
  },
  orderType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderTypeText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
