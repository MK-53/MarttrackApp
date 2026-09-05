import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";

export default function SearchBar({ value, onChangeText, placeholder = "Search..." }) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#555"
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
