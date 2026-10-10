import React, { useState, useMemo, useEffect } from "react";
import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import SearchBar from "../components/SearchBar";
import ScreenHeader from "../components/ScreenHeader";
import { validateItemName, validatePositive, validateRequired } from "../utils/validation";

export default function EditItemScreen({ onNavigate, initialItemId = null }) {
  const { state, dispatch } = useMartTrack();
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [form, setForm] = useState({ editName: "", editTarget: "", editUnit: "", editReason: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const filteredItems = search.trim()
    ? state.items.filter(i => i.item_name.toLowerCase().includes(search.toLowerCase().trim()))
    : state.items;

  const handleSelect = (item) => {
    setSelectedItem(item);
    setForm({ editName: "", editTarget: "", editUnit: "", editReason: "" });
    setErrors({});
  };

  useEffect(() => {
    if (initialItemId === null || initialItemId === undefined) return;
    const item = state.items.find(i => i.id === Number(initialItemId));
    if (item) handleSelect(item);
  }, [initialItemId, state.items]);

  useEffect(() => {
    if (!pendingAction) return;
    setSaving(false);
    if (state.lastActionError) {
      Alert.alert("Error", state.lastActionError);
    } else {
      Alert.alert("Success", pendingAction.successMessage);
      onNavigate("summary");
    }
    setPendingAction(null);
  }, [pendingAction, state.lastActionError, onNavigate]);

  const handleEdit = () => {
    if (saving) return;
    setSaving(true);
    const newErrors = {};
    const reasonError = validateRequired(form.editReason, "Reason");
    if (reasonError) newErrors.editReason = reasonError;
    if (form.editName && form.editName.trim()) {
      const nameError = validateItemName(form.editName);
      if (nameError) newErrors.editName = nameError;
    }
    if (form.editTarget && String(form.editTarget).trim()) {
      const targetError = validatePositive(form.editTarget);
      if (targetError) newErrors.editTarget = targetError;
    }
    const nothingChanged =
      (!form.editName || !form.editName.trim() || form.editName.trim() === selectedItem.item_name) &&
      (!form.editTarget || !String(form.editTarget).trim() || Number(form.editTarget) === selectedItem.target_price_per_unit) &&
      (!form.editUnit || !form.editUnit.trim() || form.editUnit.trim() === selectedItem.sell_unit_type);
    if (nothingChanged) newErrors.editName = "Change at least one field before saving.";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); setSaving(false); return; }
    dispatch({
      type: "EDIT_ITEM",
      payload: {
        itemId: selectedItem.id,
        newName: form.editName,
        newTarget: form.editTarget,
        newUnit: form.editUnit,
        reason: form.editReason,
      },
    });
    setPendingAction({ successMessage: "Item updated." });
  };

  if (!selectedItem) {
    return (
      <View style={styles.flex1}>
        <ScreenHeader title="Select Item to Edit" onBack={() => onNavigate("summary")} />
        <View style={{ paddingHorizontal: 16 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search items..." />
        </View>
        <FlatList
          data={filteredItems}
          contentContainerStyle={styles.screenPad}
          keyExtractor={item => String(item.id)}
          ListEmptyComponent={<Text style={styles.emptyText}>No items found.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.menuCard, { borderLeftColor: COLORS.primary }]}
              onPress={() => handleSelect(item)}
            >
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.menuLabel}>{item.item_name}</Text>
                  <Text style={styles.itemSub}>ID: {item.id} - {item.sell_unit_type}</Text>
                </View>
                <Text style={[styles.itemSub, { fontWeight: "700" }]}>${item.target_price_per_unit}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <ScreenHeader title={`Editing: ${selectedItem.item_name}`} onBack={() => setSelectedItem(null)} />
      <Card style={styles.p16}>
        <View style={styles.currentInfo}>
          <Text style={styles.label}>Current Values</Text>
          <Text style={styles.currentText}>Name: {selectedItem.item_name}</Text>
          <Text style={styles.currentText}>Target: ${selectedItem.target_price_per_unit}</Text>
          <Text style={styles.currentText}>Unit: {selectedItem.sell_unit_type}</Text>
        </View>
        <Input
          label="Reason for change (Required)"
          value={form.editReason}
          onChangeText={v => { setForm(p => ({...p, editReason: v})); setErrors(p => ({...p, editReason: null})); }}
          placeholder="e.g., Price update or typo fix"
          error={errors.editReason}
        />
        <Input
          label="New Name"
          value={form.editName}
          onChangeText={v => { setForm(p => ({...p, editName: v})); setErrors(p => ({...p, editName: null})); }}
          placeholder={selectedItem.item_name}
          error={errors.editName}
        />
        <Input
          label="New Target Price"
          value={form.editTarget}
          onChangeText={v => { setForm(p => ({...p, editTarget: v})); setErrors(p => ({...p, editTarget: null})); }}
          keyboardType="numeric"
          placeholder={String(selectedItem.target_price_per_unit)}
          error={errors.editTarget}
        />
        <Input
          label="New Unit Type"
          value={form.editUnit}
          onChangeText={v => setForm(p => ({...p, editUnit: v}))}
          placeholder={selectedItem.sell_unit_type}
        />
        <Button title={saving ? "Saving..." : "Update Item"} onPress={handleEdit} loading={saving} disabled={saving} style={styles.mt10} />
        <Button title="Back" onPress={() => setSelectedItem(null)} color={COLORS.textBody} style={styles.mt10} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screenPad: { padding: 16, paddingBottom: 120 },
  p16: { padding: 16 },
  mt10: { marginTop: 10 },
  row: { flexDirection: "row" },
  menuCard: { backgroundColor: COLORS.card, padding: 18, borderRadius: 12, borderLeftWidth: 3, marginBottom: 12 },
  menuLabel: { fontSize: 17, fontWeight: "600", color: COLORS.textHeader },
  itemSub: { fontSize: 13, color: COLORS.textBody, marginTop: 2 },
  emptyText: { textAlign: "center", marginTop: 24, color: COLORS.textBody, fontSize: 14 },
  currentInfo: { backgroundColor: "#1A1A1A", borderRadius: 10, padding: 14, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.textBody, marginBottom: 6, textTransform: "uppercase" },
  currentText: { fontSize: 14, color: COLORS.textBody, marginTop: 2 },
});
