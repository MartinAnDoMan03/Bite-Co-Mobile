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
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import config from '../constants/config';

const BuyerOTPVerification = () => {
  const router = useRouter();
  const { email, userId } = useLocalSearchParams();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef([]);

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

    // Move to next input if value is entered
    if (value !== "" && index < 3) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Move to previous input on backspace if current input is empty
    if (e.nativeEvent.key === "Backspace" && index > 0 && otp[index] === "") {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/buyer/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          userId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to resend OTP");
      }

      // Reset timer and disable resend button
      setTimer(60);
      setCanResend(false);
      Alert.alert("Success", "OTP baru telah dikirim ke email Anda");

    } catch (error) {
      console.error("Resend OTP error:", error);
      Alert.alert("Error", error.message || "Gagal mengirim ulang OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 4) {
      Alert.alert("Error", "Masukkan kode OTP lengkap");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${config.API_URL}/buyer/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          userId,
          otp: otpString,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "OTP verification failed");
      }

      Alert.alert(
        "Success", 
        "Email berhasil diverifikasi! Silakan login.",
        [
          {
            text: "OK",
            onPress: () => {
              router.push("/buyer/BuyerIndex");
            }
          }
        ]
      );

    } catch (error) {
      console.error("OTP verification error:", error);
      Alert.alert("Error", error.message || "Gagal memverifikasi OTP");
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <AntDesign name="left" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verifikasi OTP</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Masukkan Kode OTP</Text>
          <Text style={styles.subtitle}>
            Kode OTP telah dikirim ke email {email}
          </Text>

          <View style={styles.otpContainer}>
            {[0, 1, 2, 3].map((index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.otpInput}
                maxLength={1}
                keyboardType="number-pad"
                value={otp[index]}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.verifyButton, isLoading && styles.disabledButton]}
            onPress={handleVerifyOTP}
            disabled={isLoading}
          >
            <Text style={styles.verifyButtonText}>
              {isLoading ? "Memverifikasi..." : "Verifikasi"}
            </Text>
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              {canResend ? "Tidak menerima kode? " : `Tunggu ${timer} detik `}
            </Text>
            {canResend && (
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={isLoading || !canResend}
              >
                <Text style={[styles.resendLink, (!canResend || isLoading) && styles.disabledText]}>
                  Kirim ulang
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default BuyerOTPVerification;

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
    marginBottom: 40,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  otpInput: {
    width: 60,
    height: 60,
    backgroundColor: "#f7f7f7",
    borderRadius: 10,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  verifyButton: {
    backgroundColor: "#FFB800",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: "#711330",
    fontSize: 18,
    fontWeight: "bold",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  resendText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
  },
  resendLink: {
    color: "#FFB800",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledText: {
    opacity: 0.5,
  },
});
