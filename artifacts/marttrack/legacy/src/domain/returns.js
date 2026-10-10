import { createAuditEvent } from "./audit.js";
import { isWeightBasedUnit } from "../utils/validation.js";

export const processReturn = (state, payload) => {
  const { saleId, returnQty, reason } = payload;

  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) throw new Error("Sale not found");

  const normalizedReturnQty = Number(returnQty);
  const item = state.items?.find(candidate => candidate.id === sale.item_id);
  const allowsFractions = isWeightBasedUnit(item?.sell_unit_type);
  if (!Number.isFinite(normalizedReturnQty) || normalizedReturnQty <= 0)
    throw new Error("Return quantity must be greater than zero");
  if (!allowsFractions && !Number.isInteger(normalizedReturnQty))
    throw new Error("Return quantity must be a whole number greater than zero");

  if (normalizedReturnQty > sale.qty_sold)
    throw new Error(`Return cannot exceed sold amount (${sale.qty_sold})`);

  const batchIndex = state.batches.findIndex(b => b.id === sale.batch_id);
  if (batchIndex < 0) throw new Error("Original batch not found");

  const updatedBatches = [...state.batches];
  updatedBatches[batchIndex] = {
    ...updatedBatches[batchIndex],
    qty_remaining: updatedBatches[batchIndex].qty_remaining + normalizedReturnQty,
  };

  const refundAmount = Number((sale.sale_price * normalizedReturnQty).toFixed(2));

  const remainingSold = sale.qty_sold - normalizedReturnQty;
  const updatedSale = remainingSold <= 0
    ? null
    : {
        ...sale,
        qty_sold: remainingSold,
        revenue: Number((sale.sale_price * remainingSold).toFixed(2)),
        cogs: Number((sale.cost_at_sale * remainingSold).toFixed(2)),
        profit: Number(((sale.sale_price - sale.cost_at_sale) * remainingSold).toFixed(2)),
      };

  const updatedSales = state.sales
    .map(item => {
      if (item.id !== sale.id) return item;
      return updatedSale;
    })
    .filter(Boolean);

  const auditEvent = createAuditEvent(
    state.counters, "SALE", sale.id, "RETURN",
    sale, updatedSale,
    reason, `Returned ${normalizedReturnQty} units for sale ${sale.id}. Reason: ${reason || "n/a"}`
  );

  return {
    newState: {
      ...state,
      batches: updatedBatches,
      sales: updatedSales,
      editHistory: [auditEvent, ...state.editHistory],
      counters: { ...state.counters, editId: state.counters.editId + 1 },
    },
    returnDetails: {
      saleId, returnQty: normalizedReturnQty,
      refundAmount,
      reason,
    },
  };
};
