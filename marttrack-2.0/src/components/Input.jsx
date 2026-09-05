import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";

export default function Input({ label, value, onChangeText, error, ...props }) {
  return (
    <View style={styles.fieldRow}>
      {label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor="#555"
        value={value || ""}
        onChangeText={onChangeText}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldRow: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 13, fontWeight: "600", color: COLORS.textBody,
    marginBottom: 6, letterSpacing: 0.2, textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#1A1A1A", borderRadius: 10,
    padding: 13, fontSize: 16, color: COLORS.textHeader,
    borderWidth: 1, borderColor: COLORS.border,
  },
  inputError: { borderColor: COLORS.danger },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
});
