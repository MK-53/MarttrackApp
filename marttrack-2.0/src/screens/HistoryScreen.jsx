import React, { useState, useMemo } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import Card from "../components/Card";
import SearchBar from "../components/SearchBar";
import FilterTabs from "../components/FilterTabs";
import ScreenHeader from "../components/ScreenHeader";
import { formatDate, isToday, isThisWeek, isThisMonth } from "../utils/dates";

export default function HistoryScreen({ onNavigate }) {
  const { state } = useMartTrack();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const filteredHistory = useMemo(() => {
    let result = state.editHistory;
    switch (actionFilter) {
      case "sales":   result = result.filter(e => e.action === "SALE"); break;
      case "returns": result = result.filter(e => e.action === "RETURN"); break;
      case "stock":   result = result.filter(e => e.action === "NEW_BATCH"); break;
      case "edits":   result = result.filter(e => e.action === "EDIT_ITEM"); break;
      case "archive": result = result.filter(e => e.action === "ARCHIVE_ITEM"); break;
    }
    switch (dateFilter) {
      case "today": result = result.filter(e => isToday(e.timestamp)); break;
      case "week":  result = result.filter(e => isThisWeek(e.timestamp)); break;
      case "month": result = result.filter(e => isThisMonth(e.timestamp)); break;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(e => {
        const name = e.item_name || (e.before && e.before.item_name) || (e.after && e.after.item_name) || "";
        return name.toLowerCase().includes(q) || e.action.toLowerCase().includes(q);
      });
    }
    return result;
  }, [state.editHistory, actionFilter, dateFilter, search]);

  const getActionColor = (action) => {
    switch (action) {
      case "SALE": return COLORS.secondary;
      case "RETURN": return COLORS.danger;
      case "NEW_BATCH": return COLORS.primary;
      case "EDIT_ITEM": return COLORS.warning;
      case "ARCHIVE_ITEM": return COLORS.danger;
      default: return COLORS.textBody;
    }
  };

  const getItemName = (item) => {
    if (item.item_name) return item.item_name;
    if (item.before && item.before.item_name) return item.before.item_name;
    if (item.after && item.after.item_name) return item.after.item_name;
    return `Item #${item.entityId}`;
  };

  const getDetails = (item) => {
    if (item.details) return item.details;
    if (item.reason) return item.reason;
    return "";
  };

  return (
    <View style={styles.flex1}>
      <ScreenHeader title="Activity History" onBack={() => onNavigate("summary")} />
      <View style={{ paddingHorizontal: 16 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search history..." />
        <FilterTabs
          tabs={[
            { label: "All", value: "all" },
            { label: "Sales", value: "sales" },
            { label: "Returns", value: "returns" },
            { label: "Stock", value: "stock" },
            { label: "Edits", value: "edits" },
          ]}
          activeTab={actionFilter}
          onTabChange={setActionFilter}
        />
        <FilterTabs
          tabs={[
            { label: "All Time", value: "all" },
            { label: "Today", value: "today" },
            { label: "This Week", value: "week" },
            { label: "This Month", value: "month" },
          ]}
          activeTab={dateFilter}
          onTabChange={setDateFilter}
        />
      </View>
      <FlatList
        data={filteredHistory}
        contentContainerStyle={styles.screenPad}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={<Text style={styles.emptyText}>No history records found.</Text>}
        renderItem={({ item }) => (
          <Card style={styles.historyItem}>
            <View style={styles.historyHeader}>
              <Text style={[styles.historyType, { color: getActionColor(item.action) }]}>
                {item.action.replace(/_/g, " ")}
              </Text>
              <Text style={styles.historyDate}>{formatDate(item.timestamp)}</Text>
            </View>
            <Text style={styles.historyItemName}>{getItemName(item)}</Text>
            {getDetails(item) && <Text style={styles.itemSub}>{getDetails(item)}</Text>}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screenPad: { padding: 16, paddingBottom: 120 },
  historyItem: { padding: 14, marginBottom: 8 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  historyType: { fontWeight: "700", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  historyItemName: { fontSize: 15, fontWeight: "700", color: COLORS.textHeader, marginBottom: 3 },
  historyDate: { fontSize: 10, color: "#555" },
  itemSub: { fontSize: 13, color: COLORS.textBody, marginTop: 2 },
  emptyText: { textAlign: "center", marginTop: 24, color: COLORS.textBody, fontSize: 14 },
});
