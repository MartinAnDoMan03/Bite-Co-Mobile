import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import axios from "axios";
import config from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SellerIndex = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${config.API_URL}/seller/login`, {
        email,
        password
      });

      if (response.data.success) {
        // Save token to AsyncStorage
        await AsyncStorage.setItem('sellerToken', response.data.token);
        router.push("/seller/(tabs)");
      } else {
        alert(response.data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert(error.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
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
          value={email}
          onChangeText={setEmail}
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
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{
            backgroundColor: "#f7f7f7",
            padding: 15,
            borderRadius: 10,
            width: "100%",
          }}
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
            opacity: loading ? 0.7 : 1,
          }}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text
            style={{
              color: "#711330",
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            {loading ? "Memproses..." : "Masuk"}
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
            router.push("/seller/DetailUsaha");
          }}
        >
          <Text
            style={{
              color: "#711330",
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            Daftar Menjadi Mitra
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SellerIndex;

const styles = StyleSheet.create({});