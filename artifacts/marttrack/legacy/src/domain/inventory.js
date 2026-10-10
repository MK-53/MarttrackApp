import { createAuditEvent } from "./audit.js";
import { now } from "../utils/dates.js";

export const addStock = (state, payload) => {
  const { itemId, itemName, targetPrice, unitType, totalCost, quantity, isNewItem } = payload;

  let item;
  let items = [...state.items];

  if (isNewItem) {
    item = {
      id: state.counters.itemId,
      item_name: itemName.trim(),
      target_price_per_unit: Number(targetPrice),
      sell_unit_type: (unitType || "unit").trim(),
    };
    items.push(item);
  } else {
    item = items.find(i => i.id === itemId);
    if (!item) throw new Error("Item not found");
  }

  const totalCostNum = Number(totalCost);
  const qtyNum = Number(quantity);
  const costPerUnit = totalCostNum / qtyNum;

  const batch = {
    id: state.counters.batchId,
    item_id: item.id,
    initial_qty: qtyNum,
    qty_remaining: qtyNum,
    cost_per_unit: costPerUnit,
    timestamp: now(),
  };

  const auditEvent = createAuditEvent(
    state.counters, "ITEM", item.id, "NEW_BATCH",
    null, { quantity: qtyNum, totalCost: totalCostNum, costPerUnit },
    null, `Added ${qtyNum} units (total ${totalCostNum.toFixed(2)}, cost/unit ${costPerUnit.toFixed(2)})`
  );

  return {
    ...state,
    items,
    batches: [...state.batches, batch],
    editHistory: [auditEvent, ...state.editHistory],
    counters: {
      ...state.counters,
      itemId: isNewItem ? state.counters.itemId + 1 : state.counters.itemId,
      batchId: state.counters.batchId + 1,
      editId: state.counters.editId + 1,
    },
  };
};

export const editBatch = (state, payload) => {
  const { batchId, newQuantity, newTotalCost, reason, recalculatePastSales = false } = payload;
  const batch = state.batches.find(item => item.id === Number(batchId));
  if (!batch) throw new Error("Batch not found");
  if (!reason?.trim()) throw new Error("A reason is required to edit a batch");

  const alreadySold = batch.initial_qty - batch.qty_remaining;
  const updatedQty = newQuantity === undefined || newQuantity === ""
    ? batch.initial_qty
    : Number(newQuantity);
  const oldTotalCost = batch.cost_per_unit * batch.initial_qty;
  const updatedTotalCost = newTotalCost === undefined || newTotalCost === ""
    ? oldTotalCost
    : Number(newTotalCost);

  if (!Number.isFinite(updatedQty) || updatedQty <= 0)
    throw new Error("Quantity must be a positive number");
  if (updatedQty < alreadySold)
    throw new Error(`Can't set quantity below ${alreadySold} — that much has already been sold from this batch`);
  if (!Number.isFinite(updatedTotalCost) || updatedTotalCost <= 0)
    throw new Error("Total cost must be a positive number");

  const newCostPerUnit = updatedTotalCost / updatedQty;
  const updatedBatch = {
    ...batch,
    initial_qty: updatedQty,
    qty_remaining: updatedQty - alreadySold,
    cost_per_unit: newCostPerUnit,
  };

  let sales = state.sales;
  let profitDelta = 0;
  let affectedSalesCount = 0;

  if (recalculatePastSales) {
    sales = state.sales.map(sale => {
      if (sale.batch_id !== Number(batchId)) return sale;
      const newCogs = newCostPerUnit * sale.qty_sold;
      const newProfit = (sale.sale_price - newCostPerUnit) * sale.qty_sold;
      profitDelta += newProfit - sale.profit;
      affectedSalesCount += 1;
      return {
        ...sale,
        cost_at_sale: newCostPerUnit,
        cogs: Number(newCogs.toFixed(2)),
        profit: Number(newProfit.toFixed(2)),
        restated: true,
      };
    });
  }

  const restatementNote = recalculatePastSales
    ? ` Also restated ${affectedSalesCount} past sale(s); total profit impact: ${profitDelta >= 0 ? "+" : ""}${profitDelta.toFixed(2)}.`
    : "";
  const auditEvent = createAuditEvent(
    state.counters,
    "BATCH",
    Number(batchId),
    "EDIT_BATCH",
    {
      quantity: batch.initial_qty,
      totalCost: Number(oldTotalCost.toFixed(2)),
      costPerUnit: batch.cost_per_unit,
    },
    {
      quantity: updatedQty,
      totalCost: Number(updatedTotalCost.toFixed(2)),
      costPerUnit: newCostPerUnit,
      recalculatePastSales: Boolean(recalculatePastSales),
      affectedSalesCount,
      profitDelta: Number(profitDelta.toFixed(2)),
    },
    reason.trim(),
    `Corrected batch #${batchId}: qty ${batch.initial_qty} → ${updatedQty}, cost/unit ${batch.cost_per_unit.toFixed(2)} → ${newCostPerUnit.toFixed(2)}.${restatementNote}`,
  );

  return {
    ...state,
    batches: state.batches.map(item => item.id === Number(batchId) ? updatedBatch : item),
    sales,
    editHistory: [auditEvent, ...state.editHistory],
    counters: { ...state.counters, editId: state.counters.editId + 1 },
  };
};

export const editItem = (state, payload) => {
  const { itemId, newName, newTarget, newUnit, reason } = payload;

  const itemIndex = state.items.findIndex(i => i.id === Number(itemId));
  if (itemIndex < 0) throw new Error("Item not found");

  const current = state.items[itemIndex];
  const updates = { ...current };
  const details = [];

  if (newName && newName.trim() && newName.trim() !== current.item_name) {
    details.push(`name "${current.item_name}" -> "${newName.trim()}"`);
    updates.item_name = newName.trim();
  }

  if (newTarget && String(newTarget).trim()) {
    const targetValue = Number(newTarget);
    if (targetValue !== current.target_price_per_unit) {
      details.push(`target ${current.target_price_per_unit} -> ${targetValue}`);
      updates.target_price_per_unit = targetValue;
    }
  }

  if (newUnit && newUnit.trim() && newUnit.trim() !== current.sell_unit_type) {
    details.push(`unit ${current.sell_unit_type} -> ${newUnit.trim()}`);
    updates.sell_unit_type = newUnit.trim();
  }

  if (details.length === 0) throw new Error("No changes were provided");

  const updatedItems = [...state.items];
  updatedItems[itemIndex] = updates;

  const auditEvent = createAuditEvent(
    state.counters, "ITEM", current.id, "EDIT_ITEM",
    current, updates, reason, details.join("; ")
  );

  return {
    ...state,
    items: updatedItems,
    editHistory: [auditEvent, ...state.editHistory],
    counters: { ...state.counters, editId: state.counters.editId + 1 },
  };
};

export const getItemsWithStock = (state) => {
  return state.items
    .map((item) => {
      const batches = state.batches.filter(b => b.item_id === item.id);
      const totalIn = batches.reduce((s, b) => s + b.initial_qty, 0);
      const totalStock = batches.reduce((s, b) => s + b.qty_remaining, 0);
      const costPerUnit = totalStock > 0
        ? Number((batches.reduce((s, b) => s + b.cost_per_unit * b.qty_remaining, 0) / totalStock).toFixed(2))
        : 0;
      const soldQty = state.sales.filter(s => s.item_id === item.id).reduce((s, sale) => s + sale.qty_sold, 0);
      const profit = state.sales.filter(s => s.item_id === item.id).reduce((s, sale) => s + sale.profit, 0);
      return { ...item, totalIn, totalStock, costPerUnit, soldQty, profit };
    });
};

export const findSimilarItems = (state, name) => {
  const lower = name.toLowerCase().trim();
  if (!lower) return [];
  return state.items.filter(item =>
    item.item_name.toLowerCase().includes(lower)
  );
};
