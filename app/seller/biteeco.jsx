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
import { useRouter } from 'expo-router';
import HeaderTitleBack from '../../components/HeaderTitleBack';
import COLORS from '../constants/color';

const BiteEcoSeller = () => {
  const router = useRouter();

  const ecoFeatures = [
    {
      icon: 'recycling',
      title: 'Kelola Limbah Makanan',
      description: 'Posting dan jual limbah makanan Anda kepada pembeli yang membutuhkan',
      color: COLORS.GREEN4,
      action: () => router.push('/seller/biteeco/management'),
      actionText: 'Kelola Limbah',
    },
    {
      icon: 'eco',
      title: 'Kemasan Ramah Lingkungan',
      description: 'Dapatkan kemasan biodegradable untuk semua pesanan',
      color: '#4CAF50',
    },
    {
      icon: 'nature',
      title: 'Sertifikat Eco-Friendly',
      description: 'Dapatkan sertifikat warung ramah lingkungan',
      color: '#8BC34A',
    },
    {
      icon: 'energy-savings-leaf',
      title: 'Carbon Footprint Tracking',
      description: 'Pantau jejak karbon dari operasional warung Anda',
      color: '#2E7D32',
    },
  ];

  const ecoTips = [
    {
      title: 'Reduce Food Waste',
      description: 'Kelola porsi makanan dengan tepat untuk mengurangi limbah',
      icon: 'restaurant',
    },
    {
      title: 'Gunakan Bahan Lokal',
      description: 'Prioritaskan bahan makanan dari petani lokal',
      icon: 'location-on',
    },
    {
      title: 'Hemat Energi',
      description: 'Optimalkan penggunaan gas dan listrik saat memasak',
      icon: 'bolt',
    },
    {
      title: 'Kompos Organik',
      description: 'Ubah sisa makanan menjadi kompos untuk pupuk',
      icon: 'grass',
    },
  ];

  const handleJoinBiteEco = () => {
    const phoneNumber = '6281234567890';
    const message = 'Halo, saya ingin bergabung dengan program Bite Eco untuk warung saya';
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`);
    });
  };

  const FeatureCard = ({ icon, title, description, color, action, actionText }) => (
    <View style={styles.featureCard}>
      <View style={[styles.featureIcon, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
      {action && actionText && (
        <TouchableOpacity style={[styles.featureAction, { backgroundColor: color }]} onPress={action}>
          <Text style={styles.featureActionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const TipCard = ({ icon, title, description }) => (
    <View style={styles.tipCard}>
      <MaterialIcons name={icon} size={24} color={COLORS.GREEN4} />
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipDescription}>{description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Bite Eco" />
      
      <ScrollView style={styles.scrollView}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="eco" size={48} color={COLORS.GREEN4} />
          </View>
          <Text style={styles.title}>Bite Eco</Text>
          <Text style={styles.subtitle}>
            Bergabunglah dalam gerakan warung ramah lingkungan untuk masa depan yang lebih hijau
          </Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>500+</Text>
            <Text style={styles.statLabel}>Warung Bergabung</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>10K+</Text>
            <Text style={styles.statLabel}>Kemasan Ramah Lingkungan</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>2 Ton</Text>
            <Text style={styles.statLabel}>CO2 Dikurangi</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Program Bite Eco</Text>
          <View style={styles.featuresGrid}>
            {ecoFeatures.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                color={feature.color}
                action={feature.action}
                actionText={feature.actionText}
              />
            ))}
          </View>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Keuntungan Bergabung</Text>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <MaterialIcons name="trending-up" size={20} color={COLORS.GREEN4} />
              <Text style={styles.benefitText}>
                Tingkatkan brand image sebagai warung peduli lingkungan
              </Text>
            </View>
            
            <View style={styles.benefitItem}>
              <MaterialIcons name="local-offer" size={20} color={COLORS.GREEN4} />
              <Text style={styles.benefitText}>
                Dapatkan kemasan eco-friendly dengan harga khusus
              </Text>
            </View>
            
            <View style={styles.benefitItem}>
              <MaterialIcons name="verified" size={20} color={COLORS.GREEN4} />
              <Text style={styles.benefitText}>
                Sertifikat resmi warung ramah lingkungan
              </Text>
            </View>
            
            <View style={styles.benefitItem}>
              <MaterialIcons name="people" size={20} color={COLORS.GREEN4} />
              <Text style={styles.benefitText}>
                Akses komunitas warung eco-friendly
              </Text>
            </View>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Tips Warung Ramah Lingkungan</Text>
          {ecoTips.map((tip, index) => (
            <TipCard
              key={index}
              icon={tip.icon}
              title={tip.title}
              description={tip.description}
            />
          ))}
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaCard}>
            <MaterialIcons name="eco" size={32} color={COLORS.GREEN4} />
            <Text style={styles.ctaTitle}>Siap Menjadi Warung Eco-Friendly?</Text>
            <Text style={styles.ctaDescription}>
              Bergabunglah dengan program Bite Eco dan mulai berkontribusi untuk lingkungan yang lebih baik
            </Text>
            
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleJoinBiteEco}
            >
              <MaterialIcons name="eco" size={20} color="white" />
              <Text style={styles.ctaButtonText}>Bergabung Sekarang</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BiteEcoSeller;

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
    backgroundColor: COLORS.GREEN4 + '20',
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
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.GREEN4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
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
    fontSize: 14,
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
  benefitsList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  tipsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  tipCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  ctaSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  ctaCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: COLORS.GREEN4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
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
  featureAction: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  featureActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
