import { StyleSheet, View, Image, TouchableOpacity, Text } from "react-native";
import React from "react";
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import COLORS from '../app/constants/color.js';
import { useRouter } from "expo-router";

const HeaderTitleBackLocation = ({ title, textColor = "black" }) => {
  const route = useRouter();
  const handleBack = () => {
    route.back();
  };
  return (
    <View
      style={{
        flexDirection: "row",
        width: "100%",
        padding : 20,
        justifyContent: "center",
      }}
    >
      <TouchableOpacity
        style={{
          height: 50,
          width: 50,
          backgroundColor: COLORS.BACKGROUND,
          borderRadius: 99,
          alignItems: "center",
          justifyContent: "center",
          position: "absolute",
          top: 0,
          left: 20,
        }}
        onPress={handleBack}
      >
        <AntDesign name="left" size={20} color={COLORS.TEXT} />
      </TouchableOpacity>
      <View
        style={{ height: 20, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold", color: textColor }}>{title}</Text>
      </View>
      <View style={{ position: "absolute", right: 20, top: 10 }}>
      <TouchableOpacity 
        style={{
          paddingVertical: 10,
          paddingHorizontal: 10,
          backgroundColor: COLORS.BACKGROUNDDARKER,
          borderRadius: 99,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          }}>
          <Entypo name="location-pin" size={22} color={COLORS.TEXT} />
          <Text>Rumah</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

export default HeaderTitleBackLocation;

const styles = StyleSheet.create({});
