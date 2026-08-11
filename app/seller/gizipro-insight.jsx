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

const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('sellerToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

const InsightTipsMenu = () => {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [cleanMenus, setCleanMenus] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  const load = async () => {
    try {
      setIsLoading(true);
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
      const analyzedItems = allItems.filter((item) => item.giziResult);

      if (analyzedItems.length === 0) {
        setIsEmpty(true);
        setIsLoading(false);
        return;
      }

      // Kumpulin per "issue" (teks bebas dari AI) - dikelompokkan berdasarkan teks yang sama persis
      const grouped = {};
      const clean = [];

      analyzedItems.forEach((item) => {
        const insights = item.giziResult.insights || [];
        if (insights.length === 0) {
          clean.push({ id: String(item.id), name: item.name });
          return;
        }
        insights.forEach((insight) => {
          const key = (insight.issue || 'Lainnya').trim();
          if (!grouped[key]) {
            grouped[key] = { id: key, label: key, tip: insight.tip, insightText: insight.explanation, menus: [] };
          }
          grouped[key].menus.push({ id: String(item.id), name: item.name });
        });
      });

      const groupList = Object.values(grouped).sort((a, b) => b.menus.length - a.menus.length);

      setGroups(groupList);
      setCleanMenus(clean);
      setIsEmpty(false);
    } catch (error) {
      console.error('Load insight error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Insight & Tips Menu</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          </View>
        ) : isEmpty ? (
          <View style={styles.centerState}>
            <MaterialIcons name="insights" size={32} color="#ccc" />
            <Text style={styles.metaMuted}>
              Belum ada menu yang dianalisis. Analisis menu dulu di Fitur Analisis Nutrisi biar insight-nya muncul di sini.
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => router.push('/seller/gizipro-analisis')}
            >
              <Text style={styles.retryBtnText}>Ke Analisis Nutrisi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {groups.length === 0 ? (
              <View style={styles.allCleanBanner}>
                <MaterialIcons name="celebration" size={22} color="#2E7D32" />
                <Text style={styles.allCleanText}>Semua menu kamu udah seimbang gizinya, mantap!</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Perlu Diperbaiki</Text>
                {groups.map((group) => {
                  const expanded = expandedId === group.id;
                  return (
                    <View key={group.id} style={[styles.groupCard, styles.shadow]}>
                      <TouchableOpacity
                        style={styles.groupHeader}
                        onPress={() => setExpandedId(expanded ? null : group.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.groupIcon, { backgroundColor: '#FFF3E0' }]}>
                          <MaterialIcons name="warning" size={20} color="#B26A00" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.groupTitle}>{group.label}</Text>
                          <Text style={styles.groupCount}>{group.menus.length} menu terdampak</Text>
                        </View>
                        <MaterialIcons
                          name={expanded ? 'expand-less' : 'expand-more'}
                          size={22}
                          color="#ccc"
                        />
                      </TouchableOpacity>

                      <View style={styles.tipRow}>
                        <MaterialIcons name="lightbulb" size={15} color={COLORS.PRIMARY} />
                        <Text style={styles.tipText}>{group.tip}</Text>
                      </View>

                      {expanded && (
                        <View style={styles.menuListInGroup}>
                          {group.menus.map((m) => (
                            <TouchableOpacity
                              key={m.id}
                              style={styles.menuChipRow}
                              onPress={() => router.push('/seller/gizipro-analisis')}
                            >
                              <MaterialIcons name="restaurant-menu" size={14} color="#888" />
                              <Text style={styles.menuChipText}>{m.name}</Text>
                              <MaterialIcons name="chevron-right" size={16} color="#ccc" />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {cleanMenus.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Menu Tanpa Masalah ({cleanMenus.length})</Text>
                <View style={[styles.groupCard, styles.shadow]}>
                  {cleanMenus.map((m, i) => (
                    <View key={m.id} style={[styles.menuChipRow, i === cleanMenus.length - 1 && { borderBottomWidth: 0 }]}>
                      <MaterialIcons name="check-circle" size={16} color="#2E7D32" />
                      <Text style={styles.menuChipText}>{m.name}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default InsightTipsMenu;

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
  centerState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 10 },
  metaMuted: { fontSize: 12.5, color: '#aaa', textAlign: 'center', lineHeight: 18 },
  retryBtn: {
    marginTop: 6,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.PRIMARY, marginTop: 18, marginBottom: 10 },
  allCleanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  allCleanText: { flex: 1, fontSize: 13, color: '#2E7D32', fontWeight: '600' },
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupTitle: { fontSize: 14, fontWeight: '700', color: '#23272f' },
  groupCount: { fontSize: 11.5, color: '#888', marginTop: 2 },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F7EAEF',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  tipText: { fontSize: 12, color: '#444', flex: 1, lineHeight: 17 },
  menuListInGroup: { marginTop: 8 },
  menuChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuChipText: { flex: 1, fontSize: 12.5, color: '#444' },
});