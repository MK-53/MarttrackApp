import assert from "node:assert/strict";
import { test } from "node:test";

import { editBatch } from "./inventory.js";
import { martTrackReducer } from "../state/martTrackReducer.js";

const createState = () => ({
  items: [{ id: 1, item_name: "Rice", target_price_per_unit: 15, sell_unit_type: "kg" }],
  batches: [
    { id: 7, item_id: 1, initial_qty: 10, qty_remaining: 5, cost_per_unit: 10, timestamp: "2026-01-01T00:00:00.000Z" },
    { id: 8, item_id: 1, initial_qty: 4, qty_remaining: 4, cost_per_unit: 12, timestamp: "2026-02-01T00:00:00.000Z" },
  ],
  sales: [
    {
      id: 1,
      item_id: 1,
      batch_id: 7,
      qty_sold: 5,
      sale_price: 20,
      cost_at_sale: 10,
      cogs: 50,
      profit: 50,
    },
    {
      id: 2,
      item_id: 1,
      batch_id: 8,
      qty_sold: 1,
      sale_price: 20,
      cost_at_sale: 12,
      cogs: 12,
      profit: 8,
    },
  ],
  editHistory: [],
  counters: { itemId: 2, batchId: 9, saleId: 3, editId: 4 },
});

test("corrects a batch without changing past sale records by default", () => {
  const result = editBatch(createState(), {
    batchId: 7,
    newQuantity: 12,
    newTotalCost: 96,
    reason: "Supplier invoice typo",
  });

  assert.equal(result.batches[0].cost_per_unit, 8);
  assert.equal(result.batches[0].qty_remaining, 7);
  assert.equal(result.sales[0].cost_at_sale, 10);
  assert.equal(result.sales[0].profit, 50);
  assert.equal(result.editHistory[0].action, "EDIT_BATCH");
  assert.equal(result.editHistory[0].after.affectedSalesCount, 0);
  assert.match(result.editHistory[0].details, /Corrected batch #7/);
});

test("restates only sales allocated to the corrected batch", () => {
  const result = editBatch(createState(), {
    batchId: 7,
    newQuantity: 12,
    newTotalCost: 96,
    reason: "Supplier invoice typo",
    recalculatePastSales: true,
  });

  assert.equal(result.sales[0].cost_at_sale, 8);
  assert.equal(result.sales[0].cogs, 40);
  assert.equal(result.sales[0].profit, 60);
  assert.equal(result.sales[0].restated, true);
  assert.equal(result.sales[1].cost_at_sale, 12);
  assert.equal(result.sales[1].profit, 8);
  assert.equal(result.editHistory[0].after.affectedSalesCount, 1);
  assert.equal(result.editHistory[0].after.profitDelta, 10);
  assert.match(result.editHistory[0].details, /restated 1 past sale/);
});

test("rejects reducing a batch below its already-sold quantity", () => {
  assert.throws(
    () => editBatch(createState(), {
      batchId: 7,
      newQuantity: 4,
      newTotalCost: 96,
      reason: "Correction",
    }),
    { message: "Can't set quantity below 5 — that much has already been sold from this batch" },
  );
});

test("requires a reason for batch corrections and exposes reducer errors safely", () => {
  const state = createState();
  const result = martTrackReducer(state, {
    type: "EDIT_BATCH",
    payload: { batchId: 7, newQuantity: 12, newTotalCost: 96 },
  });

  assert.equal(result.lastActionError, "A reason is required to edit a batch");
  assert.deepEqual(result.batches, state.batches);
  assert.deepEqual(result.sales, state.sales);
});