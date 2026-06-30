import {
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
  } from "react-native";
  import React from "react";
  import logo from "../assets/images/logo.png";
import { useRouter } from "expo-router";
  
  const index = () => {
    const router = useRouter();
    return (
      <SafeAreaView style={{ backgroundColor: "#711330", height: "100%" }}>
        <View
          style={{
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <Image source={logo} alt="logo" style={{ width: 100, height: 140 }} />
          <Text
            style={{
              color: "white",
              fontSize: 24,
              marginTop: 20,
            }}
          >
            Siapakah anda?
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#FFB800",
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 5,
              marginTop: 20,
              width: "80%",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => {
              router.push("/buyer/BuyerIndex");
            }
          }
          >
            <Text
              style={{
                color: "#711330",
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              Saya Pembeli
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: "#FFB800",
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 5,
              marginTop: 20,
              width: "80%",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => {
              router.push("/seller/SellerIndex");
            }
          }
          >
            <Text
              style={{
                color: "#711330",
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              Saya Penjual
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };
  
  export default index;
  
  const styles = StyleSheet.create({});
  