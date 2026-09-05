import { createAuditEvent } from "./audit";
import { now } from "../utils/dates";

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
      active: true,
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

export const archiveItem = (state, payload) => {
  const { itemId, reason } = payload;

  const item = state.items.find(i => i.id === itemId);
  if (!item) throw new Error("Item not found");

  const hasTransactions =
    state.batches.some(b => b.item_id === itemId) ||
    state.sales.some(s => s.item_id === itemId);

  const auditEvent = createAuditEvent(
    state.counters, "ITEM", itemId, "ARCHIVE_ITEM",
    item, { ...item, active: false }, reason || "Archived",
    `Archived item: ${item.item_name}`
  );

  let newState = {
    ...state,
    editHistory: [auditEvent, ...state.editHistory],
    counters: { ...state.counters, editId: state.counters.editId + 1 },
  };

  if (hasTransactions) {
    newState.items = newState.items.map(i =>
      i.id === itemId ? { ...i, active: false, archived: true } : i
    );
  } else {
    newState.items = newState.items.filter(i => i.id !== itemId);
    newState.batches = newState.batches.filter(b => b.item_id !== itemId);
    newState.sales = newState.sales.filter(s => s.item_id !== itemId);
  }

  return newState;
};

export const getItemsWithStock = (state) => {
  return state.items
    .filter(item => item.active !== false)
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
    item.active !== false &&
    item.item_name.toLowerCase().includes(lower)
  );
};
