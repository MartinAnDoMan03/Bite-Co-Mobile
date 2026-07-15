import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import config from '../constants/config'; 
import { Ionicons } from "@expo/vector-icons";

const BURGUNDY = "#711330";

// Helper scaling responsif: dasar dari lebar 375 (iPhone standar), dengan batas atas/bawah
// biar teks & spacing nggak kegedean di tablet atau kekecilan di layar kecil.
const BASE_WIDTH = 375;
const scale = (size, width) => {
  const ratio = width / BASE_WIDTH;
  const clampedRatio = Math.max(0.85, Math.min(ratio, 1.3));
  return Math.round(size * clampedRatio);
};

const BuyerForgotPassword = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  // State untuk mengontrol tampilan (1 = Input Email, 2 = Input OTP & Password Baru)
  const [step, setStep] = useState(1); 
  
  // Form State
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Modal Alert State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("Informasi");

  const showCustomAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  // Fungsi Langkah 1: Minta OTP
  const handleRequestOTP = async () => {
    if (!email) {
      showCustomAlert("Gagal", "Harap masukkan email Anda.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/buyer/reset-password-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengirim OTP");
      }

      showCustomAlert("Berhasil", "Kode OTP telah dikirim ke email Anda.");
      setStep(2); // Pindah ke langkah input OTP

    } catch (error) {
      console.error("Request OTP error:", error);
      showCustomAlert("Gagal", error.message || "Terjadi kesalahan. Pastikan email terdaftar.");
    } finally {
      setIsLoading(false);
    }
  };

// Fungsi Langkah 2 & 3: Verifikasi OTP lalu Reset Password
  const handleResetPassword = async () => {
    if (!otp || !newPassword) {
      showCustomAlert("Gagal", "OTP dan Password Baru harus diisi.");
      return;
    }

    setIsLoading(true);
    try {
      // --- TAHAP 2: VERIFIKASI OTP TERLEBIH DAHULU ---
      const verifyResponse = await fetch(`${config.API_URL}/buyer/verify-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email, 
          otp: otp 
        }),
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok) {
        // Jika OTP salah, langsung berhenti di sini dan lempar error
        throw new Error(verifyResult.message || "Kode OTP salah atau kadaluarsa.");
      }

      // --- TAHAP 3: JIKA OTP BENAR, LANJUT SIMPAN PASSWORD BARU ---
      const resetResponse = await fetch(`${config.API_URL}/buyer/reset-password-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email,
          otp: otp,
          password: newPassword,     
          newPassword: newPassword   
        }),
      });

      const resetResult = await resetResponse.json();

      if (!resetResponse.ok) {
        throw new Error(resetResult.message || "Gagal mereset password.");
      }

      // Jika berhasil melewati tahap 2 dan 3
      showCustomAlert("Berhasil", "Password berhasil diubah! Silakan masuk dengan password baru.");
      
      setTimeout(() => {
        setShowAlertModal(false);
        router.back(); // Kembali ke halaman login
      }, 2000);

    } catch (error) {
      console.error("Reset Password error:", error);
      showCustomAlert("Gagal", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          
          {/* Header Section: judul & deskripsi ada di sini, bukan di bagian putih */}
          <View style={[styles.topSection, { paddingTop: insets.top + 150, paddingHorizontal: SCREEN_WIDTH * 0.09 }]}>
            <Text style={[styles.greeting, { fontSize: scale(26, SCREEN_WIDTH) }]}>
              {step === 1 ? "Reset Password" : "Buat Password Baru"}
            </Text>
            <Text style={[styles.subtitle, { fontSize: scale(13, SCREEN_WIDTH) }]}>
              {step === 1 ? (
                "Masukkan email yang terdaftar. Kami akan mengirimkan kode OTP untuk mereset password Anda."
              ) : (
                <>
                  Masukkan 6-digit kode OTP yang dikirim ke <Text style={{ fontWeight: 'bold' }}>{email}</Text> beserta password baru Anda.
                </>
              )}
            </Text>
          </View>

          {/* Form Section — hanya berisi input & tombol */}
          <View style={[styles.bottomSection, { paddingHorizontal: SCREEN_WIDTH * 0.07, paddingTop: Math.max(SCREEN_HEIGHT * 0.0, 48) }]}>
            
            {step === 1 ? (
              <>
                <View style={styles.inputWrap}>
                  <TextInput
                    placeholder="Email Anda"
                    placeholderTextColor="#aaa"
                    value={email}
                    onChangeText={setEmail}
                    style={[styles.input, { fontSize: scale(14, SCREEN_WIDTH) }]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.btnPrimary, { opacity: isLoading ? 0.7 : 1 }]}
                  onPress={handleRequestOTP}
                  disabled={isLoading}
                >
                  <Text style={[styles.btnPrimaryText, { fontSize: scale(15, SCREEN_WIDTH) }]}>
                    {isLoading ? "Mengirim..." : "Kirim Kode OTP"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputWrap}>
                  <TextInput
                    placeholder="Kode OTP"
                    placeholderTextColor="#aaa"
                    value={otp}
                    onChangeText={setOtp}
                    style={[styles.input, { fontSize: scale(14, SCREEN_WIDTH), letterSpacing: 2 }]}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <TextInput
                    placeholder="Password Baru"
                    placeholderTextColor="#aaa"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    style={[styles.input, { fontSize: scale(14, SCREEN_WIDTH), paddingRight: 48 }]}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.btnPrimary, { opacity: isLoading ? 0.7 : 1 }]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  <Text style={[styles.btnPrimaryText, { fontSize: scale(15, SCREEN_WIDTH) }]}>
                    {isLoading ? "Memproses..." : "Simpan Password Baru"}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={{ marginTop: 15 }} onPress={() => setStep(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={[styles.resendText, { fontSize: scale(13, SCREEN_WIDTH) }]}>Kirim ulang OTP (Ganti Email)</Text>
                </TouchableOpacity>
              </>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Alert */}
      <Modal visible={showAlertModal} transparent animationType="fade" onRequestClose={() => setShowAlertModal(false)}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={styles.alertIconWrap}>
              <Ionicons name={alertTitle === "Berhasil" ? "checkmark-circle" : "alert-circle"} size={28} color={BURGUNDY} />
            </View>
            <Text style={[styles.alertTitle, { fontSize: scale(16, SCREEN_WIDTH) }]}>{alertTitle}</Text>
            <Text style={[styles.alertText, { fontSize: scale(13, SCREEN_WIDTH) }]}>{alertMessage}</Text>
            <TouchableOpacity style={styles.alertBtn} onPress={() => setShowAlertModal(false)}>
              <Text style={[styles.alertBtnText, { fontSize: scale(13, SCREEN_WIDTH) }]}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default BuyerForgotPassword;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BURGUNDY },
  topSection: {
    backgroundColor: BURGUNDY,
    alignItems: "center",
    paddingBottom: 190,
  },
  greeting: {
    fontWeight: "800",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 340,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: "center",
  },
  inputWrap: { width: "100%", marginBottom: 16, position: 'relative' },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1.2,
    borderColor: "#ddd",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    color: "#1a1a1a",
  },
  eyeBtn: { position: "absolute", right: 16, top: 0, bottom: 0, justifyContent: "center" },
  btnPrimary: {
    width: "100%",
    backgroundColor: BURGUNDY,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },
  resendText: { color: BURGUNDY, fontWeight: '600', textDecorationLine: 'underline' },
  
  // Alert styles
  alertOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
  alertCard: { width: "100%", maxWidth: 360, backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center" },
  alertIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fdf1f4", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  alertTitle: { color: BURGUNDY, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  alertText: { color: "#555", textAlign: "center", marginBottom: 22 },
  alertBtn: { width: "100%", paddingVertical: 13, borderRadius: 12, backgroundColor: BURGUNDY, alignItems: "center" },
  alertBtnText: { color: "#fff", fontWeight: "700" },
});