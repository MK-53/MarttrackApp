const PRIVATE_FIELDS = new Set([
  "cost",
  "cost_at_sale",
  "cost_per_unit",
  "costPerUnit",
  "cogs",
  "profit",
  "profitDelta",
  "profitTotal",
  "totalCost",
  "total_cost",
]);

const redactPrivateFields = value => {
  if (Array.isArray(value)) return value.map(redactPrivateFields);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PRIVATE_FIELDS.has(key))
      .map(([key, nested]) => [key, redactPrivateFields(nested)]),
  );
};

export const filterState = (state, role) => {
  if (role === "owner") return JSON.parse(JSON.stringify(state));

  const safeState = redactPrivateFields(state);
  return {
    ...safeState,
    // Sellers need stock levels to sell, but don't receive financial history,
    // supplier quotes, or audit records through the state endpoint.
    sales: [],
    suppliers: [],
    editHistory: [],
  };
};
