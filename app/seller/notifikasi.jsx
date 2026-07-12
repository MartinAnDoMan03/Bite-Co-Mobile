import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import COLORS from '../constants/color';
import { useLanguage } from '../contexts/LanguageContext';

const Notifikasi = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const FILTERS = [
    { key: 'all', label: t('pesanan.filters.all') },
    { key: 'unread', label: t('notifikasi.filters.unread') },
    { key: 'read', label: t('notifikasi.filters.read') },
  ];

  // Empty notification screen - no data fetching
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <MaterialIcons name="notifications-none" size={44} color={COLORS.PRIMARY} />
      </View>
      <Text style={styles.emptyTitle}>{t('notifikasi.empty.title')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('notifikasi.empty.subtitle')}
      </Text>
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

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
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

      <FlatList
        data={[]} // Always empty array
        renderItem={() => null} // Never renders items
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

  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  filterChipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  filterChipText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: '#888',
    textAlign: 'center',
    lineHeight: 19,
  },
});

export default Notifikasi;