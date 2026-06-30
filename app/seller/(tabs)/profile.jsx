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
import * as ImagePicker from "expo-image-picker"; // Import ImagePicker
import * as Linking from 'expo-linking';
import PinPointMapModal from '../../../components/PinPointMapModal';
import MapPreview from '../../../components/MapPreview'; //Map Preview

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
      <SafeAreaView>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView>
        <View style={styles.container}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={fetchProfileData}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <Text style={styles.buttonText}>Sign Out</Text>
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
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <Text style={styles.headerText}>Profile</Text>
      </View>

      <View style={[styles.profileInfo, styles.shadow]}>
        <Text style={styles.sectionTitle}>Outlet Information</Text>
        <View style={styles.infoColumn}>
          <Text style={styles.label}>Store Icon:</Text>
          <TouchableOpacity onPress={() => handleImagePicker("storeIcon")}>
            {storeIcon ? (
              <Image
                source={{
                  uri:
                    typeof storeIcon === "string" ? storeIcon : storeIcon.uri,
                }}
                style={styles.storeIcon}
              />
            ) : (
              <View style={styles.noImageIcon}>
                <Text style={styles.noImageIconText}>No Icon</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoColumn}>
          <Text style={styles.label}>Store Banner:</Text>
          <TouchableOpacity onPress={() => handleImagePicker("storeBanner")}>
            {storeBanner ? (
              <Image
                source={{
                  uri:
                    typeof storeBanner === "string"
                      ? storeBanner
                      : storeBanner.uri,
                }}
                style={styles.storeBanner}
              />
            ) : (
              <View style={styles.noImageIcon}>
                <Text style={styles.noImageIconText}>No Banner</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoColumn}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{userData.name}</Text>
        </View>

        <View style={styles.infoColumn}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{userData.email}</Text>
        </View>

        <View style={styles.infoColumn}>
          <Text style={styles.label}>Phone:</Text>
          <Text style={styles.value}>{userData.phone}</Text>
        </View>

        <Text style={styles.sectionTitle}>Address Details</Text>
        <View style={styles.infoColumn}>
          <Text style={styles.label}>Alamat:</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={userData.address}
              onChangeText={(value) => handleInputChange("address", value)}
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.value}>
              {userData.address || "Not provided"}
            </Text>
          )}
        </View>

        <View style={styles.infoColumn}>
          <Text style={styles.label}>Kelurahan:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={userData.kelurahan}
              onChangeText={(value) => handleInputChange("kelurahan", value)}
            />
          ) : (
            <Text style={styles.value}>
              {userData.kelurahan || "Not provided"}
            </Text>
          )}
        </View>

        <View style={styles.infoColumn}>
          <Text style={styles.label}>Kecamatan:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={userData.kecamatan}
              onChangeText={(value) => handleInputChange("kecamatan", value)}
            />
          ) : (
            <Text style={styles.value}>
              {userData.kecamatan || "Not provided"}
            </Text>
          )}
        </View>

        <View style={styles.infoColumn}>
          <Text style={styles.label}>Provinsi:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={userData.provinsi}
              onChangeText={(value) => handleInputChange("provinsi", value)}
            />
          ) : (
            <Text style={styles.value}>
              {userData.provinsi || "Not provided"}
            </Text>
          )}
        </View>

        <View style={styles.infoColumn}>
          <Text style={styles.label}>Kode Pos:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={userData.kodePos}
              onChangeText={(value) => handleInputChange("kodePos", value)}
              keyboardType="numeric"
            />
          ) : (
            <Text style={styles.value}>
              {userData.kodePos || "Not provided"}
            </Text>
          )}
        </View>

        <View style={styles.infoColumn}>
          <Text style={styles.label}>Catatan:</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={userData.catatan}
              onChangeText={(value) => handleInputChange("catatan", value)}
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.value}>
              {userData.catatan || "Not provided"}
            </Text>
          )}
        </View>

        <View style={styles.infoColumn}>
          <Text style={styles.label}>Tentukan Pin Poin:</Text>
          {isEditing ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Contoh: -6.200000, 106.816666"
                value={
                  pinPoint.lat && pinPoint.lng
                    ? `${pinPoint.lat}, ${pinPoint.lng}`
                    : ''
                }
                onChangeText={handlePinPointInput}
              />
              <TouchableOpacity
                style={{ backgroundColor: COLORS.PRIMARY, padding: 8, borderRadius: 8 }}
                onPress={openPinPointMap}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Buka Map</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.value}>
              {pinPoint.lat && pinPoint.lng
                ? `${pinPoint.lat}, ${pinPoint.lng}`
                : 'Belum ditentukan'}
            </Text>
          )}
          {/* Show map preview if pinPoint is set */}
          {pinPoint.lat && pinPoint.lng && (
            <View style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' }}>
              <MapPreview latitude={pinPoint.lat} longitude={pinPoint.lng} style={{ width: '100%', height: 180 }} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setIsEditing(false)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.signOutButton]}
              onPress={handleSignOut}
            >
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      <PinPointMapModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSelect={handlePinPointSelect}
        initialPin={pinPoint.lat && pinPoint.lng ? { latitude: pinPoint.lat, longitude: pinPoint.lng } : undefined}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f8f8",
  },
  profileHeader: {
    marginBottom: 30,
    alignItems: "center",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.PRIMARY,
  },
  profileInfo: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  infoColumn: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
  },
  multilineInput: {
    height: 60,
    textAlignVertical: "top",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.PRIMARY,
    marginTop: 20,
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  saveButton: {
    backgroundColor: COLORS.GREEN3,
  },
  cancelButton: {
    backgroundColor: "#666",
    marginTop: 10,
  },
  editButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  signOutButton: {
    backgroundColor: "#dc3545",
    marginTop: 10,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imagePicker: {
    backgroundColor: COLORS.GRAY2,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  imagePickerText: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: "bold",
  },
  storeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  storeBanner: {
    width: "100%",
    height: 200,
    borderRadius: 10,
  },
  noImageIcon: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "gray",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.2,
  },
  noImageIconText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default profile;
