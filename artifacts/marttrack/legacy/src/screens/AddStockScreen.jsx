import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import { getItemsWithStock, findSimilarItems } from "../domain/inventory";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import ScreenHeader from "../components/ScreenHeader";
import { isWeightBasedUnit, validateItemName, validatePositive } from "../utils/validation";

export default function AddStockScreen({ onNavigate }) {
  const { state, dispatch, isDispatching } = useMartTrack();
  const [form, setForm] = useState({
    addName: "", addTarget: "", addUnit: "",
    addTotalCost: "", addQty: "",
    selectedItemId: null, isNewItem: true,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const itemsWithStock = getItemsWithStock(state);
  const matchedItem = form.selectedItemId
    ? itemsWithStock.find(i => i.id === form.selectedItemId) : null;
  const similarItems = form.addName && form.addName.trim() && form.isNewItem
    ? findSimilarItems(state, form.addName) : [];

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const handleSelectExisting = (item) => {
    setForm({ ...form, selectedItemId: item.id, addName: item.item_name, isNewItem: false });
    setErrors({});
  };

  useEffect(() => {
    if (!pendingAction || isDispatching) return;
    setSaving(false);
    if (state.lastActionError) {
      Alert.alert("Error", state.lastActionError);
    } else {
      Alert.alert("Success", pendingAction.successMessage);
      onNavigate("summary");
    }
    setPendingAction(null);
  }, [pendingAction, state.lastActionError, isDispatching, onNavigate]);

  const handleAddStock = () => {
    if (saving) return;
    setSaving(true);

    const newErrors = {};
    const nameError = validateItemName(form.addName);
    if (nameError) newErrors.addName = nameError;
    if (form.isNewItem) {
      const targetError = validatePositive(form.addTarget);
      if (targetError) newErrors.addTarget = targetError;
    }
    const costError = validatePositive(form.addTotalCost);
    if (costError) newErrors.addTotalCost = costError;
    const unitType = form.isNewItem ? form.addUnit : matchedItem?.sell_unit_type;
    const qtyError = validatePositive(form.addQty, !isWeightBasedUnit(unitType));
    if (qtyError) newErrors.addQty = qtyError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSaving(false);
      return;
    }

    dispatch({
      type: "ADD_STOCK",
      payload: {
        itemId: form.selectedItemId,
        itemName: form.addName,
        targetPrice: form.addTarget,
        unitType: form.addUnit || "unit",
        totalCost: form.addTotalCost,
        quantity: form.addQty,
        isNewItem: form.isNewItem,
      },
    });
    setPendingAction({ successMessage: "Batch added successfully." });
  };

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <ScreenHeader title="New Stock Batch" onBack={() => onNavigate("summary")} />
      <Card style={styles.p16}>
        <Input
          label="Item Name"
          value={form.addName}
          onChangeText={v => setField("addName", v)}
          placeholder="e.g. Sugar"
          error={errors.addName}
        />

        {form.isNewItem && similarItems.length > 0 && (
          <View style={styles.similarBanner}>
            <Text style={styles.similarTitle}>Similar products found:</Text>
            {similarItems.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleSelectExisting(item)}
                style={styles.similarItem}
              >
                <Text style={styles.similarItemText}>{item.item_name}</Text>
                <Text style={styles.similarItemSub}>{item.totalStock} in stock</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {matchedItem ? (
          <View style={styles.existingBanner}>
            <Text style={styles.existingTitle}>Restocking - "{matchedItem.item_name}"</Text>
            <Text style={styles.existingSub}>Unit: {matchedItem.sell_unit_type}</Text>
            <Text style={styles.existingSub}>Target: ${matchedItem.target_price_per_unit}</Text>
            <Text style={styles.existingSub}>In Stock: {matchedItem.totalStock}</Text>
            <TouchableOpacity onPress={() => setForm({ ...form, selectedItemId: null, isNewItem: true, addName: "" })}>
              <Text style={styles.clearLink}>Clear selection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Input
              label="Target Price per Unit"
              value={form.addTarget}
              onChangeText={v => setField("addTarget", v)}
              keyboardType="numeric"
              placeholder="e.g. 5.00"
              error={errors.addTarget}
            />
            <Input
              label="Unit Type (sachet / kg / unit)"
              value={form.addUnit}
              onChangeText={v => setField("addUnit", v)}
              placeholder="unit"
            />
          </>
        )}

        <Input
          label="Total Cost of Batch"
          value={form.addTotalCost}
          onChangeText={v => setField("addTotalCost", v)}
          keyboardType="numeric"
          placeholder="e.g. 500"
          error={errors.addTotalCost}
        />
        <Input
          label="Quantity in Batch"
          value={form.addQty}
          onChangeText={v => setField("addQty", v)}
          keyboardType="numeric"
          placeholder="e.g. 100"
          error={errors.addQty}
        />

        <Button
          title={saving ? "Saving..." : "Save Batch"}
          onPress={handleAddStock}
          loading={saving}
          disabled={saving}
          style={styles.mt10}
        />
        <Button
          title="Cancel"
          onPress={() => onNavigate("summary")}
          color={COLORS.textBody}
          style={styles.mt10}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, paddingBottom: 120 },
  p16: { padding: 16 },
  mt10: { marginTop: 10 },
  similarBanner: {
    backgroundColor: "#0D1F17", borderWidth: 1, borderColor: "#1A4D30",
    borderRadius: 10, padding: 14, marginBottom: 16,
  },
  similarTitle: { fontSize: 13, fontWeight: "700", color: COLORS.secondary, marginBottom: 10 },
  similarItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  similarItemText: { fontSize: 15, fontWeight: "600", color: COLORS.textHeader },
  similarItemSub: { fontSize: 12, color: COLORS.textBody, marginTop: 2 },
  existingBanner: {
    backgroundColor: "#0D1F17", borderWidth: 1, borderColor: "#1A4D30",
    borderRadius: 10, padding: 14, marginBottom: 16,
  },
  existingTitle: { fontSize: 13, fontWeight: "700", color: COLORS.secondary, marginBottom: 8 },
  existingSub: { fontSize: 13, color: COLORS.textBody, marginTop: 2 },
  clearLink: { fontSize: 12, color: COLORS.primary, marginTop: 8, fontWeight: "600" },
});
