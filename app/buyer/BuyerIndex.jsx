import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useBuyerAuth } from '../hooks/useBuyerAuth.js';
import config from '../constants/config';

const BuyerIndex = () => {
  const router = useRouter();
  const { login } = useBuyerAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert("Error", "Email dan password harus diisi");
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
      Alert.alert("Error", error.message || "Gagal masuk. Periksa email dan password Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: "#711330", height: "100%" }}>
      <View
        style={{
          justifyContent: "center",
          alignItems: "start",
          padding: 30,
          height: "100%",
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 64,
            marginTop: 20,
          }}
        >
          Halo!
        </Text>
        <Text
          style={{
            color: "white",
            fontSize: 24,
          }}
        >
          Selamat datang di Bite&Co
        </Text>
        <TextInput
          placeholder="Email"
          value={formData.email}
          onChangeText={(value) => handleInputChange("email", value)}
          style={{
            backgroundColor: "#f7f7f7",
            padding: 15,
            borderRadius: 10,
            width: "100%",
            marginVertical: 20,
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Password"
          value={formData.password}
          onChangeText={(value) => handleInputChange("password", value)}
          style={{
            backgroundColor: "#f7f7f7",
            padding: 15,
            borderRadius: 10,
            width: "100%",
          }}
          secureTextEntry
        />
        <Text
          style={{
            color: "white",
            fontSize: 16,
            marginTop: 20,
            textAlign: "start",
          }}
        >
          Lupa Password?
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#FFB800",
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 5,
            marginTop: 20,
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            opacity: isLoading ? 0.7 : 1,
          }}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text
            style={{
              color: "#711330",
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            {isLoading ? "Masuk..." : "Masuk"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: "#FFB800",
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 5,
            marginTop: 20,
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => {
            router.push("/buyer/BuyerRegister");
          }}
        >
          <Text
            style={{
              color: "#711330",
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            Daftar Dengan E-Mail
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

export default BuyerIndex;

const styles = StyleSheet.create({});
