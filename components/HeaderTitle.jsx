import { StyleSheet, View, Image, TouchableOpacity, Text } from "react-native";
import AntDesign from '@expo/vector-icons/AntDesign';
import COLORS from '../app/constants/color.js';
import { useRouter } from "expo-router";

const HeaderTitle = ({ title, textColor = "black" }) => {
  const route = useRouter();
  return (
    <View
      style={{
        flexDirection: "row",
        width: "100%",
        padding : 20,
        justifyContent: "center",
      }}
    >
      <View
        style={{ height: 20, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold", color: textColor }}>{title}</Text>
      </View>
    </View>
  );
};

export default HeaderTitle;

const styles = StyleSheet.create({});
