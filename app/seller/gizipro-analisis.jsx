import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../constants/color';
import config from '../constants/config';

// Sama seperti di daftarmenu.jsx - ambil token seller yang tersimpan
const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('sellerToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Database bahan sementara (mock) - nanti diganti hasil fetch dari API nilaigizi.com
// Nilai per 100 gram
const INGREDIENT_DB = {
  'Santan kental': { energi: 330, karbohidrat: 6, protein: 3, lemak: 34, lemak_jenuh: 30, serat: 1, natrium: 15, gula: 3, kolesterol: 0 },
  'Santan encer': { energi: 120, karbohidrat: 3, protein: 1.5, lemak: 12, lemak_jenuh: 10, serat: 0.5, natrium: 8, gula: 1.5, kolesterol: 0 },
  'Minyak goreng': { energi: 884, karbohidrat: 0, protein: 0, lemak: 100, lemak_jenuh: 14, serat: 0, natrium: 0, gula: 0, kolesterol: 0 },
  'Ayam dada tanpa kulit': { energi: 165, karbohidrat: 0, protein: 31, lemak: 3.6, lemak_jenuh: 1, serat: 0, natrium: 74, gula: 0, kolesterol: 85 },
  'Ayam paha dengan kulit': { energi: 209, karbohidrat: 0, protein: 26, lemak: 10.9, lemak_jenuh: 3, serat: 0, natrium: 84, gula: 0, kolesterol: 93 },
  'Daging sapi': { energi: 250, karbohidrat: 0, protein: 26, lemak: 15, lemak_jenuh: 6, serat: 0, natrium: 72, gula: 0, kolesterol: 90 },
  'Tempe': { energi: 193, karbohidrat: 9, protein: 19, lemak: 11, lemak_jenuh: 2, serat: 5, natrium: 9, gula: 0, kolesterol: 0 },
  'Tahu': { energi: 76, karbohidrat: 2, protein: 8, lemak: 4.5, lemak_jenuh: 0.5, serat: 0.4, natrium: 7, gula: 0, kolesterol: 0 },
  'Telur ayam': { energi: 155, karbohidrat: 1, protein: 13, lemak: 11, lemak_jenuh: 3, serat: 0, natrium: 124, gula: 1, kolesterol: 373 },
  'Nasi putih': { energi: 130, karbohidrat: 28, protein: 2.7, lemak: 0.3, lemak_jenuh: 0, serat: 0.4, natrium: 1, gula: 0, kolesterol: 0 },
  'Kentang': { energi: 77, karbohidrat: 17, protein: 2, lemak: 0.1, lemak_jenuh: 0, serat: 2.2, natrium: 6, gula: 0.8, kolesterol: 0 },
  'Wortel': { energi: 41, karbohidrat: 10, protein: 0.9, lemak: 0.2, lemak_jenuh: 0, serat: 2.8, natrium: 69, gula: 4.7, kolesterol: 0 },
  'Kangkung': { energi: 19, karbohidrat: 3.1, protein: 2.6, lemak: 0.2, lemak_jenuh: 0, serat: 2.1, natrium: 113, gula: 0, kolesterol: 0 },
  'Bayam': { energi: 23, karbohidrat: 3.6, protein: 2.9, lemak: 0.4, lemak_jenuh: 0, serat: 2.2, natrium: 79, gula: 0.4, kolesterol: 0 },
  'Kecap manis': { energi: 275, karbohidrat: 62, protein: 4, lemak: 0.5, lemak_jenuh: 0, serat: 0, natrium: 2200, gula: 55, kolesterol: 0 },
  'Kecap asin': { energi: 60, karbohidrat: 6, protein: 6, lemak: 0, lemak_jenuh: 0, serat: 0, natrium: 5500, gula: 1, kolesterol: 0 },
  'Gula pasir': { energi: 387, karbohidrat: 100, protein: 0, lemak: 0, lemak_jenuh: 0, serat: 0, natrium: 0, gula: 100, kolesterol: 0 },
};

// Rule insight - versi inline dari gizipro-tips-library.json, dicocokkan ke hasil per porsi
const INSIGHT_RULES = [
  {
    id: 'tinggi_lemak_jenuh',
    check: (r) => r.lemak_jenuh > 5,
    label: 'Tinggi lemak jenuh',
    badgeColor: '#B26A00',
    badgeBg: '#FFF3E0',
    insight: 'Menu ini mengandung lemak jenuh cukup tinggi, kemungkinan besar dari santan kental atau minyak berlebih.',
    tip: 'Coba ganti sebagian santan kental dengan santan encer, atau kurangi minyak saat menumis',
  },
  {
    id: 'tinggi_natrium',
    check: (r) => r.natrium > 800,
    label: 'Tinggi natrium',
    badgeColor: '#B26A00',
    badgeBg: '#FFF3E0',
    insight: 'Kandungan natrium menu ini tergolong tinggi, biasanya dari kecap atau penyedap rasa.',
    tip: 'Kurangi takaran kecap dan ganti sebagian dengan bawang putih atau jahe untuk rasa gurih alami',
  },
  {
    id: 'rendah_protein',
    check: (r) => r.protein < 10,
    label: 'Rendah protein',
    badgeColor: '#B26A00',
    badgeBg: '#FFF3E0',
    insight: 'Kandungan protein menu ini masih rendah untuk kategori makanan utama.',
    tip: 'Tambahkan tempe, tahu, atau telur untuk menambah protein tanpa menaikkan biaya terlalu besar',
  },
  {
    id: 'kalori_tinggi',
    check: (r) => r.energi > 700,
    label: 'Kalori tinggi',
    badgeColor: '#993C1D',
    badgeBg: '#FAECE7',
    insight: 'Total kalori menu ini tinggi untuk satu porsi, kurang cocok untuk pelanggan yang sedang diet.',
    tip: 'Kurangi porsi nasi atau batasi komponen gorengan jadi satu jenis saja per menu',
  },
];

const getAutoLabels = (r) => {
  const labels = [];
  if (r.protein >= 20) labels.push({ text: 'Tinggi Protein', color: '#2E7D32', bg: '#E8F5E9' });
  if (r.energi <= 400) labels.push({ text: 'Rendah Kalori', color: '#2E7D32', bg: '#E8F5E9' });
  if (r.serat >= 5) labels.push({ text: 'Tinggi Serat', color: '#2E7D32', bg: '#E8F5E9' });
  if (r.karbohidrat <= 20) labels.push({ text: 'Rendah Karbo', color: '#2E7D32', bg: '#E8F5E9' });
  return labels;
};

const MenuAnalysisGizi = () => {
  const router = useRouter();

  const [menus, setMenus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchMenus = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch(`${config.API_URL}/seller/menu`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Gagal ambil data menu (${response.status})`);
      }

      const result = await response.json();
      const categories = result.data || result || [];

      // Ratakan semua item dari tiap kategori jadi satu list buat dianalisis gizinya
      const flattened = categories.flatMap((category) =>
        (category.items || []).map((item) => ({
          id: String(item.id),
          name: item.name,
          categoryName: category.name,
          image: item.image,
          servings: 1,
          analyzed: false,
          ingredients: [],
          result: null,
        }))
      );

      setMenus(flattened);
    } catch (error) {
      console.error('Fetch menu gizi error:', error);
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [servings, setServings] = useState('');
  const [rows, setRows] = useState([{ name: '', grams: '' }]);

  const openMenu = (menu) => {
    setActiveMenuId(menu.id);
    setIsEditing(!menu.analyzed);
    setServings(String(menu.servings));
    setRows(menu.ingredients.length > 0 ? menu.ingredients : [{ name: '', grams: '' }]);
  };

  const closeMenu = () => {
    setActiveMenuId(null);
    setIsEditing(false);
  };

  const addRow = () => setRows([...rows, { name: '', grams: '' }]);

  const updateRow = (index, field, value) => {
    const next = [...rows];
    next[index][field] = value;
    setRows(next);
  };

  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const calculate = (menuId) => {
    const totalServings = parseFloat(servings) || 1;
    const totals = { energi: 0, karbohidrat: 0, protein: 0, lemak: 0, lemak_jenuh: 0, serat: 0, natrium: 0, gula: 0, kolesterol: 0 };
    const notFound = [];

    rows.forEach((row) => {
      const data = INGREDIENT_DB[row.name];
      const grams = parseFloat(row.grams) || 0;
      if (!data) {
        if (row.name.trim()) notFound.push(row.name);
        return;
      }
      const factor = grams / 100;
      Object.keys(totals).forEach((key) => {
        totals[key] += data[key] * factor;
      });
    });

    const perPorsi = {};
    Object.keys(totals).forEach((key) => {
      perPorsi[key] = Math.round((totals[key] / totalServings) * 10) / 10;
    });

    const matchedInsights = INSIGHT_RULES.filter((rule) => rule.check(perPorsi));
    const labels = getAutoLabels(perPorsi);

    setMenus((prev) =>
      prev.map((m) =>
        m.id === menuId
          ? { ...m, analyzed: true, servings: totalServings, ingredients: rows, result: { perPorsi, labels, insights: matchedInsights, notFound } }
          : m
      )
    );
    setActiveMenuId(null);
  };

  const activeMenu = menus.find((m) => m.id === activeMenuId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (activeMenuId ? closeMenu() : router.back())} style={styles.backBtn}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analisis Nutrisi</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.menuMetaMuted}>Memuat menu...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.centerState}>
            <MaterialIcons name="error-outline" size={32} color="#C62828" />
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity onPress={fetchMenus} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : !activeMenu ? (
          // State 1: daftar menu
          <>
            <Text style={styles.sectionTitle}>Menu Kamu</Text>
            {menus.length === 0 ? (
              <View style={styles.centerState}>
                <Text style={styles.menuMetaMuted}>Belum ada menu. Tambahkan menu dulu di halaman Daftar Menu.</Text>
              </View>
            ) : (
              menus.map((menu) => (
              <TouchableOpacity
                key={menu.id}
                style={[styles.menuCard, styles.shadow]}
                onPress={() => openMenu(menu)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuName}>{menu.name}</Text>
                  {menu.analyzed ? (
                    <View style={styles.menuStatusRow}>
                      <Text style={styles.menuMeta}>{menu.result.perPorsi.energi} kkal / porsi</Text>
                      {menu.result.labels.map((l, i) => (
                        <View key={i} style={[styles.miniBadge, { backgroundColor: l.bg }]}>
                          <Text style={[styles.miniBadgeText, { color: l.color }]}>{l.text}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.menuMetaMuted}>Belum dianalisis</Text>
                  )}
                </View>
                <MaterialIcons
                  name={menu.analyzed ? 'check-circle' : 'chevron-right'}
                  size={20}
                  color={menu.analyzed ? '#2E7D32' : '#ccc'}
                />
              </TouchableOpacity>
              ))
            )}
          </>
        ) : isEditing ? (
          // State 2: form input bahan
          <>
            <Text style={styles.sectionTitle}>{activeMenu.name}</Text>

            <View style={[styles.formCard, styles.shadow]}>
              <Text style={styles.fieldLabel}>Jumlah porsi hasil masak</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={servings}
                onChangeText={setServings}
                placeholder="misal 10"
              />

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Daftar bahan</Text>
              {rows.map((row, index) => (
                <View key={index} style={styles.ingredientRow}>
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    value={row.name}
                    onChangeText={(v) => updateRow(index, 'name', v)}
                    placeholder="misal Santan kental"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginLeft: 8 }]}
                    keyboardType="numeric"
                    value={row.grams}
                    onChangeText={(v) => updateRow(index, 'grams', v)}
                    placeholder="gram"
                  />
                  <TouchableOpacity onPress={() => removeRow(index)} style={{ marginLeft: 8 }}>
                    <MaterialIcons name="close" size={20} color="#ccc" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity onPress={addRow} style={styles.addRowBtn}>
                <MaterialIcons name="add" size={18} color={COLORS.PRIMARY} />
                <Text style={styles.addRowText}>Tambah Bahan</Text>
              </TouchableOpacity>

              <Text style={styles.hintText}>
                Bahan yang tersedia di database: {Object.keys(INGREDIENT_DB).join(', ')}
              </Text>
            </View>

            <TouchableOpacity style={styles.ctaButton} onPress={() => calculate(activeMenu.id)} activeOpacity={0.8}>
              <MaterialIcons name="calculate" size={20} color="white" />
              <Text style={styles.ctaButtonText}>Hitung Gizi Otomatis</Text>
            </TouchableOpacity>
          </>
        ) : (
          // State 3: hasil analisis
          <>
            <Text style={styles.sectionTitle}>{activeMenu.name}</Text>

            <View style={[styles.formCard, styles.shadow]}>
              <Text style={styles.fieldLabel}>Gizi per porsi</Text>
              <View style={styles.resultGrid}>
                {[
                  ['Energi', `${activeMenu.result.perPorsi.energi} kkal`],
                  ['Karbohidrat', `${activeMenu.result.perPorsi.karbohidrat} g`],
                  ['Protein', `${activeMenu.result.perPorsi.protein} g`],
                  ['Lemak', `${activeMenu.result.perPorsi.lemak} g`],
                  ['Lemak jenuh', `${activeMenu.result.perPorsi.lemak_jenuh} g`],
                  ['Serat', `${activeMenu.result.perPorsi.serat} g`],
                  ['Natrium', `${activeMenu.result.perPorsi.natrium} mg`],
                  ['Gula', `${activeMenu.result.perPorsi.gula} g`],
                ].map(([label, value]) => (
                  <View key={label} style={styles.resultItem}>
                    <Text style={styles.resultLabel}>{label}</Text>
                    <Text style={styles.resultValue}>{value}</Text>
                  </View>
                ))}
              </View>

              {activeMenu.result.labels.length > 0 && (
                <View style={[styles.menuStatusRow, { marginTop: 12 }]}>
                  {activeMenu.result.labels.map((l, i) => (
                    <View key={i} style={[styles.miniBadge, { backgroundColor: l.bg }]}>
                      <Text style={[styles.miniBadgeText, { color: l.color }]}>{l.text}</Text>
                    </View>
                  ))}
                </View>
              )}

              {activeMenu.result.notFound.length > 0 && (
                <Text style={[styles.hintText, { marginTop: 10 }]}>
                  Bahan belum ada di database: {activeMenu.result.notFound.join(', ')}
                </Text>
              )}
            </View>

            {activeMenu.result.insights.map((insight) => (
              <View key={insight.id} style={[styles.insightCard, styles.shadow]}>
                <View style={[styles.miniBadge, { backgroundColor: insight.badgeBg, alignSelf: 'flex-start' }]}>
                  <Text style={[styles.miniBadgeText, { color: insight.badgeColor }]}>{insight.label}</Text>
                </View>
                <Text style={styles.insightText}>{insight.insight}</Text>
                <View style={styles.insightTipRow}>
                  <MaterialIcons name="lightbulb" size={16} color={COLORS.PRIMARY} />
                  <Text style={styles.insightTipText}>{insight.tip}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaButtonOutline]}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="edit" size={18} color={COLORS.PRIMARY} />
              <Text style={[styles.ctaButtonText, { color: COLORS.PRIMARY }]}>Edit Bahan</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* State 3: hasil - ditampilkan lewat menu list yang udah dianalisis, buka lagi buat lihat detail */}
    </SafeAreaView>
  );
};

export default MenuAnalysisGizi;

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
  errorText: { fontSize: 12.5, color: '#C62828', textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.PRIMARY, marginTop: 18, marginBottom: 10 },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuName: { fontSize: 14, fontWeight: '700', color: '#23272f', marginBottom: 4 },
  menuMeta: { fontSize: 12, color: '#666' },
  menuMetaMuted: { fontSize: 12, color: '#aaa' },
  menuStatusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  miniBadgeText: { fontSize: 10, fontWeight: '700' },
  formCard: { backgroundColor: 'white', borderRadius: 14, padding: 16 },
  fieldLabel: { fontSize: 12.5, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#23272f',
  },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  addRowText: { fontSize: 12.5, color: COLORS.PRIMARY, fontWeight: '600' },
  hintText: { fontSize: 10.5, color: '#aaa', marginTop: 10, lineHeight: 14 },
  ctaButton: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 16,
    gap: 8,
  },
  ctaButtonOutline: {
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: COLORS.PRIMARY,
  },
  ctaButtonText: { color: 'white', fontSize: 14.5, fontWeight: '700' },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resultItem: {
    width: '48%',
    backgroundColor: '#F7F8FA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  resultLabel: { fontSize: 10.5, color: '#888', marginBottom: 2 },
  resultValue: { fontSize: 14, fontWeight: '700', color: '#23272f' },
  insightCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
  insightText: { fontSize: 12.5, color: '#666', lineHeight: 18, marginTop: 8, marginBottom: 10 },
  insightTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F7EAEF',
    borderRadius: 10,
    padding: 10,
  },
  insightTipText: { fontSize: 12, color: '#444', flex: 1, lineHeight: 17 },
});