import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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

// Ubah format hasil dari backend (energi_kkal, labels string, dst) jadi format yang dipakai tampilan
const adaptGiziResult = (raw) => {
  return {
    perPorsi: {
      energi: raw.energi_kkal ?? 0,
      karbohidrat: raw.karbohidrat_g ?? 0,
      protein: raw.protein_g ?? 0,
      lemak: raw.lemak_g ?? 0,
      lemak_jenuh: raw.lemak_jenuh_g ?? 0,
      serat: raw.serat_g ?? 0,
      natrium: raw.natrium_mg ?? 0,
      gula: raw.gula_g ?? 0,
      kolesterol: raw.kolesterol_mg ?? 0,
    },
    labels: (raw.labels || []).map((text) => ({ text, color: '#2E7D32', bg: '#E8F5E9' })),
    insights: (raw.insights || []).map((ins, i) => ({
      id: `ai_insight_${i}`,
      label: ins.issue,
      badgeColor: '#B26A00',
      badgeBg: '#FFF3E0',
      insight: ins.explanation,
      tip: ins.tip,
    })),
    cookingTips: raw.cooking_tips || [],
  };
};

// Panggil backend beneran - backend yang manggil Gemini, key aman di server
const callGeminiAI = async (menu, ingredientsText) => {
  const response = await fetch(`${config.API_URL}/seller/menu/gizi-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getAuthToken()}`,
    },
    body: JSON.stringify({
      categoryId: menu.categoryId,
      menuId: menu.id,
      ingredients: ingredientsText,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Gagal menganalisis (${response.status})`);
  }

  const data = await response.json();
  const rawResult = data.data?.menuItem?.giziResult || data.menuItem?.giziResult;

  if (!rawResult) {
    throw new Error('Backend tidak mengembalikan hasil analisis');
  }

  return adaptGiziResult(rawResult);
};

const GiziAiAnalysis = () => {
  const router = useRouter();

  const [menus, setMenus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [ingredientsText, setIngredientsText] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
      if (!response.ok) throw new Error(`Gagal ambil data menu (${response.status})`);

      const result = await response.json();
      const categories = result.data || result || [];
      const flattened = categories.flatMap((category) =>
        (category.items || []).map((item) => ({
          id: String(item.id),
          categoryId: category.id,
          name: item.name,
          image: item.image,
          analyzed: !!item.giziResult,
          result: item.giziResult ? adaptGiziResult(item.giziResult) : null,
        }))
      );
      setMenus(flattened);
    } catch (error) {
      console.error('Fetch menu error:', error);
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const openMenu = (menu) => {
    setActiveMenuId(menu.id);
    setIsEditing(!menu.analyzed);
    setIngredientsText('');
    setPhotoUri(null);
  };

  const closeMenu = () => {
    setActiveMenuId(null);
    setIsEditing(false);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const runAnalysis = async (menu) => {
    setIsAnalyzing(true);
    try {
      const aiResult = await callGeminiAI(menu, ingredientsText);
      setMenus((prev) =>
        prev.map((m) => (m.id === menu.id ? { ...m, analyzed: true, result: aiResult } : m))
      );
      setIsEditing(false);
      setActiveMenuId(null);
    } catch (error) {
      console.error('AI analysis error:', error);
      Alert.alert('Gagal', error.message || 'Gagal menganalisis, coba lagi');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activeMenu = menus.find((m) => m.id === activeMenuId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (activeMenuId ? closeMenu() : router.back())} style={styles.backBtn}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analisis Nutrisi (AI)</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
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
          <>
            <Text style={styles.sectionTitle}>Menu Kamu</Text>
            {menus.length === 0 ? (
              <View style={styles.centerState}>
                <Text style={styles.metaMuted}>Belum ada menu.</Text>
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
                        <Text style={styles.metaMuted}>{menu.result.perPorsi.energi} kkal / porsi</Text>
                        {menu.result.labels.map((l, i) => (
                          <View key={i} style={[styles.miniBadge, { backgroundColor: l.bg }]}>
                            <Text style={[styles.miniBadgeText, { color: l.color }]}>{l.text}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.metaMuted}>Belum dianalisis</Text>
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
          <>
            <Text style={styles.sectionTitle}>{activeMenu.name}</Text>

            <View style={[styles.formCard, styles.shadow]}>
              <Text style={styles.fieldLabel}>Foto menu (opsional)</Text>
              <TouchableOpacity style={styles.photoBox} onPress={pickPhoto} activeOpacity={0.8}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <MaterialIcons name="add-a-photo" size={22} color="#aaa" />
                    <Text style={styles.metaMuted}>Tambah foto</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.hintText}>
                Foto belum diproses AI saat ini, cuma buat referensi kamu sendiri. Yang dipakai buat analisis: nama menu + bahan di bawah.
              </Text>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Bahan-bahan (opsional)</Text>
              <TextInput
                style={[styles.input, { height: 90 }]}
                value={ingredientsText}
                onChangeText={setIngredientsText}
                placeholder="misal: santan kental, ayam, cabai merah, serai"
                placeholderTextColor="#aaa"
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.hintText}>
                Nggak perlu ketik gram atau takaran persis — AI yang akan mengestimasi. Kosongkan kalau mau AI nebak dari nama menu dan foto aja.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.ctaButton, isAnalyzing && { opacity: 0.6 }]}
              onPress={() => runAnalysis(activeMenu)}
              disabled={isAnalyzing}
              activeOpacity={0.8}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialIcons name="auto-awesome" size={20} color="white" />
                  <Text style={styles.ctaButtonText}>Analisis dengan AI</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{activeMenu.name}</Text>

            <View style={[styles.formCard, styles.shadow]}>
              <Text style={styles.fieldLabel}>Gizi per porsi (estimasi AI)</Text>
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

            {activeMenu.result.cookingTips?.length > 0 && (
              <View style={[styles.insightCard, styles.shadow]}>
                <Text style={styles.fieldLabel}>
                  <MaterialIcons name="soup-kitchen" size={14} /> Tips Masak
                </Text>
                {activeMenu.result.cookingTips.map((tip, i) => (
                  <View key={i} style={styles.cookingTipRow}>
                    <Text style={styles.cookingTipBullet}>{i + 1}</Text>
                    <Text style={styles.insightTipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaButtonOutline]}
              onPress={() => {
                setIngredientsText('');
                setPhotoUri(null);
                setIsEditing(true);
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={18} color={COLORS.PRIMARY} />
              <Text style={[styles.ctaButtonText, { color: COLORS.PRIMARY }]}>Analisis Ulang</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default GiziAiAnalysis;

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
  centerState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  metaMuted: { fontSize: 12, color: '#aaa' },
  errorText: { fontSize: 12.5, color: '#C62828', textAlign: 'center' },
  retryBtn: { marginTop: 8, backgroundColor: COLORS.PRIMARY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  mockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 10,
    marginTop: 16,
  },
  mockBannerText: { flex: 1, fontSize: 10.5, color: '#B26A00', lineHeight: 14 },
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
  menuStatusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  miniBadgeText: { fontSize: 10, fontWeight: '700' },
  formCard: { backgroundColor: 'white', borderRadius: 14, padding: 16 },
  fieldLabel: { fontSize: 12.5, fontWeight: '600', color: '#444', marginBottom: 6 },
  photoBox: {
    width: 100,
    height: 75,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#23272f',
  },
  hintText: { fontSize: 10.5, color: '#aaa', marginTop: 8, lineHeight: 14 },
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
  ctaButtonOutline: { backgroundColor: 'white', borderWidth: 1.5, borderColor: COLORS.PRIMARY },
  ctaButtonText: { color: 'white', fontSize: 14.5, fontWeight: '700' },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  resultItem: { width: '48%', backgroundColor: '#F7F8FA', borderRadius: 10, padding: 10, marginBottom: 8 },
  resultLabel: { fontSize: 10.5, color: '#888', marginBottom: 2 },
  resultValue: { fontSize: 14, fontWeight: '700', color: '#23272f' },
  insightCard: { backgroundColor: 'white', borderRadius: 14, padding: 14, marginTop: 10 },
  insightText: { fontSize: 12.5, color: '#666', lineHeight: 18, marginTop: 8, marginBottom: 10 },
  insightTipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#F7EAEF', borderRadius: 10, padding: 10 },
  insightTipText: { fontSize: 12, color: '#444', flex: 1, lineHeight: 17 },
  cookingTipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  cookingTipBullet: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    backgroundColor: '#F7EAEF',
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: 'center',
    lineHeight: 18,
    overflow: 'hidden',
  },
});