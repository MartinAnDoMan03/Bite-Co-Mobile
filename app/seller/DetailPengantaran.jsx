import { StyleSheet, Text, Touchable, TouchableOpacity, View } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderTitleBack from '../../components/HeaderTitleBack';
import COLORS from '../constants/color';

const DetailPengantaran = () => {
  return (
    <SafeAreaView>
      <HeaderTitleBack title="Detail Pengantaran" />
      <View
      style={{
        padding: 20,
        gap: 8
      }}>
        <Text
          style={{
            fontWeight: "bold",
          }}
        >
          Tanggal Pengantaran
        </Text>
        <Text>
            10 Januari 2025
        </Text>
        <Text
          style={{
            fontWeight: "bold",
          }}
        >
          Jam Pengantaran
        </Text>
        <Text>
            09:00 AM
        </Text>
        <Text
          style={{
            fontWeight: "bold",
          }}
        >
          Nama Pelanggan
        </Text>
        <Text>
            Nayla Syifa
        </Text>
        <Text
          style={{
            fontWeight: "bold",
          }}
        >
          Alamat
        </Text>
        <Text>
            Jalan Mawar no 15
        </Text>

        <Text
          style={{
            fontWeight: "bold",
          }}
        >
          Status
        </Text>
        <Text
          style={{
            color: COLORS.YELLOW
          }}>
            Sedang Proses
        </Text>
        <TouchableOpacity
        style={{
            backgroundColor: COLORS.GREEN3,
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 5,
            marginTop: 20,
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            }}>
            <Text style={{ color: "white"}}>Antar Sekarang</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default DetailPengantaran;

const styles = StyleSheet.create({});
