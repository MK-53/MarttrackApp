import React from "react";
import { View, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";

export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 0.5, borderColor: COLORS.border,
    shadowColor: "#000", shadowOpacity: 0.35,
    shadowRadius: 12, elevation: 4,
  },
});
