import { now } from "../utils/dates.js";
import { NIGERIA_FESTIVALS_2026 } from "../constants/festivals.js";

const bucketKey = (isoTimestamp, granularity) => {
  const date = new Date(isoTimestamp);
  if (granularity === "day") return date.toISOString().slice(0, 10);
  if (granularity === "month") return date.toISOString().slice(0, 7);

  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
};

export const getSalesTrend = (state, granularity = "day") => {
  const buckets = {};

  for (const sale of state.sales) {
    const key = bucketKey(sale.timestamp, granularity);
    buckets[key] ??= { revenue: 0, cogs: 0, profit: 0, unitsSold: 0 };
    buckets[key].revenue += sale.revenue ?? sale.sale_price * sale.qty_sold;
    buckets[key].cogs += sale.cogs ?? sale.cost_at_sale * sale.qty_sold;
    buckets[key].profit += sale.profit;
    buckets[key].unitsSold += sale.qty_sold;
  }

  return Object.entries(buckets)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([period, totals]) => ({ period, ...totals }));
};

export const getTopAndBottomItems = (state, limit = 5) => {
  const byItem = {};

  for (const sale of state.sales) {
    byItem[sale.item_id] ??= { revenue: 0, profit: 0, unitsSold: 0 };
    byItem[sale.item_id].revenue += sale.revenue ?? sale.sale_price * sale.qty_sold;
    byItem[sale.item_id].profit += sale.profit;
    byItem[sale.item_id].unitsSold += sale.qty_sold;
  }

  const ranked = Object.entries(byItem)
    .map(([itemId, totals]) => ({
      itemId: Number(itemId),
      itemName: state.items.find(item => item.id === Number(itemId))?.item_name ?? "Unknown",
      ...totals,
    }))
    .sort((first, second) => second.profit - first.profit);

  return {
    topSellers: ranked.slice(0, limit),
    slowMovers: ranked.slice(-limit).reverse(),
  };
};

export const getStockHealth = (state) => {
  return state.items
    .map(item => {
      const batches = state.batches
        .filter(batch => batch.item_id === item.id && batch.qty_remaining > 0)
        .sort((first, second) => new Date(first.timestamp) - new Date(second.timestamp));
      const stockOnHand = batches.reduce((sum, batch) => sum + batch.qty_remaining, 0);
      const oldestBatch = batches[0];
      const daysInStock = oldestBatch
        ? Math.floor((new Date(now()) - new Date(oldestBatch.timestamp)) / 86400000)
        : 0;

      return { itemId: item.id, itemName: item.item_name, stockOnHand, daysInStock };
    })
    .filter(item => item.stockOnHand > 0);
};

export const getUpcomingFestivalWindow = (
  referenceDateIso = new Date().toISOString(),
) => {
  const today = new Date(referenceDateIso);

  for (const festival of NIGERIA_FESTIVALS_2026) {
    const festivalDate = new Date(festival.date);
    const windowStart = new Date(festivalDate);
    windowStart.setDate(festivalDate.getDate() - festival.leadDays);

    if (today >= windowStart && today <= festivalDate) {
      return {
        ...festival,
        daysUntil: Math.ceil((festivalDate - today) / 86400000),
      };
    }
  }

  return null;
};

export const getFestivalHistoricalLift = (state, festivalName, itemId) => {
  const lastYearSales = state.sales.filter(sale =>
    sale.item_id === itemId &&
    new Date(sale.timestamp).getFullYear() === new Date().getFullYear() - 1,
  );
  const unitsLastYear = lastYearSales.reduce((sum, sale) => sum + sale.qty_sold, 0);

  return { festivalName, itemId, unitsLastYear };
};