import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { useTheme } from "../state/MartTrackContext";

export default function ScreenHeader({ title, onBack }) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.textHeader }]}>{"<"}</Text>
        </TouchableOpacity>
      )}
      <View>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>MARTTRACK</Text>
        <Text style={[styles.headerTitle, { color: colors.textHeader }]}>{title}</Text>
      </View>
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
    borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  backText: { color: COLORS.textHeader, fontSize: 20, fontWeight: "700" },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1.6, marginBottom: 2 },
  headerTitle: {
    fontSize: 22, fontWeight: "700",
    color: COLORS.textHeader, letterSpacing: -0.3,
  },
});
