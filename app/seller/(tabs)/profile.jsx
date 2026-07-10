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
} from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../../constants/color";
import axios from "axios";
import config from "../../constants/config";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker"; // Import ImagePicker
import * as Linking from 'expo-linking';
import PinPointMapModal from '../../../components/PinPointMapModal';
import MapPreview from '../../../components/MapPreview'; //Map Preview

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
const AddressField = ({ label, value, editable, onChangeText, keyboardType, multiline }) => (
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
        {value || "No provided"}
      </Text>
    )}
  </View>
);

const profile = () => {
  const router = useRouter();
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
        setError("No token found");
        setLoading(false);
        return;
      }

      const response = await axios.get(`${config.API_URL}/seller/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUserData({
        name: response.data.name || "Not provided",
        email: response.data.email || "Not provided",
        phone: response.data.phone || "Not provided",
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
        lat: response.data.pinLat || null,
        lng: response.data.pinLng || null,
      }); // Load pin point
      setLoading(false);
      setIsEditing(false); // Ensure editing mode is off after fetch
    } catch (err) {
      setError("Failed to fetch profile data");
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
            <Text style={styles.solidButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillButton, styles.outlineButton, { marginTop: 10 }]}
            onPress={handleSignOut}
          >
            <Text style={styles.outlineButtonText}>Sign Out</Text>
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

      if (storeIcon && typeof storeIcon !== "string") {
        formData.append("storeIcon", {
          uri: storeIcon.uri,
          name: "storeIcon.jpg", // Or use a more descriptive name
          type: "image/jpeg", // Adjust the type based on the actual image type
        });
      }

      if (storeBanner && typeof storeBanner !== "string") {
        formData.append("storeBanner", {
          uri: storeBanner.uri,
          name: "storeBanner.jpg", // Or use a more descriptive name
          type: "image/jpeg", // Adjust the type based on the actual image type
        });
      }

      const response = await axios.put(
        `${config.API_URL}/seller/profile`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data", // Important for sending files
          },
        }
      );

      if (response.data.success) {
        setIsEditing(false); // Exit edit mode immediately
        await fetchProfileData(); // Then refetch profile data
        Alert.alert("Success", "Profile updated successfully");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update profile");
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
      Alert.alert("Permission to access camera roll is required!");
      return;
    }

    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (pickerResult.canceled === true) {
      return;
    }

    if (type === "storeIcon") {
      setStoreIcon(pickerResult.assets[0]);
    } else if (type === "storeBanner") {
      setStoreBanner(pickerResult.assets[0]);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F6FA" }}>
      {/* Header selaras dengan halaman lain (Pesanan, Pesan) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Kembali">
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* ---------------- Informasi Outlet ---------------- */}
        <Text style={styles.sectionTitle}>Informasi Outlet</Text>
        <View style={[styles.card, styles.shadow]}>
          <View style={styles.imageRow}>
            <View style={styles.imageCol}>
              <Text style={styles.imageLabel}>Ikon Outlet</Text>
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
              <Text style={styles.imageLabel}>Banner Outlet</Text>
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

          <InfoRow icon="edit" label="Nama Outlet" value={userData.name} />
          <InfoRow icon="mail-outline" label="Email" value={userData.email} />
          <InfoRow icon="phone" label="No. HP" value={userData.phone} isLast />
        </View>

        {/* ---------------- Detail Alamat ---------------- */}
        <Text style={styles.sectionTitle}>Detail Alamat</Text>
        <View style={[styles.card, styles.shadow]}>
          <View style={styles.addressRow}>
            <AddressField
              label="Alamat"
              value={userData.address}
              editable={isEditing}
              onChangeText={(v) => handleInputChange("address", v)}
              multiline
            />
            <AddressField
              label="Kelurahan"
              value={userData.kelurahan}
              editable={isEditing}
              onChangeText={(v) => handleInputChange("kelurahan", v)}
            />
          </View>
          <View style={styles.addressRow}>
            <AddressField
              label="Kecamatan"
              value={userData.kecamatan}
              editable={isEditing}
              onChangeText={(v) => handleInputChange("kecamatan", v)}
            />
            <AddressField
              label="Provinsi"
              value={userData.provinsi}
              editable={isEditing}
              onChangeText={(v) => handleInputChange("provinsi", v)}
            />
          </View>
          <View style={styles.addressRow}>
            <AddressField
              label="Kode Pos"
              value={userData.kodePos}
              editable={isEditing}
              onChangeText={(v) => handleInputChange("kodePos", v)}
              keyboardType="numeric"
            />
            <AddressField
              label="Catatan"
              value={userData.catatan}
              editable={isEditing}
              onChangeText={(v) => handleInputChange("catatan", v)}
              multiline
            />
          </View>
        </View>

        {/* ---------------- Tentukan Pin Poin ---------------- */}
        <View style={[styles.card, styles.shadow, { marginTop: 14 }]}>
          <Text style={styles.pinLabel}>Tentukan Pin Poin</Text>
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
                <Text style={styles.pinPlaceholderText}>GMaps</Text>
              </View>
            )}
          </TouchableOpacity>
          {isEditing && (
            <TextInput
              style={styles.pinManualInput}
              placeholder="Contoh: -6.200000, 106.816666"
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
                  {loading ? "Menyimpan..." : "Simpan Perubahan"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pillButton, styles.outlineButton]}
                onPress={() => setIsEditing(false)}
                disabled={loading}
              >
                <Text style={styles.outlineButtonText}>Batal</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.pillButton, styles.outlineButton]}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.outlineButtonText}>Edit Profil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pillButton, styles.solidButton]}
                onPress={handleSignOut}
              >
                <Text style={styles.solidButtonText}>Keluar</Text>
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
});

export default profile;