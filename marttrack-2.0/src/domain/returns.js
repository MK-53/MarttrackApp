import { createAuditEvent } from "./audit";

export const processReturn = (state, payload) => {
  const { saleId, returnQty, reason } = payload;

  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) throw new Error("Sale not found");

  if (returnQty > sale.qty_sold)
    throw new Error(`Return cannot exceed sold amount (${sale.qty_sold})`);

  const batchIndex = state.batches.findIndex(b => b.id === sale.batch_id);
  if (batchIndex < 0) throw new Error("Original batch not found");

  const updatedBatches = [...state.batches];
  updatedBatches[batchIndex] = {
    ...updatedBatches[batchIndex],
    qty_remaining: updatedBatches[batchIndex].qty_remaining + returnQty,
  };

  const refundAmount = sale.sale_price * returnQty;

  const updatedSales = state.sales
    .map(item => {
      if (item.id !== sale.id) return item;
      const remainingSold = item.qty_sold - returnQty;
      if (remainingSold <= 0) return null;
      return {
        ...item,
        qty_sold: remainingSold,
        profit: Number(((item.sale_price - item.cost_at_sale) * remainingSold).toFixed(2)),
      };
    })
    .filter(Boolean);

  const auditEvent = createAuditEvent(
    state.counters, "SALE", sale.id, "RETURN",
    sale, { ...sale, returnQty, refundAmount },
    reason, `Returned ${returnQty} units for sale ${sale.id}. Reason: ${reason || "n/a"}`
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
      saleId, returnQty,
      refundAmount: Number(refundAmount.toFixed(2)),
      reason,
    },
  };
};
