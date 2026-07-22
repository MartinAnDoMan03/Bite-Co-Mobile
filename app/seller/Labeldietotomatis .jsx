import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../constants/color';
import config from '../constants/config';

const ANALYSIS_STORAGE_KEY = 'gizipro_analysis_results';

const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('sellerToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

const LABEL_ORDER = ['Tinggi Protein', 'Rendah Kalori', 'Tinggi Serat', 'Rendah Karbo'];

const LabelDietOtomatis = () => {
  const router = useRouter();
  const [menus, setMenus] = useState([]);
  const [unanalyzedCount, setUnanalyzedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('Semua');

  const load = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const response = await fetch(`${config.API_URL}/seller/menu`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });
      if (!response.ok) throw new Error(`Gagal ambil data menu (${response.status})`);

      const result = await response.json();
      const categories = result.data || result || [];
      const allItems = categories.flatMap((category) => category.items || []);

      const raw = await AsyncStorage.getItem(ANALYSIS_STORAGE_KEY);
      const storedResults = raw ? JSON.parse(raw) : {};

      const labeled = [];
      let unlabeledCount = 0;

      allItems.forEach((item) => {
        const stored = storedResults[String(item.id)];
        if (stored && stored.result.labels.length > 0) {
          labeled.push({ id: String(item.id), name: item.name, labels: stored.result.labels });
        } else {
          unlabeledCount += 1;
        }
      });

      setMenus(labeled);
      setUnanalyzedCount(unlabeledCount);
    } catch (error) {
      console.error('Load label diet error:', error);
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const availableLabels = LABEL_ORDER.filter((label) =>
    menus.some((m) => m.labels.some((l) => l.text === label))
  );

  const filteredMenus =
    activeFilter === 'Semua' ? menus : menus.filter((m) => m.labels.some((l) => l.text === activeFilter));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Label Diet Otomatis</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.metaMuted}>Memuat...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.centerState}>
            <MaterialIcons name="error-outline" size={32} color="#C62828" />
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity onPress={load} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {unanalyzedCount > 0 && (
              <TouchableOpacity
                style={styles.bannerCard}
                onPress={() => router.push('/seller/gizipro-analisis')}
                activeOpacity={0.8}
              >
                <MaterialIcons name="info-outline" size={18} color={COLORS.PRIMARY} />
                <Text style={styles.bannerText}>
                  {unanalyzedCount} menu belum punya label — analisis dulu di Fitur Analisis Nutrisi
                </Text>
                <MaterialIcons name="chevron-right" size={18} color={COLORS.PRIMARY} />
              </TouchableOpacity>
            )}

            {menus.length === 0 ? (
              <View style={styles.centerState}>
                <Text style={styles.metaMuted}>Belum ada menu yang punya label. Analisis menu kamu dulu.</Text>
              </View>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                  {['Semua', ...availableLabels].map((label) => (
                    <TouchableOpacity
                      key={label}
                      onPress={() => setActiveFilter(label)}
                      style={[styles.filterChip, activeFilter === label && styles.filterChipActive]}
                    >
                      <Text
                        style={[styles.filterChipText, activeFilter === label && styles.filterChipTextActive]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.sectionTitle}>{filteredMenus.length} Menu</Text>
                {filteredMenus.map((menu) => (
                  <View key={menu.id} style={[styles.menuCard, styles.shadow]}>
                    <Text style={styles.menuName}>{menu.name}</Text>
                    <View style={styles.labelRow}>
                      {menu.labels.map((l, i) => (
                        <View key={i} style={[styles.miniBadge, { backgroundColor: l.bg }]}>
                          <Text style={[styles.miniBadgeText, { color: l.color }]}>{l.text}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LabelDietOtomatis;

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
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  centerState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, gap: 8 },
  metaMuted: { fontSize: 12.5, color: '#aaa', textAlign: 'center' },
  errorText: { fontSize: 12.5, color: '#C62828', textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F7EAEF',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  bannerText: { flex: 1, fontSize: 11.5, color: '#444', lineHeight: 16 },
  filterRow: { marginTop: 16, marginBottom: 4 },
  filterChip: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterChipActive: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY },
  filterChipText: { fontSize: 12, color: '#666', fontWeight: '600' },
  filterChipTextActive: { color: 'white' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.PRIMARY, marginTop: 14, marginBottom: 10 },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  menuName: { fontSize: 14, fontWeight: '700', color: '#23272f', marginBottom: 8 },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  miniBadgeText: { fontSize: 10, fontWeight: '700' },
});