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

const BiteEcoSeller = () => {
  const router = useRouter();
  const { t } = useLanguage();

  const ecoFeatures = [
    {
      icon: 'recycling',
      title: t('biteEco.features.wasteManagement.title'),
      description: t('biteEco.features.wasteManagement.description'),
      color: COLORS.GREEN4,
      action: () => router.push('/seller/biteeco/management'),
      actionText: t('biteEco.features.wasteManagement.actionText'),
    },
    {
      icon: 'eco',
      title: t('biteEco.features.ecoPackaging.title'),
      description: t('biteEco.features.ecoPackaging.description'),
      color: '#4CAF50',
    },
    {
      icon: 'nature',
      title: t('biteEco.features.ecoCertificate.title'),
      description: t('biteEco.features.ecoCertificate.description'),
      color: '#8BC34A',
    },
    {
      icon: 'energy-savings-leaf',
      title: t('biteEco.features.carbonTracking.title'),
      description: t('biteEco.features.carbonTracking.description'),
      color: '#2E7D32',
    },
  ];

  const ecoTips = [
    {
      title: t('biteEco.tips.reduceWaste.title'),
      description: t('biteEco.tips.reduceWaste.description'),
      icon: 'restaurant',
    },
    {
      title: t('biteEco.tips.localIngredients.title'),
      description: t('biteEco.tips.localIngredients.description'),
      icon: 'location-on',
    },
    {
      title: t('biteEco.tips.saveEnergy.title'),
      description: t('biteEco.tips.saveEnergy.description'),
      icon: 'bolt',
    },
    {
      title: t('biteEco.tips.compost.title'),
      description: t('biteEco.tips.compost.description'),
      icon: 'grass',
    },
  ];

  const handleJoinBiteEco = () => {
    const phoneNumber = '6281234567890';
    const message = t('biteEco.whatsappMessage');
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`);
    });
  };

  const FeatureCard = ({ icon, title, description, color, action, actionText }) => (
    <View style={[styles.featureCard, styles.shadow]}>
      <View style={[styles.featureIcon, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon} size={26} color={color} />
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
    <View style={styles.tipRow}>
      <View style={styles.tipIconBox}>
        <MaterialIcons name={icon} size={18} color={COLORS.GREEN4} />
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipDescription}>{description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('biteEco.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('biteEco.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Section */}
        <View style={[styles.introCard, styles.shadow]}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="eco" size={38} color={COLORS.GREEN4} />
          </View>
          <Text style={styles.introTitle}>{t('biteEco.intro.title')}</Text>
          <Text style={styles.introSubtitle}>
            {t('biteEco.intro.subtitle')}
          </Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={[styles.statCard, styles.shadow]}>
            <Text style={styles.statNumber}>{t('biteEco.stats.storesJoined.value')}</Text>
            <Text style={styles.statLabel}>{t('biteEco.stats.storesJoined.label')}</Text>
          </View>
          <View style={[styles.statCard, styles.shadow]}>
            <Text style={styles.statNumber}>{t('biteEco.stats.ecoPackaging.value')}</Text>
            <Text style={styles.statLabel}>{t('biteEco.stats.ecoPackaging.label')}</Text>
          </View>
          <View style={[styles.statCard, styles.shadow]}>
            <Text style={styles.statNumber}>{t('biteEco.stats.co2Reduced.value')}</Text>
            <Text style={styles.statLabel}>{t('biteEco.stats.co2Reduced.label')}</Text>
          </View>
        </View>

        {/* Features */}
        <Text style={styles.sectionTitle}>{t('biteEco.sections.program')}</Text>
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

        {/* Benefits Section */}
        <Text style={styles.sectionTitle}>{t('biteEco.sections.benefits')}</Text>
        <View style={[styles.card, styles.shadow]}>
          {[
            { icon: 'trending-up', text: t('biteEco.benefits.brandImage') },
            { icon: 'local-offer', text: t('biteEco.benefits.discountPackaging') },
            { icon: 'verified', text: t('biteEco.benefits.certificate') },
            { icon: 'people', text: t('biteEco.benefits.community') },
          ].map((benefit, index, arr) => (
            <View
              key={index}
              style={[styles.benefitRow, index === arr.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={styles.tipIconBox}>
                <MaterialIcons name={benefit.icon} size={18} color={COLORS.GREEN4} />
              </View>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          ))}
        </View>

        {/* Tips Section */}
        <Text style={styles.sectionTitle}>{t('biteEco.sections.tips')}</Text>
        <View style={[styles.card, styles.shadow]}>
          {ecoTips.map((tip, index) => (
            <View key={index} style={[index !== ecoTips.length - 1 && styles.tipDivider]}>
              <TipCard icon={tip.icon} title={tip.title} description={tip.description} />
            </View>
          ))}
        </View>

        {/* CTA Section */}
        <View style={[styles.ctaCard, styles.shadow]}>
          <View style={styles.ctaIconWrap}>
            <MaterialIcons name="eco" size={28} color={COLORS.GREEN4} />
          </View>
          <Text style={styles.ctaTitle}>{t('biteEco.cta.title')}</Text>
          <Text style={styles.ctaDescription}>
            {t('biteEco.cta.description')}
          </Text>

          <TouchableOpacity style={styles.ctaButton} onPress={handleJoinBiteEco} activeOpacity={0.85}>
            <MaterialIcons name="eco" size={18} color="white" />
            <Text style={styles.ctaButtonText}>{t('biteEco.cta.button')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BiteEcoSeller;

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

  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    marginTop: 18,
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
  },

  // Intro
  introCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  logoContainer: {
    backgroundColor: COLORS.GREEN4 + '20',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#23272f',
    marginBottom: 6,
  },
  introSubtitle: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 19,
  },

  // Stats
  statsSection: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.GREEN4,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 10.5,
    color: '#888',
    textAlign: 'center',
  },

  // Features
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
    marginBottom: 12,
    alignItems: 'center',
  },
  featureIcon: {
    borderRadius: 18,
    padding: 10,
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 6,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    lineHeight: 15,
  },
  featureAction: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: 'center',
  },
  featureActionText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },

  // Benefits
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  benefitText: {
    fontSize: 13,
    color: '#23272f',
    flex: 1,
    lineHeight: 18,
  },

  // Tips
  tipDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tipIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E9F5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 2,
  },
  tipDescription: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },

  // CTA
  ctaCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    marginTop: 18,
  },
  ctaIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E9F5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#23272f',
    marginBottom: 6,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 12.5,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  ctaButton: {
    backgroundColor: COLORS.GREEN4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 30,
    gap: 8,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});