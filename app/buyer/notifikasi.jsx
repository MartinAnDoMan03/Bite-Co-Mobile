import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import COLORS from '../constants/color';
import config from '../constants/config';
import { useLanguage } from '../contexts/LanguageContext';
import { getBuyerNotificationRoute } from '../utils/notificationRouting';

const TYPE_ICONS = {
  order: 'receipt-long',
  payment: 'payments',
  review: 'star-rate',
  system: 'info',
};

const timeAgo = (isoString) => {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
};

const NotificationItem = ({ item, onPress }) => (
  <TouchableOpacity
    style={[styles.item, !item.isRead && styles.itemUnread]}
    onPress={() => onPress(item)}
    activeOpacity={0.7}
  >
    <View style={[styles.itemIconBox, !item.isRead && styles.itemIconBoxUnread]}>
      <MaterialIcons
        name={TYPE_ICONS[item.type] || 'notifications'}
        size={20}
        color={COLORS.PRIMARY}
      />
    </View>
    <View style={styles.itemBody}>
      <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.itemMessage} numberOfLines={2}>{item.message}</Text>
      <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
    </View>
    {!item.isRead && <View style={styles.unreadDot} />}
  </TouchableOpacity>
);

const BuyerNotifikasi = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const FILTERS = [
    { key: 'all', label: t('pesanan.filters.all') },
    { key: 'unread', label: t('notifikasi.filters.unread') },
    { key: 'read', label: t('notifikasi.filters.read') },
  ];

  const fetchNotifications = useCallback(async (filter) => {
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      if (!token) return;

      const params = {};
      if (filter === 'unread') params.isRead = 'false';
      if (filter === 'read') params.isRead = 'true';

      const response = await axios.get(`${config.API_URL}/buyer/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setNotifications(response.data.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchNotifications(activeFilter);
    }, [activeFilter, fetchNotifications])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(activeFilter);
  };

  const handleItemPress = async (item) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );

    try {
      const token = await AsyncStorage.getItem('buyerToken');
      if (token && !item.isRead) {
        await axios.patch(
          `${config.API_URL}/buyer/notifications/${item.id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }

    const route = getBuyerNotificationRoute(item.data);
    if (route) router.push(route);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <MaterialIcons name="notifications-none" size={44} color={COLORS.PRIMARY} />
      </View>
      <Text style={styles.emptyTitle}>{t('notifikasi.empty.title')}</Text>
      <Text style={styles.emptySubtitle}>{t('notifikasi.empty.subtitle')}</Text>
    </View>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterBar}>
      {FILTERS.map((filter) => {
        const active = activeFilter === filter.key;
        return (
          <TouchableOpacity
            key={filter.key}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('pelanggan.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifikasi.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.content}>
        {renderFilterButtons()}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={handleItemPress} />
          )}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.PRIMARY]}
              tintColor={COLORS.PRIMARY}
            />
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
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
  content: { paddingHorizontal: 16, paddingTop: 16 },
  filterBar: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  filterChipActive: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY },
  filterChipText: { fontSize: 13, color: '#888', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  list: { flex: 1 },
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  itemUnread: { backgroundColor: '#FCF3F6' },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F6FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemIconBoxUnread: { backgroundColor: '#F7EAEF' },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#23272f', marginBottom: 2 },
  itemMessage: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 4 },
  itemTime: { fontSize: 11.5, color: '#aaa' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIconBox: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F7EAEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#23272f', marginBottom: 6 },
  emptySubtitle: { fontSize: 13.5, color: '#888', textAlign: 'center', lineHeight: 19 },
});

export default BuyerNotifikasi;