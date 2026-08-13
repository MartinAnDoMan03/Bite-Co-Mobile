import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Platform,
  Switch,
  Modal,
} from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../../constants/color";
import axios from "axios";
import config from "../../constants/config";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker"; // Import ImagePicker
import * as ImageManipulator from "expo-image-manipulator";
import * as Linking from 'expo-linking';
import DateTimePicker from '@react-native-community/datetimepicker';
import PinPointMapModal from '../../../components/PinPointMapModal';
import MapPreview from '../../../components/MapPreview'; //Map Preview
import { useLanguage } from '../../contexts/LanguageContext';

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
// Address grid field: label kecil abu-abu di atas, value/input di bawah
// ---------------------------------------------------------------------------
const AddressField = ({ label, value, editable, onChangeText, keyboardType, multiline, placeholder }) => (
  <View style={styles.addressField}>
    <Text style={styles.addressLabel}>{label}</Text>
    {editable ? (
      <TextInput
        style={[styles.addressInput, multiline && styles.addressInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    ) : (
      <Text style={styles.addressValue} numberOfLines={multiline ? 3 : 1}>
        {value || placeholder}
      </Text>
    )}
  </View>
);

// ---------------------------------------------------------------------------
// Helper: konversi antara string "HH:mm" (yang disimpan/dikirim ke backend)
// dan objek Date (yang dibutuhkan DateTimePicker)
// ---------------------------------------------------------------------------
const timeStringToDate = (timeStr) => {
  const [h, m] = (timeStr || "08:00").split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

const formatTimeHHmm = (date) => {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
};

// ---------------------------------------------------------------------------
// Web-only time picker.
// @react-native-community/datetimepicker only wraps native platform views
// (UIDatePicker on iOS, DatePickerDialog/TimePickerDialog on Android) — it has
// no web backend at all. On a web export, rendering <DateTimePicker /> does
// nothing visible: no error, no dialog, just silence, which is exactly why
// tapping "Jam Buka"/"Jam Tutup" looked like a dead button. This component is
// the web-only replacement, built on the browser's native <input type="time">
// control (which gives a real OS-style time picker UI for free).
// ---------------------------------------------------------------------------
const WebTimePickerModal = ({ visible, initialValue, title, onCancel, onConfirm }) => {
  const { t } = useLanguage();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.webTimeOverlay}>
        {/* Kita gunakan style card dan shadow bawaan aplikasimu */}
        <View style={[styles.card, styles.shadow, styles.webTimeCard]}>
          <Text style={styles.webTimeTitle}>{title}</Text>
          
          <input
            type="time"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            style={{
              fontSize: 22,
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #e5e5e5",
              marginBottom: 24,
              width: "100%",
              boxSizing: "border-box",
              textAlign: "center",
              fontFamily: "inherit",
              color: "#23272f",
              fontWeight: "700",
              outline: "none", 
            }}
          />
          
          <View style={styles.webTimeBtnRow}>
            {/* Menggunakan tombol outline bawaan aplikasi */}
            <TouchableOpacity 
              style={[styles.pillButton, styles.outlineButton, { flex: 1, paddingVertical: 10 }]} 
              onPress={onCancel} 
              activeOpacity={0.85}
            >
              <Text style={styles.outlineButtonText}>{t("common.cancel") || "Batal"}</Text>
            </TouchableOpacity>
            
            {/* Menggunakan tombol solid primary bawaan aplikasi */}
            <TouchableOpacity
              style={[styles.pillButton, styles.solidButton, { flex: 1, paddingVertical: 10 }]}
              onPress={() => onConfirm(value)}
              activeOpacity={0.85}
            >
              <Text style={styles.solidButtonText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const profile = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    kelurahan: "",
    kecamatan: "",
    provinsi: "",
    kodePos: "",
    catatan: "",
  });
  const [storeIcon, setStoreIcon] = useState(null);
  const [storeBanner, setStoreBanner] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pinPoint, setPinPoint] = useState({ lat: null, lng: null });
  const [showPinModal, setShowPinModal] = useState(false);

  // Jam operasional outlet — 1 range jam yang berlaku tiap hari (bukan per-hari beda-beda)
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const [showTimePicker, setShowTimePicker] = useState(null); // 'open' | 'close' | null
  const [isManuallyClosed, setIsManuallyClosed] = useState(false); // toggle "tutup sementara" (libur, dll)

  // Instantly upload after picking, but ensure state is updated before upload
  useEffect(() => {
    if (storeIcon && typeof storeIcon !== "string") {
      handleSave();
    }
    // eslint-disable-next-line
  }, [storeIcon]);

  useEffect(() => {
    if (storeBanner && typeof storeBanner !== "string") {
      handleSave();
    }
    // eslint-disable-next-line
  }, [storeBanner]);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const token = await AsyncStorage.getItem("sellerToken");
      if (!token) {
        setError(t("profil.errors.noToken"));
        setLoading(false);
        return;
      }

      const response = await axios.get(`${config.API_URL}/seller/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUserData({
        name: response.data.name || t("profil.notProvided"),
        email: response.data.email || t("profil.notProvided"),
        phone: response.data.phone || t("profil.notProvided"),
        address: response.data.address || "",
        kelurahan: response.data.kelurahan || "",
        kecamatan: response.data.kecamatan || "",
        provinsi: response.data.provinsi || "",
        kodePos: response.data.kodePos || "",
        catatan: response.data.catatan || "",
      });
      setStoreIcon(response.data.storeIcon || null); // Load store icon
      setStoreBanner(response.data.storeBanner || null); // Load store banner
      setPinPoint({
        lat: response.data.pinLat ? parseFloat(response.data.pinLat) : null,
        lng: response.data.pinLng ? parseFloat(response.data.pinLng) : null,
      }); // Load pin point
      setOpenTime(response.data.openTime || "08:00");
      setCloseTime(response.data.closeTime || "20:00");
      setIsManuallyClosed(response.data.isManuallyClosed || false);
      setLoading(false);
      setIsEditing(false); // Ensure editing mode is off after fetch
      if (params.edit === 'true') {
        setIsEditing(true);
      } else {
        setIsEditing(false);
      }
    } catch (err) {
      setError(t("profil.errors.fetchFailed"));
      setLoading(false);
      console.error("Profile fetch error:", err);
    }
  };

  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem("sellerToken");
      router.push("/"); // Navigate to index.jsx (first screen)
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

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
            <Text style={styles.solidButtonText}>{t("profil.actions.retry")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillButton, styles.outlineButton, { marginTop: 10 }]}
            onPress={handleSignOut}
          >
            <Text style={styles.outlineButtonText}>{t("profil.actions.signOut")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("sellerToken");

      // Create FormData to send the images
      const formData = new FormData();
      formData.append("name", userData.name);
      formData.append("phone", userData.phone);
      formData.append("address", userData.address);
      formData.append("kelurahan", userData.kelurahan);
      formData.append("kecamatan", userData.kecamatan);
      formData.append("provinsi", userData.provinsi);
      formData.append("kodePos", userData.kodePos);
      formData.append("catatan", userData.catatan);
      formData.append("pinLat", pinPoint.lat);
      formData.append("pinLng", pinPoint.lng);
      if (pinPoint.address) {
        formData.append("pinAddress", pinPoint.address);
      }
      formData.append("openTime", openTime);
      formData.append("closeTime", closeTime);
      formData.append("isManuallyClosed", isManuallyClosed);

      if (storeIcon && typeof storeIcon !== "string") {
        if (Platform.OS === 'web') {
          const imgResponse = await fetch(storeIcon.uri);
          const blob = await imgResponse.blob();
          formData.append("storeIcon", blob, "storeIcon.jpg");
        } else {
          formData.append("storeIcon", { uri: storeIcon.uri, name: "storeIcon.jpg", type: "image/jpeg" });
        }
      }
      if (storeBanner && typeof storeBanner !== "string") {
        if (Platform.OS === 'web') {
          const imgResponse = await fetch(storeBanner.uri);
          const blob = await imgResponse.blob();
          formData.append("storeBanner", blob, "storeBanner.jpg");
        } else {
          formData.append("storeBanner", { uri: storeBanner.uri, name: "storeBanner.jpg", type: "image/jpeg" });
        }
      }

      const response = await axios.put(
        `${config.API_URL}/seller/profile`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
        console.log("RESPONSE DARI BACKEND:", JSON.stringify(response.data));
      if (response.data.success) {
        setIsEditing(false); // Exit edit mode immediately
        await fetchProfileData(); // Then refetch profile data
        Alert.alert(t("common.success"), t("profil.alerts.updateSuccess"));
      }
    } catch (err) {
      Alert.alert(t("common.error"), t("profil.alerts.updateFailed"));
      console.error("Profile update error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setUserData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImagePicker = async (type) => {
    let permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(t("profil.alerts.permissionRequired"));
      return;
    }

    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (pickerResult.canceled === true) {
      return;
    }

      const manipulated = await ImageManipulator.manipulateAsync(
      pickerResult.assets[0].uri,
      [{ resize: { width: 1080, height: 1080 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
   );
    const resizedAsset = { ...pickerResult.assets[0], uri: manipulated.uri };

    if (type === "storeIcon") {
      setStoreIcon(resizedAsset);
    } else if (type === "storeBanner") {
      setStoreBanner(resizedAsset);
    }
  };

  // Open Google Maps to pick a location (Expo Go compatible)
  const handleOpenMap = () => {
    const url =
      'https://www.google.com/maps/search/?api=1&query=' +
      (pinPoint.lat && pinPoint.lng ? `${pinPoint.lat},${pinPoint.lng}` : '');
    Linking.openURL(url);
  };

  // Helper to update pin point from Google Maps link (manual input for now)
  const handlePinPointInput = (text) => {
    // Accept format: lat,lng
    const [lat, lng] = text.split(",").map((v) => parseFloat(v.trim()));
    if (!isNaN(lat) && !isNaN(lng)) {
      setPinPoint({ lat, lng });
    }
  };

  const handlePinPointSelect = (point) => {
    setPinPoint({ lat: point.latitude, lng: point.longitude, address: point.address });
    // Optionally, you can also set userData.address = point.address if you want to auto-fill the address field
  };

  // Add this function before the return statement in the profile component
  // Use modal instead of router.push for PinPointMapModal
  const openPinPointMap = () => {
    setShowPinModal(true);
  };

  // Handler untuk hasil pilih waktu dari DateTimePicker (jam buka / jam tutup)
  const handleTimeChange = (event, selectedDate) => {
    const field = showTimePicker;
    setShowTimePicker(null);
    if (event.type === "set" && selectedDate && field) {
      const formatted = formatTimeHHmm(selectedDate);
      if (field === "open") setOpenTime(formatted);
      else setCloseTime(formatted);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F6FA" }}>
      {/* Header selaras dengan halaman lain (Pesanan, Pesan) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t("common.back")}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profil.header.title")}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* ---------------- Informasi Outlet ---------------- */}
        <Text style={styles.sectionTitle}>{t("profil.sections.storeInfo")}</Text>
        <View style={[styles.card, styles.shadow]}>
          <View style={styles.imageRow}>
            <View style={styles.imageCol}>
              <Text style={styles.imageLabel}>{t("profil.imageLabels.icon")}</Text>
              <TouchableOpacity style={styles.imageBox} onPress={() => handleImagePicker("storeIcon")}>
                {storeIcon ? (
                  <Image
                    source={{ uri: typeof storeIcon === "string" ? storeIcon : storeIcon.uri }}
                    style={styles.imageBoxImg}
                  />
                ) : (
                  <MaterialIcons name="add-photo-alternate" size={22} color="#bbb" />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.imageCol}>
              <Text style={styles.imageLabel}>{t("profil.imageLabels.banner")}</Text>
              <TouchableOpacity style={styles.imageBox} onPress={() => handleImagePicker("storeBanner")}>
                {storeBanner ? (
                  <Image
                    source={{ uri: typeof storeBanner === "string" ? storeBanner : storeBanner.uri }}
                    style={styles.imageBoxImg}
                  />
                ) : (
                  <MaterialIcons name="add-photo-alternate" size={22} color="#bbb" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {isEditing ? (
            <View style={{ paddingVertical: 4 }}>
              <AddressField
                label={t("profil.info.storeName")}
                value={userData.name}
                editable
                onChangeText={(v) => handleInputChange("name", v)}
                placeholder={t("profil.notProvided")}
              />
              <AddressField
                label={t("profil.info.phone")}
                value={userData.phone}
                editable
                onChangeText={(v) => handleInputChange("phone", v)}
                keyboardType="phone-pad"
                placeholder={t("profil.notProvided")}
              />
            </View>
          ) : (
            <>
              <InfoRow icon="edit" label={t("profil.info.storeName")} value={userData.name} />
              <InfoRow icon="phone" label={t("profil.info.phone")} value={userData.phone} isLast />
            </>
          )}
          <InfoRow icon="mail-outline" label={t("profil.info.email")} value={userData.email} isLast />
          {isEditing && (
            <Text style={styles.closedHint}>
              Email tidak dapat diubah di sini karena terhubung dengan akun login kamu.
            </Text>
          )}
        </View>

        {/* ---------------- Jam Operasional ---------------- */}
        <Text style={styles.sectionTitle}>Jam Operasional</Text>
        <View style={[styles.card, styles.shadow]}>
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => isEditing && setShowTimePicker("open")}
            disabled={!isEditing}
            activeOpacity={isEditing ? 0.6 : 1}
          >
            <View style={styles.infoRowLeft}>
              <MaterialIcons name="wb-sunny" size={16} color="#999" />
              <Text style={styles.infoRowLabel}>Jam Buka</Text>
            </View>
            <View style={styles.timeValueWrap}>
              <Text style={styles.timeValueText}>{openTime}</Text>
              {isEditing && <MaterialIcons name="edit" size={14} color={COLORS.PRIMARY} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => isEditing && setShowTimePicker("close")}
            disabled={!isEditing}
            activeOpacity={isEditing ? 0.6 : 1}
          >
            <View style={styles.infoRowLeft}>
              <MaterialIcons name="nights-stay" size={16} color="#999" />
              <Text style={styles.infoRowLabel}>Jam Tutup</Text>
            </View>
            <View style={styles.timeValueWrap}>
              <Text style={styles.timeValueText}>{closeTime}</Text>
              {isEditing && <MaterialIcons name="edit" size={14} color={COLORS.PRIMARY} />}
            </View>
          </TouchableOpacity>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoRowLeft}>
              <MaterialIcons name="block" size={16} color="#999" />
              <Text style={styles.infoRowLabel}>Tutup Sementara</Text>
            </View>
            <Switch
              value={isManuallyClosed}
              onValueChange={setIsManuallyClosed}
              disabled={!isEditing}
              trackColor={{ false: "#ddd", true: COLORS.PRIMARY }}
              thumbColor="#fff"
            />
          </View>

          {isManuallyClosed && (
            <Text style={styles.closedHint}>
              Outlet akan tampil "Tutup" ke pembeli, terlepas dari jam operasional di atas. Aktifkan kalau libur (contoh: hari Minggu).
            </Text>
          )}
        </View>

        {/* Render WebTimePickerModal HANYA jika di Web */}
        {Platform.OS === "web" && (
          <WebTimePickerModal
            visible={!!showTimePicker}
            initialValue={showTimePicker === "open" ? openTime : closeTime}
            title={showTimePicker === "open" ? "Pilih Jam Buka" : "Pilih Jam Tutup"}
            onCancel={() => setShowTimePicker(null)}
            onConfirm={(val) => {
              if (showTimePicker === "open") setOpenTime(val);
              else setCloseTime(val);
              setShowTimePicker(null);
            }}
          />
        )}

        {/* Render DateTimePicker HANYA jika di HP (iOS/Android) */}
        {Platform.OS !== "web" && showTimePicker && (
          <DateTimePicker
            value={timeStringToDate(showTimePicker === "open" ? openTime : closeTime)}
            mode="time"
            is24Hour={true}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleTimeChange}
          />
        )}

        {/* ---------------- Detail Alamat ---------------- */}
        <Text style={styles.sectionTitle}>{t("profil.sections.addressDetail")}</Text>
        <View style={[styles.card, styles.shadow]}>
          <View style={styles.addressRow}>
            <AddressField
              label={t("profil.address.street")}
              value={userData.address}
              editable={isEditing}
              onChangeText={(v) => handleInputChange("address", v)}
              multiline
              placeholder={t("profil.address.notProvided")}
            />
            <AddressField
              label={t("profil.address.kelurahan")}
              value={userData.kelurahan}
              editable={isEditing}
              onChangeText={(v) => handleInputChange("kelurahan", v)}
              placeholder={t("profil.address.notProvided")}
            />
          </View>
          <View style={styles.addressRow}>
            <AddressField
              label={t("profil.address.kecamatan")}
              value={userData.kecamatan}
              editable={isEditing}
              onChangeText={(v) => handleInputChange("kecamatan", v)}
              placeholder={t("profil.address.notProvided")}
            />
            <AddressField
              label={t("profil.address.provinsi")}
              value={userData.provinsi}
              editable={isEditing}
              onChangeText={(v) => handleInputChange("provinsi", v)}
              placeholder={t("profil.address.notProvided")}
            />
          </View>
          <View style={styles.addressRow}>
            <AddressField
              label={t("profil.address.postalCode")}
              value={userData.kodePos}
              editable={isEditing}
              onChangeText={(v) => handleInputChange("kodePos", v)}
              keyboardType="numeric"
              placeholder={t("profil.address.notProvided")}
            />
            <AddressField
              label={t("profil.address.notes")}
              value={userData.catatan}
              editable={isEditing}
              onChangeText={(v) => handleInputChange("catatan", v)}
              multiline
              placeholder={t("profil.address.notProvided")}
            />
          </View>
        </View>

        {/* ---------------- Tentukan Pin Poin ---------------- */}
        <View style={[styles.card, styles.shadow, { marginTop: 14 }]}>
          <Text style={styles.pinLabel}>{t("profil.pin.label")}</Text>
          <TouchableOpacity
            style={styles.pinBox}
            onPress={openPinPointMap}
            activeOpacity={0.8}
          >
            {pinPoint.lat && pinPoint.lng ? (
              <MapPreview
                latitude={pinPoint.lat}
                longitude={pinPoint.lng}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <View style={styles.pinPlaceholder}>
                <MaterialIcons name="map" size={22} color="#bbb" />
                <Text style={styles.pinPlaceholderText}>{t("profil.pin.placeholder")}</Text>
              </View>
            )}
          </TouchableOpacity>
          {isEditing && (
            <TextInput
              style={styles.pinManualInput}
              placeholder={t("profil.pin.manualPlaceholder")}
              placeholderTextColor="#aaa"
              value={pinPoint.lat && pinPoint.lng ? `${pinPoint.lat}, ${pinPoint.lng}` : ""}
              onChangeText={handlePinPointInput}
            />
          )}
        </View>

        {/* ---------------- Tombol Aksi ---------------- */}
        <View style={styles.buttonContainer}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.pillButton, styles.solidButton]}
                onPress={handleSave}
                disabled={loading}
              >
                <Text style={styles.solidButtonText}>
                  {loading ? t("profil.actions.saving") : t("profil.actions.saveChanges")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pillButton, styles.outlineButton]}
                onPress={() => {
                  fetchProfileData(); // buang perubahan yang belum disimpan, ambil ulang data asli
                  setIsEditing(false);
                }}
                disabled={loading}
              >
                <Text style={styles.outlineButtonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.pillButton, styles.outlineButton]}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.outlineButtonText}>{t("profil.actions.editProfile")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pillButton, styles.solidButton]}
                onPress={handleSignOut}
              >
                <Text style={styles.solidButtonText}>{t("profil.actions.logout")}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <PinPointMapModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSelect={handlePinPointSelect}
        initialPin={pinPoint.lat && pinPoint.lng ? { latitude: pinPoint.lat, longitude: pinPoint.lng } : undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Header selaras dengan halaman lain
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

  // Image pickers (Ikon Outlet / Banner Outlet)
  imageRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  imageCol: {
    flex: 1,
  },
  imageLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 6,
  },
  imageBox: {
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imageBoxImg: {
    width: "100%",
    height: "100%",
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

  // Jam Operasional (jam buka/tutup) — jangan pakai infoRowValue karena
  // maxWidth 60% di situ bikin teks pendek kayak "07:00" ikut wrap ke bawah
  timeValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeValueText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#23272f",
  },
  closedHint: {
    fontSize: 12,
    color: "#999",
    paddingTop: 8,
    paddingHorizontal: 2,
    lineHeight: 17,
  },

  // Address grid
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
  addressInput: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13.5,
    color: "#23272f",
  },
  addressInputMultiline: {
    height: 60,
    textAlignVertical: "top",
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
  pinPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  pinPlaceholderText: {
    fontSize: 12,
    color: "#bbb",
  },
  pinManualInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#23272f",
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

  //  Popup Web Picker 
  webTimeOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Latar belakang gelap transparan
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  webTimeCard: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    padding: 24,
    borderRadius: 20, // Sudut lebih bulat
  },
  webTimeTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.PRIMARY, // Warna teks mengikuti primary color app
    marginBottom: 16,
  },
  webTimeBtnRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
});

export default profile;