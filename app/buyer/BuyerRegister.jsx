import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Dimensions,
  useWindowDimensions,
  Keyboard,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../contexts/LanguageContext";
import config from '../constants/config';
import { contentMaxWidth } from '../constants/responsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BURGUNDY = "#711330";

const SCALE_BASE_WIDTH = Platform.OS === 'web' ? Math.min(SCREEN_WIDTH, 480) : SCREEN_WIDTH;
const scale = (size) => (SCALE_BASE_WIDTH / 375) * size;
const CARD_MARGIN_H = Math.max(14, SCALE_BASE_WIDTH * 0.045);

const BuyerRegister = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWideScreen = Platform.OS === 'web' && width >= 640;
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Kunci scroll selama keyboard belum muncul, aktifkan saat keyboard muncul
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Modal alert custom (pengganti alert() bawaan)
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  // Modal sukses registrasi
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPayload, setSuccessPayload] = useState(null);

  const showCustomAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showCustomAlert(t('buyerRegister.alerts.incompleteFormTitle'), t('buyerRegister.alerts.nameRequired'));
      return false;
    }
    if (!formData.email.trim()) {
      showCustomAlert(t('buyerRegister.alerts.incompleteFormTitle'), t('buyerRegister.alerts.emailRequired'));
      return false;
    }
    if (!formData.phone.trim()) {
      showCustomAlert(t('buyerRegister.alerts.incompleteFormTitle'), t('buyerRegister.alerts.phoneRequired'));
      return false;
    }
    if (!formData.password) {
      showCustomAlert(t('buyerRegister.alerts.incompleteFormTitle'), t('buyerRegister.alerts.passwordRequired'));
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      showCustomAlert(t('buyerRegister.alerts.incompleteFormTitle'), t('buyerRegister.alerts.passwordMismatch'));
      return false;
    }
    if (formData.password.length < 6) {
      showCustomAlert(t('buyerRegister.alerts.incompleteFormTitle'), t('buyerRegister.alerts.passwordTooShort'));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showCustomAlert(t('buyerRegister.alerts.incompleteFormTitle'), t('buyerRegister.alerts.invalidEmail'));
      return false;
    }

    const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
    if (!phoneRegex.test(formData.phone)) {
      showCustomAlert(t('buyerRegister.alerts.incompleteFormTitle'), t('buyerRegister.alerts.invalidPhone'));
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${config.API_URL}/buyer/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Registration failed");
      }

      if (!result || !result.userId) {
        throw new Error('Invalid response from server');
      }

      setSuccessPayload({ email: formData.email, userId: result.userId });
      setShowSuccessModal(true);

    } catch (error) {
      console.error("Registration error:", error);
      showCustomAlert(t('buyerRegister.alerts.registerFailedTitle'), error.message || t('buyerRegister.alerts.registerFailedGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccessModal(false);
    if (successPayload) {
      router.push({
        pathname: "/buyer/BuyerOTPVerification",
        params: {
          email: successPayload.email,
          userId: successPayload.userId,
        }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={isKeyboardVisible}
          bounces={false}
        >
          <View style={isWideScreen ? styles.desktopCard : { flex: 1 }}>
          {/* Top section — burgundy header */}
             <View style={[styles.stepHeader, isWideScreen && styles.stepHeaderWide]}>
            <View style={styles.stepBadge}>
              <Ionicons name="person-add" size={22} color="#fff" />
            </View>
            <Text style={styles.stepTitle}>{t('buyerRegister.header.title')}</Text>
          </View>

          {/* White card — form */}
          <View style={[styles.whiteCard, isWideScreen && styles.whiteCardWide]}>
            <Text style={styles.cardTitle}>{t('buyerRegister.card.title')}</Text>

            <Text style={styles.fieldLabel}>{t('buyerRegister.card.fields.name.label')}</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('buyerRegister.card.fields.name.placeholder')}
              placeholderTextColor="#aaa"
              value={formData.name}
              onChangeText={(value) => handleInputChange("name", value)}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>{t('buyerRegister.card.fields.email.label')}</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('buyerRegister.card.fields.email.placeholder')}
              placeholderTextColor="#aaa"
              value={formData.email}
              onChangeText={(value) => handleInputChange("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>{t('buyerRegister.card.fields.phone.label')}</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('buyerRegister.card.fields.phone.placeholder')}
              placeholderTextColor="#aaa"
              value={formData.phone}
              onChangeText={(value) => handleInputChange("phone", value)}
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>{t('buyerRegister.card.fields.password.label')}</Text>
            <View style={styles.passwordFieldWrap}>
              <TextInput
                style={[styles.fieldInput, { paddingRight: scale(44) }]}
                placeholder={t('buyerRegister.card.fields.password.placeholder')}
                placeholderTextColor="#aaa"
                value={formData.password}
                onChangeText={(value) => handleInputChange("password", value)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.passwordEyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>{t('buyerRegister.card.fields.confirmPassword.label')}</Text>
            <View style={styles.passwordFieldWrap}>
              <TextInput
                style={[styles.fieldInput, { paddingRight: scale(44) }]}
                placeholder={t('buyerRegister.card.fields.confirmPassword.placeholder')}
                placeholderTextColor="#aaa"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange("confirmPassword", value)}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.passwordEyeBtn}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, { opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>
                {isLoading ? t('buyerRegister.card.submitting') : t('buyerRegister.card.submitButton')}
              </Text>
            </TouchableOpacity>

            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>{t('buyerRegister.card.loginPrompt')}</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.loginLink}>{t('buyerRegister.card.loginLink')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ---------- Modal alert custom (error / validasi) ---------- */}
      <Modal
        visible={showAlertModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAlertModal(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={styles.alertIconWrap}>
              <Ionicons name="alert-circle" size={28} color={BURGUNDY} />
            </View>

            <Text style={styles.alertTitle}>{alertTitle}</Text>
            <Text style={styles.alertText}>{alertMessage}</Text>

            <TouchableOpacity
              style={styles.alertBtn}
              onPress={() => setShowAlertModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.alertBtnText}>{t('buyerRegister.alerts.gotIt')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---------- Modal sukses registrasi ---------- */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessConfirm}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={[styles.alertIconWrap, { backgroundColor: "#e9f7ee" }]}>
              <Ionicons name="checkmark-circle" size={28} color="#2e9152" />
            </View>

            <Text style={styles.alertTitle}>{t('buyerRegister.alerts.success.title')}</Text>
            <Text style={styles.alertText}>
              {t('buyerRegister.alerts.success.message')}
            </Text>

            <TouchableOpacity
              style={styles.alertBtn}
              onPress={handleSuccessConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.alertBtnText}>{t('buyerRegister.alerts.success.button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default BuyerRegister;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BURGUNDY,
  },
  
  desktopCard: {
    flexDirection: "row",
    width: "100%",
    maxWidth: Math.min(contentMaxWidth, 920),
    alignSelf: "center",
    borderRadius: 28,
    overflow: "hidden",
    marginVertical: 40,
    minHeight: 560,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },

  // Header
  stepHeader: {
    backgroundColor: BURGUNDY,
    alignItems: "center",
    paddingTop: scale(20),
    paddingBottom: scale(22),
    paddingHorizontal: 28,
  },
  stepHeaderWide: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 48,
  },
  stepBadge: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(30),
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: scale(36),
    marginBottom: 12,
  },
  stepTitle: {
    color: "#fff",
    fontSize: scale(19),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },

  // White card
  whiteCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginHorizontal: CARD_MARGIN_H,
    marginTop: 0,
    marginBottom: 0,
    padding: scale(18),
    paddingBottom: scale(22),
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  whiteCardWide: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginHorizontal: 0,
    paddingHorizontal: 48,
    maxWidth: undefined,
  },
  cardTitle: {
    color: BURGUNDY,
    fontSize: scale(16),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },

  // Fields
  fieldLabel: {
    color: BURGUNDY,
    fontSize: scale(12),
    fontWeight: "700",
    marginBottom: 5,
    marginTop: 8,
  },
  fieldInput: {
    backgroundColor: "#fff",
    borderWidth: 1.2,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    fontSize: scale(14),
    color: "#1a1a1a",
    justifyContent: "center",
  },
  passwordFieldWrap: {
    position: "relative",
    justifyContent: "center",
  },
  passwordEyeBtn: {
    position: "absolute",
    right: scale(14),
    height: "100%",
    justifyContent: "center",
  },

  // Button
  btnPrimary: {
    width: "100%",
    backgroundColor: BURGUNDY,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 22,
    shadowColor: BURGUNDY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: scale(15),
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Login prompt
  loginPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  loginPromptText: {
    color: "#666",
    fontSize: scale(13),
  },
  loginLink: {
    color: BURGUNDY,
    fontSize: scale(13),
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  // Alert / success modal
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  alertCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  alertIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fdf1f4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  alertTitle: {
    color: BURGUNDY,
    fontSize: scale(17),
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  alertText: {
    color: "#555",
    fontSize: scale(13.5),
    textAlign: "center",
    lineHeight: scale(19),
    marginBottom: 22,
  },
  alertBtn: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: BURGUNDY,
    alignItems: "center",
  },
  alertBtnText: {
    color: "#fff",
    fontSize: scale(14),
    fontWeight: "700",
  },
});