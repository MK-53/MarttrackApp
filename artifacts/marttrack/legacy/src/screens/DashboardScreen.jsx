import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack, useTheme } from "../state/MartTrackContext";
import { getSummary } from "../domain/accounting";
import Card from "../components/Card";

export default function DashboardScreen({ onNavigate }) {
  const { state, dispatch, isConnected, activeStore } = useMartTrack();
  const { colors, theme } = useTheme();
  const summary = getSummary(state);
  const firstName = "there";

  const actions = [
    { label: "Restock an item", hint: "Add new stock", icon: "+", value: "add", color: COLORS.primary },
    { label: "Record a sale", hint: "Log money in", icon: "$", value: "sell", color: COLORS.success },
    { label: "Check stock", hint: "See what is left", icon: "\u2261", value: "inventory", color: "#657C5C" },
    { label: "Process return", hint: "Give a refund", icon: "\u2190", value: "return", color: COLORS.danger },
  ];

  return (
    <ScrollView
      style={styles.flex1}
      contentContainerStyle={styles.screenPad}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}><Text style={styles.logoText}>M</Text></View>
          <View>
            <Text style={[styles.brandName, { color: colors.textHeader }]}>MartTrack</Text>
            <Text style={[styles.brandSub, { color: colors.textBody }]}>Your shop, understood</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityRole="switch"
            accessibilityLabel="Switch theme"
            accessibilityState={{ checked: theme === "light" }}
            onPress={() => dispatch({ type: "UPDATE_SETTINGS", payload: { theme: theme === "light" ? "dark" : "light" } })}
            style={[styles.themeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.themeToggleLabel, { color: colors.textBody }]}>{theme === "light" ? "LIGHT" : "DARK"}</Text>
            <View style={[styles.themeTrack, { backgroundColor: theme === "light" ? colors.primary : colors.border }]}>
              <View style={[styles.themeThumb, { transform: [{ translateX: theme === "light" ? 13 : 0 }] }]} />
            </View>
          </TouchableOpacity>
          <View style={styles.openPill}><View style={styles.openDot} /><Text style={styles.openText}>OPEN</Text></View>
        </View>
      </View>

      <Text style={[styles.greeting, { color: colors.textHeader }]}>Good day, {firstName}.</Text>
      <Text style={[styles.intro, { color: colors.textBody }]}>Here’s the clearest picture of your shop right now.</Text>

      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.cardKicker}>TOTAL SALES</Text>
            <Text style={styles.heroValue}>${summary.salesRevenue.toFixed(2)}</Text>
          </View>
          <View style={styles.trendBadge}><Text style={styles.trendText}>TODAY</Text></View>
        </View>
        <View style={styles.heroRule} />
        <Text style={styles.helper}>Money collected from recorded sales</Text>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textHeader }]}>The bigger picture</Text>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>All time</Text>
      </View>

      <View style={styles.metricRow}>
        <Card style={[styles.metricCard, { marginRight: 6 }]}>
          <Text style={[styles.metricLabel, { color: colors.textBody }]}>MONEY SPENT</Text>
          <Text style={[styles.metricValue, { color: colors.textHeader }]}>${summary.totalInvestment.toFixed(2)}</Text>
          <Text style={[styles.metricHint, { color: colors.textMuted }]}>On stock</Text>
        </Card>
        <Card style={[styles.metricCard, { marginLeft: 6 }]}>
          <Text style={[styles.metricLabel, { color: colors.textBody }]}>PROFIT</Text>
          <Text style={[styles.metricValue, { color: colors.secondary }]}>${summary.grossProfit.toFixed(2)}</Text>
          <Text style={[styles.metricHint, { color: colors.textMuted }]}>After stock cost</Text>
        </Card>
      </View>

      <Card style={styles.explainCard}>
        <View style={styles.explainIcon}><Text style={styles.explainIconText}>i</Text></View>
        <View style={styles.explainCopy}>
          <Text style={[styles.explainTitle, { color: colors.secondary }]}>What your numbers mean</Text>
          <Text style={[styles.explainText, { color: colors.textBody }]}>Profit is what remains after the cost of the items you sold. It does not include other shop expenses.</Text>
        </View>
      </Card>

      <TouchableOpacity
        testID="open-business-briefing"
        onPress={() => onNavigate("briefing")}
        style={[styles.briefingLink, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.82}
      >
        <View style={[styles.briefingIcon, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.briefingIconText, { color: colors.background }]}>★</Text>
        </View>
        <View style={styles.briefingCopy}>
          <Text style={[styles.briefingTitle, { color: colors.textHeader }]}>Open Business Briefing</Text>
          <Text style={[styles.briefingHint, { color: colors.textBody }]}>Trends, stock health, festivals, and supplier savings</Text>
        </View>
        <Text style={[styles.briefingArrow, { color: colors.textBody }]}>{">"}</Text>
      </TouchableOpacity>

      <View style={styles.detailRow}>
        <View><Text style={[styles.detailLabel, { color: colors.textMuted }]}>STOCK VALUE</Text><Text style={[styles.detailValue, { color: colors.textHeader }]}>${summary.inventoryValue.toFixed(2)}</Text></View>
        <View style={styles.detailDivider} />
        <View><Text style={[styles.detailLabel, { color: colors.textMuted }]}>RETURN ON STOCK</Text><Text style={[styles.detailValue, { color: colors.primary }]}>{summary.roi.toFixed(1)}%</Text></View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textHeader }]}>What do you need to do?</Text>
      <View style={styles.menuGrid}>
        {actions.map(item => (
          <TouchableOpacity
            key={item.value}
            onPress={() => onNavigate(item.value)}
            disabled={!isConnected && activeStore?.location !== "device" && ["sell", "add"].includes(item.value)}
            accessibilityState={{ disabled: !isConnected && activeStore?.location !== "device" && ["sell", "add"].includes(item.value) }}
            style={[styles.menuBlock, { borderColor: item.color }]}
            activeOpacity={0.82}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color }]}><Text style={styles.menuIconText}>{item.icon}</Text></View>
            <Text style={[styles.menuLabel, { color: colors.textHeader }]}>{item.label}</Text>
            <Text style={[styles.menuHint, { color: colors.textBody }]}>{item.hint}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screenPad: { padding: 18, paddingTop: 20, paddingBottom: 120 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logoMark: { width: 42, height: 42, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginRight: 11 },
  logoText: { fontSize: 21, fontWeight: "900", color: "#FFF" },
  brandName: { fontSize: 18, fontWeight: "800", color: COLORS.textHeader, letterSpacing: -0.3 },
  brandSub: { fontSize: 11, color: COLORS.textBody, marginTop: 2 },
  openPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(159,227,178,0.12)" },
  openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.secondary, marginRight: 6 },
  openText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, color: COLORS.secondary },
  themeToggle: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 18, paddingHorizontal: 8, paddingVertical: 5 },
  themeToggleLabel: { fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },
  themeTrack: { width: 25, height: 14, borderRadius: 8, padding: 2, justifyContent: "center" },
  themeThumb: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" },
  greeting: { fontSize: 30, lineHeight: 35, fontWeight: "800", color: COLORS.textHeader, letterSpacing: -0.8 },
  intro: { fontSize: 14, lineHeight: 20, color: COLORS.textBody, marginTop: 4, marginBottom: 18 },
  heroCard: { backgroundColor: COLORS.primary, borderWidth: 0, borderRadius: 22, padding: 20, marginBottom: 22 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardKicker: { fontSize: 11, letterSpacing: 1.4, fontWeight: "800", color: "rgba(255,255,255,0.7)", marginBottom: 7 },
  heroValue: { fontSize: 38, fontWeight: "800", color: "#FFF", letterSpacing: -1 },
  trendBadge: { borderRadius: 20, backgroundColor: "rgba(16,17,15,0.18)", paddingHorizontal: 10, paddingVertical: 6 },
  trendText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, color: "#FFF" },
  heroRule: { height: 1, backgroundColor: "rgba(255,255,255,0.25)", marginVertical: 15 },
  helper: { fontSize: 12, color: "rgba(255,255,255,0.8)" },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textHeader, marginBottom: 10 },
  sectionHint: { fontSize: 12, color: COLORS.textMuted },
  metricRow: { flexDirection: "row" },
  metricCard: { flex: 1, padding: 16, borderRadius: 17, marginBottom: 12 },
  metricLabel: { fontSize: 10, letterSpacing: 1, fontWeight: "800", color: COLORS.textBody },
  metricValue: { fontSize: 22, fontWeight: "800", color: COLORS.textHeader, marginTop: 7 },
  metricHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  explainCard: { flexDirection: "row", padding: 14, borderRadius: 16, backgroundColor: "rgba(159,227,178,0.08)", borderColor: "rgba(159,227,178,0.18)" },
  explainIcon: { width: 25, height: 25, borderRadius: 13, backgroundColor: COLORS.secondary, alignItems: "center", justifyContent: "center", marginRight: 10 },
  explainIconText: { fontSize: 15, fontWeight: "800", color: COLORS.background },
  explainCopy: { flex: 1 },
  explainTitle: { fontSize: 13, fontWeight: "800", color: COLORS.secondary, marginBottom: 3 },
  explainText: { fontSize: 12, lineHeight: 17, color: COLORS.textBody },
  briefingLink: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 13, marginBottom: 18 },
  briefingIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 10 },
  briefingIconText: { fontSize: 16, fontWeight: "900" },
  briefingCopy: { flex: 1 },
  briefingTitle: { fontSize: 14, fontWeight: "800" },
  briefingHint: { fontSize: 11, marginTop: 3 },
  briefingArrow: { fontSize: 20, marginLeft: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", paddingVertical: 20, marginBottom: 5 },
  detailLabel: { fontSize: 10, letterSpacing: 0.8, fontWeight: "800", color: COLORS.textMuted, marginBottom: 5 },
  detailValue: { fontSize: 18, fontWeight: "800", color: COLORS.textHeader },
  detailDivider: { width: 1, height: 32, backgroundColor: COLORS.border, marginHorizontal: 28 },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  menuBlock: { width: "48.2%", minHeight: 125, borderRadius: 17, borderWidth: 1, backgroundColor: COLORS.card, padding: 14 },
  menuIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  menuIconText: { fontSize: 19, fontWeight: "900", color: COLORS.background },
  menuLabel: { fontSize: 14, fontWeight: "800", color: COLORS.textHeader },
  menuHint: { fontSize: 11, color: COLORS.textBody, marginTop: 3 },
});