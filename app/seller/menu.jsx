import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from '../constants/color';
import menuIcon from "../../assets/images/menuIcon.png";
import menuPaket from "../../assets/images/menuPaket.png";
import { useRouter } from "expo-router";
import { useLanguage } from '../contexts/LanguageContext';

const Card = ({ icon, title, desc, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.iconBox}>
      <Image source={icon} style={styles.icon} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={20} color="#c9c9c9" />
  </TouchableOpacity>
);

const menu = () => {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain (Pesan, Pesanan, Profil, Pelanggan) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('menuPage.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('menuPage.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.content}>
        <Card
          icon={menuIcon}
          title={t('menuPage.cards.menu.title')}
          desc={t('menuPage.cards.menu.desc')}
          onPress={() => router.push("seller/daftarmenu")}
        />
        <Card
          icon={menuPaket}
          title={t('menuPage.cards.paket.title')}
          desc={t('menuPage.cards.paket.desc')}
        />
      </View>
    </SafeAreaView>
  );
};

export default menu;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.PRIMARY },

  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FDECC8",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  icon: {
    width: 44,
    height: 44,
    resizeMode: "contain",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#23272f",
  },
  cardDesc: {
    fontSize: 12.5,
    color: "#888",
    marginTop: 2,
  },
});