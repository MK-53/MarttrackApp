import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEY, SCHEMA_VERSION } from "../constants/config";

const defaultState = {
  schemaVersion: SCHEMA_VERSION,
  items: [],
  batches: [],
  sales: [],
  editHistory: [],
  counters: { itemId: 1, batchId: 1, saleId: 1, editId: 1 },
  settings: { theme: "dark" },
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
  if (!state.schemaVersion || state.schemaVersion < SCHEMA_VERSION) {
    const migrated = {
      ...defaultState,
      ...state,
      schemaVersion: SCHEMA_VERSION,
      settings: state.settings || { theme: "dark" },
    };
    // Ensure items have 'active' flag
    migrated.items = migrated.items.map(item => ({
      ...item,
      active: item.active !== undefined ? item.active : true,
    }));
    return migrated;
  }
  return state;
};

export const clearAllData = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Clear failed", error);
  }
};
