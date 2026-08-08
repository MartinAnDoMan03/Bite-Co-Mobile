import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import profileBlack from "../../assets/images/profile-black.png";
import config from '../constants/config';
import COLORS from '../constants/color';
import { useLanguage } from '../contexts/LanguageContext';

// Status -> warna pill (bg tint), selaras dengan pola di JadwalPengantaran
const STATUS_STYLES = {
  completed: { bg: "#E8F5E9", color: "#2E7D32" },
  delivery: { bg: "#E3F2FD", color: "#1976D2" },
  processing: { bg: "#FFF3E0", color: "#B26A00" },
  waiting_approval: { bg: "#FFF3E0", color: "#B26A00" },
};
const getStatusStyle = (status) =>
  STATUS_STYLES[status?.toLowerCase()] || { bg: "#F0F0F0", color: "#757575" };

// Label status diambil dari key pelanggan.status.* yang sudah ada di locale
const STATUS_KEYS = {
  completed: "completed",
  delivery: "delivery",
  processing: "processing",
  waiting_approval: "waitingApproval",
};
const getStatusKey = (status) => STATUS_KEYS[status?.toLowerCase()] || "pending";

const ALERT_TYPE_STYLES = {
  info: { icon: 'info', color: COLORS.PRIMARY, bg: '#F7EAEF' },
  success: { icon: 'check-circle', color: '#2E7D32', bg: '#E8F5E9' },
  error: { icon: 'error', color: '#C62828', bg: '#FFEBEE' },
  warning: { icon: 'warning', color: '#B26A00', bg: '#FFF3E0' },
};

const CustomAlert = ({ visible, title, message, buttons, type = 'info', onClose }) => {
  const typeStyle = ALERT_TYPE_STYLES[type] || ALERT_TYPE_STYLES.info;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.alertOverlay}>
        <View style={styles.alertContent}>
          <View style={[styles.alertIconCircle, { backgroundColor: typeStyle.bg }]}>
            <MaterialIcons name={typeStyle.icon} size={26} color={typeStyle.color} />
          </View>
          <Text style={styles.alertTitle}>{title}</Text>
          {!!message && <Text style={styles.alertMessage}>{message}</Text>}
          <View style={styles.alertButtons}>
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.alertButton, isCancel ? styles.alertButtonOutline : styles.alertButtonSolid]}
                  onPress={() => {
                    onClose();
                    btn.onPress && btn.onPress();
                  }}
                >
                  <Text style={[styles.alertButtonText, isCancel ? styles.alertButtonTextOutline : styles.alertButtonTextSolid]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PelangganDetails = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const { customerId, customerName } = useLocalSearchParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', buttons: [], type: 'info' });

  const showAlert = (title, message, buttons = [{ text: t('common.ok') }], type = 'info') => {
    setCustomAlert({ visible: true, title, message, buttons, type });
  };
  const closeAlert = () => setCustomAlert((prev) => ({ ...prev, visible: false }));

  // Fetch customer details from backend
  const fetchCustomerDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) {
        setError(t('pelanggan.errors.noToken'));
        return;
      }

      const response = await fetch(`${config.API_URL}/seller/customers/${customerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          setCustomer(data.customer);
          setError(null);
        } catch (parseError) {
          console.error('JSON Parse Error in customer details:', parseError);
          setError(t('pelangganDetails.errors.parseFailed'));
        }
      } else {
        console.error('HTTP Error in customer details:', response.status, responseText);

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
      console.error('Error fetching customer details:', error);
      setError(t('pelangganDetails.errors.fetchFailed'));
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
    if (!dateString) return t('pelanggan.card.dateUnknown');
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Calculate customer insights
  const getCustomerInsights = (customer) => {
    if (!customer) return {};

    const avgOrderValue = customer.totalSpent / (customer.totalOrders || 1);
    const isHighValue = avgOrderValue > 200000; // Above 200k average
    const isFrequent = customer.totalOrders >= 5;
    const isRecent = new Date(customer.lastOrderDate) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // Within 14 days

    let customerTypeKey = 'new';
    if (isHighValue && isFrequent) customerTypeKey = 'premium';
    else if (isFrequent) customerTypeKey = 'loyal';
    else if (isHighValue) customerTypeKey = 'highValue';

    const loyaltyLevelKey = customer.totalOrders >= 10 ? 'veryLoyal' :
                        customer.totalOrders >= 5 ? 'loyal' :
                        customer.totalOrders >= 2 ? 'growing' : 'new';

    return {
      customerType: t(`pelangganDetails.insights.types.${customerTypeKey}`),
      loyaltyLevel: t(`pelangganDetails.insights.loyalty.${loyaltyLevelKey}`),
      isHighValue,
      isFrequent,
      isRecent,
      avgOrderValue
    };
  };

  const renderHeader = (title) => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('pelanggan.accessibility.back')}>
        <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader(customerName || t('pelangganDetails.header.fallbackTitle'))}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>{t('pelangganDetails.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader(customerName || t('pelangganDetails.header.fallbackTitle'))}
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconBox, { backgroundColor: '#FFEBEE' }]}>
            <MaterialIcons name="error-outline" size={44} color="#C62828" />
          </View>
          <Text style={styles.errorTitle}>{t('pelanggan.error.title')}</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCustomerDetails} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>{t('pelanggan.error.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader(customerName || t('pelangganDetails.header.fallbackTitle'))}
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconBox, { backgroundColor: '#F5F6FA' }]}>
            <MaterialIcons name="person-off" size={44} color="#9AA0A6" />
          </View>
          <Text style={styles.errorTitle}>{t('pelangganDetails.notFound.title')}</Text>
          <Text style={styles.errorSubtitle}>{t('pelangganDetails.notFound.subtitle')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const insights = getCustomerInsights(customer);

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader(customer.name)}

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={[styles.card, styles.profileSection]}>
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
                    <MaterialIcons name="email" size={15} color="#999" />
                    <Text style={styles.contactText}>{customer.email}</Text>
                  </View>
                )}
                {customer.phone && (
                  <View style={styles.contactRow}>
                    <MaterialIcons name="phone" size={15} color="#999" />
                    <Text style={styles.contactText}>{customer.phone}</Text>
                  </View>
                )}
                {customer.address && (
                  <View style={styles.contactRow}>
                    <MaterialIcons name="location-on" size={15} color="#999" />
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
              <Text style={styles.statLabel}>{t('pelanggan.stats.totalOrders')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{formatCurrency(customer.totalSpent)}</Text>
              <Text style={styles.statLabel}>{t('pelangganDetails.stats.totalSpent')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{formatCurrency(customer.averageOrderValue || 0)}</Text>
              <Text style={styles.statLabel}>{t('pelangganDetails.stats.averageOrder')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{formatDate(customer.customerSince)}</Text>
              <Text style={styles.statLabel}>{t('pelangganDetails.stats.customerSince')}</Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="info" size={18} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>{t('pelangganDetails.sections.customerInfo')}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={18} color="#999" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('pelangganDetails.info.lastOrder')}</Text>
              <Text style={styles.infoValue}>{formatDate(customer.lastOrderDate)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="restaurant" size={18} color="#999" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('pelangganDetails.info.favoriteService')}</Text>
              <Text style={styles.infoValue}>{customer.mostPreferredService}</Text>
            </View>
          </View>

          {customer.stats && (
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <MaterialIcons name="assessment" size={18} color="#999" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('pelangganDetails.info.orderStatus')}</Text>
                <Text style={styles.infoValue}>
                  {t('pelangganDetails.info.orderStatusValue', { completed: customer.stats.completedOrders, processing: customer.stats.processingOrders })}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Customer Insights Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="insights" size={18} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>{t('pelangganDetails.sections.insights')}</Text>
          </View>

          <View style={styles.insightsGrid}>
            <View style={styles.insightCard}>
              <MaterialIcons name="star" size={20} color="#2E7D32" />
              <Text style={styles.insightLabel}>{t('pelangganDetails.insights.customerType')}</Text>
              <Text style={styles.insightValue}>{insights.customerType}</Text>
            </View>

            <View style={styles.insightCard}>
              <MaterialIcons name="favorite" size={20} color="#C62828" />
              <Text style={styles.insightLabel}>{t('pelangganDetails.insights.loyaltyLevel')}</Text>
              <Text style={styles.insightValue}>{insights.loyaltyLevel}</Text>
            </View>
          </View>
        </View>

        {/* Allergy/Special Notes */}
        {customer.allergyNotes && customer.allergyNotes.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="warning" size={18} color="#B26A00" />
              <Text style={styles.sectionTitle}>{t('pelangganDetails.sections.specialNotes')}</Text>
            </View>
            {customer.allergyNotes.map((note, index) => (
              <View key={index} style={styles.allergyNote}>
                <MaterialIcons name="info" size={15} color="#B26A00" />
                <Text style={styles.allergyText}>{note}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Service Preferences */}
        {customer.servicePreferences && Object.keys(customer.servicePreferences).length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="favorite" size={18} color={COLORS.PRIMARY} />
              <Text style={styles.sectionTitle}>{t('pelangganDetails.sections.servicePreferences')}</Text>
            </View>
            <View style={styles.preferencesGrid}>
              {Object.entries(customer.servicePreferences).map(([service, count]) => (
                <View key={service} style={styles.preferenceCard}>
                  <Text style={styles.preferenceService}>{service}</Text>
                  <Text style={styles.preferenceCount}>{t('laporan.topItems.ordersSuffix', { count })}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Orders */}
        <View style={[styles.card, { marginBottom: 28 }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="receipt" size={18} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>{t('pelangganDetails.sections.orderHistory')}</Text>
          </View>

          {customer.orders && customer.orders.length > 0 ? (
            customer.orders.map((order, index) => {
              const statusStyle = getStatusStyle(order.status);
              return (
                <View key={order.id || index} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderType}>{order.type}</Text>
                      <Text style={styles.orderDate}>{formatDate(order.date)}</Text>
                    </View>
                    <View style={[styles.orderStatusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.orderStatusText, { color: statusStyle.color }]}>
                        {t(`pelanggan.status.${getStatusKey(order.status)}`)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderDetails}>
                    <Text style={styles.orderAmount}>{formatCurrency(order.amount)}</Text>
                    <Text style={styles.orderPax}>{t('pelangganDetails.order.paxSuffix', { pax: order.pax })}</Text>
                  </View>

                  {order.notes && (
                    <Text style={styles.orderNotes}>{order.notes}</Text>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.noOrdersText}>{t('pelangganDetails.noOrders')}</Text>
          )}
        </View>
      </ScrollView>

      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        type={customAlert.type}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
};

export default PelangganDetails;

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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.PRIMARY, textAlign: 'center' },

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
    fontSize: 14,
    color: '#777',
    marginTop: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  errorIconBox: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13.5,
    color: '#888',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 30,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Shared card style
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  profileSection: {
    marginTop: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  profileImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#23272f',
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
    fontSize: 13,
    color: '#777',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F5F6FA',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11.5,
    color: '#888',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#23272f',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12.5,
    color: '#888',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#23272f',
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  insightCard: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  insightLabel: {
    fontSize: 11.5,
    color: '#888',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  insightValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#23272f',
    textAlign: 'center',
  },
  allergyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    padding: 11,
    borderRadius: 10,
    marginBottom: 8,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#B26A00',
  },
  allergyText: {
    fontSize: 13,
    color: '#23272f',
    flex: 1,
    lineHeight: 19,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preferenceCard: {
    backgroundColor: '#F7EAEF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFD9E1',
  },
  preferenceService: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  preferenceCount: {
    fontSize: 11.5,
    color: '#888',
  },
  orderCard: {
    backgroundColor: '#F5F6FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
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
    fontSize: 14.5,
    fontWeight: '700',
    color: '#23272f',
  },
  orderDate: {
    fontSize: 11.5,
    color: '#888',
  },
  orderStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderAmount: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  orderPax: {
    fontSize: 13,
    color: '#888',
    marginLeft: 8,
  },
  orderNotes: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 4,
  },
  noOrdersText: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 13.5,
    paddingVertical: 20,
  },

  // CustomAlert
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  alertContent: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  alertIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23272f',
    textAlign: 'center',
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 13.5,
    color: '#777',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  alertButtonSolid: {
    backgroundColor: COLORS.PRIMARY,
  },
  alertButtonOutline: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertButtonTextSolid: {
    color: '#fff',
  },
  alertButtonTextOutline: {
    color: '#777',
  },
});