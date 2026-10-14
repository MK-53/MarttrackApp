import React from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useMartTrack } from "../state/MartTrackContext";
import { getItemsWithStock } from "../domain/inventory";
import { formatCurrency } from "../utils/formatting";
import Card from "../components/Card";
import Button from "../components/Button";
import { COLORS } from "../constants/colors";

export default function SellerHomeScreen({ onNavigate }) {
  const { state, activeStore, isConnected, colors } = useMartTrack();
  const items = getItemsWithStock(state).filter(item => item.totalStock > 0);

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>MARTTRACK · SELLER</Text>
      <Text style={[styles.title, { color: colors.textHeader }]}>{activeStore?.name || "Your store"}</Text>
      <Text style={[styles.intro, { color: colors.textBody }]}>
        Check what is available, then record each sale. Stock is updated by the store host.
      </Text>
      <Button
        title="Record a sale"
        onPress={() => onNavigate("sell")}
        disabled={!isConnected}
        color={COLORS.secondary}
        textStyle={{ color: colors.background }}
        style={styles.sellButton}
      />
      {!isConnected && (
        <Text style={[styles.offlineText, { color: colors.danger }]}>
          The host is offline. Sales are paused; the saved stock list is read-only.
        </Text>
      )}
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: colors.textHeader }]}>Available stock</Text>
        <Text style={[styles.count, { color: colors.textMuted }]}>{items.length} items</Text>
      </View>
      {items.map(item => (
        <Card key={item.id} style={styles.itemCard}>
          <View style={styles.itemCopy}>
            <Text style={[styles.itemName, { color: colors.textHeader }]}>{item.item_name}</Text>
            <Text style={[styles.itemQty, { color: colors.textBody }]}>
              {item.totalStock} {item.sell_unit_type} available
            </Text>
          </View>
          <Text style={[styles.price, { color: colors.secondary }]}>
            {formatCurrency(item.target_price_per_unit)}
          </Text>
        </Card>
      ))}
      {items.length === 0 && (
        <Text style={[styles.empty, { color: colors.textMuted }]}>No items are currently in stock.</Text>
      )}
      <TouchableOpacity onPress={() => onNavigate("stores")} style={styles.storesLink}>
        <Text style={[styles.storesLinkText, { color: colors.primary }]}>Switch store or manage access</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: 18, paddingBottom: 130 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.4, marginTop: 12 },
  title: { fontSize: 28, fontWeight: "900", marginTop: 5 },
  intro: { fontSize: 14, lineHeight: 20, marginTop: 7, marginBottom: 18 },
  sellButton: { marginBottom: 12 },
  offlineText: { fontSize: 12, lineHeight: 18, marginBottom: 14 },
  sectionRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 9, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  count: { fontSize: 12 },
  itemCard: { padding: 15, marginBottom: 9, flexDirection: "row", alignItems: "center" },
  itemCopy: { flex: 1, paddingRight: 10 },
  itemName: { fontSize: 15, fontWeight: "800" },
  itemQty: { fontSize: 12, marginTop: 4 },
  price: { fontSize: 13, fontWeight: "800" },
  empty: { fontSize: 13, lineHeight: 19, marginTop: 10 },
  storesLink: { alignSelf: "center", padding: 14, marginTop: 8 },
  storesLinkText: { fontSize: 13, fontWeight: "700" },
});
