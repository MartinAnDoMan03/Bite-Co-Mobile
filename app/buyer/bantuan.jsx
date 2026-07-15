import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import COLORS from '../constants/color';
import { useLanguage } from '../contexts/LanguageContext';

// ==== Custom Alert Card ====
// Konsisten dengan SettingsPage: menggantikan Alert.alert bawaan (putih polos)
// dengan card bertema.
const ALERT_ICONS = {
  info: { name: 'info', color: COLORS.PRIMARY, bg: '#F7EAEF' },
  success: { name: 'check-circle', color: '#2E7D32', bg: '#E8F5E9' },
  error: { name: 'error', color: '#C62828', bg: '#FFEBEE' },
  warning: { name: 'warning', color: '#C62828', bg: '#FFEBEE' },
};

const CustomAlert = ({ visible, type = 'info', title, message, buttons, onClose }) => {
  const icon = ALERT_ICONS[type] || ALERT_ICONS.info;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.alertOverlay}>
        <View style={styles.alertCard}>
          <View style={[styles.alertIconWrap, { backgroundColor: icon.bg }]}>
            <MaterialIcons name={icon.name} size={30} color={icon.color} />
          </View>

          {!!title && <Text style={styles.alertTitle}>{title}</Text>}
          {!!message && <Text style={styles.alertMessage}>{message}</Text>}

          <View style={styles.alertButtonRow}>
            {buttons.map((btn, idx) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => {
                    onClose();
                    btn.onPress && btn.onPress();
                  }}
                  style={[
                    styles.alertButton,
                    isCancel && styles.alertButtonCancel,
                    isDestructive && styles.alertButtonDestructive,
                    !isCancel && !isDestructive && styles.alertButtonPrimary,
                    buttons.length > 1 && idx === 0 && { marginRight: 8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.alertButtonText,
                      isCancel && styles.alertButtonTextCancel,
                      (isDestructive || (!isCancel && !isDestructive)) && styles.alertButtonTextSolid,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const BantuanPage = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  // ==== Custom alert state ====
  const [alertState, setAlertState] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [{ text: t('common.ok') }],
  });

  const showAlert = (title, message, buttons = [{ text: t('common.ok') }], type = 'info') => {
    setAlertState({ visible: true, type, title, message, buttons });
  };

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = '+6285262130124'; // Nomor WhatsApp Ketua Bite&Co (Sementara)
    const message = t('bantuan.whatsappMessage');
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        showAlert(t('common.error'), t('bantuan.alerts.whatsappNotInstalled'), [{ text: t('common.ok') }], 'error');
      }
    });
  };

  const handleEmailContact = () => {
    const email = 'support@biteandco.id';
    const subject = 'Bantuan Aplikasi Seller';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;

    Linking.openURL(url).catch(() => {
      showAlert(t('common.error'), t('bantuan.alerts.emailNotAvailable'), [{ text: t('common.ok') }], 'error');
    });
  };

  const faqData = [
    { id: 1, question: t('bantuan.faq.q1.question'), answer: t('bantuan.faq.q1.answer') },
    { id: 2, question: t('bantuan.faq.q2.question'), answer: t('bantuan.faq.q2.answer') },
    { id: 3, question: t('bantuan.faq.q3.question'), answer: t('bantuan.faq.q3.answer') },
    { id: 4, question: t('bantuan.faq.q4.question'), answer: t('bantuan.faq.q4.answer') },
    { id: 5, question: t('bantuan.faq.q5.question'), answer: t('bantuan.faq.q5.answer') },
    { id: 6, question: t('bantuan.faq.q6.question'), answer: t('bantuan.faq.q6.answer') },
  ];

  const quickActions = [
    {
      id: 1,
      title: t('bantuan.quickActions.whatsapp.title'),
      subtitle: t('bantuan.quickActions.whatsapp.subtitle'),
      icon: 'chat',
      color: '#25D366',
      onPress: handleWhatsAppContact
    },
    {
      id: 2,
      title: t('bantuan.quickActions.email.title'),
      subtitle: t('bantuan.quickActions.email.subtitle'),
      icon: 'email',
      color: '#EA4335',
      onPress: handleEmailContact
    },
    {
      id: 3,
      title: t('bantuan.quickActions.guide.title'),
      subtitle: t('bantuan.quickActions.guide.subtitle'),
      icon: 'menu-book',
      color: '#4285F4',
      onPress: () => showAlert(t('common.info'), t('bantuan.alerts.guideComingSoon'), [{ text: t('common.ok') }], 'info')
    },
    {
      id: 4,
      title: t('bantuan.quickActions.video.title'),
      subtitle: t('bantuan.quickActions.video.subtitle'),
      icon: 'play-circle-filled',
      color: '#FF0000',
      onPress: () => showAlert(t('common.info'), t('bantuan.alerts.videoComingSoon'), [{ text: t('common.ok') }], 'info')
    }
  ];

  const contactItems = [
    { icon: 'phone', label: t('bantuan.contact.phone') },
    { icon: 'email', label: t('bantuan.contact.email') },
    { icon: 'access-time', label: t('bantuan.contact.hours') },
    { icon: 'location-on', label: t('bantuan.contact.location') },
  ];

  const appInfoItems = [
    { label: t('bantuan.appInfo.versionLabel'), value: t('bantuan.appInfo.versionValue') },
    { label: t('bantuan.appInfo.lastUpdateLabel'), value: t('bantuan.appInfo.lastUpdateValue') },
    { label: t('bantuan.appInfo.deviceIdLabel'), value: t('bantuan.appInfo.deviceIdValue') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('bantuan.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('bantuan.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.PRIMARY]} />
        }
      >
        {/* Quick Contact Section */}
        <Text style={styles.sectionTitle}>{t('bantuan.sections.contactUs')}</Text>
        <View style={{ gap: 10 }}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.quickActionCard, styles.shadow]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                <MaterialIcons name={action.icon} size={20} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#c9c9c9" />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ Section */}
        <Text style={styles.sectionTitle}>{t('bantuan.sections.faq')}</Text>
        <View style={[styles.card, styles.shadow]}>
          {faqData.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.faqItem, index === faqData.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <MaterialIcons
                  name={expandedFAQ === item.id ? "expand-less" : "expand-more"}
                  size={22}
                  color="#999"
                />
              </View>
              {expandedFAQ === item.id && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Info Section */}
        <Text style={styles.sectionTitle}>{t('bantuan.sections.contactInfo')}</Text>
        <View style={[styles.card, styles.shadow]}>
          {contactItems.map((item, index) => (
            <View
              key={index}
              style={[styles.contactRow, index === contactItems.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={styles.contactIconBox}>
                <MaterialIcons name={item.icon} size={16} color={COLORS.PRIMARY} />
              </View>
              <Text style={styles.contactText}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* App Info Section */}
        <Text style={styles.sectionTitle}>{t('bantuan.sections.appInfo')}</Text>
        <View style={[styles.card, styles.shadow]}>
          {appInfoItems.map((item, index) => (
            <View
              key={index}
              style={[styles.infoRow, index === appInfoItems.length - 1 && { borderBottomWidth: 0 }]}
            >
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Custom Alert Card (pengganti Alert.alert bawaan) */}
      <CustomAlert
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
};

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
    padding: 6,
  },

  // Quick actions
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#888',
  },

  // FAQ
  faqItem: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#23272f',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 12.5,
    color: '#777',
    marginTop: 8,
    lineHeight: 19,
  },

  // Contact info
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F7EAEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 13.5,
    color: '#23272f',
    flex: 1,
  },

  // App info
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 13,
    color: '#777',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#23272f',
  },

  // ==== Custom Alert Card ====
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 8, 12, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  alertCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingTop: 24,
    paddingBottom: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E4E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  alertIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#23272f',
    textAlign: 'center',
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#6b6b6b',
    textAlign: 'center',
    marginBottom: 20,
  },
  alertButtonRow: {
    flexDirection: 'row',
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertButtonPrimary: {
    backgroundColor: COLORS.PRIMARY,
  },
  alertButtonDestructive: {
    backgroundColor: '#C62828',
  },
  alertButtonCancel: {
    backgroundColor: '#F5EFE6',
    borderWidth: 1.5,
    borderColor: '#E4D6DC',
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertButtonTextSolid: {
    color: '#FFFFFF',
  },
  alertButtonTextCancel: {
    color: COLORS.PRIMARY,
  },
});

export default BantuanPage;