import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import COLORS from '../../constants/color';
import config from '../../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../contexts/LanguageContext';

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
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.alertButton,
                    isCancel ? styles.alertButtonOutline : styles.alertButtonSolid,
                    isDestructive && styles.alertButtonDestructive,
                  ]}
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

const BiteEcoManagement = () => {
  const { t } = useLanguage();
  const [wasteItems, setWasteItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', buttons: [], type: 'info' });
  const router = useRouter();

  const showAlert = (title, message, buttons = [{ text: t('common.ok') }], type = 'info') => {
    setCustomAlert({ visible: true, title, message, buttons, type });
  };
  const closeAlert = () => setCustomAlert((prev) => ({ ...prev, visible: false }));

  const fetchWasteItems = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const token = await AsyncStorage.getItem('sellerToken');

      if (!token) {
        showAlert(t('common.error'), t('laporan.errors.loginRequired'), [{ text: t('common.ok') }], 'error');
        return;
      }

      const response = await fetch(`${config.API_URL}/seller/bite-eco`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();

        // If authentication failed, show a more helpful error
        if (response.status === 401) {
          showAlert(
            t('biteEcoManagement.alerts.authError.title'),
            t('biteEcoManagement.alerts.authError.message'),
            [
              { text: t('common.ok') },
              { text: t('biteEcoManagement.alerts.authError.logoutButton'), style: 'destructive', onPress: () => {
                AsyncStorage.removeItem('sellerToken');
                router.replace('/seller/SellerIndex');
              }}
            ],
            'error'
          );
          return;
        }

        throw new Error(`Failed to fetch waste items: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const items = result.wasteItems || [];
        setWasteItems(items);
      } else {
        showAlert(t('common.error'), result.message || t('biteEcoManagement.alerts.fetchFailed'), [{ text: t('common.ok') }], 'error');
      }

    } catch (error) {
      console.error('Error fetching waste items:', error);
      showAlert(t('common.error'), t('biteEcoManagement.alerts.fetchFailedWithMessage', { message: error.message }), [{ text: t('common.ok') }], 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, router, t]);

  useFocusEffect(
    useCallback(() => {
      fetchWasteItems();
    }, [fetchWasteItems])
  );

  const handleDeleteItem = async (itemId) => {
    showAlert(
      t('biteEcoManagement.alerts.deleteConfirm.title'),
      t('biteEcoManagement.alerts.deleteConfirm.message'),
      [
        { text: t('biteEcoManagement.alerts.deleteConfirm.cancelButton'), style: 'cancel' },
        {
          text: t('biteEcoManagement.alerts.deleteConfirm.confirmButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('sellerToken');
              const response = await fetch(`${config.API_URL}/seller/bite-eco`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ itemId }),
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete item: ${response.status}`);
              }

              const result = await response.json();

              if (result.success) {
                showAlert(t('common.success'), t('biteEcoManagement.alerts.deleteSuccess'), [{ text: t('common.ok') }], 'success');
                fetchWasteItems(); // Refresh the list
              } else {
                showAlert(t('common.error'), result.message || t('biteEcoManagement.alerts.deleteFailed'), [{ text: t('common.ok') }], 'error');
              }
            } catch (error) {
              console.error('Error deleting item:', error);
              showAlert(t('common.error'), t('biteEcoManagement.alerts.deleteFailedWithMessage', { message: error.message }), [{ text: t('common.ok') }], 'error');
            }
          },
        },
      ],
      'warning'
    );
  };

  const WasteItemCard = ({ item }) => (
    <View style={[styles.wasteCard, styles.shadow]}>
      <View style={styles.cardHeader}>
        <Image
          source={{ uri: item.image || 'https://via.placeholder.com/80' }}
          style={styles.wasteImage}
        />
        <View style={styles.wasteInfo}>
          <Text style={styles.wasteTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.wasteMetaRow}>
            <MaterialIcons name="inventory-2" size={12} color="#999" />
            <Text style={styles.wasteMetaText}>{t('biteEcoManagement.card.quantityLabel', { quantity: item.quantity })}</Text>
          </View>
          <View style={styles.wasteMetaRow}>
            <MaterialIcons name="verified" size={12} color="#999" />
            <Text style={styles.wasteMetaText}>{t('biteEcoManagement.card.conditionLabel', { condition: item.condition })}</Text>
          </View>
          <Text style={styles.wasteDescription} numberOfLines={2}>{item.description}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => router.push({
            pathname: '/seller/biteeco/edit',
            params: {
              itemId: item.id,
              itemData: JSON.stringify(item)
            }
          })}
        >
          <MaterialIcons name="edit" size={15} color="#fff" />
          <Text style={styles.actionButtonText}>{t('biteEcoManagement.card.editButton')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteItem(item.id)}
        >
          <MaterialIcons name="delete-outline" size={15} color="#fff" />
          <Text style={styles.actionButtonText}>{t('biteEcoManagement.card.deleteButton')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('addBiteEcoItem.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('biteEcoManagement.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.content}>
        {/* Header Section */}
        <View style={[styles.introCard, styles.shadow]}>
          <View style={styles.headerInfo}>
            <View style={styles.introIconBox}>
              <MaterialIcons name="eco" size={24} color={COLORS.GREEN4} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.introTitle}>{t('biteEcoManagement.intro.title')}</Text>
              <Text style={styles.introSubtitle}>
                {t('biteEcoManagement.intro.subtitle')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/seller/biteeco/add')}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={18} color="#fff" />
            <Text style={styles.addButtonText}>{t('biteEcoManagement.addButton')}</Text>
          </TouchableOpacity>
        </View>

        {/* Items List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.loadingText}>{t('editBiteEcoItem.loading')}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.itemsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchWasteItems();
                }}
                colors={[COLORS.PRIMARY]}
              />
            }
          >
            {wasteItems.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <MaterialIcons name="eco" size={40} color="#bbb" />
                </View>
                <Text style={styles.emptyTitle}>{t('biteEcoManagement.empty.title')}</Text>
                <Text style={styles.emptySubtitle}>
                  {t('biteEcoManagement.empty.subtitle')}
                </Text>

                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/seller/biteeco/add')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyButtonText}>{t('biteEcoManagement.empty.button')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              wasteItems.map((item) => (
                <WasteItemCard key={item.id} item={item} />
              ))
            )}
          </ScrollView>
        )}
      </View>

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

  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Intro / kelola card
  introCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    marginBottom: 14,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  introIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E9F5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  introTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 3,
  },
  introSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  addButton: {
    backgroundColor: COLORS.GREEN4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 30,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  itemsList: {
    flex: 1,
  },
  wasteCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  wasteImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  wasteInfo: {
    flex: 1,
    marginLeft: 12,
  },
  wasteTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 4,
  },
  wasteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  wasteMetaText: {
    fontSize: 11.5,
    color: '#888',
  },
  wasteDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 20,
    gap: 5,
  },
  editButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  deleteButton: {
    backgroundColor: '#C62828',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12.5,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13.5,
    color: '#888',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: COLORS.GREEN4,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 30,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13.5,
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
  alertButtonDestructive: {
    backgroundColor: '#C62828',
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

export default BiteEcoManagement;