import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import { getSummary } from "../domain/accounting";
import Card from "../components/Card";

export default function DashboardScreen({ onNavigate }) {
  const { state } = useMartTrack();
  const summary = getSummary(state);

  const actions = [
    { label: "Add Stock",   icon: "+", value: "add",    color: COLORS.primary },
    { label: "Record Sale", icon: "$", value: "sell",   color: COLORS.success },
    { label: "Edit Item",   icon: "\u270E", value: "edit",   color: COLORS.warning },
    { label: "Return",      icon: "\u2190", value: "return", color: COLORS.danger },
  ];

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.screenPad}>
      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>M</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>MartTrack</Text>
          <Text style={styles.heroSub}>Financial Overview</Text>
        </View>
      </View>

      <Card style={styles.glassCard}>
        <Text style={styles.label}>Sales Revenue</Text>
        <Text style={styles.valueLarge}>${summary.salesRevenue.toFixed(2)}</Text>
      </Card>

      <View style={styles.row}>
        <Card style={[styles.glassCard, styles.glassCardSm, { flex: 1, marginRight: 6 }]}>
          <Text style={styles.label}>Investment</Text>
          <Text style={styles.valueMd}>${summary.totalInvestment.toFixed(2)}</Text>
        </Card>
        <Card style={[styles.glassCard, styles.glassCardSm, { flex: 1, marginLeft: 6 }]}>
          <Text style={styles.label}>Gross Profit</Text>
          <Text style={[styles.valueMd, { color: COLORS.secondary }]}>
            ${summary.grossProfit.toFixed(2)}
          </Text>
        </Card>
      </View>

      <Card style={styles.glassCard}>
        <Text style={styles.label}>Cost of Goods Sold (COGS)</Text>
        <Text style={styles.valueMd}>${summary.cogs.toFixed(2)}</Text>
      </Card>

      <Card style={styles.glassCard}>
        <Text style={styles.label}>Inventory Value</Text>
        <Text style={styles.valueMd}>${summary.inventoryValue.toFixed(2)}</Text>
      </Card>

      <Card style={styles.glassCard}>
        <Text style={styles.label}>Return on Investment</Text>
        <Text style={[styles.valueLarge, { color: COLORS.primary }]}>
          {summary.roi.toFixed(2)}%
        </Text>
      </Card>

      <Text style={styles.sectionLabel}>Quick Actions</Text>
      <View style={styles.menuGrid}>
        {actions.map(item => (
          <TouchableOpacity
            key={item.value}
            onPress={() => onNavigate(item.value)}
            style={[styles.menuBlock, { backgroundColor: item.color }]}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screenPad: { padding: 16, paddingBottom: 120 },
  hero: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20, marginTop: 8 },
  logoMark: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  logoText: { fontSize: 22, fontWeight: "900", color: "#FFF" },
  heroTitle: { fontSize: 24, fontWeight: "800", color: COLORS.textHeader, letterSpacing: -0.4 },
  heroSub: { fontSize: 13, color: COLORS.textBody, marginTop: 2 },
  glassCard: {
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    padding: 20, marginBottom: 12,
  },
  glassCardSm: { padding: 16 },
  row: { flexDirection: "row" },
  label: { fontSize: 12, color: COLORS.textBody, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 },
  valueLarge: { fontSize: 34, fontWeight: "800", color: COLORS.textHeader, letterSpacing: -0.5 },
  valueMd: { fontSize: 22, fontWeight: "800", color: COLORS.textHeader, letterSpacing: -0.3 },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: COLORS.textBody,
    letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12, marginTop: 4,
  },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  menuBlock: {
    width: "47.5%", aspectRatio: 1, borderRadius: 16,
    padding: 18, justifyContent: "flex-end",
  },
  menuIcon: { fontSize: 26, fontWeight: "900", color: "rgba(255,255,255,0.9)", marginBottom: 8 },
  menuLabel: { fontSize: 17, fontWeight: "800", color: "#FFF" },
});
