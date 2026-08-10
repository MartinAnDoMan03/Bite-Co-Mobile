import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import COLORS from '../constants/color';
import { useLanguage } from '../contexts/LanguageContext';

const BiteEcoBuyer = () => {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel={t('buyerBiteEco.header.accessibility.back')}
        >
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('buyerBiteEco.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Coming Soon Hero */}
        <View style={[styles.heroCard, styles.shadow]}>
          <View style={styles.heroIconWrap}>
            <MaterialIcons name="eco" size={44} color={COLORS.GREEN4} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('biteEco.comingSoon.badge')}</Text>
          </View>
          <Text style={styles.heroTitle}>{t('biteEco.comingSoon.title')}</Text>
          <Text style={styles.heroDescription}>
            {t('biteEco.comingSoon.description')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BiteEcoBuyer;

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

  shadow: Platform.select({
    web: {
      boxShadow: '0px 2px 6px rgba(0,0,0,0.05)',
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
  }),

  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Hero
  heroCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  heroIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.GREEN4 + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    backgroundColor: COLORS.GREEN4 + '20',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.GREEN4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#23272f',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 19,
  },
});