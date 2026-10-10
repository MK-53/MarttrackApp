import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addSupplierQuote,
  getSupplierRecommendations,
} from "./suppliers.js";
import { martTrackReducer } from "../state/martTrackReducer.js";

const createState = () => ({
  items: [
    { id: 1, item_name: "Rice" },
    { id: 2, item_name: "Sugar" },
  ],
  batches: [
    { item_id: 1, qty_remaining: 10, cost_per_unit: 10 },
    { item_id: 1, qty_remaining: 4, cost_per_unit: 14 },
    { item_id: 2, qty_remaining: 10, cost_per_unit: 5 },
  ],
  suppliers: [],
  counters: { itemId: 3, batchId: 1, saleId: 1, editId: 1, supplierId: 1 },
  lastActionError: null,
});

test("adds a manual supplier quote and increments its counter", () => {
  const result = addSupplierQuote(createState(), {
    itemId: 1,
    supplierName: "Amina Foods",
    quotedPrice: 8,
    contact: "0800 000 0000",
  });

  assert.deepEqual(result.suppliers[0], {
    id: 1,
    item_id: 1,
    supplier_name: "Amina Foods",
    contact: "0800 000 0000",
    quoted_price: 8,
    source: "manual",
    checked_at: result.suppliers[0].checked_at,
  });
  assert.equal(result.counters.supplierId, 2);
});

test("rejects missing supplier names and invalid quoted prices", () => {
  assert.throws(
    () => addSupplierQuote(createState(), { itemId: 1, supplierName: " ", quotedPrice: 8 }),
    { message: "Supplier name is required" },
  );
  assert.throws(
    () => addSupplierQuote(createState(), { itemId: 1, supplierName: "Amina Foods", quotedPrice: 0 }),
    { message: "Quoted price must be a positive number" },
  );
});

test("recommends the cheapest quote only when it saves money", () => {
  const state = createState();
  const withRiceQuote = addSupplierQuote(state, {
    itemId: 1,
    supplierName: "Amina Foods",
    quotedPrice: 8,
  });
  const withAllQuotes = addSupplierQuote(withRiceQuote, {
    itemId: 2,
    supplierName: "Sugar House",
    quotedPrice: 6,
  });

  assert.deepEqual(getSupplierRecommendations(withAllQuotes), [
    {
      itemId: 1,
      itemName: "Rice",
      currentCost: 12,
      supplier: "Amina Foods",
      quotedPrice: 8,
      savingsPct: 33.3,
      checkedAt: withAllQuotes.suppliers[0].checked_at,
    },
  ]);
});

test("adds supplier quotes through the reducer", () => {
  const result = martTrackReducer(createState(), {
    type: "ADD_SUPPLIER_QUOTE",
    payload: { itemId: 1, supplierName: "Amina Foods", quotedPrice: 8 },
  });

  assert.equal(result.lastActionError, null);
  assert.equal(result.suppliers[0].supplier_name, "Amina Foods");
  assert.equal(result.counters.supplierId, 2);
});