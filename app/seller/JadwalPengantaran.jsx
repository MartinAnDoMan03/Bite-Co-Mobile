import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderTitleBack from '../../components/HeaderTitleBack';
import COLORS from '../constants/color';
import menuIcon from "../../assets/images/menuIcon.png";
import AntDesign from '@expo/vector-icons/AntDesign';

const Card = ({ name, address, date, status, statusColor }) => {
  return (
    <TouchableOpacity
      style={{
        width: "100%",
        backgroundColor: "white",
        padding: 10,
        borderRadius: 10,
        marginVertical: 5,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Image source={menuIcon} style={{ width: 89, height: 89 }} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "bold",
            marginLeft: 10,
          }}
        >
          {name}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: COLORS.GRAY,
            marginLeft: 10,
          }}
        >
          {address}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: COLORS.GRAY,
            marginLeft: 10,
          }}
        >
          {date}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: statusColor,
            marginLeft: 10,
          }}
        >
          {status}
        </Text>
      </View>
      <AntDesign name="right" size={24} color="black" />
    </TouchableOpacity>
  );
};

const JadwalPengantaran = () => {
  return (
    <SafeAreaView
      style={{
        width: "100%",
        flexDirection: "column",
      }}
    >
      <HeaderTitleBack title="Jadwal Pengantaran" />
      <View
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: COLORS.GREEN3,
            paddingHorizontal: 20,
            paddingVertical: 5,
            borderRadius: 99,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            Semua
          </Text>
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "column",
            justifyContent: "center",
            paddingVertical: 10,
            width: "100%",
            paddingHorizontal: 20,
          }}
        >
          <Card
            name={"Nayla Syifa"}
            address={"Jl. Mawar No. 15"}
            date={"10 Januari, 09:00"}
            status={"Selesai"}
            statusColor={COLORS.GREEN4}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default JadwalPengantaran;

const styles = StyleSheet.create({});
