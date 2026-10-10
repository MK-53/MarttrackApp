import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";

export default function Button({
  title, onPress, color = COLORS.primary, style,
  loading = false, disabled = false, textStyle
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: color }, style, (disabled || loading) && styles.disabled]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={[styles.btnText, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 15, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  btnText: {
    color: "#FFF", fontSize: 15, fontWeight: "700", letterSpacing: 0.3,
  },
  disabled: { opacity: 0.5 },
});
