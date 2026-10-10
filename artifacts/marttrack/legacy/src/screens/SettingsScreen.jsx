import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, Share, Switch, TextInput, TouchableOpacity } from "react-native";
import * as SecureStore from "expo-secure-store";
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
  const { state, dispatch, colors, theme } = useMartTrack();
  const [exporting, setExporting] = useState(false);
  const [ownApiKey, setOwnApiKey] = useState("");
  const [keyLoaded, setKeyLoaded] = useState(false);

  const providerOptions = [
    { label: "Claude", value: "anthropic" },
    { label: "Gemini", value: "gemini" },
    { label: "OpenAI", value: "openai" },
  ];
  const selectedProvider = state.settings?.aiProvider || "anthropic";

  useEffect(() => {
    SecureStore.getItemAsync("mt_own_api_key")
      .then(value => {
        setOwnApiKey(value || "");
        setKeyLoaded(true);
      })
      .catch(() => setKeyLoaded(true));
  }, []);

  const handleKeyChange = (value) => {
    setOwnApiKey(value);
    if (value.trim()) {
      SecureStore.setItemAsync("mt_own_api_key", value.trim()).catch(() => {});
    } else {
      SecureStore.deleteItemAsync("mt_own_api_key").catch(() => {});
    }
  };

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

      <Text style={[styles.sectionLabel, { color: colors.textBody }]}>Appearance</Text>
      <Card style={styles.p16}>
        <View style={styles.themeRow}>
          <View style={styles.themeCopy}>
            <Text style={[styles.themeTitle, { color: colors.textHeader }]}>Light theme</Text>
            <Text style={[styles.cardDesc, { color: colors.textBody }]}>Use a brighter workspace during the day.</Text>
          </View>
          <Switch
            value={theme === "light"}
            onValueChange={(enabled) => dispatch({ type: "UPDATE_SETTINGS", payload: { theme: enabled ? "light" : "dark" } })}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <Text style={[styles.sectionLabel, { color: colors.textBody }]}>AI Briefing</Text>
      <Card style={styles.p16}>
        <Text style={[styles.cardDesc, { color: colors.textBody }]}>
          Choose which AI writes your business briefings. The saved key must come from this provider.
        </Text>
        <View style={styles.segmented}>
          {providerOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              testID={`settings-provider-${option.value}`}
              onPress={() => dispatch({ type: "UPDATE_SETTINGS", payload: { aiProvider: option.value } })}
              style={[
                styles.segment,
                { borderColor: colors.border },
                selectedProvider === option.value && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.segmentText, { color: selectedProvider === option.value ? colors.background : colors.textBody }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.cardDesc, { color: colors.textBody, marginTop: 16 }]}>
          Your {providerOptions.find(option => option.value === selectedProvider)?.label} API key
        </Text>
        <TextInput
          testID="settings-ai-api-key"
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textHeader, borderColor: colors.border }]}
          value={ownApiKey}
          onChangeText={handleKeyChange}
          placeholder="Paste your API key"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!ownApiKey.trim() && keyLoaded && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            Required — briefings won&apos;t work without a key for this provider.
          </Text>
        )}
        <Text style={[styles.cardDesc, styles.keyNote, { color: colors.textBody }]}>
          Stored securely on this device only. MartTrack never stores your key or charges you for AI usage.
        </Text>
      </Card>

      <Text style={[styles.sectionLabel, { color: colors.textBody }]}>Backup & Export</Text>
      <Card style={styles.p16}>
        <Text style={[styles.cardDesc, { color: colors.textBody }]}>Export all data as JSON for backup.</Text>
        <Button title={exporting ? "Exporting..." : "Export Data (JSON)"} onPress={handleExportJSON} loading={exporting} disabled={exporting} style={styles.mt10} />
        <View style={styles.divider} />
        <Text style={[styles.cardDesc, { color: colors.textBody }]}>Export sales records as CSV.</Text>
        <Button title="Export Sales (CSV)" onPress={handleExportSalesCSV} color={COLORS.success} style={styles.mt10} />
        <View style={styles.divider} />
        <Text style={[styles.cardDesc, { color: colors.textBody }]}>Export inventory as CSV.</Text>
        <Button title="Export Inventory (CSV)" onPress={handleExportInventoryCSV} color={COLORS.warning} style={styles.mt10} />
        <View style={styles.divider} />
        <Text style={[styles.cardDesc, { color: colors.textBody }]}>Export purchases/batches as CSV.</Text>
        <Button title="Export Purchases (CSV)" onPress={handleExportPurchasesCSV} color={COLORS.primary} style={styles.mt10} />
      </Card>

      <Text style={[styles.sectionLabel, { color: colors.textBody }]}>Security</Text>
      <Card style={styles.p16}>
        <Text style={[styles.cardDesc, { color: colors.textBody }]}>Reset your PIN. You will need to create a new one.</Text>
        <Button title="Reset PIN" onPress={handleResetPin} color={COLORS.danger} style={styles.mt10} />
      </Card>

      <Text style={[styles.sectionLabel, { color: colors.textBody }]}>About</Text>
      <Card style={styles.p16}>
        <Text style={[styles.aboutText, { color: colors.textHeader }]}>MartTrack 2.0</Text>
        <Text style={[styles.aboutSub, { color: colors.textBody }]}>Private shop tracking that works offline</Text>
        <Text style={[styles.aboutSub, { color: colors.textBody }]}>Schema v{state.schemaVersion}</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, paddingBottom: 120 },
  p16: { padding: 16 },
  mt10: { marginTop: 10 },
  segmented: { flexDirection: "row", gap: 8, marginTop: 12 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 9, paddingVertical: 9, alignItems: "center" },
  segmentText: { fontSize: 12, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 16, marginTop: 8 },
  errorText: { fontSize: 12, marginTop: 5 },
  keyNote: { fontSize: 12, marginTop: 7 },
  themeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  themeCopy: { flex: 1, paddingRight: 16 },
  themeTitle: { fontSize: 15, fontWeight: "800", marginBottom: 3 },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: COLORS.textBody,
    letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12, marginTop: 4,
  },
  cardDesc: { fontSize: 14, color: COLORS.textBody },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  aboutText: { fontSize: 18, fontWeight: "800", color: COLORS.textHeader, marginBottom: 4 },
  aboutSub: { fontSize: 13, color: COLORS.textBody, marginTop: 2 },
});
