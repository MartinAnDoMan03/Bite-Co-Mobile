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
import { useBuyerAuth } from '../hooks/useBuyerAuth.js';
import config from '../constants/config';
import logo from "../../assets/images/logo.png";
import { Ionicons } from "@expo/vector-icons";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const BURGUNDY = "#711330";

const BuyerIndex = () => {
  const router = useRouter();
  const { login } = useBuyerAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State untuk modal alert custom (pengganti alert() bawaan)
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showCustomAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      showCustomAlert("Email dan password harus diisi");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${config.API_URL}/buyer/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Login failed");
      }

      if (!result.token) {
        throw new Error("Token not received");
      }

      // Use the auth hook to handle login
      await login(result.token);

      // Navigate to buyer tabs
      router.push("/buyer/(tabs)");

    } catch (error) {
      console.error("Login error:", error);
      showCustomAlert(error.message || "Gagal masuk. Periksa email dan password Anda.");
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
            <Text style={styles.greeting}>Halo!</Text>
            <Text style={styles.subtitle}>Selamat datang di Bite&Co</Text>

            {/* Email input */}
            <View style={styles.inputWrap}>
              <TextInput
                placeholder="Email"
                placeholderTextColor="#aaa"
                value={formData.email}
                onChangeText={(value) => handleInputChange("email", value)}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password input */}
            <View style={styles.inputWrap}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#aaa"
                value={formData.password}
                onChangeText={(value) => handleInputChange("password", value)}
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
            <TouchableOpacity style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Lupa password?</Text>
            </TouchableOpacity>

            {/* Tombol Masuk */}
            <TouchableOpacity
              style={[styles.btnPrimary, { opacity: isLoading ? 0.7 : 1, marginTop: SCREEN_HEIGHT * 0.02 }]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>
                {isLoading ? "Masuk..." : "Masuk"}
              </Text>
            </TouchableOpacity>

            {/* Belum punya akun? Daftar */}
            <View style={styles.registerWrap}>
              <Text style={styles.registerText}>Belum punya akun? </Text>
              <TouchableOpacity onPress={() => router.push("/buyer/BuyerRegister")}>
                <Text style={styles.registerLink}>Daftar</Text>
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

            <Text style={styles.alertTitle}>Gagal Masuk</Text>
            <Text style={styles.alertText}>{alertMessage}</Text>

            <TouchableOpacity
              style={styles.alertBtn}
              onPress={() => setShowAlertModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.alertBtnText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default BuyerIndex;

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