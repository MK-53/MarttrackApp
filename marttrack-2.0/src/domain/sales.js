import { createAuditEvent } from "./audit";
import { now } from "../utils/dates";

export const previewSale = (state, itemId, quantity, sellingPrice) => {
  const item = state.items.find(i => i.id === itemId);
  if (!item) throw new Error("Item not found");

  const available = state.batches.filter(
    b => b.item_id === itemId && b.qty_remaining > 0
  );
  const totalAvailable = available.reduce((s, b) => s + b.qty_remaining, 0);

  if (quantity > totalAvailable)
    throw new Error(`Not enough stock. Available: ${totalAvailable}`);

  const sorted = [...available].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  let remaining = quantity;
  let profitTotal = 0;
  let revenueTotal = 0;
  let cogsTotal = 0;
  const fifoAllocation = [];

  for (const batch of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, batch.qty_remaining);
    const cost = batch.cost_per_unit * take;
    const revenue = sellingPrice * take;
    const profit = (sellingPrice - batch.cost_per_unit) * take;

    fifoAllocation.push({
      batchId: batch.id,
      units: take,
      costPerUnit: batch.cost_per_unit,
      cost: Number(cost.toFixed(2)),
      revenue: Number(revenue.toFixed(2)),
      profit: Number(profit.toFixed(2)),
    });

    remaining -= take;
    profitTotal += profit;
    revenueTotal += revenue;
    cogsTotal += cost;
  }

  return {
    item,
    quantity,
    sellingPrice,
    revenue: Number(revenueTotal.toFixed(2)),
    cogs: Number(cogsTotal.toFixed(2)),
    profit: Number(profitTotal.toFixed(2)),
    fifoAllocation,
    stockRemaining: totalAvailable - quantity,
  };
};

export const recordSale = (state, payload) => {
  const { itemId, quantity, sellingPrice } = payload;

  const item = state.items.find(i => i.id === itemId);
  if (!item) throw new Error("Item not found");

  const available = state.batches.filter(
    b => b.item_id === itemId && b.qty_remaining > 0
  );
  const totalAvailable = available.reduce((s, b) => s + b.qty_remaining, 0);

  if (quantity > totalAvailable)
    throw new Error(`Not enough stock. Available: ${totalAvailable}`);

  const sorted = [...available].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  let remaining = quantity;
  let profitTotal = 0;
  let revenueTotal = 0;
  let cogsTotal = 0;
  const batchUpdates = state.batches.map(b => ({ ...b }));
  const salesToAdd = [];
  const fifoAllocation = [];

  for (const batch of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, batch.qty_remaining);
    const cost = batch.cost_per_unit * take;
    const revenue = sellingPrice * take;
    const profit = (sellingPrice - batch.cost_per_unit) * take;

    const updatedBatch = batchUpdates.find(b => b.id === batch.id);
    if (updatedBatch) updatedBatch.qty_remaining -= take;

    salesToAdd.push({
      id: state.counters.saleId + salesToAdd.length,
      item_id: itemId,
      batch_id: batch.id,
      qty_sold: take,
      sale_price: sellingPrice,
      cost_at_sale: batch.cost_per_unit,
      profit: Number(profit.toFixed(2)),
      revenue: Number(revenue.toFixed(2)),
      cogs: Number(cost.toFixed(2)),
      timestamp: now(),
    });

    fifoAllocation.push({
      batchId: batch.id, units: take,
      costPerUnit: batch.cost_per_unit,
      cost: Number(cost.toFixed(2)),
    });

    remaining -= take;
    profitTotal += profit;
    revenueTotal += revenue;
    cogsTotal += cost;
  }

  const auditEvent = createAuditEvent(
    state.counters, "ITEM", itemId, "SALE",
    null, { quantity, sellingPrice, profit: Number(profitTotal.toFixed(2)) },
    null, `Sold ${quantity} units @ ${sellingPrice.toFixed(2)}`
  );

  return {
    newState: {
      ...state,
      batches: batchUpdates,
      sales: [...state.sales, ...salesToAdd],
      editHistory: [auditEvent, ...state.editHistory],
      counters: {
        ...state.counters,
        saleId: state.counters.saleId + salesToAdd.length,
        editId: state.counters.editId + 1,
      },
    },
    saleDetails: {
      quantity, sellingPrice,
      revenue: Number(revenueTotal.toFixed(2)),
      cogs: Number(cogsTotal.toFixed(2)),
      profit: Number(profitTotal.toFixed(2)),
      fifoAllocation,
    },
  };
};
