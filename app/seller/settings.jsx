import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../constants/color';
import { useLanguage } from '../contexts/LanguageContext';

// ==== Custom Alert Card ====
// Menggantikan Alert.alert bawaan (putih polos) dengan card bertema.
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

// ==== Language Picker Modal ====
const LanguagePickerModal = ({ visible, onClose, t }) => {
  const { language, setLanguage, availableLanguages } = useLanguage();

  const handleSelect = (code) => {
    setLanguage(code);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('settings.languagePicker.title')}</Text>
          <Text style={styles.languagePickerSubtitle}>{t('settings.languagePicker.subtitle')}</Text>

          <FlatList
            data={availableLanguages}
            keyExtractor={(item) => item.code}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const isActive = item.code === language;
              return (
                <TouchableOpacity
                  style={[styles.languageOption, isActive && styles.languageOptionActive]}
                  onPress={() => handleSelect(item.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageFlag}>{item.flag}</Text>
                  <Text style={[styles.languageLabel, isActive && styles.languageLabelActive]}>
                    {item.label}
                  </Text>
                  {isActive && (
                    <MaterialIcons name="check-circle" size={20} color={COLORS.PRIMARY} />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { marginTop: 8 }]} onPress={onClose}>
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
// ==== Policy Modal (Kebijakan Privasi / Syarat & Ketentuan) ====
const PolicyModal = ({ visible, onClose, title, intro, sections }) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.policyContainer}>
        <View style={styles.policyHeader}>
          <TouchableOpacity onPress={onClose} style={styles.policyBackBtn}>
            <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.policyHeaderTitle} numberOfLines={1}>{title}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          style={styles.policyScroll}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {!!intro && (
            <View style={styles.policyIntroCard}>
              <Text style={styles.policyIntroText}>{intro}</Text>
            </View>
          )}

          {sections.map((section, idx) => (
            <View key={idx} style={styles.policySectionCard}>
              <View style={styles.policySectionHeader}>
                <View style={styles.policySectionIconWrap}>
                  <MaterialIcons name={section.icon} size={18} color={COLORS.PRIMARY} />
                </View>
                <Text style={styles.policySectionTitle}>{section.title}</Text>
              </View>
              <Text style={styles.policySectionBody}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};
const SettingsPage = () => {
  const router = useRouter();
  const { t } = useLanguage();

  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState({
    orderNotifications: true,
    promotionNotifications: false,
    soundEnabled: true,
    vibrationEnabled: true,
  });
  const [businessSettings, setBusinessSettings] = useState({
    autoAcceptOrders: false,
    showOnlineStatus: true,
    allowScheduledOrders: true,
  });
  const [privacyModal, setPrivacyModal] = useState(false);
  const [termsModal, setTermsModal] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
 const [languageModal, setLanguageModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // ==== Custom alert state ====
  const [alertState, setAlertState] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [{ text: 'OK' }],
  });

  const showAlert = (title, message, buttons = [{ text: t('common.ok') }], type = 'info') => {
    setAlertState({ visible: true, type, title, message, buttons });
  };

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notificationSettings = await AsyncStorage.getItem('notifications');
      const businessData = await AsyncStorage.getItem('businessSettings');

      if (notificationSettings) {
        setNotifications(JSON.parse(notificationSettings));
      }
      if (businessData) {
        setBusinessSettings(JSON.parse(businessData));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSettings();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleNotificationToggle = (key) => {
    const newNotifications = { ...notifications, [key]: !notifications[key] };
    setNotifications(newNotifications);
    saveSettings('notifications', newNotifications);
  };

  const handleBusinessToggle = (key) => {
    const newBusinessSettings = { ...businessSettings, [key]: !businessSettings[key] };
    setBusinessSettings(newBusinessSettings);
    saveSettings('businessSettings', newBusinessSettings);
  };

  const handleChangePassword = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showAlert(t('common.error'), t('settings.changePasswordModal.errors.emptyFields'), [{ text: t('common.ok') }], 'error');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showAlert(t('common.error'), t('settings.changePasswordModal.errors.mismatch'), [{ text: t('common.ok') }], 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showAlert(t('common.error'), t('settings.changePasswordModal.errors.tooShort'), [{ text: t('common.ok') }], 'error');
      return;
    }

    // Here you would typically make an API call to change password
    showAlert(
      t('common.success'),
      t('settings.changePasswordModal.success'),
      [
        {
          text: t('common.ok'),
          onPress: () => {
            setChangePasswordModal(false);
            setPasswordData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            });
          },
        },
      ],
      'success'
    );
  };

  const handleLogout = () => {
    showAlert(
      t('settings.logoutModal.title'),
      t('settings.logoutModal.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logoutModal.confirmButton'),
          style: 'destructive',
          onPress: () => {
            // Here you would clear user session and navigate to login
            showAlert(t('common.info'), t('settings.logoutModal.success'), [{ text: t('common.ok') }], 'success');
          },
        },
      ],
      'warning'
    );
  };

const handleDeleteAccount = () => {
  showAlert(
    t('settings.deleteAccountModal.title'),
    t('settings.deleteAccountModal.message'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccountModal.confirmButton'),
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('sellerToken'); 
            
            const apiUrl = 'https://admin.biteandco.id/api/v1/seller/profile'; 

            const response = await fetch(apiUrl, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
              }
            });

            if (response.ok) {
              await AsyncStorage.clear(); 
              
              showAlert(
                t('common.success'), 
                t('settings.deleteAccountModal.success'), 
                [
                  { 
                    text: t('common.ok'), 
                    onPress: () => router.replace('seller/SellerIndex') 
                  }
                ], 
                'success'
              );
            } else {
              const errorData = await response.json();
              showAlert(
                t('common.error'), 
                errorData.message || t('settings.deleteAccountModal.error'), 
                [{ text: t('common.ok') }], 
                'error'
              );
            }
          } catch (error) {
            console.error('Error deleting account:', error);
            showAlert(
              t('common.error'), 
              t('settings.deleteAccountModal.networkError'), 
              [{ text: t('common.ok') }], 
              'error'
            );
          }
        },
      },
    ],
    'warning'
  );
};

  const settingSections = [
    {
      title: t('settings.sections.notifications.title'),
      items: [
        {
          key: 'orderNotifications',
          label: t('settings.sections.notifications.orderNotifications.label'),
          subtitle: t('settings.sections.notifications.orderNotifications.subtitle'),
          type: 'switch',
          value: notifications.orderNotifications,
          onToggle: () => handleNotificationToggle('orderNotifications'),
        },
        {
          key: 'promotionNotifications',
          label: t('settings.sections.notifications.promotionNotifications.label'),
          subtitle: t('settings.sections.notifications.promotionNotifications.subtitle'),
          type: 'switch',
          value: notifications.promotionNotifications,
          onToggle: () => handleNotificationToggle('promotionNotifications'),
        },
        {
          key: 'soundEnabled',
          label: t('settings.sections.notifications.soundEnabled.label'),
          subtitle: t('settings.sections.notifications.soundEnabled.subtitle'),
          type: 'switch',
          value: notifications.soundEnabled,
          onToggle: () => handleNotificationToggle('soundEnabled'),
        },
        {
          key: 'vibrationEnabled',
          label: t('settings.sections.notifications.vibrationEnabled.label'),
          subtitle: t('settings.sections.notifications.vibrationEnabled.subtitle'),
          type: 'switch',
          value: notifications.vibrationEnabled,
          onToggle: () => handleNotificationToggle('vibrationEnabled'),
        },
      ],
    },
    {
      title: t('settings.sections.business.title'),
      items: [
        {
          key: 'autoAcceptOrders',
          label: t('settings.sections.business.autoAcceptOrders.label'),
          subtitle: t('settings.sections.business.autoAcceptOrders.subtitle'),
          type: 'switch',
          value: businessSettings.autoAcceptOrders,
          onToggle: () => handleBusinessToggle('autoAcceptOrders'),
        },
        {
          key: 'showOnlineStatus',
          label: t('settings.sections.business.showOnlineStatus.label'),
          subtitle: t('settings.sections.business.showOnlineStatus.subtitle'),
          type: 'switch',
          value: businessSettings.showOnlineStatus,
          onToggle: () => handleBusinessToggle('showOnlineStatus'),
        },
        {
          key: 'allowScheduledOrders',
          label: t('settings.sections.business.allowScheduledOrders.label'),
          subtitle: t('settings.sections.business.allowScheduledOrders.subtitle'),
          type: 'switch',
          value: businessSettings.allowScheduledOrders,
          onToggle: () => handleBusinessToggle('allowScheduledOrders'),
        },
      ],
    },
    {
      title: t('settings.sections.account.title'),
      items: [
        {
          key: 'changePassword',
          label: t('settings.sections.account.changePassword.label'),
          subtitle: t('settings.sections.account.changePassword.subtitle'),
          type: 'button',
          icon: 'lock',
          onPress: () => setChangePasswordModal(true),
        },
        {
          key: 'twoFactor',
          label: t('settings.sections.account.twoFactor.label'),
          subtitle: t('settings.sections.account.twoFactor.subtitle'),
          type: 'button',
          icon: 'security',
          onPress: () => showAlert(t('common.info'), t('settings.sections.account.twoFactor.comingSoon'), [{ text: t('common.ok') }], 'info'),
        },
      ],
    },
    {
      title: t('settings.sections.app.title'),
      items: [
        {
          key: 'language',
          label: t('settings.sections.app.language.label'),
          subtitle: t('settings.sections.app.language.subtitle'),
          type: 'button',
          icon: 'language',
          onPress: () => setLanguageModal(true),
        },
        {
          key: 'cache',
          label: t('settings.sections.app.cache.label'),
          subtitle: t('settings.sections.app.cache.subtitle'),
          type: 'button',
          icon: 'clear-all',
          onPress: () => showAlert(t('common.success'), t('settings.sections.app.cache.success'), [{ text: t('common.ok') }], 'success'),
        },
      ],
    },
    {
      title: t('settings.sections.other.title'),
      items: [
        {
          key: 'privacy',
          label: t('settings.sections.other.privacy.label'),
          subtitle: t('settings.sections.other.privacy.subtitle'),
          type: 'button',
          icon: 'privacy-tip',
         onPress: () => setPrivacyModal(true),
        },
        {
          key: 'terms',
          label: t('settings.sections.other.terms.label'),
          subtitle: t('settings.sections.other.terms.subtitle'),
          type: 'button',
          icon: 'description',
          onPress: () => setTermsModal(true),
        },
        {
          key: 'about',
          label: t('settings.sections.other.about.label'),
          subtitle: t('settings.sections.other.about.subtitle'),
          type: 'button',
          icon: 'info',
          onPress: () =>
            showAlert(
              t('settings.sections.other.about.title'),
              t('settings.sections.other.about.message'),
              [{ text: t('common.ok') }],
              'info'
            ),
        },
      ],
    },
    {
      title: t('settings.sections.danger.title'),
      items: [
        {
          key: 'logout',
          label: t('settings.sections.danger.logout.label'),
          subtitle: t('settings.sections.danger.logout.subtitle'),
          type: 'danger',
          icon: 'logout',
          onPress: handleLogout,
        },
        {
          key: 'deleteAccount',
          label: t('settings.sections.danger.deleteAccount.label'),
          subtitle: t('settings.sections.danger.deleteAccount.subtitle'),
          type: 'danger',
          icon: 'delete-forever',
          onPress: handleDeleteAccount,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Kembali">
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.headerTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.PRIMARY]} />
        }
      >
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.card, styles.shadow]}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.settingItem,
                    itemIndex === section.items.length - 1 && styles.lastItem,
                  ]}
                  onPress={item.onPress}
                  disabled={item.type === 'switch'}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingContent}>
                    {item.icon && (
                      <View
                        style={[
                          styles.settingIconBox,
                          { backgroundColor: item.type === 'danger' ? '#FFEBEE' : '#F7EAEF' },
                        ]}
                      >
                        <MaterialIcons
                          name={item.icon}
                          size={18}
                          color={item.type === 'danger' ? '#C62828' : COLORS.PRIMARY}
                        />
                      </View>
                    )}
                    <View style={styles.settingText}>
                      <Text style={[styles.settingLabel, item.type === 'danger' && styles.dangerText]}>
                        {item.label}
                      </Text>
                      <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>

                  {item.type === 'switch' ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: '#e5e5e5', true: COLORS.PRIMARY }}
                      thumbColor="#fff"
                    />
                  ) : (
                    <MaterialIcons name="chevron-right" size={20} color="#c9c9c9" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.changePasswordModal.title')}</Text>

            <TextInput
              style={styles.input}
              placeholder={t('settings.changePasswordModal.currentPassword')}
              placeholderTextColor="#aaa"
              secureTextEntry
              value={passwordData.currentPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
            />

            <TextInput
              style={styles.input}
              placeholder={t('settings.changePasswordModal.newPassword')}
              placeholderTextColor="#aaa"
              secureTextEntry
              value={passwordData.newPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
            />

            <TextInput
              style={styles.input}
              placeholder={t('settings.changePasswordModal.confirmPassword')}
              placeholderTextColor="#aaa"
              secureTextEntry
              value={passwordData.confirmPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setChangePasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleChangePassword}>
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Picker Modal */}
      <LanguagePickerModal visible={languageModal} onClose={() => setLanguageModal(false)} t={t} />
             {/* Privacy Policy Modal */}
     <PolicyModal
       visible={privacyModal}
       onClose={() => setPrivacyModal(false)}
       title={t('settings.privacyPolicyContent.title')}
       intro={t('settings.privacyPolicyContent.intro')}
       sections={t('settings.privacyPolicyContent.sections')}
     />

     {/* Terms & Conditions Modal */}
     <PolicyModal
       visible={termsModal}
       onClose={() => setTermsModal(false)}
       title={t('settings.termsContent.title')}
       intro={t('settings.termsContent.intro')}
       sections={t('settings.termsContent.sections')}
     />


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
  // ==== Policy Modal ====
  policyContainer: { flex: 1, backgroundColor: '#F5F6FA' },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  policyBackBtn: { width: 26 },
  policyHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    marginHorizontal: 8,
  },
  policyScroll: { flex: 1, paddingHorizontal: 16 },
  policyIntroCard: {
    backgroundColor: '#F7EAEF',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F0DCE3',
  },
  policyIntroText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#5c3341',
    fontWeight: '500',
  },
  policySectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  policySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  policySectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F7EAEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  policySectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#23272f',
    flex: 1,
  },
  policySectionBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#666',
  },
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  dangerText: {
    color: '#C62828',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    textAlign: 'center',
    marginBottom: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 10,
    color: '#23272f',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: COLORS.PRIMARY,
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },

  // ==== Language Picker ====
  languagePickerSubtitle: {
    fontSize: 12.5,
    color: '#888',
    textAlign: 'center',
    marginTop: -10,
    marginBottom: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    gap: 12,
  },
  languageOptionActive: {
    backgroundColor: '#F7EAEF',
    borderColor: COLORS.PRIMARY,
  },
  languageFlag: {
    fontSize: 22,
  },
  languageLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#23272f',
  },
  languageLabelActive: {
    color: COLORS.PRIMARY,
    fontWeight: '700',
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

export default SettingsPage;