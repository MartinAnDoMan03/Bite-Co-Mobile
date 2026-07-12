import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
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
      title: 'Analisis Nutrisi',
      description: 'Analisis detail kandungan gizi setiap menu makanan',
      color: COLORS.PRIMARY,
      bg: '#F7EAEF',
    },
    {
      icon: 'restaurant-menu',
      title: 'Menu Sehat',
      description: 'Rekomendasi menu dengan kandungan gizi seimbang',
      color: '#2E7D32',
      bg: '#E8F5E9',
    },
    {
      icon: 'local-hospital',
      title: 'Konsultasi Ahli',
      description: 'Konsultasi dengan ahli gizi profesional',
      color: '#B26A00',
      bg: '#FFF3E0',
    },
    {
      icon: 'trending-up',
      title: 'Laporan Gizi',
      description: 'Laporan perkembangan nilai gizi menu Anda',
      color: '#6A1B9A',
      bg: '#F3E5F5',
    },
  ];

  const benefits = [
    'Meningkatkan kredibilitas warung dengan sertifikat gizi',
    'Menarik lebih banyak pelanggan yang peduli kesehatan',
    'Optimasi harga berdasarkan nilai gizi',
    'Panduan menu sehat untuk berbagai kalangan',
  ];

  const handleContactGiziPro = () => {
    // WhatsApp contact untuk GiziPro
    const phoneNumber = '6281234567890';
    const message = 'Halo, saya tertarik dengan layanan GiziPro untuk warung saya';
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

    Linking.openURL(url).catch(() => {
      // Fallback jika WhatsApp tidak terinstall
      Linking.openURL(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`);
    });
  };

  const FeatureCard = ({ icon, title, description, color, bg }) => (
    <View style={[styles.featureCard, styles.shadow]}>
      <View style={[styles.featureIcon, { backgroundColor: bg }]}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
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
        {/* Header Section */}
        <View style={[styles.intro, styles.shadow]}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="eco" size={38} color={COLORS.PRIMARY} />
          </View>
          <Text style={styles.title}>GiziPro untuk Warung</Text>
          <Text style={styles.subtitle}>
            Tingkatkan kualitas dan nilai jual menu Anda dengan analisis gizi profesional
          </Text>
        </View>

        {/* Features Grid */}
        <Text style={styles.sectionTitle}>Fitur Unggulan</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              color={feature.color}
              bg={feature.bg}
            />
          ))}
        </View>

        {/* Benefits Section */}
        <Text style={styles.sectionTitle}>Manfaat untuk Warung Anda</Text>
        <View style={[styles.benefitsCard, styles.shadow]}>
          {benefits.map((benefit, index) => (
            <View
              key={index}
              style={[styles.benefitItem, index === benefits.length - 1 && { borderBottomWidth: 0 }]}
            >
              <MaterialIcons name="check-circle" size={18} color="#2E7D32" />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleContactGiziPro}
            activeOpacity={0.8}
          >
            <MaterialIcons name="chat" size={20} color="white" />
            <Text style={styles.ctaButtonText}>Hubungi Konsultan</Text>
          </TouchableOpacity>

          <Text style={styles.ctaDescription}>
            Dapatkan konsultasi gratis untuk mengetahui kebutuhan gizi warung Anda
          </Text>
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
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.PRIMARY },

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
    paddingVertical: 26,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 16,
  },
  logoContainer: {
    backgroundColor: '#F7EAEF',
    borderRadius: 20,
    padding: 10,
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
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
  benefitsCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  benefitText: {
    fontSize: 13,
    color: '#444',
    flex: 1,
    lineHeight: 18,
  },
  ctaSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  ctaButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 14.5,
    fontWeight: '700',
  },
  ctaDescription: {
    fontSize: 11.5,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 30,
  },
});