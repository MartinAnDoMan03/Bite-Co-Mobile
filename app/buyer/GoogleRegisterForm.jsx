import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import { MaterialIcons } from "@expo/vector-icons";
import config from "../constants/config";
import { useBuyerAuth } from "../hooks/useBuyerAuth.js";
import PinPointMapModal from "../../components/PinPointMapModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GoogleRegisterForm = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login } = useBuyerAuth();
  
  // Pre-fill with Google data
  const [formData, setFormData] = useState({
    name: params.name || "",
    email: params.email || "",
    phone: "",
    googleId: params.googleId || "",
  });
  
  const [addressFields, setAddressFields] = useState({
    address: "",
    kelurahan: "",
    kecamatan: "",
    provinsi: "",
    kodepos: "",
    catatan: "",
  });
  
  const [pinPoint, setPinPoint] = useState({ lat: null, lng: null, address: "" });
  const [showPinPointModal, setShowPinPointModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field, value) => {
    setAddressFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePinPointSelect = (point) => {
    const newPinPoint = { 
      lat: point.latitude, 
      lng: point.longitude, 
      address: point.address 
    };
    setPinPoint(newPinPoint);
    
    // Auto-fill address fields if address components are available
    if (point.addressComponents) {
      const newAddressFields = {
        address: point.addressComponents.address || point.address || "",
        kelurahan: point.addressComponents.kelurahan || "",
        kecamatan: point.addressComponents.kecamatan || "",
        provinsi: point.addressComponents.provinsi || "",
        kodepos: point.addressComponents.kodepos || "",
        catatan: addressFields.catatan, // Keep existing notes
      };
      
      setAddressFields(newAddressFields);
      
      Alert.alert(
        "Alamat Otomatis Terisi",
        "Alamat pengantaran telah diisi secara otomatis berdasarkan lokasi pin point. Anda dapat mengeditnya jika diperlukan.",
        [{ text: "OK" }]
      );
    }
    
    setShowPinPointModal(false);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Nama lengkap harus diisi");
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert("Error", "Nomor telepon harus diisi");
      return false;
    }
    if (!addressFields.address.trim()) {
      Alert.alert("Error", "Alamat lengkap harus diisi");
      return false;
    }
    if (!pinPoint.lat || !pinPoint.lng) {
      Alert.alert("Error", "Pinpoint lokasi harus dipilih");
      return false;
    }

    // Phone validation (Indonesian format)
    const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
    if (!phoneRegex.test(formData.phone)) {
      Alert.alert("Error", "Format nomor telepon tidak valid");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${config.API_URL}/buyer/google-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          googleId: formData.googleId,
          address: addressFields,
          pinPoint: pinPoint,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Registration failed");
      }

      if (!result.token) {
        throw new Error("Token not received");
      }

      // Save address and pinpoint data
      await AsyncStorage.setItem('addressFields', JSON.stringify(addressFields));
      await AsyncStorage.setItem('pinPoint', JSON.stringify(pinPoint));

      // Use the auth hook to handle login
      await login(result.token);

      Alert.alert(
        "Success", 
        "Registrasi berhasil! Selamat datang di Bite&Co.",
        [{
          text: "OK",
          onPress: () => {
            router.push("/buyer/(tabs)");
          }
        }]
      );

    } catch (error) {
      console.error("Google registration error:", error);
      Alert.alert("Error", error.message || "Terjadi kesalahan saat registrasi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <AntDesign name="left" size={20} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Lengkapi Data Diri</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Selamat Datang!</Text>
            <Text style={styles.subtitle}>
              Lengkapi data diri Anda untuk melanjutkan
            </Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nama Lengkap</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan nama lengkap"
                  value={formData.name}
                  onChangeText={(value) => handleInputChange("name", value)}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  placeholder="Email dari Google"
                  value={formData.email}
                  editable={false}
                />
                <Text style={styles.helperText}>Email dari akun Google Anda</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nomor Telepon</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan nomor telepon"
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange("phone", value)}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Alamat Lengkap</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Masukkan alamat lengkap..."
                  value={addressFields.address}
                  onChangeText={(value) => handleAddressChange("address", value)}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kelurahan</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan kelurahan"
                  value={addressFields.kelurahan}
                  onChangeText={(value) => handleAddressChange("kelurahan", value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kecamatan</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan kecamatan"
                  value={addressFields.kecamatan}
                  onChangeText={(value) => handleAddressChange("kecamatan", value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Provinsi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan provinsi"
                  value={addressFields.provinsi}
                  onChangeText={(value) => handleAddressChange("provinsi", value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kode Pos</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan kode pos"
                  value={addressFields.kodepos}
                  onChangeText={(value) => handleAddressChange("kodepos", value)}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Catatan Alamat (Opsional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Dekat warung Bu Sari"
                  value={addressFields.catatan}
                  onChangeText={(value) => handleAddressChange("catatan", value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pinpoint Lokasi</Text>
                <TouchableOpacity
                  style={styles.pinpointButton}
                  onPress={() => setShowPinPointModal(true)}
                >
                  <MaterialIcons 
                    name="location-on" 
                    size={24} 
                    color={pinPoint.lat ? "#711330" : "#666"} 
                  />
                  <Text style={[
                    styles.pinpointButtonText,
                    pinPoint.lat && styles.pinpointButtonTextActive
                  ]}>
                    {pinPoint.lat ? "Lokasi Dipilih" : "Pilih Lokasi di Peta"}
                  </Text>
                </TouchableOpacity>
                {pinPoint.address && (
                  <Text style={styles.pinpointAddress}>{pinPoint.address}</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.registerButton, isLoading && styles.disabledButton]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? "Mendaftar..." : "Daftar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PinPointMapModal
        visible={showPinPointModal}
        onClose={() => setShowPinPointModal(false)}
        onLocationSelect={handlePinPointSelect}
        initialLocation={pinPoint.lat ? { latitude: pinPoint.lat, longitude: pinPoint.lng } : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#711330",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  title: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    marginBottom: 30,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f7f7f7",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: "#e0e0e0",
    color: "#666",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  helperText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    marginTop: 5,
  },
  pinpointButton: {
    backgroundColor: "#f7f7f7",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pinpointButtonText: {
    fontSize: 16,
    color: "#666",
    marginLeft: 8,
  },
  pinpointButtonTextActive: {
    color: "#711330",
    fontWeight: "600",
  },
  pinpointAddress: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginTop: 8,
    fontStyle: "italic",
  },
  registerButton: {
    backgroundColor: "#FFB800",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  disabledButton: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: "#711330",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default GoogleRegisterForm;
