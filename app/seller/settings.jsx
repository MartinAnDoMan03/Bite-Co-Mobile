import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderTitleBack from '../../components/HeaderTitleBack';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsPage = () => {
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
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

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
      Alert.alert('Error', 'Mohon isi semua field password');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'Password baru tidak sama dengan konfirmasi password');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'Password baru minimal 6 karakter');
      return;
    }

    // Here you would typically make an API call to change password
    Alert.alert(
      'Berhasil',
      'Password berhasil diubah',
      [
        {
          text: 'OK',
          onPress: () => {
            setChangePasswordModal(false);
            setPasswordData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            });
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar dari aplikasi?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: () => {
            // Here you would clear user session and navigate to login
            Alert.alert('Info', 'Logout berhasil');
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hapus Akun',
      'Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan dan semua data akan hilang.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Info', 'Fitur hapus akun akan segera tersedia. Silakan hubungi customer service untuk bantuan.');
          }
        }
      ]
    );
  };

  const settingSections = [
    {
      title: 'Notifikasi',
      items: [
        {
          key: 'orderNotifications',
          label: 'Notifikasi Pesanan',
          subtitle: 'Terima notifikasi untuk pesanan baru',
          type: 'switch',
          value: notifications.orderNotifications,
          onToggle: () => handleNotificationToggle('orderNotifications'),
        },
        {
          key: 'promotionNotifications',
          label: 'Notifikasi Promosi',
          subtitle: 'Terima notifikasi tentang promosi dan penawaran',
          type: 'switch',
          value: notifications.promotionNotifications,
          onToggle: () => handleNotificationToggle('promotionNotifications'),
        },
        {
          key: 'soundEnabled',
          label: 'Suara Notifikasi',
          subtitle: 'Aktifkan suara untuk notifikasi',
          type: 'switch',
          value: notifications.soundEnabled,
          onToggle: () => handleNotificationToggle('soundEnabled'),
        },
        {
          key: 'vibrationEnabled',
          label: 'Getar',
          subtitle: 'Aktifkan getaran untuk notifikasi',
          type: 'switch',
          value: notifications.vibrationEnabled,
          onToggle: () => handleNotificationToggle('vibrationEnabled'),
        },
      ],
    },
    {
      title: 'Pengaturan Bisnis',
      items: [
        {
          key: 'autoAcceptOrders',
          label: 'Auto Accept Pesanan',
          subtitle: 'Otomatis terima pesanan yang masuk',
          type: 'switch',
          value: businessSettings.autoAcceptOrders,
          onToggle: () => handleBusinessToggle('autoAcceptOrders'),
        },
        {
          key: 'showOnlineStatus',
          label: 'Tampilkan Status Online',
          subtitle: 'Tampilkan status online ke pelanggan',
          type: 'switch',
          value: businessSettings.showOnlineStatus,
          onToggle: () => handleBusinessToggle('showOnlineStatus'),
        },
        {
          key: 'allowScheduledOrders',
          label: 'Pesanan Terjadwal',
          subtitle: 'Izinkan pelanggan memesan untuk jadwal tertentu',
          type: 'switch',
          value: businessSettings.allowScheduledOrders,
          onToggle: () => handleBusinessToggle('allowScheduledOrders'),
        },
      ],
    },
    {
      title: 'Akun & Keamanan',
      items: [
        {
          key: 'changePassword',
          label: 'Ubah Password',
          subtitle: 'Ganti password akun Anda',
          type: 'button',
          icon: 'lock',
          onPress: () => setChangePasswordModal(true),
        },
        {
          key: 'twoFactor',
          label: 'Autentikasi 2 Faktor',
          subtitle: 'Tingkatkan keamanan akun',
          type: 'button',
          icon: 'security',
          onPress: () => Alert.alert('Info', 'Fitur 2FA akan segera tersedia'),
        },
      ],
    },
    {
      title: 'Aplikasi',
      items: [
        {
          key: 'language',
          label: 'Bahasa',
          subtitle: 'Indonesia',
          type: 'button',
          icon: 'language',
          onPress: () => Alert.alert('Info', 'Pengaturan bahasa akan segera tersedia'),
        },
        {
          key: 'theme',
          label: 'Tema',
          subtitle: 'Terang',
          type: 'button',
          icon: 'palette',
          onPress: () => Alert.alert('Info', 'Pengaturan tema akan segera tersedia'),
        },
        {
          key: 'cache',
          label: 'Bersihkan Cache',
          subtitle: 'Hapus data cache aplikasi',
          type: 'button',
          icon: 'clear-all',
          onPress: () => Alert.alert('Info', 'Cache berhasil dibersihkan'),
        },
      ],
    },
    {
      title: 'Lainnya',
      items: [
        {
          key: 'privacy',
          label: 'Kebijakan Privasi',
          subtitle: 'Baca kebijakan privasi kami',
          type: 'button',
          icon: 'privacy-tip',
          onPress: () => Alert.alert('Info', 'Kebijakan privasi akan ditampilkan'),
        },
        {
          key: 'terms',
          label: 'Syarat & Ketentuan',
          subtitle: 'Baca syarat dan ketentuan',
          type: 'button',
          icon: 'description',
          onPress: () => Alert.alert('Info', 'Syarat & ketentuan akan ditampilkan'),
        },
        {
          key: 'about',
          label: 'Tentang Aplikasi',
          subtitle: 'Versi 1.2.5',
          type: 'button',
          icon: 'info',
          onPress: () => Alert.alert('Tentang', 'Bite&Co Seller v1.2.5\nDikembangkan untuk memudahkan pengelolaan warung Anda'),
        },
      ],
    },
    {
      title: 'Aksi Berbahaya',
      items: [
        {
          key: 'logout',
          label: 'Keluar',
          subtitle: 'Keluar dari aplikasi',
          type: 'danger',
          icon: 'logout',
          onPress: handleLogout,
        },
        {
          key: 'deleteAccount',
          label: 'Hapus Akun',
          subtitle: 'Hapus akun dan semua data',
          type: 'danger',
          icon: 'delete-forever',
          onPress: handleDeleteAccount,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Pengaturan" />
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.settingItem,
                  itemIndex === section.items.length - 1 && styles.lastItem
                ]}
                onPress={item.onPress}
                disabled={item.type === 'switch'}
              >
                <View style={styles.settingContent}>
                  {item.icon && (
                    <MaterialIcons
                      name={item.icon}
                      size={24}
                      color={item.type === 'danger' ? '#dc3545' : '#FF6B35'}
                      style={styles.settingIcon}
                    />
                  )}
                  <View style={styles.settingText}>
                    <Text style={[
                      styles.settingLabel,
                      item.type === 'danger' && styles.dangerText
                    ]}>
                      {item.label}
                    </Text>
                    <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                
                {item.type === 'switch' ? (
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: '#e9ecef', true: '#FF6B35' }}
                    thumbColor={item.value ? '#fff' : '#f4f3f4'}
                  />
                ) : (
                  <MaterialIcons name="chevron-right" size={20} color="#666" />
                )}
              </TouchableOpacity>
            ))}
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
            <Text style={styles.modalTitle}>Ubah Password</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Password Saat Ini"
              secureTextEntry
              value={passwordData.currentPassword}
              onChangeText={(text) => setPasswordData({...passwordData, currentPassword: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password Baru"
              secureTextEntry
              value={passwordData.newPassword}
              onChangeText={(text) => setPasswordData({...passwordData, newPassword: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Konfirmasi Password Baru"
              secureTextEntry
              value={passwordData.confirmPassword}
              onChangeText={(text) => setPasswordData({...passwordData, confirmPassword: text})}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setChangePasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleChangePassword}
              >
                <Text style={styles.saveButtonText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  dangerText: {
    color: '#dc3545',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default SettingsPage;
