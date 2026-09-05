import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, Share } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import { exportToJSON } from "../services/backup";
import { exportSalesToCSV, exportInventoryToCSV, exportPurchasesToCSV } from "../services/backup";
import { getItemsWithStock } from "../domain/inventory";
import Card from "../components/Card";
import Button from "../components/Button";
import ScreenHeader from "../components/ScreenHeader";
import { clearPin } from "../services/auth";

export default function SettingsScreen({ onNavigate, onLogout }) {
  const { state } = useMartTrack();
  const [exporting, setExporting] = useState(false);

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      const json = await exportToJSON();
      await Share.share({ message: json, title: "MartTrack Backup" });
    } catch { Alert.alert("Error", "Failed to export data."); }
    finally { setExporting(false); }
  };

  const handleExportSalesCSV = async () => {
    try {
      const csv = exportSalesToCSV(state.sales, state.items);
      await Share.share({ message: csv, title: "MartTrack Sales Export" });
    } catch { Alert.alert("Error", "Failed to export sales."); }
  };

  const handleExportInventoryCSV = async () => {
    try {
      const items = getItemsWithStock(state);
      const csv = exportInventoryToCSV(items);
      await Share.share({ message: csv, title: "MartTrack Inventory Export" });
    } catch { Alert.alert("Error", "Failed to export inventory."); }
  };

  const handleExportPurchasesCSV = async () => {
    try {
      const csv = exportPurchasesToCSV(state.batches, state.items);
      await Share.share({ message: csv, title: "MartTrack Purchases Export" });
    } catch { Alert.alert("Error", "Failed to export purchases."); }
  };

  const handleResetPin = () => {
    Alert.alert("Reset PIN", "This will clear your PIN. You will create a new one on next launch.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: async () => { await clearPin(); onLogout(); } },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <ScreenHeader title="Settings" onBack={() => onNavigate("summary")} />

      <Text style={styles.sectionLabel}>Backup & Export</Text>
      <Card style={styles.p16}>
        <Text style={styles.cardDesc}>Export all data as JSON for backup.</Text>
        <Button title={exporting ? "Exporting..." : "Export Data (JSON)"} onPress={handleExportJSON} loading={exporting} disabled={exporting} style={styles.mt10} />
        <View style={styles.divider} />
        <Text style={styles.cardDesc}>Export sales records as CSV.</Text>
        <Button title="Export Sales (CSV)" onPress={handleExportSalesCSV} color={COLORS.success} style={styles.mt10} />
        <View style={styles.divider} />
        <Text style={styles.cardDesc}>Export inventory as CSV.</Text>
        <Button title="Export Inventory (CSV)" onPress={handleExportInventoryCSV} color={COLORS.warning} style={styles.mt10} />
        <View style={styles.divider} />
        <Text style={styles.cardDesc}>Export purchases/batches as CSV.</Text>
        <Button title="Export Purchases (CSV)" onPress={handleExportPurchasesCSV} color={COLORS.primary} style={styles.mt10} />
      </Card>

      <Text style={styles.sectionLabel}>Security</Text>
      <Card style={styles.p16}>
        <Text style={styles.cardDesc}>Reset your PIN. You will need to create a new one.</Text>
        <Button title="Reset PIN" onPress={handleResetPin} color={COLORS.danger} style={styles.mt10} />
      </Card>

      <Text style={styles.sectionLabel}>About</Text>
      <Card style={styles.p16}>
        <Text style={styles.aboutText}>MartTrack 2.0</Text>
        <Text style={styles.aboutSub}>Offline-First Inventory & Profit Management</Text>
        <Text style={styles.aboutSub}>AtlasPeak - Schema v{state.schemaVersion}</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, paddingBottom: 120 },
  p16: { padding: 16 },
  mt10: { marginTop: 10 },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: COLORS.textBody,
    letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12, marginTop: 4,
  },
  cardDesc: { fontSize: 14, color: COLORS.textBody },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  aboutText: { fontSize: 18, fontWeight: "800", color: COLORS.textHeader, marginBottom: 4 },
  aboutSub: { fontSize: 13, color: COLORS.textBody, marginTop: 2 },
});
