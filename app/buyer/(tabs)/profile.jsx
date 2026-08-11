import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import React, { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../../constants/color';
import axios from 'axios';
import config from '../../constants/config';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import PinPointMapModal from '../../../components/PinPointMapModal';
import { useLanguage } from "../../contexts/LanguageContext";
// ---------------------------------------------------------------------------
// Small reusable row: icon + label on the left, value on the right
// ---------------------------------------------------------------------------
const InfoRow = ({ icon, label, value, isLast }) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.infoRowLeft}>
      <MaterialIcons name={icon} size={16} color="#999" />
      <Text style={styles.infoRowLabel}>{label}</Text>
    </View>
    <Text style={styles.infoRowValue} numberOfLines={1}>{value || "-"}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// Address grid field (read-only): label kecil abu-abu di atas, value di bawah
// ---------------------------------------------------------------------------
const AddressField = ({ label, value, placeholder }) => (
  <View style={styles.addressField}>
    <Text style={styles.addressLabel}>{label}</Text>
    <Text style={styles.addressValue} numberOfLines={2}>
      {value || placeholder}
    </Text>
  </View>
);

const profile = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addressFields, setAddressFields] = useState({
    address: '',
    kelurahan: '',
    kecamatan: '',
    provinsi: '',
    kodepos: '',
    catatan: '',
  });
  const [pinPoint, setPinPoint] = useState({ lat: null, lng: null, address: '' });
  const [showPinPointModal, setShowPinPointModal] = useState(false);
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);

  // ---- Logika di bawah ini tidak diubah ----
  const fetchProfileData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      if (!token) {
        setError('No token found');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${config.API_URL}/buyer/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setUserData(response.data);

      // Load address data from AsyncStorage
      await loadAddressData();

      setLoading(false);
    } catch (err) {
      setError('Failed to fetch profile data');
      setLoading(false);
      console.error('Profile fetch error:', err);
    }
  }, []);

  const loadAddressData = async () => {
    try {
      const savedAddress = await AsyncStorage.getItem('addressFields');
      const savedPinPoint = await AsyncStorage.getItem('pinPoint');

      if (savedAddress) {
        setAddressFields(JSON.parse(savedAddress));
      }

      if (savedPinPoint) {
        setPinPoint(JSON.parse(savedPinPoint));
      }
    } catch (error) {
      console.error('Error loading address data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData])
  );

  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem('buyerToken');
      router.push('/'); // Navigate to index.jsx (first screen)
      console.log('Signed out successfully');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handlePinPointSelect = (point) => {
    const newPinPoint = {
      lat: point.latitude,
      lng: point.longitude,
      address: point.address
    };
    setPinPoint(newPinPoint);
    AsyncStorage.setItem('pinPoint', JSON.stringify(newPinPoint));

    // Auto-fill address fields if address components are available
    if (point.addressComponents) {
      const newAddressFields = {
        address: point.addressComponents.address || point.address || '',
        kelurahan: point.addressComponents.kelurahan || '',
        kecamatan: point.addressComponents.kecamatan || '',
        provinsi: point.addressComponents.provinsi || '',
        kodepos: point.addressComponents.kodepos || '',
        catatan: addressFields.catatan, // Keep existing notes
      };

      setAddressFields(newAddressFields);
      AsyncStorage.setItem('addressFields', JSON.stringify(newAddressFields));

      // Show notification that address has been auto-filled
      Alert.alert(
      t("profile.autoFillTitle"),
        t("profile.autoFillMessage"),
        [{ text: t("common.ok", "OK") }]
      );
    }

    setShowPinPointModal(false);
  };

  const openPinPointMap = () => {
    setShowPinPointModal(true);
  };

  const handleSaveAddress = async () => {
    try {
      await AsyncStorage.setItem('addressFields', JSON.stringify(addressFields));
      setShowEditAddressModal(false);
      Alert.alert(t("profile.success"), t("profile.addressSaved"))
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert(t("profile.error"), t("profile.saveFailed"))
    }
  };
  // ---- Akhir bagian logika yang tidak diubah ----

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F6FA" }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F6FA" }}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          
          <TouchableOpacity style={[styles.pillButton, styles.solidButton]} onPress={fetchProfileData}>
            <Text style={styles.solidButtonText}>{t("profile.retry")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pillButton, styles.outlineButton, { marginTop: 10, paddingHorizontal: 30 }]}
            onPress={handleSignOut}
          >
            <Text style={styles.outlineButtonText}>{t("profile.logout")}</Text>
          </TouchableOpacity>
          
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F6FA" }}>
      {/* Header selaras dengan halaman profil penjual */}
      <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('profile.header.accessibility.back')}>
        <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t("profile.title")}</Text>
      <TouchableOpacity onPress={() => router.push('/buyer/notifikasi')} style={{ width: 26 }}>
        <MaterialIcons name="notifications-none" size={24} color={COLORS.PRIMARY} />
      </TouchableOpacity>
    </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* ---------------- Informasi Personal ---------------- */}
        <Text style={styles.sectionTitle}>{t("profile.personalInfo")}</Text>
        <View style={[styles.card, styles.shadow]}>
        <InfoRow icon="badge" label={t("profile.name")} value={userData.name}/>
          <InfoRow icon="mail-outline" label={t("profile.email")} value={userData.email} />
          <InfoRow icon="phone" label={t("profile.phone")} value={userData.phone} isLast />
        </View>

        {/* ---------------- Detail Alamat ---------------- */}
        <Text style={styles.sectionTitle}>{t("profile.deliveryAddress")}</Text>
        <View style={[styles.card, styles.shadow]}>
          <View style={styles.addressRow}>
            <AddressField label={t("profile.fullAddress")} value={addressFields.address} placeholder={t("profile.notSet")} />
            <AddressField label={t("profile.village")} value={addressFields.kelurahan} placeholder={t("profile.notSet")} />
          </View>
          <View style={styles.addressRow}>
            <AddressField label={t("profile.district")} value={addressFields.kecamatan} placeholder={t("profile.notSet")} />
            <AddressField label={t("profile.province")} value={addressFields.provinsi} placeholder={t("profile.notSet")} />
          </View>
          <View style={styles.addressRow}>
            <AddressField label={t("profile.postalCode")} value={addressFields.kodepos} placeholder={t("profile.notSet")} />
            <AddressField label={t("profile.notes")} value={addressFields.catatan} placeholder={t("profile.notSet")} />
          </View>

          <TouchableOpacity
            style={[styles.pillButton, styles.outlineButton, { marginTop: 6 }]}
            onPress={() => setShowEditAddressModal(true)}
          >
            <Text style={styles.outlineButtonText}>{t("profile.editAddress")}</Text>
          </TouchableOpacity>
        </View>

        {/* ---------------- Pin Point Lokasi ---------------- */}
        <View style={[styles.card, styles.shadow, { marginTop: 14 }]}>
          <Text style={styles.pinLabel}>{t("profile.pinPoint")}</Text>
          <TouchableOpacity style={styles.pinBox} onPress={openPinPointMap} activeOpacity={0.8}>
            {pinPoint.lat && pinPoint.lng ? (
              <View style={styles.pinFilled}>
                <MaterialIcons name="place" size={24} color={COLORS.PRIMARY} />
                <Text style={styles.pinCoordinateText}>
                  {pinPoint.lat.toFixed(6)}, {pinPoint.lng.toFixed(6)}
                </Text>
              </View>
            ) : (
              <View style={styles.pinPlaceholder}>
                <MaterialIcons name="map" size={22} color="#bbb" />
                <Text style={styles.pinPlaceholderText}>{t("profile.notSet")}r</Text>
              </View>
            )}
          </TouchableOpacity>
          {pinPoint.address ? (
            <Text style={styles.pinAddressText} numberOfLines={2}>{pinPoint.address}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.pillButton, styles.outlineButton, { marginTop: 12 }]}
            onPress={openPinPointMap}
          >
            <Text style={styles.outlineButtonText}>
              {pinPoint.lat && pinPoint.lng ? t("profile.updatePin") : t("profile.setPin")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ---------------- Tombol Keluar ---------------- */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.pillButton, styles.solidButton]}
            onPress={handleSignOut}
          >
            <Text style={styles.solidButtonText}>{t("profile.logout")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* PinPoint Map Modal */}
      <PinPointMapModal
        visible={showPinPointModal}
        onClose={() => setShowPinPointModal(false)}
        onSelect={handlePinPointSelect}
        initialPin={pinPoint.lat && pinPoint.lng ? {
          latitude: pinPoint.lat,
          longitude: pinPoint.lng
        } : null}
      />

      {/* Edit Address Modal — direstyle selaras dengan gaya penjual */}
      <Modal
        visible={showEditAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t("profile.editDeliveryAddress")}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalFieldLabel}>{t("profile.fullAddress")}</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline]}
                placeholder={t("profile.fullAddressPlaceholder")}
                value={addressFields.address}
                onChangeText={(text) => setAddressFields(prev => ({ ...prev, address: text }))}
                multiline
              />

              <Text style={styles.modalFieldLabel}>{t("profile.village")}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t("profile.villagePlaceholder")}
                value={addressFields.kelurahan}
                onChangeText={(text) => setAddressFields(prev => ({ ...prev, kelurahan: text }))}
              />

              <Text style={styles.modalFieldLabel}>{t("profile.district")}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t("profile.districtPlaceholder")}
                value={addressFields.kecamatan}
                onChangeText={(text) => setAddressFields(prev => ({ ...prev, kecamatan: text }))}
              />

              <Text style={styles.modalFieldLabel}>{t("profile.province")}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t("profile.provincePlaceholder")}
                value={addressFields.provinsi}
                onChangeText={(text) => setAddressFields(prev => ({ ...prev, provinsi: text }))}
              />

              <Text style={styles.modalFieldLabel}>{t("profile.postalCode")}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t("profile.postalCodePlaceholder")}
                value={addressFields.kodepos}
                onChangeText={(text) => setAddressFields(prev => ({ ...prev, kodepos: text }))}
                keyboardType="numeric"
              />

              <Text style={styles.modalFieldLabel}>{t("profile.notes")}</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline]}
                placeholder={t("profile.notesPlaceholder")}
                value={addressFields.catatan}
                onChangeText={(text) => setAddressFields(prev => ({ ...prev, catatan: text }))}
                multiline
              />
            </ScrollView>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.pillButton, styles.outlineButton, { flex: 1 }]}
                onPress={() => setShowEditAddressModal(false)}
              >
                <Text style={styles.outlineButtonText}>{t("profile.cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pillButton, styles.solidButton, { flex: 1 }]}
                onPress={handleSaveAddress}
              >
                <Text style={styles.solidButtonText}>{t("profile.save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Header selaras dengan halaman profil penjual
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.PRIMARY },

  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.PRIMARY,
    marginTop: 18,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  // Info row (icon + label + value)
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoRowLabel: {
    fontSize: 13.5,
    color: "#777",
  },
  infoRowValue: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#23272f",
    maxWidth: "60%",
    textAlign: "right",
  },

  // Address grid (read-only)
  addressRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 14,
  },
  addressField: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#23272f",
  },

  // Pin point
  pinLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  pinBox: {
    height: 110,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  pinFilled: {
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  pinCoordinateText: {
    fontSize: 12,
    color: "#555",
    fontFamily: "monospace",
  },
  pinPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  pinPlaceholderText: {
    fontSize: 12,
    color: "#bbb",
  },
  pinAddressText: {
    marginTop: 10,
    fontSize: 12.5,
    color: "#666",
  },

  // Buttons
  buttonContainer: {
    marginTop: 22,
    gap: 10,
  },
  pillButton: {
    paddingVertical: 13,
    borderRadius: 30,
    alignItems: "center",
  },
  solidButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  solidButtonText: {
    color: "#fff",
    fontSize: 14.5,
    fontWeight: "700",
  },
  outlineButton: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: COLORS.PRIMARY,
  },
  outlineButtonText: {
    color: COLORS.PRIMARY,
    fontSize: 14.5,
    fontWeight: "700",
  },

  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },

  // Edit Address Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 22,
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: COLORS.PRIMARY,
  },
  modalFieldLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
    color: '#23272f',
  },
  modalInputMultiline: {
    height: 64,
    textAlignVertical: 'top',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  backBtn: {
  width: 26,
  alignItems: "flex-start",
  justifyContent: "center",
},
});

export default profile;