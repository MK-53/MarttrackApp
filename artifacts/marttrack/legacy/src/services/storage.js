import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEY, SCHEMA_VERSION } from "../constants/config.js";

const defaultState = {
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

export const getDefaultState = () => ({ ...defaultState });

export const loadData = async () => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return migrateState(parsed);
    }
    return defaultState;
  } catch (error) {
    console.warn("Load failed", error);
    return defaultState;
  }
};

export const saveData = async (data) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Save failed", error);
  }
};

const migrateState = (state) => {
  const migrated = {
    ...defaultState,
    ...state,
    schemaVersion: SCHEMA_VERSION,
    settings: { ...defaultState.settings, ...(state.settings || {}) },
    suppliers: state.suppliers || [],
    counters: {
      ...defaultState.counters,
      ...(state.counters || {}),
      supplierId: state.counters?.supplierId || defaultState.counters.supplierId,
    },
    lastActionError: null,
  };

  // Restore goods from the old archive model as regular editable goods.
  migrated.items = (state.items || []).map(({ active: _active, archived: _archived, ...item }) => item);
  migrated.editHistory = (state.editHistory || []).filter(
    event => event.action !== "ARCHIVE_ITEM",
  );
  return migrated;
};

export const clearAllData = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Clear failed", error);
  }
};
