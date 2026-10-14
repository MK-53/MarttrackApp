import React, { useState, useMemo, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import SearchBar from "../components/SearchBar";
import ScreenHeader from "../components/ScreenHeader";
import { isWeightBasedUnit, validatePositive } from "../utils/validation";
import { formatDate } from "../utils/dates";

export default function ReturnScreen({ onNavigate }) {
  const { state, dispatch, isDispatching } = useMartTrack();
  const [step, setStep] = useState("select");
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnQty, setReturnQty] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const salesWithItems = useMemo(() => {
    return state.sales
      .map(sale => {
        const item = state.items.find(i => i.id === sale.item_id);
        return { ...sale, item };
      })
      .filter(s => s.item);
  }, [state.sales, state.items]);

  const filteredSales = search.trim()
    ? salesWithItems.filter(s =>
        s.item.item_name.toLowerCase().includes(search.toLowerCase().trim()) ||
        String(s.id).includes(search.trim())
      )
    : salesWithItems;

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

  const handleConfirmReturn = async () => {
    if (saving) return;
    const newErrors = {};
    const qtyError = validatePositive(
      returnQty,
      !isWeightBasedUnit(selectedSale?.item?.sell_unit_type),
    );
    if (qtyError) newErrors.returnQty = qtyError;
    if (Number(returnQty) > selectedSale.qty_sold) {
      newErrors.returnQty = `Cannot exceed sold amount (${selectedSale.qty_sold})`;
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setSaving(true);
    dispatch({
      type: "PROCESS_RETURN",
      payload: {
        saleId: selectedSale.id,
        returnQty: Number(returnQty),
        reason: returnReason || "n/a",
      },
    });
    const refund = (Number(returnQty) * selectedSale.sale_price).toFixed(2);
    setPendingAction({ successMessage: `Returned ${returnQty} units. Refund: $${refund}` });
  };

  if (step === "select") {
    return (
      <ScrollView contentContainerStyle={styles.screenPad}>
        <ScreenHeader title="Select Sale to Return" onBack={() => onNavigate("summary")} />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by product or sale ID..." />
        {filteredSales.map(sale => (
          <TouchableOpacity
            key={sale.id}
            style={[styles.menuCard, { borderLeftColor: COLORS.danger }]}
            onPress={() => { setSelectedSale(sale); setStep("detail"); }}
          >
            <Text style={styles.menuLabel}>Sale #{sale.id} - {sale.item.item_name}</Text>
            <Text style={styles.itemSub}>{sale.qty_sold} {sale.item.sell_unit_type} @ ${sale.sale_price.toFixed(2)}</Text>
            <Text style={styles.itemSub}>{formatDate(sale.timestamp)}</Text>
          </TouchableOpacity>
        ))}
        {filteredSales.length === 0 && <Text style={styles.emptyText}>No sales records found.</Text>}
      </ScrollView>
    );
  }

  if (step === "detail" && selectedSale) {
    const refundAmount = (Number(returnQty || 0) * selectedSale.sale_price).toFixed(2);
    return (
      <ScrollView contentContainerStyle={styles.screenPad}>
        <ScreenHeader title={`Return - Sale #${selectedSale.id}`} onBack={() => setStep("select")} />
        <Card style={styles.p16}>
          <View style={{ marginBottom: 15 }}>
            <Text style={styles.label}>Product</Text>
            <Text style={styles.value}>{selectedSale.item.item_name}</Text>
            <Text style={styles.itemSub}>
              {selectedSale.qty_sold} {selectedSale.item.sell_unit_type} sold @ ${selectedSale.sale_price.toFixed(2)}
            </Text>
            <Text style={styles.itemSub}>{formatDate(selectedSale.timestamp)}</Text>
          </View>
          <Input
            label="Return Quantity"
            value={returnQty}
            onChangeText={v => { setReturnQty(v); setErrors(p => ({...p, returnQty: null})); }}
            keyboardType="numeric"
            placeholder={`Max: ${selectedSale.qty_sold}`}
            error={errors.returnQty}
          />
          <Input
            label="Reason"
            value={returnReason}
            onChangeText={setReturnReason}
            placeholder="e.g., Damaged, wrong item"
          />
          <View style={styles.refundBox}>
            <Text style={styles.refundLabel}>Refund Amount</Text>
            <Text style={styles.refundValue}>${refundAmount}</Text>
          </View>
          <Button
            title={saving ? "Processing..." : "Confirm Return"}
            onPress={handleConfirmReturn}
            loading={saving}
            disabled={saving}
            color={COLORS.danger}
            style={styles.mt10}
          />
          <Button title="Back" onPress={() => setStep("select")} color={COLORS.textBody} style={styles.mt10} />
        </Card>
      </ScrollView>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, paddingBottom: 120 },
  p16: { padding: 16 },
  mt10: { marginTop: 10 },
  menuCard: { backgroundColor: COLORS.card, padding: 18, borderRadius: 12, borderLeftWidth: 3, marginBottom: 12 },
  menuLabel: { fontSize: 17, fontWeight: "600", color: COLORS.textHeader },
  itemSub: { fontSize: 13, color: COLORS.textBody, marginTop: 2 },
  emptyText: { textAlign: "center", marginTop: 24, color: COLORS.textBody, fontSize: 14 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.textBody, marginBottom: 6, textTransform: "uppercase" },
  value: { fontSize: 17, fontWeight: "700", color: COLORS.textHeader },
  refundBox: {
    backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 10, padding: 14,
    marginTop: 10, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
  },
  refundLabel: { fontSize: 13, color: COLORS.textBody },
  refundValue: { fontSize: 22, fontWeight: "800", color: COLORS.danger, marginTop: 4 },
});
