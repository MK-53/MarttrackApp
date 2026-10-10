export const calculateGrossProfit = (sales) => {
  return sales.reduce((total, sale) => total + sale.profit, 0);
};

export const calculateSalesRevenue = (sales) => {
  return sales.reduce((total, sale) =>
    total + (sale.revenue || sale.sale_price * sale.qty_sold), 0
  );
};

export const calculateCOGS = (sales) => {
  return sales.reduce((total, sale) =>
    total + (sale.cogs || sale.cost_at_sale * sale.qty_sold), 0
  );
};

export const calculateInventoryInvestment = (batches) => {
  return batches.reduce((sum, batch) =>
    sum + batch.initial_qty * batch.cost_per_unit, 0
  );
};

export const calculateInventoryValue = (batches) => {
  return batches.reduce((sum, batch) =>
    sum + batch.qty_remaining * batch.cost_per_unit, 0
  );
};

export const calculateROI = (investment, profit) => {
  return investment > 0 ? (profit / investment) * 100 : 0;
};

export const getSummary = (state) => {
  const totalInvestment = calculateInventoryInvestment(state.batches);
  const salesRevenue = calculateSalesRevenue(state.sales);
  const cogs = calculateCOGS(state.sales);
  const grossProfit = calculateGrossProfit(state.sales);
  const inventoryValue = calculateInventoryValue(state.batches);
  const roi = calculateROI(totalInvestment, grossProfit);

  return {
    totalInvestment,
    salesRevenue,
    cogs,
    grossProfit,
    inventoryValue,
    roi,
  };
};
