import { addStock, editItem, archiveItem } from "../domain/inventory";
import { recordSale } from "../domain/sales";
import { processReturn } from "../domain/returns";
import { SCHEMA_VERSION } from "../constants/config";

export const defaultState = {
  schemaVersion: SCHEMA_VERSION,
  items: [],
  batches: [],
  sales: [],
  editHistory: [],
  counters: { itemId: 1, batchId: 1, saleId: 1, editId: 1 },
  settings: { theme: "dark" },
};

export function martTrackReducer(state, action) {
  switch (action.type) {
    case "ADD_STOCK":
      return addStock(state, action.payload);

    case "RECORD_SALE":
      return recordSale(state, action.payload).newState;

    case "PROCESS_RETURN":
      return processReturn(state, action.payload).newState;

    case "EDIT_ITEM":
      return editItem(state, action.payload);

    case "ARCHIVE_ITEM":
      return archiveItem(state, action.payload);

    case "LOAD_STATE":
      return action.payload;

    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.payload } };

    default:
      return state;
  }
}
