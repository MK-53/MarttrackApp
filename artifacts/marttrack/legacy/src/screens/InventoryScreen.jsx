import React, { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import { getItemsWithStock } from "../domain/inventory";
import Card from "../components/Card";
import SearchBar from "../components/SearchBar";
import FilterTabs from "../components/FilterTabs";
import ScreenHeader from "../components/ScreenHeader";

export default function InventoryScreen({ onNavigate }) {
  const { state, isOwner } = useMartTrack();
  const canSeeOwnerData = isOwner !== false;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedItemId, setExpandedItemId] = useState(null);

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

  return (
    <View style={styles.flex1}>
        <ScreenHeader title="Stock levels" onBack={() => onNavigate("summary")} />
      <View style={{ paddingHorizontal: 16 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Find an item..." />
        <FilterTabs
          tabs={[
            { label: "All", value: "all" },
            { label: "Running low", value: "low" },
            { label: "Sold out", value: "out" },
            ...(canSeeOwnerData ? [
            { label: "Making profit", value: "profit" },
            ] : []),
          ]}
          activeTab={filter}
          onTabChange={setFilter}
        />
      </View>
      <FlatList
        data={filteredItems}
        contentContainerStyle={styles.screenPad}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={<Text style={styles.emptyText}>Nothing matches that search.</Text>}
        renderItem={({ item }) => (
          <Card style={styles.listItem}>
            <View style={styles.flex1}>
              <Text style={styles.itemTitle}>{item.item_name}</Text>
              <Text style={styles.itemSub}>
                {item.totalStock} {item.sell_unit_type} left to sell
              </Text>
              {canSeeOwnerData && <Text style={styles.itemSub}>Average cost ${item.costPerUnit} · {item.soldQty} sold</Text>}
              <TouchableOpacity
                testID={`check-stock-details-${item.id}`}
                style={styles.detailsToggle}
                onPress={() => setExpandedItemId(current => current === item.id ? null : item.id)}
              >
                <Text style={styles.detailsToggleText}>
                  {expandedItemId === item.id ? "Hide details  ˄" : "More details  ˅"}
                </Text>
              </TouchableOpacity>
              {expandedItemId === item.id && (
                <View style={styles.detailsPanel}>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>Total added</Text>
                      <Text style={styles.detailValue}>{item.totalIn} {item.sell_unit_type}</Text>
                    </View>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>Still in stock</Text>
                      <Text style={styles.detailValue}>{item.totalStock} {item.sell_unit_type}</Text>
                    </View>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>Target price</Text>
                      <Text style={styles.detailValue}>${item.target_price_per_unit.toFixed(2)}</Text>
                    </View>
                    {canSeeOwnerData && (
                      <View style={styles.detailCell}>
                        <Text style={styles.detailLabel}>Stock value</Text>
                        <Text style={styles.detailValue}>${(item.totalStock * item.costPerUnit).toFixed(2)}</Text>
                      </View>
                    )}
                  </View>
                  {canSeeOwnerData && <TouchableOpacity
                    testID={`check-stock-edit-${item.id}`}
                    style={styles.editButton}
                    onPress={() => onNavigate("edit", { itemId: item.id })}
                  >
                    <Text style={styles.editButtonText}>Edit this good</Text>
                  </TouchableOpacity>}
                </View>
              )}
            </View>
            {canSeeOwnerData && <View style={styles.alignEnd}>
              <Text style={styles.itemProfit}>+${item.profit.toFixed(2)}</Text>
              <Text style={styles.itemSub}>Profit so far</Text>
            </View>}
          </Card>
        )}
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
  detailsToggle: { alignSelf: "flex-start", marginTop: 10, paddingVertical: 4 },
  detailsToggleText: { color: COLORS.primary, fontSize: 13, fontWeight: "700" },
  detailsPanel: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 9,
    marginTop: 8,
    padding: 10,
  },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  detailCell: { width: "50%", paddingHorizontal: 4, marginBottom: 9 },
  detailLabel: { color: COLORS.textBody, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  detailValue: { color: COLORS.textHeader, fontSize: 13, fontWeight: "700", marginTop: 2 },
  editButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
    marginTop: 2,
  },
  editButtonText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  emptyText: { textAlign: "center", marginTop: 24, color: COLORS.textBody, fontSize: 14 },
});
