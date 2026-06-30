import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import HeaderTitleBack from '../../components/HeaderTitleBack';
import COLORS from '../constants/color';

const GiziProSeller = () => {
  const features = [
    {
      icon: 'assessment',
      title: 'Analisis Nutrisi',
      description: 'Analisis detail kandungan gizi setiap menu makanan',
      color: COLORS.PRIMARY,
    },
    {
      icon: 'restaurant-menu',
      title: 'Menu Sehat',
      description: 'Rekomendasi menu dengan kandungan gizi seimbang',
      color: COLORS.GREEN4,
    },
    {
      icon: 'local-hospital',
      title: 'Konsultasi Ahli',
      description: 'Konsultasi dengan ahli gizi profesional',
      color: '#FF9800',
    },
    {
      icon: 'trending-up',
      title: 'Laporan Gizi',
      description: 'Laporan perkembangan nilai gizi menu Anda',
      color: '#9C27B0',
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

  const FeatureCard = ({ icon, title, description, color }) => (
    <View style={styles.featureCard}>
      <View style={[styles.featureIcon, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon} size={32} color={color} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="GiziPro" />
      
      <ScrollView style={styles.scrollView}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="eco" size={48} color={COLORS.PRIMARY} />
          </View>
          <Text style={styles.title}>GiziPro untuk Warung</Text>
          <Text style={styles.subtitle}>
            Tingkatkan kualitas dan nilai jual menu Anda dengan analisis gizi profesional
          </Text>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Fitur Unggulan</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                color={feature.color}
              />
            ))}
          </View>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Manfaat untuk Warung Anda</Text>
          {benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <MaterialIcons name="check-circle" size={20} color={COLORS.GREEN3} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleContactGiziPro}
          >
            <MaterialIcons name="whatsapp" size={24} color="white" />
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
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logoContainer: {
    backgroundColor: COLORS.PRIMARY + '20',
    borderRadius: 25,
    padding: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIcon: {
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  benefitsSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  ctaSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  ctaButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginBottom: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ctaDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});
