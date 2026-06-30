import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderTitleBack from '../../components/HeaderTitleBack';
import menuIcon from "../../assets/images/menuIcon.png";
import menuPaket from "../../assets/images/menuPaket.png";
import { useRouter } from "expo-router";

const Card = ({icon, title, desc}) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={{
        backgroundColor: "white",
        padding: 10,
        borderRadius: 10,
        marginVertical: 5,
        flexDirection: "row",
        alignItems: "center",
      }}
      onPress={() => {
        title === "Menu" ? router.push("seller/daftarmenu") : null
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginRight: 10,
          gap: 10,
          flex: 1,
        }}
      >
        <Image
          source={icon}
          style={{ width: 89, height: 89, borderRadius: 20 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>{title}</Text>
          <Text style={{ fontSize: 14, color: "#666" }}>
            {desc}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const menu = () => {
  return (
    <SafeAreaView
      style={{
        padding: 20,
      }}
    >
      <HeaderTitleBack title="Menu" />
      <Card icon={menuIcon} title={"Menu"} desc={"Kelola daftar menu anda  di sini"} />
      <Card icon={menuPaket} title={"Paket"} desc={"Kelola daftar paket anda  di sini"} />
    </SafeAreaView>
  );
};

export default menu;

const styles = StyleSheet.create({});
