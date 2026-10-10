import React from "react";
import { View, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { useTheme } from "../state/MartTrackContext";

export default function Card({ children, style }) {
  const { colors, theme } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowOpacity: theme === "light" ? 0.08 : 0.35 }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: 14,
    borderWidth: 0.5, borderColor: COLORS.border,
    shadowColor: "#000", shadowOpacity: 0.35,
    shadowRadius: 12, elevation: 4,
  },
});
