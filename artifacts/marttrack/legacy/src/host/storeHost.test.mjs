import test from "node:test";
import assert from "node:assert/strict";
import { createStoreHost } from "./storeHost.js";

const createState = quantity => ({
  schemaVersion: 3,
  items: [{ id: 1, item_name: "Rice", target_price_per_unit: 4, sell_unit_type: "unit" }],
  batches: [{
    id: 1,
    item_id: 1,
    initial_qty: quantity,
    qty_remaining: quantity,
    cost_per_unit: 2,
    timestamp: "2026-01-01T00:00:00.000Z",
  }],
  sales: [],
  editHistory: [],
  suppliers: [],
  counters: { itemId: 2, batchId: 2, saleId: 1, editId: 1, supplierId: 1 },
  settings: { theme: "dark", aiProvider: "anthropic" },
  lastActionError: null,
});

const members = [
  { id: "owner-1", role: "owner" },
  { id: "seller-1", role: "seller" },
];

const saleAction = (memberId, actionId, quantity) => ({
  memberId,
  actionId,
  type: "RECORD_SALE",
  payload: { itemId: 1, quantity, sellingPrice: 4 },
});

test("two concurrent sales cannot both sell the last five units", async () => {
  const host = createStoreHost({ initialState: createState(5), members });
  const results = await Promise.all([
    host.submitAction(saleAction("seller-1", "parallel-sale-0001", 5)),
    host.submitAction(saleAction("owner-1", "parallel-sale-0002", 5)),
  ]);

  assert.equal(results.filter(result => result.ok).length, 1);
  assert.equal(results.filter(result => !result.ok).length, 1);
  assert.match(results.find(result => !result.ok).error, /Not enough stock/);
  assert.equal(host.version, 1);
});

test("fifty concurrent sales never oversell stock", async () => {
  const host = createStoreHost({ initialState: createState(25), members });
  const results = await Promise.all(
    Array.from({ length: 50 }, (_, index) =>
      host.submitAction(saleAction("seller-1", `parallel-sale-${String(index).padStart(4, "0")}`, 1)),
    ),
  );
  const snapshot = host.getSnapshot("owner-1");
  const successfulSales = results.filter(result => result.ok).length;
  const remaining = snapshot.state.batches.reduce((sum, batch) => sum + batch.qty_remaining, 0);
  const sold = snapshot.state.sales.reduce((sum, sale) => sum + sale.qty_sold, 0);

  assert.equal(successfulSales, 25);
  assert.equal(remaining, 0);
  assert.equal(sold + remaining, 25);
  assert.equal(host.version, 25);
});

test("retrying an actionId applies the sale only once", async () => {
  const host = createStoreHost({ initialState: createState(5), members });
  const action = saleAction("seller-1", "stable-action-id-0001", 2);
  const first = await host.submitAction(action);
  const retry = await host.submitAction(action);
  const snapshot = host.getSnapshot("owner-1");

  assert.equal(first.ok, true);
  assert.equal(retry.ok, true);
  assert.equal(retry.duplicate, true);
  assert.equal(snapshot.state.sales.reduce((sum, sale) => sum + sale.qty_sold, 0), 2);
  assert.equal(host.version, 1);
});

test("replaying a rejected actionId does not turn the rejection into a success", async () => {
  const host = createStoreHost({ initialState: createState(1), members });
  const action = saleAction("seller-1", "stable-failed-action-0001", 2);
  const first = await host.submitAction(action);
  const retry = await host.submitAction(action);

  assert.equal(first.ok, false);
  assert.equal(retry.ok, false);
  assert.match(retry.error, /Not enough stock/);
  assert.equal(host.version, 0);
});

test("seller actions cannot change stock", async () => {
  const host = createStoreHost({ initialState: createState(5), members });
  const result = await host.submitAction({
    memberId: "seller-1",
    actionId: "forbidden-action-0001",
    type: "ADD_STOCK",
    payload: {
      itemName: "Rice",
      itemId: 1,
      totalCost: 10,
      quantity: 2,
      isNewItem: false,
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /cannot perform ADD_STOCK/);
  assert.equal(host.version, 0);
});

test("seller snapshots contain no cost or profit fields", async () => {
  const host = createStoreHost({
    initialState: {
      ...createState(5),
      sales: [{
        id: 1,
        item_id: 1,
        batch_id: 1,
        qty_sold: 1,
        sale_price: 4,
        cost_at_sale: 2,
        profit: 2,
        revenue: 4,
        cogs: 2,
      }],
    },
    members,
  });
  const snapshot = host.getSnapshot("seller-1").state;
  const serialized = JSON.stringify(snapshot);

  assert.doesNotMatch(serialized, /cost_per_unit|cost_at_sale|profit|cogs/i);
  assert.deepEqual(snapshot.sales, []);
  assert.equal(snapshot.batches[0].qty_remaining, 5);
});

test("failed persistence does not commit state or increment version", async () => {
  const host = createStoreHost({
    initialState: createState(5),
    members,
    persist: async () => { throw new Error("disk unavailable"); },
  });
  const result = await host.submitAction(saleAction("seller-1", "persist-error-0001", 1));

  assert.equal(result.ok, false);
  assert.equal(result.error, "disk unavailable");
  assert.equal(host.version, 0);
  assert.equal(host.getSnapshot("owner-1").state.batches[0].qty_remaining, 5);
});
