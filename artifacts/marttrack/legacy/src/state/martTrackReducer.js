import { addStock, editBatch, editItem } from "../domain/inventory.js";
import { recordSale } from "../domain/sales.js";
import { processReturn } from "../domain/returns.js";
import { addSupplierQuote } from "../domain/suppliers.js";
import { SCHEMA_VERSION } from "../constants/config.js";

export const defaultState = {
  schemaVersion: SCHEMA_VERSION,
  items: [],
  batches: [],
  sales: [],
  editHistory: [],
  suppliers: [],
  counters: { itemId: 1, batchId: 1, saleId: 1, editId: 1, supplierId: 1 },
  settings: { theme: "dark", aiProvider: "anthropic" },
  lastActionError: null,
};

export function martTrackReducer(state, action) {
  try {
    let nextState;
    switch (action.type) {
      case "ADD_STOCK":
        nextState = addStock(state, action.payload);
        break;

      case "EDIT_BATCH":
        nextState = editBatch(state, action.payload);
        break;

      case "RECORD_SALE":
        nextState = recordSale(state, action.payload).newState;
        break;

      case "PROCESS_RETURN":
        nextState = processReturn(state, action.payload).newState;
        break;

      case "EDIT_ITEM":
        nextState = editItem(state, action.payload);
        break;

      case "ADD_SUPPLIER_QUOTE":
        nextState = addSupplierQuote(state, action.payload);
        break;

      case "LOAD_STATE":
        nextState = action.payload;
        break;

      case "UPDATE_SETTINGS":
        nextState = { ...state, settings: { ...state.settings, ...action.payload } };
        break;

      case "CLEAR_ACTION_ERROR":
        nextState = state;
        break;

      default:
        nextState = state;
        break;
    }
    return { ...nextState, lastActionError: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Reducer rejected ${action?.type || "unknown action"}:`, message);
    return { ...state, lastActionError: message };
  }
}
