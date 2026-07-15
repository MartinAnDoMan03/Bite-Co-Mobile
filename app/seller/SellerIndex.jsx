import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import axios from "axios";
import config from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logo from "../../assets/images/logo.png";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../contexts/LanguageContext";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const BURGUNDY = "#711330";

const SellerIndex = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State untuk modal alert custom (pengganti alert() bawaan)
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showCustomAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${config.API_URL}/seller/login`, {
        email,
        password,
      });

      if (response.data.success) {
        await AsyncStorage.setItem('sellerToken', response.data.token);
        router.push("/seller/(tabs)");
      } else {
        showCustomAlert(response.data.message || t("sellerLogin.loginFailed"));
      }
    } catch (error) {
      console.error("Login error:", error);
      showCustomAlert(error.response?.data?.message || t("sellerLogin.loginFailedRetry"));
    } finally {
      setLoading(false);
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
        >
          {/* Top section — burgundy + logo */}
          <View style={styles.topSection}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Bottom section — form */}
          <View style={styles.bottomSection}>
            <Text style={styles.greeting}>{t("sellerLogin.greeting")}</Text>
            <Text style={styles.subtitle}>{t("sellerLogin.subtitle")}</Text>

            {/* Email input */}
            <View style={styles.inputWrap}>
              <TextInput
                placeholder={t("sellerLogin.email")}
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password input */}
            <View style={styles.inputWrap}>
              <TextInput
                placeholder={t("sellerLogin.password")}
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={[styles.input, { paddingRight: 48 }]}
              />
              <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#888"
              />
            </TouchableOpacity>
            </View>

            {/* Lupa password */}
            <TouchableOpacity style={styles.forgotWrap} onPress={() => router.push("/seller/SellerForgotPassword")}>
              <Text style={styles.forgotText}>Lupa Password?</Text>
            </TouchableOpacity>

           {/* Tombol Masuk */}
            <TouchableOpacity
              style={[styles.btnPrimary, { opacity: loading ? 0.7 : 1, marginTop: SCREEN_HEIGHT * 0.02 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? t("sellerLogin.processing") : t("sellerLogin.login")}
              </Text>
            </TouchableOpacity>

            {/* Belum punya akun? Daftar */}
            <View style={styles.registerWrap}>
              <Text style={styles.registerText}>{t("sellerLogin.noAccount")}</Text>
              <TouchableOpacity onPress={() => router.push("/seller/DetailUsaha")}>
                <Text style={styles.registerLink}>{t("sellerLogin.register")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ---------- Modal alert custom (Bahasa Indonesia, tema burgundy) ---------- */}
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

            <Text style={styles.alertTitle}>{t("sellerLogin.loginFailedTitle")}</Text>
            <Text style={styles.alertText}>{alertMessage}</Text>

            <TouchableOpacity
              style={styles.alertBtn}
              onPress={() => setShowAlertModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.alertBtnText}>{t("common.ok", "OK")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SellerIndex;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BURGUNDY,
  },
  registerWrap: {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  marginTop: SCREEN_HEIGHT * 0.015,
},
registerText: {
  color: "#666",
  fontSize: SCREEN_WIDTH * 0.038,
},
registerLink: {
  color: BURGUNDY,
  fontSize: SCREEN_WIDTH * 0.038,
  fontWeight: "700",
  textDecorationLine: "underline"
},
  topSection: {
  height: SCREEN_HEIGHT * 0.40,
  backgroundColor: BURGUNDY,
  alignItems: "center",
  justifyContent: "center", 
  paddingTop: SCREEN_HEIGHT * 0.05,
  },
  logo: {
    width: SCREEN_WIDTH * 0.38,
    height: SCREEN_WIDTH * 0.38,
    tintColor: "#fff",
  },

  // Bottom white section
  bottomSection: {
  flex: 1,
  paddingHorizontal: SCREEN_WIDTH * 0.07,
  paddingTop: SCREEN_HEIGHT * 0.04,
  paddingBottom: SCREEN_HEIGHT * 0.03,
  alignItems: "center", 
  backgroundColor: "#ffffff",
  borderTopLeftRadius: 25,   
  borderTopRightRadius: 25,  
  marginTop: -15,            
},

  greeting: {
    fontSize: SCREEN_WIDTH * 0.11,
    fontWeight: "800",
    color: BURGUNDY,
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: SCREEN_WIDTH * 0.035,
    color: BURGUNDY,
    fontWeight: "500",
    marginBottom: SCREEN_HEIGHT * 0.035,
    textAlign: "center", 
  },

  // Input
  inputWrap: {
    position: "relative",
    marginBottom: SCREEN_HEIGHT * 0.02,
    width: "100%",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1.2,
    borderColor: "#ddd",
    borderRadius: 14,
    paddingVertical: SCREEN_HEIGHT * 0.018,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    fontSize: SCREEN_WIDTH * 0.038,
    color: "#1a1a1a",
  },
  eyeBtn: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  eyeIcon: {
    fontSize: 16,
  },

  // Lupa password
  forgotWrap: {
    alignSelf: "flex-start",
    marginBottom: SCREEN_HEIGHT * 0.05,
  },
  forgotText: {
    color: BURGUNDY,
    fontSize: SCREEN_WIDTH * 0.033,
    fontWeight: "700",
  },

  // Tombol (Masuk & Daftar sama-sama filled pill)
  btnPrimary: {
    width: "100%",
    backgroundColor: BURGUNDY,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: SCREEN_HEIGHT * 0.017,
    shadowColor: BURGUNDY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: SCREEN_WIDTH * 0.04,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Alert modal custom (pengganti alert() bawaan)
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
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  alertText: {
    color: "#555",
    fontSize: SCREEN_WIDTH * 0.036,
    textAlign: "center",
    lineHeight: SCREEN_WIDTH * 0.05,
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
    fontSize: SCREEN_WIDTH * 0.037,
    fontWeight: "700",
  },
});