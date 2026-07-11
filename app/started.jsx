import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import React from "react";
import logo from "../assets/images/logo.png";
import { useRouter } from "expo-router";
import { useLanguage } from "./contexts/LanguageContext";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const Started = () => {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      {/* Top section — burgundy, proporsi 55% layar */}
      <View style={styles.topSection}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>
          {t("started.title")}
        </Text>

        <Text style={styles.subtitle}>
          {t("started.subtitle")}
        </Text>
      </View>

      {/* Bottom section — putih */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.85}
          onPress={() => router.push("/buyer/BuyerIndex")}
        >
          <Text style={styles.buttonText}>
            {t("started.buyer")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.85}
          onPress={() => router.push("/seller/SellerIndex")}
        >
          <Text style={styles.buttonText}>
            {t("started.seller")}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Started;

const BURGUNDY = "#711330";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  topSection: {
    height: SCREEN_HEIGHT * 0.55,
    backgroundColor: BURGUNDY,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 24,
  },

  logo: {
    width: SCREEN_WIDTH * 0.38,
    height: SCREEN_WIDTH * 0.38,
    marginBottom: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 20,
  },

  bottomSection: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 28,
    paddingTop: 100,
    alignItems: "center",
    gap: 12,
  },

  button: {
    width: "100%",
    backgroundColor: BURGUNDY,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BURGUNDY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});