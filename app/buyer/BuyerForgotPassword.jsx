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
import { useLanguage } from "../contexts/LanguageContext";
import config from '../constants/config'; 
import { Ionicons } from "@expo/vector-icons";

const BURGUNDY = "#711330";

// Helper scaling responsif: dasar dari lebar 375 (iPhone standar), dengan batas atas/bawah
// biar teks & spacing nggak kegedean di tablet atau kekecilan di layar kecil.

const BuyerForgotPassword = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Only ever true on a wide web browser — native app and narrow/mobile web
  // render exactly as before, untouched.
  const isWideScreen = Platform.OS === 'web' && width >= 640;

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
  const [alertTitle, setAlertTitle] = useState(t('buyerForgotPassword.alerts.infoTitle'));
  // Business key terpisah dari teks judul, supaya nggak patah saat judul diterjemahkan
  const [alertType, setAlertType] = useState("info");

  const showCustomAlert = (type, title, message) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  // Fungsi Langkah 1: Minta OTP
  const handleRequestOTP = async () => {
    if (!email) {
      showCustomAlert("failed", t('buyerForgotPassword.alerts.failedTitle'), t('buyerForgotPassword.alerts.emptyEmail'));
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
        throw new Error(result.message || t('buyerForgotPassword.alerts.otpRequestFailedGeneric'));
      }

      showCustomAlert("success", t('buyerForgotPassword.alerts.successTitle'), t('buyerForgotPassword.alerts.otpSent'));
      setStep(2); // Pindah ke langkah input OTP

    } catch (error) {
      console.error("Request OTP error:", error);
      showCustomAlert("failed", t('buyerForgotPassword.alerts.failedTitle'), error.message || t('buyerForgotPassword.alerts.otpRequestFailedGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

// Fungsi Langkah 2 & 3: Verifikasi OTP lalu Reset Password
  const handleResetPassword = async () => {
    if (!otp || !newPassword) {
      showCustomAlert("failed", t('buyerForgotPassword.alerts.failedTitle'), t('buyerForgotPassword.alerts.emptyOtpOrPassword'));
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
      showCustomAlert("success", t('buyerForgotPassword.alerts.successTitle'), t('buyerForgotPassword.alerts.passwordResetSuccess'));
      
      setTimeout(() => {
        setShowAlertModal(false);
        router.back(); // Kembali ke halaman login
      }, 2000);

    } catch (error) {
      console.error("Reset Password error:", error);
      showCustomAlert("failed", t('buyerForgotPassword.alerts.failedTitle'), error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isWideScreen && styles.containerWide]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={[!isWideScreen && { flex: 1, paddingTop: 100, }, isWideScreen && styles.desktopCard]}>
          
          <View style={[styles.topSection]}>
            <Text style={[styles.greeting, { fontSize: 28 }]}>
              {step === 1 ? t('buyerForgotPassword.step1.title') : t('buyerForgotPassword.step2.title')}
            </Text>
            <Text style={[styles.subtitle, { fontSize: 14 }]}>
              {step === 1 ? (
                t('buyerForgotPassword.step1.subtitle')
              ) : (
                <>
                  {t('buyerForgotPassword.step2.subtitlePrefix')} <Text style={{ fontWeight: 'bold' }}>{email}</Text> {t('buyerForgotPassword.step2.subtitleSuffix')}
                </>
              )}
            </Text>
          </View>

          {/* Form Section — hanya berisi input & tombol */}
          <View style={[styles.bottomSection]}>
            
            {step === 1 ? (
              <>
                <View style={styles.inputWrap}>
                  <TextInput
                    placeholder={t('buyerForgotPassword.fields.emailPlaceholder')}
                    placeholderTextColor="#aaa"
                    value={email}
                    onChangeText={setEmail}
                    style={[styles.input]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.btnPrimary, { opacity: isLoading ? 0.7 : 1 }]}
                  onPress={handleRequestOTP}
                  disabled={isLoading}
                >
                  <Text style={[styles.btnPrimaryText]}>
                    {isLoading ? t('buyerForgotPassword.buttons.sending') : t('buyerForgotPassword.buttons.sendOtp')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputWrap}>
                  <TextInput
                    placeholder={t('buyerForgotPassword.fields.otpPlaceholder')}
                    placeholderTextColor="#aaa"
                    value={otp}
                    onChangeText={setOtp}
                    style={[styles.input]}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <TextInput
                    placeholder={t('buyerForgotPassword.fields.newPasswordPlaceholder')}
                    placeholderTextColor="#aaa"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    style={[styles.input]}
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
                  <Text style={[styles.btnPrimaryText]}>
                    {isLoading ? t('buyerForgotPassword.buttons.processing') : t('buyerForgotPassword.buttons.savePassword')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={{ marginTop: 15 }} onPress={() => setStep(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={[styles.resendText]}>{t('buyerForgotPassword.buttons.resendOtp')}</Text>
                </TouchableOpacity>
              </>
            )}

          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Alert */}
      <Modal visible={showAlertModal} transparent animationType="fade" onRequestClose={() => setShowAlertModal(false)}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={styles.alertIconWrap}>
              <Ionicons name={alertType === "success" ? "checkmark-circle" : "alert-circle"} size={28} color={BURGUNDY} />
            </View>
            <Text style={[styles.alertTitle]}>{alertTitle}</Text>
            <Text style={[styles.alertText]}>{alertMessage}</Text>
            <TouchableOpacity style={styles.alertBtn} onPress={() => setShowAlertModal(false)}>
              <Text style={[styles.alertBtnText]}>{t('buyerForgotPassword.alerts.gotIt')}</Text>
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

  containerWide: {
    alignItems: "center",
    justifyContent: "center",
  },
  desktopCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 28,
    overflow: "hidden",
    marginVertical: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },

  topSection: {
    backgroundColor: BURGUNDY,
    alignItems: "center",
    paddingTop: 70,
    paddingBottom: 70,
    paddingHorizontal: 24,
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
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
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