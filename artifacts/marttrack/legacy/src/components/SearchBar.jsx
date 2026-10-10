import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { useTheme } from "../state/MartTrackContext";

export default function SearchBar({ value, onChangeText, placeholder = "Search..." }) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.textHeader, borderColor: colors.border }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  input: {
    backgroundColor: "#1A1A1A", borderRadius: 10,
    padding: 13, fontSize: 16, color: COLORS.textHeader,
    borderWidth: 1, borderColor: COLORS.border,
  },
});
