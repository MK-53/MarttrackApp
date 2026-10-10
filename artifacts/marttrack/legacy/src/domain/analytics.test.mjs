import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getFestivalHistoricalLift,
  getSalesTrend,
  getStockHealth,
  getTopAndBottomItems,
  getUpcomingFestivalWindow,
} from "./analytics.js";

const state = {
  items: [
    { id: 1, item_name: "Rice" },
    { id: 2, item_name: "Sugar" },
    { id: 3, item_name: "Empty item" },
  ],
  batches: [
    {
      id: 1,
      item_id: 1,
      qty_remaining: 10,
      cost_per_unit: 8,
      timestamp: "2026-01-01T12:00:00.000Z",
    },
    {
      id: 2,
      item_id: 2,
      qty_remaining: 0,
      cost_per_unit: 5,
      timestamp: "2026-01-02T12:00:00.000Z",
    },
  ],
  sales: [
    {
      item_id: 1,
      qty_sold: 5,
      sale_price: 12,
      revenue: 60,
      cogs: 40,
      profit: 20,
      timestamp: "2026-01-06T12:00:00.000Z",
    },
    {
      item_id: 1,
      qty_sold: 2,
      sale_price: 12,
      revenue: 24,
      cogs: 16,
      profit: 8,
      timestamp: "2026-01-07T12:00:00.000Z",
    },
    {
      item_id: 2,
      qty_sold: 10,
      sale_price: 7,
      revenue: 70,
      cogs: 50,
      profit: 20,
      timestamp: "2026-02-01T12:00:00.000Z",
    },
    {
      item_id: 1,
      qty_sold: 3,
      sale_price: 12,
      revenue: 36,
      cogs: 24,
      profit: 12,
      timestamp: "2025-10-01T12:00:00.000Z",
    },
  ],
};

test("groups sales into sorted day, week, and month buckets", () => {
  assert.deepEqual(getSalesTrend(state, "day").slice(0, 3), [
    { period: "2025-10-01", revenue: 36, cogs: 24, profit: 12, unitsSold: 3 },
    { period: "2026-01-06", revenue: 60, cogs: 40, profit: 20, unitsSold: 5 },
    { period: "2026-01-07", revenue: 24, cogs: 16, profit: 8, unitsSold: 2 },
  ]);

  assert.deepEqual(getSalesTrend(state, "week").slice(0, 2), [
    { period: "2025-09-29", revenue: 36, cogs: 24, profit: 12, unitsSold: 3 },
    { period: "2026-01-05", revenue: 84, cogs: 56, profit: 28, unitsSold: 7 },
  ]);

  assert.deepEqual(getSalesTrend(state, "month").slice(0, 2), [
    { period: "2025-10", revenue: 36, cogs: 24, profit: 12, unitsSold: 3 },
    { period: "2026-01", revenue: 84, cogs: 56, profit: 28, unitsSold: 7 },
  ]);
});

test("ranks top sellers and slow movers by profit", () => {
  const result = getTopAndBottomItems(state, 1);

  assert.equal(result.topSellers[0].itemName, "Rice");
  assert.equal(result.topSellers[0].profit, 40);
  assert.equal(result.slowMovers[0].itemName, "Sugar");
  assert.equal(result.slowMovers[0].profit, 20);
});

test("reports only items with stock on hand and their oldest stock age", () => {
  const result = getStockHealth(state);

  assert.equal(result.length, 1);
  assert.equal(result[0].itemName, "Rice");
  assert.equal(result[0].stockOnHand, 10);
  assert.ok(result[0].daysInStock >= 0);
});

test("finds a festival window and returns null outside it", () => {
  const window = getUpcomingFestivalWindow("2026-09-25T12:00:00.000Z");

  assert.deepEqual(window, {
    name: "Independence Day",
    date: "2026-10-01",
    leadDays: 10,
    daysUntil: 6,
  });
  assert.equal(getUpcomingFestivalWindow("2026-10-02T12:00:00.000Z"), null);
});

test("summarizes last year's units for an item", () => {
  assert.deepEqual(
    getFestivalHistoricalLift(state, "Independence Day", 1),
    { festivalName: "Independence Day", itemId: 1, unitsLastYear: 3 },
  );
});