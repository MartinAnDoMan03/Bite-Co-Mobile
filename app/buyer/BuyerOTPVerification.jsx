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
import React, { useState, useRef, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import config from '../constants/config';

const BURGUNDY = "#711330";

// Helper scaling responsif: dasar dari lebar 375 (iPhone standar), dengan batas atas/bawah
// biar teks & spacing nggak kegedean di tablet atau kekecilan di layar kecil.
const BASE_WIDTH = 375;
const scale = (size, width) => {
  const ratio = width / BASE_WIDTH;
  const clampedRatio = Math.max(0.85, Math.min(ratio, 1.3));
  return Math.round(size * clampedRatio);
};

const BuyerOTPVerification = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const isWideScreen = Platform.OS === 'web' && SCREEN_WIDTH >= 640;
  const effectiveWidth = isWideScreen ? Math.min(SCREEN_WIDTH, 480) : SCREEN_WIDTH;
  const { email, userId } = useLocalSearchParams();

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  // Modal Alert State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState(t('buyerOtpVerification.alerts.infoTitle'));
  const [alertType, setAlertType] = useState("info");

  const showCustomAlert = (type, title, message) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  useEffect(() => {
    if (timer > 0 && !canResend) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setCanResend(true);
    }
  }, [timer]);

  const handleOtpChange = (value, index) => {
    if (value.length > 1) {
      value = value[value.length - 1];
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value !== "" && index < 3) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && index > 0 && otp[index] === "") {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    try {
      const response = await fetch(`${config.API_URL}/buyer/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || t('buyerOtpVerification.alerts.resendFailedGeneric'));
      }

      setTimer(60);
      setCanResend(false);
      setOtp(["", "", "", ""]);
      inputRefs.current[0]?.focus();
      showCustomAlert("success", t('buyerOtpVerification.alerts.successTitle'), t('buyerOtpVerification.alerts.resendSuccess'));

    } catch (error) {
      console.error("Resend OTP error:", error);
      showCustomAlert("failed", t('buyerOtpVerification.alerts.failedTitle'), error.message || t('buyerOtpVerification.alerts.resendFailedGeneric'));
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 4) {
      showCustomAlert("failed", t('buyerOtpVerification.alerts.failedTitle'), t('buyerOtpVerification.alerts.emptyOtp'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/buyer/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userId, otp: otpString }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || t('buyerOtpVerification.alerts.verifyFailedGeneric'));
      }

      showCustomAlert("success", t('buyerOtpVerification.alerts.successTitle'), t('buyerOtpVerification.alerts.verifySuccess'));

      setTimeout(() => {
        setShowAlertModal(false);
        router.push("/buyer/BuyerIndex");
      }, 1500);

    } catch (error) {
      console.error("OTP verification error:", error);
      showCustomAlert("failed", t('buyerOtpVerification.alerts.failedTitle'), error.message || t('buyerOtpVerification.alerts.verifyFailedGeneric'));
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
          <View style={[!isWideScreen && { flex: 1 }, isWideScreen && styles.desktopCard]}>

          {/* Header Section: judul & deskripsi, senada dengan BuyerForgotPassword */}
          <View style={[
            styles.topSection,
            {
              paddingTop: isWideScreen ? 70 : insets.top + 150,
              paddingBottom: isWideScreen ? 40 : 190,
              paddingHorizontal: effectiveWidth * 0.09,
            },
          ]}>
            <TouchableOpacity
              style={[styles.backButton, { top: insets.top + 16 }]}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>

            <Text style={[styles.greeting, { fontSize: scale(26, effectiveWidth) }]}>
              {t('buyerOtpVerification.title')}
            </Text>
            <Text style={[styles.subtitle, { fontSize: scale(13, effectiveWidth) }]}>
              {t('buyerOtpVerification.subtitlePrefix')} <Text style={{ fontWeight: 'bold' }}>{email}</Text>
            </Text>
          </View>

          {/* Form Section */}
          <View style={[styles.bottomSection, { paddingHorizontal: effectiveWidth * 0.07, paddingTop: Math.max(SCREEN_HEIGHT * 0.0, 48) }]}>

            <View style={styles.otpContainer}>
              {[0, 1, 2, 3].map((index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    {
                      width: scale(58, effectiveWidth),
                      height: scale(58, effectiveWidth),
                      fontSize: scale(22, effectiveWidth),
                    },
                    focusedIndex === index && styles.otpInputFocused,
                    otp[index] !== "" && styles.otpInputFilled,
                  ]}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={otp[index]}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, { opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleVerifyOTP}
              disabled={isLoading}
            >
              <Text style={[styles.btnPrimaryText, { fontSize: scale(15, effectiveWidth) }]}>
                {isLoading ? t('buyerOtpVerification.buttons.verifying') : t('buyerOtpVerification.buttons.verify')}
              </Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={[styles.resendHint, { fontSize: scale(13, effectiveWidth) }]}>
                {canResend
                  ? t('buyerOtpVerification.resend.prompt')
                  : t('buyerOtpVerification.resend.timer', { seconds: timer })}
              </Text>
              {canResend && (
                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={isResending}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.resendText, { fontSize: scale(13, effectiveWidth) }, isResending && styles.disabledText]}>
                    {isResending ? t('buyerOtpVerification.buttons.resending') : t('buyerOtpVerification.buttons.resend')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Alert — konsisten dengan BuyerForgotPassword */}
      <Modal visible={showAlertModal} transparent animationType="fade" onRequestClose={() => setShowAlertModal(false)}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={styles.alertIconWrap}>
              <Ionicons name={alertType === "success" ? "checkmark-circle" : "alert-circle"} size={28} color={BURGUNDY} />
            </View>
            <Text style={[styles.alertTitle, { fontSize: scale(16, effectiveWidth) }]}>{alertTitle}</Text>
            <Text style={[styles.alertText, { fontSize: scale(13, effectiveWidth) }]}>{alertMessage}</Text>
            <TouchableOpacity style={styles.alertBtn} onPress={() => setShowAlertModal(false)}>
              <Text style={[styles.alertBtnText, { fontSize: scale(13, effectiveWidth) }]}>{t('buyerOtpVerification.alerts.gotIt')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default BuyerOTPVerification;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BURGUNDY },
  topSection: {
    backgroundColor: BURGUNDY,
    alignItems: "center",
    paddingBottom: 190,
  },
  backButton: {
    position: "absolute",
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
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
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
  },
  otpInput: {
    backgroundColor: "#fff",
    borderWidth: 1.2,
    borderColor: "#ddd",
    borderRadius: 14,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1a1a1a",
  },
  otpInputFocused: {
    borderColor: BURGUNDY,
    borderWidth: 1.5,
  },
  otpInputFilled: {
    backgroundColor: "#fdf1f4",
    borderColor: BURGUNDY,
  },
  btnPrimary: {
    width: "100%",
    backgroundColor: BURGUNDY,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
    flexWrap: "wrap",
  },
  resendHint: { color: "#777" },
  resendText: { color: BURGUNDY, fontWeight: '600', textDecorationLine: 'underline' },
  disabledText: { opacity: 0.5 },

  // Alert styles — sama persis dengan BuyerForgotPassword
  alertOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
  alertCard: { width: "100%", maxWidth: 360, backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center" },
  alertIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fdf1f4", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  alertTitle: { color: BURGUNDY, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  alertText: { color: "#555", textAlign: "center", marginBottom: 22 },
  alertBtn: { width: "100%", paddingVertical: 13, borderRadius: 12, backgroundColor: BURGUNDY, alignItems: "center" },
  alertBtnText: { color: "#fff", fontWeight: "700" },
});