import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import COLORS from '../constants/color';
import { useLanguage } from '../contexts/LanguageContext';

const GiziProSeller = () => {
  const router = useRouter();
  const { t } = useLanguage();

  const features = [
    {
      icon: 'assessment',
      title: 'Analisis Nutrisi Otomatis',
      description: 'Hitung kandungan gizi tiap menu dari daftar bahan',
      color: COLORS.PRIMARY,
      bg: '#F7EAEF',
      route: '/seller/gizipro-analisis',
      ready: true,
    },
    {
      icon: 'label',
      title: 'Label Diet Otomatis',
      description: 'Menu otomatis dapat tag Rendah Kalori, Tinggi Protein, dsb',
      color: '#2E7D32',
      bg: '#E8F5E9',
      route: '/seller/gizipro-label-diet',
      ready: true,
    },
    {
      icon: 'lightbulb',
      title: 'Insight & Tips Menu',
      description: 'Saran perbaikan resep dari hasil analisis gizi',
      color: '#6A1B9A',
      bg: '#F3E5F5',
      route: '/seller/gizipro-insight',
      ready: true,
    },
    {
      icon: 'travel-explore',
      title: 'Cek Manual',
      description: 'Cari nilai gizi bahan secara manual lewat AhligiziID',
      color: '#00695C',
      bg: '#E0F2F1',
      route: '/seller/gizipro-cek-manual',
      ready: true,
    },
    {
      icon: 'auto-awesome',
      title: 'Analisis (AI) - Uji Coba',
      description: 'Versi baru pakai AI, masih simulasi',
      color: '#00695C',
      bg: '#E0F2F1',
      route: '/seller/gizipro-analisis-ai',
      ready: true,
    },
  ];

  const handleFeaturePress = (feature) => {
    if (!feature.ready) {
      Alert.alert('Segera Hadir', `Fitur "${feature.title}" masih dalam pengembangan.`);
      return;
    }
    router.push(feature.route);
  };

  const FeatureCard = ({ feature }) => (
    <TouchableOpacity
      style={[styles.featureCard, styles.shadow]}
      onPress={() => handleFeaturePress(feature)}
      activeOpacity={0.7}
    >
      {!feature.ready && (
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Segera Hadir</Text>
        </View>
      )}
      <View style={[styles.featureIcon, { backgroundColor: feature.bg }]}>
        <MaterialIcons name={feature.icon} size={24} color={feature.color} />
      </View>
      <Text style={styles.featureTitle}>{feature.title}</Text>
      <Text style={styles.featureDescription}>{feature.description}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Kembali">
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GiziPro</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header Section - deskripsi singkat, bukan pitch jualan */}
        <View style={[styles.intro, styles.shadow]}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="eco" size={38} color={COLORS.PRIMARY} />
          </View>
          <Text style={styles.title}>GiziPro</Text>
          <Text style={styles.subtitle}>
            Kelola informasi gizi menu kamu dari sini
          </Text>
        </View>

        {/* Features Grid - kartu fungsional, tekan buat masuk ke fitur */}
        <Text style={styles.sectionTitle}>Fitur</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default GiziProSeller;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
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

  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  intro: {
    backgroundColor: 'white',
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 16,
  },
  logoContainer: {
    backgroundColor: '#F7EAEF',
    borderRadius: 20,
    padding: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    marginTop: 18,
    marginBottom: 10,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
    position: 'relative',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EEE',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: 9,
    color: '#999',
    fontWeight: '600',
  },
  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 5,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    lineHeight: 15,
  },
});