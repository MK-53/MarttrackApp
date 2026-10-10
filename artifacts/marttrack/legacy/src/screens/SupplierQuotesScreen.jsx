import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import { getSupplierRecommendations } from "../domain/suppliers";
import { formatCurrency } from "../utils/formatting";
import { validatePositive, validateRequired } from "../utils/validation";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import ScreenHeader from "../components/ScreenHeader";

export default function SupplierQuotesScreen({ onNavigate }) {
  const { state, colors, dispatch } = useMartTrack();
  const [selectedItemId, setSelectedItemId] = useState(state.items[0]?.id ?? null);
  const [supplierName, setSupplierName] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [contact, setContact] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState(false);
  const recommendations = useMemo(() => getSupplierRecommendations(state), [state]);
  const selectedItem = state.items.find(item => item.id === selectedItemId);

  useEffect(() => {
    if (!pendingAction) return;
    setSaving(false);
    if (state.lastActionError) {
      Alert.alert("Error", state.lastActionError);
    } else {
      setSupplierName("");
      setQuotedPrice("");
      setContact("");
      Alert.alert("Saved", "Supplier quote added.");
    }
    setPendingAction(false);
  }, [pendingAction, state.lastActionError]);

  const handleSave = () => {
    if (saving) return;
    const nextErrors = {};
    const nameError = validateRequired(supplierName, "Supplier name");
    const priceError = validatePositive(quotedPrice);
    if (nameError) nextErrors.supplierName = nameError;
    if (priceError) nextErrors.quotedPrice = priceError;
    if (!selectedItemId) nextErrors.item = "Add an item before saving a quote.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    dispatch({
      type: "ADD_SUPPLIER_QUOTE",
      payload: {
        itemId: selectedItemId,
        supplierName,
        quotedPrice: Number(quotedPrice),
        contact,
      },
    });
    setPendingAction(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.screenPad} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Supplier Quotes" onBack={() => onNavigate("summary")} />
      <Text style={[styles.intro, { color: colors.textBody }]}>
        Keep supplier prices beside your stock costs so the next restock decision is easier.
      </Text>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textHeader }]}>Best opportunities</Text>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{recommendations.length} found</Text>
      </View>
      <Card style={styles.cardPad}>
        {recommendations.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textBody }]}>
            Add a quote below that is cheaper than your current stock cost to see a recommendation here.
          </Text>
        ) : (
          recommendations.map(recommendation => (
            <View key={recommendation.itemId} style={[styles.recommendation, { borderBottomColor: colors.border }]}>
              <View style={styles.flex1}>
                <Text style={[styles.listTitle, { color: colors.textHeader }]}>{recommendation.itemName}</Text>
                <Text style={[styles.listMeta, { color: colors.textBody }]}>
                  {recommendation.supplier}: {formatCurrency(recommendation.quotedPrice)} vs {formatCurrency(recommendation.currentCost)}
                </Text>
              </View>
              <Text style={[styles.savings, { color: colors.secondary }]}>Save {recommendation.savingsPct}%</Text>
            </View>
          ))
        )}
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textHeader }]}>Add a quote</Text>
      </View>
      <Card style={styles.cardPad}>
        <Text style={[styles.fieldLabel, { color: colors.textBody }]}>Item</Text>
        <View style={styles.itemChoices}>
          {state.items.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textBody }]}>Add stock before recording a supplier quote.</Text>
          ) : (
            state.items.map(item => (
              <TouchableOpacity
                key={item.id}
                testID={`supplier-item-${item.id}`}
                onPress={() => {
                  setSelectedItemId(item.id);
                  setErrors(previous => ({ ...previous, item: null }));
                }}
                style={[
                  styles.itemChoice,
                  { borderColor: colors.border },
                  selectedItemId === item.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text style={[
                  styles.itemChoiceText,
                  { color: selectedItemId === item.id ? colors.background : colors.textBody },
                ]}>{item.item_name}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
        {errors.item && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.item}</Text>}
        <Text style={[styles.selectedItem, { color: colors.textBody }]}>
          {selectedItem ? `Selected: ${selectedItem.item_name}` : "No item selected"}
        </Text>
        <Input
          label="Supplier name"
          value={supplierName}
          onChangeText={value => {
            setSupplierName(value);
            setErrors(previous => ({ ...previous, supplierName: null }));
          }}
          placeholder="e.g. Amina Foods"
          error={errors.supplierName}
        />
        <Input
          label="Quoted price per unit"
          value={quotedPrice}
          onChangeText={value => {
            setQuotedPrice(value);
            setErrors(previous => ({ ...previous, quotedPrice: null }));
          }}
          keyboardType="numeric"
          placeholder="e.g. 8.50"
          error={errors.quotedPrice}
        />
        <Input
          label="Contact (optional)"
          value={contact}
          onChangeText={setContact}
          placeholder="Phone or note"
        />
        <Button
          title={saving ? "Saving..." : "Save Supplier Quote"}
          onPress={handleSave}
          loading={saving}
          disabled={saving || !selectedItemId}
          style={styles.actionButton}
        />
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textHeader }]}>Saved quotes</Text>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{state.suppliers?.length || 0}</Text>
      </View>
      {state.suppliers?.length ? (
        <Card style={styles.cardPad}>
          {state.suppliers.slice().reverse().map(quote => (
            <View key={quote.id} style={[styles.quoteRow, { borderBottomColor: colors.border }]}>
              <View style={styles.flex1}>
                <Text style={[styles.listTitle, { color: colors.textHeader }]}>{quote.supplier_name}</Text>
                <Text style={[styles.listMeta, { color: colors.textBody }]}>
                  {state.items.find(item => item.id === quote.item_id)?.item_name || "Unknown item"}
                  {quote.contact ? ` · ${quote.contact}` : ""}
                </Text>
              </View>
              <Text style={[styles.quotePrice, { color: colors.textHeader }]}>{formatCurrency(quote.quoted_price)}</Text>
            </View>
          ))}
        </Card>
      ) : (
        <Text style={[styles.emptyText, { color: colors.textBody }]}>No supplier quotes saved yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, paddingBottom: 120 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  sectionHint: { fontSize: 12 },
  cardPad: { padding: 14, marginBottom: 18 },
  emptyText: { fontSize: 13, lineHeight: 19 },
  recommendation: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  quoteRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  flex1: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: "700" },
  listMeta: { fontSize: 12, marginTop: 3 },
  savings: { fontSize: 12, fontWeight: "800", marginLeft: 8 },
  fieldLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 7 },
  itemChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  itemChoice: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8 },
  itemChoiceText: { fontSize: 12, fontWeight: "700" },
  selectedItem: { fontSize: 12, marginTop: 8, marginBottom: 14 },
  errorText: { fontSize: 12, marginTop: 5, marginBottom: 8 },
  quotePrice: { fontSize: 15, fontWeight: "800", marginLeft: 8 },
  actionButton: { marginTop: 4 },
});