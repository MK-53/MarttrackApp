import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateCOGS,
  calculateGrossProfit,
  calculateInventoryValue,
  calculateSalesRevenue,
  getSummary,
} from "./accounting.js";
import { processReturn } from "./returns.js";
import { previewSale, recordSale } from "./sales.js";
import { martTrackReducer } from "../state/martTrackReducer.js";

const createSale = () => ({
  id: 7,
  item_id: 3,
  batch_id: 11,
  qty_sold: 5,
  sale_price: 12.5,
  cost_at_sale: 7,
  revenue: 62.5,
  cogs: 35,
  profit: 27.5,
  timestamp: "2026-09-06T12:00:00.000Z",
});

const createState = () => ({
  batches: [
    {
      id: 11,
      item_id: 3,
      initial_qty: 10,
      qty_remaining: 5,
      cost_per_unit: 7,
      timestamp: "2026-09-01T12:00:00.000Z",
    },
  ],
  sales: [createSale()],
  editHistory: [],
  counters: { itemId: 1, batchId: 12, saleId: 8, editId: 4 },
});

const summaryFor = state => {
  const summary = getSummary(state);
  return {
    revenue: calculateSalesRevenue(state.sales),
    cogs: calculateCOGS(state.sales),
    profit: calculateGrossProfit(state.sales),
    inventoryValue: calculateInventoryValue(state.batches),
    ...summary,
  };
};

const assertRejectedReturnLeavesStateUnchanged = (state, payload, message) => {
  const stateBeforeReturn = structuredClone(state);

  assert.throws(() => processReturn(state, payload), {
    name: "Error",
    message,
  });
  assert.deepEqual(state.sales, stateBeforeReturn.sales);
  assert.deepEqual(state.batches, stateBeforeReturn.batches);
  assert.deepEqual(state.editHistory, stateBeforeReturn.editHistory);
  assert.deepEqual(state.counters, stateBeforeReturn.counters);
};

const assertRejectedReturnDispatchLeavesStateUnchanged = (state, payload, message) => {
  const stateBeforeReturn = structuredClone(state);

  const result = martTrackReducer(state, { type: "PROCESS_RETURN", payload });
  assert.equal(result.lastActionError, message);
  assert.deepEqual(state.sales, stateBeforeReturn.sales);
  assert.deepEqual(state.batches, stateBeforeReturn.batches);
  assert.deepEqual(state.editHistory, stateBeforeReturn.editHistory);
  assert.deepEqual(state.counters, stateBeforeReturn.counters);
};

const createMultiBatchSale = () => {
  const state = {
    items: [
      {
        id: 3,
        item_name: "Coffee beans",
        target_price_per_unit: 15,
        sell_unit_type: "bag",
        active: true,
      },
    ],
    batches: [
      {
        id: 11,
        item_id: 3,
        initial_qty: 3,
        qty_remaining: 3,
        cost_per_unit: 7,
        timestamp: "2026-09-01T12:00:00.000Z",
      },
      {
        id: 12,
        item_id: 3,
        initial_qty: 4,
        qty_remaining: 4,
        cost_per_unit: 9,
        timestamp: "2026-09-02T12:00:00.000Z",
      },
    ],
    sales: [],
    editHistory: [],
    counters: { itemId: 4, batchId: 13, saleId: 7, editId: 4 },
  };

  const sale = recordSale(state, {
    itemId: 3,
    quantity: 5,
    sellingPrice: 15,
  });

  return sale.newState;
};

const auditSnapshot = audit => ({
  ...audit,
  timestamp: null,
});

test("partial return restores inventory and recalculates sale totals", () => {
  const state = createState();
  const saleBeforeReturn = createSale();

  const result = processReturn(state, {
    saleId: saleBeforeReturn.id,
    returnQty: 2,
    reason: "Damaged packaging",
  });

  assert.deepEqual(result.returnDetails, {
    saleId: 7,
    returnQty: 2,
    refundAmount: 25,
    reason: "Damaged packaging",
  });
  assert.equal(result.newState.batches[0].qty_remaining, 7);
  assert.deepEqual(result.newState.sales, [
    {
      ...saleBeforeReturn,
      qty_sold: 3,
      revenue: 37.5,
      cogs: 21,
      profit: 16.5,
    },
  ]);
  assert.deepEqual(summaryFor(result.newState), {
    totalInvestment: 70,
    salesRevenue: 37.5,
    cogs: 21,
    grossProfit: 16.5,
    inventoryValue: 49,
    roi: (16.5 / 70) * 100,
    revenue: 37.5,
    profit: 16.5,
  });

  assert.equal(result.newState.editHistory.length, 1);
  assert.deepEqual(result.newState.editHistory[0], {
    id: 4,
    entityType: "SALE",
    entityId: 7,
    action: "RETURN",
    before: saleBeforeReturn,
    after: result.newState.sales[0],
    reason: "Damaged packaging",
    details: "Returned 2 units for sale 7. Reason: Damaged packaging",
    timestamp: result.newState.editHistory[0].timestamp,
  });
  assert.equal(result.newState.counters.editId, 5);
});

test("returns each FIFO-backed sale to its original batch and preserves accounting snapshots", () => {
  const stateAfterSale = createMultiBatchSale();

  assert.deepEqual(
    stateAfterSale.batches.map(({ id, qty_remaining }) => ({ id, qty_remaining })),
    [
      { id: 11, qty_remaining: 0 },
      { id: 12, qty_remaining: 2 },
    ],
  );
  assert.deepEqual(
    stateAfterSale.sales.map(({ id, batch_id, qty_sold, cost_at_sale, revenue, cogs, profit }) => ({
      id,
      batch_id,
      qty_sold,
      cost_at_sale,
      revenue,
      cogs,
      profit,
    })),
    [
      {
        id: 7,
        batch_id: 11,
        qty_sold: 3,
        cost_at_sale: 7,
        revenue: 45,
        cogs: 21,
        profit: 24,
      },
      {
        id: 8,
        batch_id: 12,
        qty_sold: 2,
        cost_at_sale: 9,
        revenue: 30,
        cogs: 18,
        profit: 12,
      },
    ],
  );
  assert.deepEqual(summaryFor(stateAfterSale), {
    totalInvestment: 57,
    salesRevenue: 75,
    cogs: 39,
    grossProfit: 36,
    inventoryValue: 18,
    roi: (36 / 57) * 100,
    revenue: 75,
    profit: 36,
  });

  const saleFromFirstBatch = stateAfterSale.sales[0];
  const firstReturn = processReturn(stateAfterSale, {
    saleId: saleFromFirstBatch.id,
    returnQty: saleFromFirstBatch.qty_sold,
    reason: "First batch return",
  });

  assert.deepEqual(firstReturn.returnDetails, {
    saleId: 7,
    returnQty: 3,
    refundAmount: 45,
    reason: "First batch return",
  });
  assert.deepEqual(
    firstReturn.newState.batches.map(({ id, qty_remaining }) => ({ id, qty_remaining })),
    [
      { id: 11, qty_remaining: 3 },
      { id: 12, qty_remaining: 2 },
    ],
  );
  assert.deepEqual(summaryFor(firstReturn.newState), {
    totalInvestment: 57,
    salesRevenue: 30,
    cogs: 18,
    grossProfit: 12,
    inventoryValue: 39,
    roi: (12 / 57) * 100,
    revenue: 30,
    profit: 12,
  });
  assert.deepEqual(auditSnapshot(firstReturn.newState.editHistory[0]), {
    id: 5,
    entityType: "SALE",
    entityId: 7,
    action: "RETURN",
    before: saleFromFirstBatch,
    after: null,
    reason: "First batch return",
    details: "Returned 3 units for sale 7. Reason: First batch return",
    timestamp: null,
  });

  const saleFromSecondBatch = firstReturn.newState.sales[0];
  const secondReturn = processReturn(firstReturn.newState, {
    saleId: saleFromSecondBatch.id,
    returnQty: saleFromSecondBatch.qty_sold,
    reason: "Second batch return",
  });

  assert.deepEqual(secondReturn.returnDetails, {
    saleId: 8,
    returnQty: 2,
    refundAmount: 30,
    reason: "Second batch return",
  });
  assert.deepEqual(
    secondReturn.newState.batches.map(({ id, qty_remaining }) => ({ id, qty_remaining })),
    [
      { id: 11, qty_remaining: 3 },
      { id: 12, qty_remaining: 4 },
    ],
  );
  assert.deepEqual(secondReturn.newState.sales, []);
  assert.deepEqual(summaryFor(secondReturn.newState), {
    totalInvestment: 57,
    salesRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    inventoryValue: 57,
    roi: 0,
    revenue: 0,
    profit: 0,
  });
  assert.deepEqual(auditSnapshot(secondReturn.newState.editHistory[0]), {
    id: 6,
    entityType: "SALE",
    entityId: 8,
    action: "RETURN",
    before: saleFromSecondBatch,
    after: null,
    reason: "Second batch return",
    details: "Returned 2 units for sale 8. Reason: Second batch return",
    timestamp: null,
  });
});

test("full return restores all inventory and removes the sale from totals", () => {
  const state = createState();
  const saleBeforeReturn = createSale();

  const result = processReturn(state, {
    saleId: saleBeforeReturn.id,
    returnQty: 5,
    reason: "Customer changed their mind",
  });

  assert.deepEqual(result.returnDetails, {
    saleId: 7,
    returnQty: 5,
    refundAmount: 62.5,
    reason: "Customer changed their mind",
  });
  assert.equal(result.newState.batches[0].qty_remaining, 10);
  assert.deepEqual(result.newState.sales, []);
  assert.deepEqual(summaryFor(result.newState), {
    totalInvestment: 70,
    salesRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    inventoryValue: 70,
    roi: 0,
    revenue: 0,
    profit: 0,
  });

  assert.equal(result.newState.editHistory.length, 1);
  assert.deepEqual(result.newState.editHistory[0], {
    id: 4,
    entityType: "SALE",
    entityId: 7,
    action: "RETURN",
    before: saleBeforeReturn,
    after: null,
    reason: "Customer changed their mind",
    details: "Returned 5 units for sale 7. Reason: Customer changed their mind",
    timestamp: result.newState.editHistory[0].timestamp,
  });
  assert.equal(result.newState.counters.editId, 5);
});

test("rejects returns for unknown sales without changing state", () => {
  const state = createState();

  assertRejectedReturnLeavesStateUnchanged(
    state,
    { saleId: 999, returnQty: 1, reason: "Unknown sale" },
    "Sale not found",
  );
});

test("rejects returns when the original batch is missing without changing state", () => {
  const state = createState();
  state.batches = [];

  assertRejectedReturnLeavesStateUnchanged(
    state,
    { saleId: 7, returnQty: 1, reason: "Missing batch" },
    "Original batch not found",
  );
});

test("rejects returns above the sold quantity without changing state", () => {
  const state = createState();

  assertRejectedReturnLeavesStateUnchanged(
    state,
    { saleId: 7, returnQty: 6, reason: "Too many units" },
    "Return cannot exceed sold amount (5)",
  );
});

test("reducer rejects returns for unknown sales without changing saved state", () => {
  const state = createState();

  assertRejectedReturnDispatchLeavesStateUnchanged(
    state,
    { saleId: 999, returnQty: 1, reason: "Unknown sale" },
    "Sale not found",
  );
});

test("reducer rejects returns when the original batch is missing without changing saved state", () => {
  const state = createState();
  state.batches = [];

  assertRejectedReturnDispatchLeavesStateUnchanged(
    state,
    { saleId: 7, returnQty: 1, reason: "Missing batch" },
    "Original batch not found",
  );
});

test("reducer rejects returns above the sold quantity without changing saved state", () => {
  const state = createState();

  assertRejectedReturnDispatchLeavesStateUnchanged(
    state,
    { saleId: 7, returnQty: 6, reason: "Too many units" },
    "Return cannot exceed sold amount (5)",
  );
});

test("reducer returns domain failures as data without changing saved state", () => {
  const state = createState();
  const stateBeforeSale = structuredClone(state);

  const result = martTrackReducer(state, {
    type: "RECORD_SALE",
    payload: { itemId: 3, quantity: -1, sellingPrice: 10 },
  });

  assert.equal(result.lastActionError, "Quantity must be a positive number");
  assert.deepEqual(result.sales, stateBeforeSale.sales);
  assert.deepEqual(result.batches, stateBeforeSale.batches);
  assert.deepEqual(result.editHistory, stateBeforeSale.editHistory);
  assert.deepEqual(result.counters, stateBeforeSale.counters);
});

test("sales domain rejects invalid quantities and prices before changing state", () => {
  const state = createMultiBatchSale();

  for (const quantity of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => previewSale(state, 3, quantity, 12),
      { message: "Quantity must be a positive number" },
    );
    assert.throws(
      () => recordSale(state, { itemId: 3, quantity, sellingPrice: 12 }),
      { message: "Quantity must be a positive number" },
    );
  }

  for (const sellingPrice of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => previewSale(state, 3, 1, sellingPrice),
      { message: "Selling price cannot be negative" },
    );
    assert.throws(
      () => recordSale(state, { itemId: 3, quantity: 1, sellingPrice }),
      { message: "Selling price cannot be negative" },
    );
  }
});

test("weight-based sales accept fractional quantities", () => {
  const state = createMultiBatchSale();
  state.items[0].sell_unit_type = "kg";

  const preview = previewSale(state, 3, 1.5, 12);
  assert.equal(preview.quantity, 1.5);
  assert.equal(preview.stockRemaining, 0.5);

  const result = recordSale(state, {
    itemId: 3,
    quantity: 1.5,
    sellingPrice: 12,
  });
  assert.equal(result.saleDetails.quantity, 1.5);
  assert.equal(result.newState.batches[0].qty_remaining, 0);
  assert.equal(result.newState.batches[1].qty_remaining, 0.5);
});

for (const [label, returnQty] of [
  ["zero", 0],
  ["negative", -1],
  ["fractional", 1.5],
  ["non-numeric", "not a number"],
]) {
  test(`rejects ${label} return quantities without changing state`, () => {
    const state = createState();
    const stateBeforeReturn = structuredClone(state);

    assert.throws(
      () => processReturn(state, { saleId: 7, returnQty, reason: "Invalid input" }),
      {
        name: "Error",
        message: label === "fractional"
          ? "Return quantity must be a whole number greater than zero"
          : "Return quantity must be greater than zero",
      },
    );
    assert.deepEqual(state, stateBeforeReturn);
  });
}