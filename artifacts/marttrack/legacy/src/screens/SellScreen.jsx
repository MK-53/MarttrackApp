import React, { useState, useMemo, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import { getItemsWithStock } from "../domain/inventory";
import { previewSale } from "../domain/sales";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import SearchBar from "../components/SearchBar";
import ScreenHeader from "../components/ScreenHeader";
import { isWeightBasedUnit, validatePositive } from "../utils/validation";

export default function SellScreen({ onNavigate }) {
  const { state, dispatch } = useMartTrack();
  const [step, setStep] = useState("select");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [sellQty, setSellQty] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const itemsWithStock = useMemo(() => getItemsWithStock(state), [state]);
  const inStockItems = itemsWithStock.filter(i => i.totalStock > 0);
  const filteredItems = search.trim()
    ? inStockItems.filter(i => i.item_name.toLowerCase().includes(search.toLowerCase().trim()))
    : inStockItems;

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setStep("form");
    setSellPrice(String(item.target_price_per_unit));
  };

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

  const handlePreview = () => {
    const newErrors = {};
    const qtyError = validatePositive(sellQty, !isWeightBasedUnit(selectedItem?.sell_unit_type));
    if (qtyError) newErrors.sellQty = qtyError;
    const priceError = validatePositive(sellPrice);
    if (priceError) newErrors.sellPrice = priceError;
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    try {
      const result = previewSale(state, selectedItem.id, Number(sellQty), Number(sellPrice));
      setPreview(result);
      setStep("review");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleConfirmSale = async () => {
    if (saving) return;
    setSaving(true);
    dispatch({
      type: "RECORD_SALE",
      payload: {
        itemId: selectedItem.id,
        quantity: Number(sellQty),
        sellingPrice: Number(sellPrice),
      },
    });
    setPendingAction({ successMessage: `Sale recorded. Profit: $${preview.profit.toFixed(2)}` });
  };

  if (step === "select") {
    return (
      <ScrollView contentContainerStyle={styles.screenPad}>
        <ScreenHeader title="Record a sale" onBack={() => onNavigate("summary")} />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Which item was sold?" />
        {filteredItems.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuCard, { borderLeftColor: COLORS.secondary }]}
            onPress={() => handleSelectItem(item)}
          >
            <Text style={styles.menuLabel}>{item.item_name}</Text>
            <Text style={styles.itemSub}>{item.totalStock} {item.sell_unit_type} available</Text>
          </TouchableOpacity>
        ))}
        {filteredItems.length === 0 && <Text style={styles.emptyText}>Nothing is ready to sell yet.</Text>}
      </ScrollView>
    );
  }

  if (step === "form") {
    return (
      <ScrollView contentContainerStyle={styles.screenPad}>
        <ScreenHeader title={`Add details`} onBack={() => setStep("select")} />
        <Text style={styles.stepIntro}>Tell us what happened so your stock and profit stay accurate.</Text>
        <Card style={styles.p16}>
          <View style={{ marginBottom: 15 }}>
            <Text style={styles.label}>Still on the shelf</Text>
            <Text style={styles.value}>{selectedItem.totalStock} {selectedItem.sell_unit_type}</Text>
          </View>
          <Input
            label="How many were sold?"
            value={sellQty}
            onChangeText={v => { setSellQty(v); setErrors(p => ({...p, sellQty: null})); }}
            keyboardType="numeric"
            error={errors.sellQty}
          />
          <Input
            label="Selling price per item"
            value={sellPrice}
            onChangeText={v => { setSellPrice(v); setErrors(p => ({...p, sellPrice: null})); }}
            keyboardType="numeric"
            placeholder={`Suggested: ${selectedItem.target_price_per_unit}`}
            error={errors.sellPrice}
          />
          <Button title="Check the sale" onPress={handlePreview} style={styles.mt10} />
          <Button title="Back" onPress={() => setStep("select")} color={COLORS.textBody} style={styles.mt10} />
        </Card>
      </ScrollView>
    );
  }

  if (step === "review" && preview) {
    return (
      <ScrollView contentContainerStyle={styles.screenPad}>
        <ScreenHeader title="Check before saving" onBack={() => setStep("form")} />
        <Card style={styles.p16}>
          <Text style={styles.reviewItemName}>{preview.item.item_name}</Text>
          <Text style={styles.reviewQty}>{preview.quantity} {preview.item.sell_unit_type}</Text>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>How stock cost is worked out</Text>
          {preview.fifoAllocation.map((alloc, i) => (
            <View key={i} style={styles.fifoRow}>
              <Text style={styles.fifoText}>Stock batch #{alloc.batchId}</Text>
              <Text style={styles.fifoText}>{alloc.units} x ${alloc.costPerUnit} = ${alloc.cost}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Money in</Text>
            <Text style={styles.summaryValue}>${preview.revenue.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Stock cost</Text>
            <Text style={styles.summaryValue}>${preview.cogs.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: COLORS.secondary }]}>Your profit</Text>
            <Text style={[styles.summaryValue, { color: COLORS.secondary }]}>${preview.profit.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Left in stock</Text>
            <Text style={styles.summaryValue}>{preview.stockRemaining} {preview.item.sell_unit_type}</Text>
          </View>
          <Button
            title={saving ? "Saving..." : "Save this sale"}
            onPress={handleConfirmSale}
            loading={saving}
            disabled={saving}
            color={COLORS.secondary}
            style={styles.mt10}
          />
          <Button title="Back" onPress={() => setStep("form")} color={COLORS.textBody} style={styles.mt10} />
        </Card>
      </ScrollView>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, paddingBottom: 120 },
  p16: { padding: 16 },
  stepIntro: { color: COLORS.textBody, fontSize: 14, lineHeight: 20, paddingHorizontal: 16, marginTop: -5, marginBottom: 12 },
  mt10: { marginTop: 10 },
  menuCard: { backgroundColor: COLORS.card, padding: 18, borderRadius: 12, borderLeftWidth: 3, marginBottom: 12 },
  menuLabel: { fontSize: 17, fontWeight: "600", color: COLORS.textHeader },
  itemSub: { fontSize: 13, color: COLORS.textBody, marginTop: 2 },
  emptyText: { textAlign: "center", marginTop: 24, color: COLORS.textBody, fontSize: 14 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.textBody, marginBottom: 6, textTransform: "uppercase" },
  value: { fontSize: 17, fontWeight: "700", color: COLORS.textHeader },
  reviewItemName: { fontSize: 20, fontWeight: "800", color: COLORS.textHeader, marginBottom: 4 },
  reviewQty: { fontSize: 15, color: COLORS.textBody, marginBottom: 16 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textBody, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  fifoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  fifoText: { fontSize: 13, color: COLORS.textBody },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: 15, color: COLORS.textBody },
  summaryValue: { fontSize: 15, fontWeight: "700", color: COLORS.textHeader },
});
