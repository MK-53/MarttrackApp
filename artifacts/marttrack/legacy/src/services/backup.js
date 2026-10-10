import { loadData, saveData } from "./storage.js";

export const exportToJSON = async () => {
  const data = await loadData();
  return JSON.stringify(data, null, 2);
};

export const importFromJSON = async (jsonString) => {
  const data = JSON.parse(jsonString);
  if (!data.schemaVersion) {
    throw new Error("Invalid backup file: missing schema version");
  }
  await saveData(data);
  return data;
};

export const exportSalesToCSV = (sales, items) => {
  const header = "Sale ID,Item Name,Quantity,Sale Price,Cost,Profit,Date\n";
  const rows = sales.map(sale => {
    const item = items.find(i => i.id === sale.item_id);
    const name = item ? item.item_name : "Unknown";
    return `${sale.id},"${name}",${sale.qty_sold},${sale.sale_price.toFixed(2)},${sale.cost_at_sale.toFixed(2)},${sale.profit.toFixed(2)},${sale.timestamp}`;
  }).join("\n");
  return header + rows;
};

export const exportInventoryToCSV = (itemsWithStock) => {
  const header = "ID,Name,Unit Type,Target Price,Total In,In Stock,Avg Cost,Units Sold,Profit\n";
  const rows = itemsWithStock.map(item => {
    return `${item.id},"${item.item_name}",${item.sell_unit_type},${item.target_price_per_unit},${item.totalIn},${item.totalStock},${item.costPerUnit},${item.soldQty},${item.profit.toFixed(2)}`;
  }).join("\n");
  return header + rows;
};

export const exportPurchasesToCSV = (batches, items) => {
  const header = "Batch ID,Item Name,Quantity,Cost Per Unit,Total Cost,Date\n";
  const rows = batches.map(batch => {
    const item = items.find(i => i.id === batch.item_id);
    const name = item ? item.item_name : "Unknown";
    const total = (batch.initial_qty * batch.cost_per_unit).toFixed(2);
    return `${batch.id},"${name}",${batch.initial_qty},${batch.cost_per_unit.toFixed(2)},${total},${batch.timestamp}`;
  }).join("\n");
  return header + rows;
};
