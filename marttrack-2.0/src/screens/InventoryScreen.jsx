import React, { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import { getItemsWithStock } from "../domain/inventory";
import Card from "../components/Card";
import SearchBar from "../components/SearchBar";
import FilterTabs from "../components/FilterTabs";
import ScreenHeader from "../components/ScreenHeader";
import ConfirmDialog from "../components/ConfirmDialog";

export default function InventoryScreen({ onNavigate }) {
  const { state, dispatch } = useMartTrack();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [archiveTarget, setArchiveTarget] = useState(null);

  const itemsWithStock = useMemo(() => getItemsWithStock(state), [state]);

  const filteredItems = useMemo(() => {
    let result = itemsWithStock;
    if (search.trim()) {
      result = result.filter(item =>
        item.item_name.toLowerCase().includes(search.toLowerCase().trim())
      );
    }
    switch (filter) {
      case "low":    result = result.filter(i => i.totalStock > 0 && i.totalStock <= 10); break;
      case "out":    result = result.filter(i => i.totalStock === 0); break;
      case "profit": result = result.filter(i => i.profit > 0); break;
    }
    return result;
  }, [itemsWithStock, search, filter]);

  const handleArchive = () => {
    if (!archiveTarget) return;
    dispatch({
      type: "ARCHIVE_ITEM",
      payload: { itemId: archiveTarget.id, reason: "Archived by user" },
    });
    setArchiveTarget(null);
  };

  const hasTransactions = archiveTarget
    ? state.batches.some(b => b.item_id === archiveTarget.id) ||
      state.sales.some(s => s.item_id === archiveTarget.id)
    : false;

  return (
    <View style={styles.flex1}>
      <ScreenHeader title="Inventory" onBack={() => onNavigate("summary")} />
      <View style={{ paddingHorizontal: 16 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search products..." />
        <FilterTabs
          tabs={[
            { label: "All", value: "all" },
            { label: "Low Stock", value: "low" },
            { label: "Out of Stock", value: "out" },
            { label: "Profitable", value: "profit" },
          ]}
          activeTab={filter}
          onTabChange={setFilter}
        />
      </View>
      <FlatList
        data={filteredItems}
        contentContainerStyle={styles.screenPad}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={<Text style={styles.emptyText}>No items found.</Text>}
        renderItem={({ item }) => (
          <Card style={styles.listItem}>
            <View style={styles.flex1}>
              <Text style={styles.itemTitle}>{item.item_name}</Text>
              <Text style={styles.itemSub}>{item.totalStock} {item.sell_unit_type} in stock</Text>
              <Text style={styles.itemSub}>Avg cost: ${item.costPerUnit} - Sold: {item.soldQty}</Text>
            </View>
            <View style={styles.alignEnd}>
              <Text style={styles.itemProfit}>+${item.profit.toFixed(2)}</Text>
              <Text style={styles.itemSub}>Profit</Text>
              <TouchableOpacity
                style={[styles.archiveBtn, { backgroundColor: COLORS.danger }]}
                onPress={() => setArchiveTarget(item)}
              >
                <Text style={styles.archiveBtnText}>Archive</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
      <ConfirmDialog
        visible={!!archiveTarget}
        title="Archive Item"
        message={
          archiveTarget
            ? `Archive "${archiveTarget.item_name}"? ${
                hasTransactions
                  ? "Financial history will be preserved."
                  : "No transactions exist, so it will be permanently removed."
              }`
            : ""
        }
        confirmText="Archive"
        confirmColor={COLORS.danger}
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screenPad: { padding: 16, paddingBottom: 120 },
  listItem: { padding: 16, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { fontSize: 17, fontWeight: "700", color: COLORS.textHeader },
  itemSub: { fontSize: 13, color: COLORS.textBody, marginTop: 2 },
  itemProfit: { fontSize: 15, fontWeight: "700", color: COLORS.secondary },
  alignEnd: { alignItems: "flex-end" },
  archiveBtn: { marginTop: 8, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6 },
  archiveBtnText: { color: "#FFF", fontSize: 11, fontWeight: "600" },
  emptyText: { textAlign: "center", marginTop: 24, color: COLORS.textBody, fontSize: 14 },
});
