import React from "react";
import { StyleSheet } from "react-native";
import StatusOrder from "../StatusOrder";


const riwayat = () => {
  return (
      <StatusOrder />
  );
};

export default riwayat;

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  selectorContainer: {
    borderColor: "black",
    borderWidth: 1,
    borderRadius: 30,
    marginHorizontal: 20,
    padding: 5,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  selectorButton: {
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 20,
    textAlign: "start",
    padding: 20,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  card: {
    width: "48%",
    padding: 20,
    borderRadius: 20,
  },
  cardNumber: {
    fontSize: 50,
    fontWeight: "bold",
    color: "white",
  },
  cardLabel: {
    fontSize: 20,
    color: "white",
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
});
