import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import ScreenHeader from "../components/ScreenHeader";
import { validatePositive, validateRequired } from "../utils/validation";

export default function EditBatchScreen({ onNavigate }) {
  const { state, colors, dispatch } = useMartTrack();
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [form, setForm] = useState({
    newQuantity: "",
    newTotalCost: "",
    reason: "",
    recalculatePastSales: false,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const itemNames = useMemo(
    () => new Map(state.items.map(item => [item.id, item.item_name])),
    [state.items],
  );

  const affectedSalesCount = selectedBatch
    ? state.sales.filter(sale => sale.batch_id === selectedBatch.id).length
    : 0;

  const selectBatch = (batch) => {
    setSelectedBatch(batch);
    setForm({
      newQuantity: String(batch.initial_qty),
      newTotalCost: String((batch.cost_per_unit * batch.initial_qty).toFixed(2)),
      reason: "",
      recalculatePastSales: false,
    });
    setErrors({});
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

  const setField = (key, value) => {
    setForm(previous => ({ ...previous, [key]: value }));
    if (errors[key]) setErrors(previous => ({ ...previous, [key]: null }));
  };

  const handleSave = () => {
    if (!selectedBatch || saving) return;
    setSaving(true);

    const nextErrors = {};
    const quantityError = validatePositive(form.newQuantity);
    if (quantityError) nextErrors.newQuantity = quantityError;
    const totalCostError = validatePositive(form.newTotalCost);
    if (totalCostError) nextErrors.newTotalCost = totalCostError;
    const reasonError = validateRequired(form.reason, "Reason");
    if (reasonError) nextErrors.reason = reasonError;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSaving(false);
      return;
    }

    dispatch({
      type: "EDIT_BATCH",
      payload: {
        batchId: selectedBatch.id,
        newQuantity: form.newQuantity,
        newTotalCost: form.newTotalCost,
        reason: form.reason,
        recalculatePastSales: form.recalculatePastSales,
      },
    });
    setPendingAction({
      successMessage: form.recalculatePastSales && affectedSalesCount > 0
        ? `Batch corrected and ${affectedSalesCount} past sale(s) restated.`
        : "Batch corrected.",
    });
  };

  if (!selectedBatch) {
    return (
      <View style={styles.flex1}>
        <ScreenHeader title="Correct Stock Batch" onBack={() => onNavigate("summary")} />
        <FlatList
          data={state.batches}
          contentContainerStyle={styles.screenPad}
          keyExtractor={batch => String(batch.id)}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textBody }]}>No stock batches found.</Text>}
          renderItem={({ item: batch }) => (
            <TouchableOpacity
              testID={`edit-batch-${batch.id}`}
              style={[styles.batchCard, { backgroundColor: colors.card, borderLeftColor: COLORS.warning }]}
              onPress={() => selectBatch(batch)}
            >
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={[styles.batchTitle, { color: colors.textHeader }]}>
                    {itemNames.get(batch.item_id) || `Item #${batch.item_id}`}
                  </Text>
                  <Text style={[styles.batchSub, { color: colors.textBody }]}>
                    Batch #{batch.id} · {batch.qty_remaining} remaining · ₦{batch.cost_per_unit.toFixed(2)}/unit
                  </Text>
                </View>
                <Text style={[styles.arrow, { color: colors.textBody }]}>{">"}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  const alreadySold = selectedBatch.initial_qty - selectedBatch.qty_remaining;

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <ScreenHeader
        title={`Correct Batch #${selectedBatch.id}`}
        onBack={() => setSelectedBatch(null)}
      />
      <Card style={styles.p16}>
        <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.textBody }]}>Current values</Text>
          <Text style={[styles.infoText, { color: colors.textHeader }]}>
            {itemNames.get(selectedBatch.item_id) || `Item #${selectedBatch.item_id}`}
          </Text>
          <Text style={[styles.infoText, { color: colors.textBody }]}>
            Original quantity: {selectedBatch.initial_qty} · Already sold: {alreadySold} · Remaining: {selectedBatch.qty_remaining}
          </Text>
          <Text style={[styles.infoText, { color: colors.textBody }]}>
            Cost per unit: ₦{selectedBatch.cost_per_unit.toFixed(2)}
          </Text>
        </View>

        {affectedSalesCount > 0 && (
          <View style={[styles.warningBox, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
            <Text style={[styles.warningTitle, { color: colors.warning }]}>
              {affectedSalesCount} sale(s) already used this batch&apos;s original cost
            </Text>
            <Text style={[styles.warningText, { color: colors.textBody }]}>
              Choose whether those past profits should stay as recorded or reflect the corrected cost.
            </Text>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.textHeader }]}>Recalculate past sales</Text>
              <Switch
                testID="edit-batch-recalculate-switch"
                value={form.recalculatePastSales}
                onValueChange={value => setField("recalculatePastSales", value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFF"
              />
            </View>
            <Text style={[styles.warningText, { color: colors.textBody }]}>
              {form.recalculatePastSales
                ? "Past sales will use the corrected cost and their profit will be restated."
                : "Past sales keep their original recorded profit; only stock going forward changes."}
            </Text>
          </View>
        )}

        <Input
          label="Reason for correction (Required)"
          value={form.reason}
          onChangeText={value => setField("reason", value)}
          placeholder="e.g., Supplier invoice typo"
          error={errors.reason}
        />
        <Input
          label="Corrected Total Quantity"
          value={form.newQuantity}
          onChangeText={value => setField("newQuantity", value)}
          keyboardType="numeric"
          error={errors.newQuantity}
        />
        <Input
          label="Corrected Total Cost"
          value={form.newTotalCost}
          onChangeText={value => setField("newTotalCost", value)}
          keyboardType="numeric"
          error={errors.newTotalCost}
        />
        <Button
          title={saving ? "Saving..." : "Save Correction"}
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.mt10}
        />
        <Button
          title="Back"
          onPress={() => setSelectedBatch(null)}
          color={COLORS.textBody}
          style={styles.mt10}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screenPad: { padding: 16, paddingBottom: 120 },
  p16: { padding: 16 },
  mt10: { marginTop: 10 },
  row: { flexDirection: "row", alignItems: "center" },
  batchCard: { padding: 18, borderRadius: 12, borderLeftWidth: 3, marginBottom: 12 },
  batchTitle: { fontSize: 17, fontWeight: "600" },
  batchSub: { fontSize: 13, marginTop: 4 },
  arrow: { fontSize: 22 },
  emptyText: { textAlign: "center", marginTop: 24, fontSize: 14 },
  infoBox: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 16 },
  infoLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 6 },
  infoText: { fontSize: 14, marginTop: 3 },
  warningBox: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 16 },
  warningTitle: { fontSize: 14, fontWeight: "700" },
  warningText: { fontSize: 13, marginTop: 6, lineHeight: 19 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  switchLabel: { fontSize: 14, fontWeight: "700", flex: 1 },
});