import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import starYellow from "../../assets/images/starYellow.png";
import starGrey from "../../assets/images/starGrey.png";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from '../constants/color';
import config from '../constants/config';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from '../../components/ToastProvider';

const { width } = Dimensions.get('window');

const DetailOrder = () => {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [maxRating, setMaxRating] = useState(5);
  const [orderData, setOrderData] = useState(null);
  const [sellerData, setSellerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("buyerToken");
      
      // Fetch order details
      const orderResponse = await fetch(`${config.API_URL}/buyer/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (orderResponse.ok) {
        const orderResult = await orderResponse.json();
        setOrderData(orderResult.order);

        // Fetch seller details
        if (orderResult.order.sellerId) {
          const sellerResponse = await fetch(`${config.API_URL}/seller/detail/${orderResult.order.sellerId}`);
          if (sellerResponse.ok) {
            const sellerResult = await sellerResponse.json();
            setSellerData(sellerResult.seller);
          }
        }
      } else {
        showError("Gagal memuat detail pesanan");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      showError("Gagal memuat detail pesanan");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!review.trim()) {
      showError("Mohon tulis ulasan Anda");
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("buyerToken");
      
      const reviewData = {
        rating: rating,
        review: review.trim(),
        orderId: orderId,
        sellerId: orderData.sellerId,
      };

      console.log('[DEBUG] Submitting review data:', reviewData);

      const response = await fetch(`${config.API_URL}/buyer/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reviewData),
      });

      console.log('[DEBUG] Review response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('[DEBUG] Review response data:', responseData);
        showSuccess("Ulasan berhasil dikirim!");
        router.back();
      } else {
        const errorData = await response.json();
        console.log('[DEBUG] Review error data:', errorData);
        showError(errorData.message || "Gagal mengirim ulasan");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      showError("Gagal mengirim ulasan");
    } finally {
      setSubmitting(false);
    }
  };

  // Header selaras dengan halaman lain (putih, rounded bottom, aksen burgundy)
  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Kembali">
        <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Detail Order</Text>
      <View style={{ width: 26 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Memuat detail pesanan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#ccc" />
          <Text style={styles.errorText}>Pesanan tidak ditemukan</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.questionText}>Bagaimana makanan mu?</Text>
          <Text style={styles.subText}>Berikan rating dan ulasan untuk pesanan ini</Text>
          
          <View style={styles.starsContainer}>
            {[...Array(maxRating)].map((_, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.7}
                onPress={() => setRating(index + 1)}
                style={styles.starButton}
              >
                <Image
                  source={index < rating ? starYellow : starGrey}
                  style={styles.starImage}
                />
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.ratingText}>
            {rating} dari {maxRating} bintang
          </Text>
        </View>

        {/* Order Info Section */}
        <View style={styles.orderInfoSection}>
          <View style={styles.storeInfo}>
            {sellerData?.storeIcon ? (
              <Image source={{ uri: sellerData.storeIcon }} style={styles.storeIcon} />
            ) : (
              <View style={[styles.storeIcon, styles.placeholderIcon]}>
                <MaterialIcons name="store" size={32} color="#999" />
              </View>
            )}
            <View style={styles.storeDetails}>
              <Text style={styles.storeName}>
                {sellerData?.outletName || "Toko"}
              </Text>
              <Text style={styles.orderId}>Order ID: {orderData.id}</Text>
              <Text style={styles.orderDate}>
                {orderData.createdAt ? new Date(orderData.createdAt).toLocaleString() : "-"}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Detail Pembelian</Text>
          
          {orderData.items && orderData.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}
              </View>
              <Text style={styles.itemPrice}>
                Rp {item.price?.toLocaleString()}
              </Text>
            </View>
          ))}
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Pembayaran</Text>
            <Text style={styles.totalAmount}>
              Rp {orderData.totalAmount?.toLocaleString()}
            </Text>
          </View>

          {orderData.pax && (
            <View style={styles.paxInfo}>
              <MaterialIcons name="people" size={18} color={COLORS.PRIMARY} />
              <Text style={styles.paxText}>Jumlah Pax: {orderData.pax}</Text>
            </View>
          )}

          {orderData.orderType && (
            <View style={styles.orderTypeInfo}>
              <MaterialIcons name="category" size={18} color={COLORS.PRIMARY} />
              <Text style={styles.orderTypeText}>Tipe: {orderData.orderType}</Text>
            </View>
          )}

          {/* Show date information for Rantangan orders */}
          {orderData.orderType === 'Rantangan' && orderData.startDate && (
            <View style={styles.dateInfo}>
              <View style={styles.dateRow}>
                <MaterialIcons name="calendar-today" size={18} color={COLORS.GREEN4} />
                <Text style={styles.dateText}>
                  Mulai: {new Date(orderData.startDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
              </View>
              {orderData.endDate && orderData.packageType !== 'Harian' && (
                <View style={styles.dateRow}>
                  <MaterialIcons name="event" size={18} color="#666" />
                  <Text style={styles.dateText}>
                    Berakhir: {new Date(orderData.endDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              )}
              {orderData.packageType && (
                <View style={styles.dateRow}>
                  <MaterialIcons name="local-offer" size={18} color="#ff9800" />
                  <Text style={[styles.dateText, { color: '#ff9800', fontWeight: '600' }]}>
                    Paket: {orderData.packageType}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Review Input Section */}
        <View style={styles.reviewSection}>
          <Text style={styles.sectionTitle}>Tulis Ulasan</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Ceritakan pengalaman Anda dengan pesanan ini..."
            multiline
            numberOfLines={4}
            value={review}
            onChangeText={setReview}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmitReview}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Kirim Ulasan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DetailOrder;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.PRIMARY },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  backButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  starImage: {
    width: 44,
    height: 44,
  },
  ratingText: {
    fontSize: 16,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  orderInfoSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  placeholderIcon: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  detailsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.GREEN4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  paxInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  paxText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  orderTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  orderTypeText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  dateInfo: {
    marginTop: 12,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.GREEN4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  reviewSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#f8f9fa',
  },
  submitSection: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  submitButton: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});