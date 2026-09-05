import React from "react";
import { ScrollView, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";

export default function FilterTabs({ tabs, activeTab, onTabChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.value}
          onPress={() => onTabChange(tab.value)}
          style={[styles.tab, activeTab === tab.value && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === tab.value && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", marginBottom: 12 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: COLORS.card,
    marginRight: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.textBody, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#FFF" },
});
