import { now } from "../utils/dates.js";

export const addSupplierQuote = (state, payload) => {
  const { itemId, supplierName, quotedPrice, contact } = payload;

  if (!supplierName?.trim()) throw new Error("Supplier name is required");
  if (!Number.isFinite(quotedPrice) || quotedPrice <= 0)
    throw new Error("Quoted price must be a positive number");

  const quote = {
    id: state.counters.supplierId,
    item_id: itemId,
    supplier_name: supplierName.trim(),
    contact: contact?.trim() || null,
    quoted_price: quotedPrice,
    source: "manual",
    checked_at: now(),
  };

  return {
    ...state,
    suppliers: [...(state.suppliers || []), quote],
    counters: {
      ...state.counters,
      supplierId: state.counters.supplierId + 1,
    },
  };
};

export const getSupplierRecommendations = (state) => {
  return state.items
    .map(item => {
      const batches = state.batches.filter(
        batch => batch.item_id === item.id && batch.qty_remaining > 0,
      );
      const currentCost = batches.reduce(
        (total, batch, _index, allBatches) =>
          total + batch.cost_per_unit / allBatches.length,
        0,
      );
      const quotes = (state.suppliers || []).filter(quote => quote.item_id === item.id);
      const cheapest = [...quotes].sort(
        (first, second) => first.quoted_price - second.quoted_price,
      )[0];

      if (!cheapest || !currentCost) return null;

      const savingsPct = ((currentCost - cheapest.quoted_price) / currentCost) * 100;
      if (savingsPct <= 0) return null;

      return {
        itemId: item.id,
        itemName: item.item_name,
        currentCost: Number(currentCost.toFixed(2)),
        supplier: cheapest.supplier_name,
        quotedPrice: cheapest.quoted_price,
        savingsPct: Number(savingsPct.toFixed(1)),
        checkedAt: cheapest.checked_at,
      };
    })
    .filter(Boolean);
};