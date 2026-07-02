import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderTitleBack from '../../components/HeaderTitleBack';
import COLORS from '../constants/color';
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { KeyboardAvoidingView, Platform } from "react-native";
import config from '../constants/config';

const Success = () => {
  const router = useRouter();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#711330",
        padding: 20,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 24,
          marginTop: 20,
        }}
      >
        Selamat!
      </Text>
      <Text
        style={{
          color: "white",
          fontSize: 16,
          marginTop: 20,
          textAlign: "center",
          paddingHorizontal: 20,
        }}
      >
        Anda telah berhasil mendaftar sebagai penjual di Bite&Co. Silakan tunggu
        konfirmasi dari tim kami. Jika ada pertanyaan, silakan hubungi kami di
        [info@biteandco.com]
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: "#FFB800",
          paddingVertical: 15,
          borderRadius: 5,
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 20,
        }}
        onPress={() => {
          router.push("/");
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 16,
            fontWeight: "bold",
          }}
        >
          Kembali ke Beranda
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const Detail = ({ setScreenNow, ktpImage, selfieImage, setLoading }) => {
  const [selectedBank, setSelectedBank] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [formData, setFormData] = useState({
    outletName: "",
    outletPhone: "",
    outletEmail: "",
    taxRate: "",
    bankAccountNumber: "",
    password: "",
  });

  const banks = [
    { id: 1, name: "BCA" },
    { id: 2, name: "Mandiri" },
    { id: 3, name: "BRI" },
    { id: 4, name: "BNI" },
  ];

  const handleInputChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async () => {
    // Validate form
    if (
      !formData.outletName ||
      !formData.outletPhone ||
      !formData.outletEmail ||
      !selectedBank ||
      !formData.bankAccountNumber ||
      !ktpImage ||
      !selfieImage ||
      !formData.password
    ) {
      Alert.alert(
        "Form Tidak Lengkap",
        "Harap lengkapi semua data yang diperlukan:\n" +
          (!formData.outletName ? "• Nama Outlet\n" : "") +
          (!formData.outletPhone ? "• Nomor Telepon\n" : "") +
          (!formData.outletEmail ? "• Email\n" : "") +
          (!selectedBank ? "• Bank\n" : "") +
          (!formData.bankAccountNumber ? "• Nomor Rekening\n" : "") +
          (!ktpImage ? "• Foto KTP\n" : "") +
          (!selfieImage ? "• Foto Selfie\n" : "") +
          (!formData.password ? "• Password\n" : "")
      );
      return;
    }

    setLoading(true);

    try {
      // Create FormData for multipart upload
      const data = new FormData();

      // Append images
      data.append("ktp", {
        uri: ktpImage.uri,
        type: "image/jpeg",
        name: "ktp.jpg",
      });

      data.append("selfie", {
        uri: selfieImage.uri,
        type: "image/jpeg",
        name: "selfie.jpg",
      });

      // Append other form data
      data.append("outletName", formData.outletName);
      data.append("outletPhone", formData.outletPhone);
      data.append("outletEmail", formData.outletEmail);
      data.append("taxRate", formData.taxRate || "0");
      data.append("bankName", selectedBank);
      data.append("bankAccountNumber", formData.bankAccountNumber);
      data.append("password", formData.password);

      console.log('KTP size:', ktpImage.fileSize);
console.log('Selfie size:', selfieImage.fileSize);
      // Post to API
      const response = await axios.post(
        `${config.API_URL}/seller/register`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: config.TIMEOUT,
        }
      );

      if (response.data.success) {
        setScreenNow("success");
      } else {
        const errorDetails = response.data.errors
          ? Object.entries(response.data.errors)
              .map(([field, message]) => `• ${field}: ${message}`)
              .join("\n")
          : response.data.message || "Tidak ada detail error tambahan";

        Alert.alert(
          "Gagal Mendaftar",
          `Terjadi kesalahan saat mengirim data:\n\n${errorDetails}`
        );
      }
    } catch (error) {
      let errorMessage = "Terjadi kesalahan saat mendaftar. Silakan coba lagi.";

      if (error.response) {
        // Server responded with error status (4xx, 5xx)
        const serverError = error.response.data;
        errorMessage = `Error ${error.response.status}: ${
          serverError.message || "Kesalahan Server"
        }\n`;

        if (serverError.errors) {
          errorMessage += Object.entries(serverError.errors)
            .map(([field, messages]) => `• ${field}: ${messages.join(", ")}`)
            .join("\n");
        }
      } else if (error.request) {
        // Request was made but no response received
        if (error.code === "ECONNABORTED") {
          errorMessage =
            "Koneksi timeout. Silakan cek koneksi internet Anda dan coba lagi.";
        } else {
          errorMessage =
            "Tidak ada respon dari server. Silakan cek koneksi internet Anda.";
        }
      } else {
        // Something happened in setting up the request
        if (error.message.includes("Network Error")) {
          errorMessage =
            "Tidak dapat terhubung ke server. Silakan cek koneksi internet Anda.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      console.error("Registration error details:", {
        message: error.message,
        code: error.code,
        config: error.config,
        response: error.response?.data,
        stack: error.stack,
      });

      Alert.alert(
        "Error Sistem",
        errorMessage + "\n\nKode Error: " + (error.code || "UNKNOWN")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <HeaderTitleBack title="Detail Usaha" textColor="white" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 100,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              flex: 1,
              justifyContent: "space-between",
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: "white",
                padding: 20,
                borderRadius: 20,
                marginBottom: 20,
              }}
            >
              <Text style={{ color: COLORS.TEXT, fontWeight: "bold" }}>
                Nama Outlet
              </Text>
              <TextInput
                style={{
                  height: 40,
                  borderColor: "gray",
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 10,
                }}
                placeholder="Masukkan nama outlet"
                placeholderTextColor="gray"
                value={formData.outletName}
                onChangeText={(text) => handleInputChange("outletName", text)}
              />
              <Text
                style={{
                  color: COLORS.TEXT,
                  fontWeight: "bold",
                  marginTop: 10,
                }}
              >
                Nomor telepon outlet
              </Text>
              <TextInput
                style={{
                  height: 40,
                  borderColor: "gray",
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 10,
                }}
                placeholder="Contoh: 081234567890"
                placeholderTextColor="gray"
                keyboardType="phone-pad"
                value={formData.outletPhone}
                onChangeText={(text) => handleInputChange("outletPhone", text)}
              />
              <Text
                style={{
                  color: COLORS.TEXT,
                  fontWeight: "bold",
                  marginTop: 10,
                }}
              >
                Email outlet
              </Text>
              <TextInput
                style={{
                  height: 40,
                  borderColor: "gray",
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 10,
                }}
                placeholder="Contoh: myresto@gmail.com"
                placeholderTextColor="gray"
                keyboardType="email-address"
                value={formData.outletEmail}
                onChangeText={(text) => handleInputChange("outletEmail", text)}
              />
              <Text
                style={{
                  color: COLORS.TEXT,
                  fontWeight: "bold",
                  marginTop: 10,
                }}
              >
                Password
              </Text>
              <TextInput
                style={{
                  height: 40,
                  borderColor: "gray",
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 10,
                }}
                placeholder="Password"
                placeholderTextColor="gray"
                secureTextEntry={true} // This makes it a password field
                value={formData.password}
                onChangeText={(text) => handleInputChange("password", text)}
              />
              <Text
                style={{
                  color: COLORS.TEXT,
                  fontWeight: "bold",
                  marginTop: 10,
                }}
              >
                Masukan pajak restoran/PB1 yang berlaku (opsional)
              </Text>
              <TextInput
                style={{
                  height: 40,
                  borderColor: "gray",
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 10,
                }}
                placeholder="Contoh: 11"
                placeholderTextColor="gray"
                keyboardType="numeric"
                value={formData.taxRate}
                onChangeText={(text) => handleInputChange("taxRate", text)}
              />

              {/* Bank Selection */}
              <Text
                style={{
                  color: COLORS.TEXT,
                  fontWeight: "bold",
                  marginTop: 10,
                }}
              >
                Pilih Bank
              </Text>
              <TouchableOpacity
                style={{
                  height: 40,
                  borderColor: "gray",
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 10,
                  justifyContent: "center",
                }}
                onPress={() => setShowBankModal(true)}
              >
                <Text style={{ color: selectedBank ? "black" : "gray" }}>
                  {selectedBank || "Pilih bank Anda"}
                </Text>
              </TouchableOpacity>

              <Text
                style={{
                  color: COLORS.TEXT,
                  fontWeight: "bold",
                  marginTop: 10,
                }}
              >
                Nomor Rekening Bank
              </Text>
              <TextInput
                style={{
                  height: 40,
                  borderColor: "gray",
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 10,
                }}
                placeholder="Contoh: 1234567890"
                placeholderTextColor="gray"
                keyboardType="numeric"
                value={formData.bankAccountNumber}
                onChangeText={(text) =>
                  handleInputChange("bankAccountNumber", text)
                }
              />
            </View>
            {/* Bank Selection Modal */}

            <TouchableOpacity
              style={{
                backgroundColor: "#FFB800",
                paddingVertical: 15,
                borderRadius: 5,
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={handleSubmit}
            >
              <Text
                style={{ color: "white", fontSize: 16, fontWeight: "bold" }}
              >
                Lanjut
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showBankModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBankModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowBankModal(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)" }} />
        </TouchableWithoutFeedback>

        <View
          style={{
            backgroundColor: "white",
            padding: 20,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          {banks.map((bank) => (
            <TouchableOpacity
              key={bank.id}
              style={{
                paddingVertical: 15,
                borderBottomWidth: 1,
                borderBottomColor: "#eee",
              }}
              onPress={() => {
                setSelectedBank(bank.name);
                setShowBankModal(false);
              }}
            >
              <Text style={{ fontSize: 16 }}>{bank.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </>
  );
};

const Identitas = ({
  setScreenNow,
  setKtpImage,
  setSelfieImage,
  ktpImage,
  selfieImage,
}) => {
  const [step, setStep] = useState(1); // 1 for KTP, 2 for selfie

  const pickImage = async (isKtp) => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Izin diperlukan",
        "Kami memerlukan izin kamera untuk mengambil foto"
      );
      return;
    }

    // Launch camera
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      if (isKtp) {
        setKtpImage(result.assets[0]);
        setStep(2); // Move to selfie step
      } else {
        setSelfieImage(result.assets[0]);
      }
    }
  };

  const handleContinue = () => {
    if (!ktpImage || !selfieImage) {
      Alert.alert(
        "Perhatian",
        "Harap ambil foto KTP dan selfie terlebih dahulu"
      );
      return;
    }
    setScreenNow("detail");
  };

  return (
    <>
      <HeaderTitleBack title="Siapkan Identitas Anda" textColor="white" />
      <View
        style={{
          flex: 1,
          justifyContent: "space-between",
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: "#f7f7f7",
            padding: 15,
            borderRadius: 10,
            width: "100%",
            marginVertical: 20,
            flexDirection: "column",
            gap: 15,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                borderColor: step === 1 ? "#FFB800" : COLORS.TEXTSECONDARY,
                borderWidth: 1,
                borderRadius: 99,
                width: 40,
                padding: 10,
                backgroundColor: step === 1 ? "#FFB800" : "transparent",
              }}
            >
              <Text
                style={{
                  color: step === 1 ? "white" : "black",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                1
              </Text>
            </View>
            <Text>Ambil Foto e-KTP</Text>
            {ktpImage && (
              <Image
                source={{ uri: ktpImage.uri }}
                style={{ width: 40, height: 40, borderRadius: 5 }}
              />
            )}
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: "#FFB800",
              padding: 10,
              borderRadius: 5,
              alignSelf: "flex-start",
              marginLeft: 50,
            }}
            onPress={() => pickImage(true)}
          >
            <Text style={{ color: "white" }}>
              {ktpImage ? "Ambil Ulang" : "Ambil Foto"}
            </Text>
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                borderColor: step === 2 ? "#FFB800" : COLORS.TEXTSECONDARY,
                borderWidth: 1,
                borderRadius: 99,
                width: 40,
                padding: 10,
                backgroundColor: step === 2 ? "#FFB800" : "transparent",
              }}
            >
              <Text
                style={{
                  color: step === 2 ? "white" : "black",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                2
              </Text>
            </View>
            <Text>Ambil Foto Selfie dengan KTP</Text>
            {selfieImage && (
              <Image
                source={{ uri: selfieImage.uri }}
                style={{ width: 40, height: 40, borderRadius: 5 }}
              />
            )}
          </View>

          {step === 2 && (
            <TouchableOpacity
              style={{
                backgroundColor: "#FFB800",
                padding: 10,
                borderRadius: 5,
                alignSelf: "flex-start",
                marginLeft: 50,
              }}
              onPress={() => pickImage(false)}
            >
              <Text style={{ color: "white" }}>
                {selfieImage ? "Ambil Ulang" : "Ambil Foto"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: "#FFB800",
            paddingVertical: 15,
            borderRadius: 5,
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            opacity: ktpImage && selfieImage ? 1 : 0.5,
          }}
          onPress={handleContinue}
          disabled={!ktpImage || !selfieImage}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>
            Lanjut
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const DetailUsaha = () => {
  const [screenNow, setScreenNow] = useState("identitas");
  const [ktpImage, setKtpImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <SafeAreaView style={{ backgroundColor: "#711330", height: "100%" }}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Mengirim data...</Text>
          </View>
        </View>
      )}

      {screenNow === "identitas" ? (
        <Identitas
          setScreenNow={setScreenNow}
          setKtpImage={setKtpImage}
          setSelfieImage={setSelfieImage}
          ktpImage={ktpImage}
          selfieImage={selfieImage}
        />
      ) : null}

      {screenNow === "detail" ? (
        <Detail
          setScreenNow={setScreenNow}
          ktpImage={ktpImage}
          selfieImage={selfieImage}
          setLoading={setLoading}
        />
      ) : null}

      {screenNow === "success" ? <Success /> : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
  },
  loadingText: {
    fontSize: 16,
  },
});

export default DetailUsaha;
