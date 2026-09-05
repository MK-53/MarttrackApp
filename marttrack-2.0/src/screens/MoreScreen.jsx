import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import ScreenHeader from "../components/ScreenHeader";

export default function MoreScreen({ onNavigate }) {
  const items = [
    { label: "Edit Item",   icon: "\u270E", value: "edit",      color: COLORS.warning,  desc: "Update item details" },
    { label: "Returns",     icon: "\u2190", value: "return",     color: COLORS.danger,   desc: "Process a return" },
    { label: "History",     icon: "\u2261", value: "history",    color: COLORS.primary,  desc: "View activity log" },
    { label: "Settings",    icon: "\u2699", value: "settings",   color: COLORS.textBody, desc: "Backup, export, security" },
  ];

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <ScreenHeader title="More" onBack={() => onNavigate("summary")} />
      {items.map(item => (
        <TouchableOpacity
          key={item.value}
          style={styles.menuItem}
          onPress={() => onNavigate(item.value)}
        >
          <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
            <Text style={styles.menuIconText}>{item.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuDesc}>{item.desc}</Text>
          </View>
          <Text style={styles.arrow}>></Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, paddingBottom: 120 },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.card, padding: 16, borderRadius: 12, marginBottom: 10,
  },
  menuIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  menuIconText: { fontSize: 18, fontWeight: "900", color: "#FFF" },
  menuLabel: { fontSize: 16, fontWeight: "700", color: COLORS.textHeader },
  menuDesc: { fontSize: 13, color: COLORS.textBody, marginTop: 2 },
  arrow: { fontSize: 22, color: COLORS.textBody },
});
