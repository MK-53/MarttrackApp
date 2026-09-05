import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";

export default function ScreenHeader({ title, onBack }) {
  return (
    <View style={styles.header}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{"<"}</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 16, paddingHorizontal: 16, paddingTop: 16,
  },
  backBtn: {
    marginRight: 12, width: 36, height: 36,
    borderRadius: 18, backgroundColor: COLORS.card,
    alignItems: "center", justifyContent: "center",
  },
  backText: { color: COLORS.textHeader, fontSize: 18, fontWeight: "700" },
  headerTitle: {
    fontSize: 22, fontWeight: "700",
    color: COLORS.textHeader, letterSpacing: -0.3,
  },
});
