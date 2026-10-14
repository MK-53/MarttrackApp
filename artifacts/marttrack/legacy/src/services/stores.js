import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { STORAGE_KEY } from "../constants/config.js";

const STORES_KEY = "@marttrack_stores";
const ACTIVE_STORE_KEY = "@marttrack_active_store";
const LEGACY_STORE_ID = "local-my-shop";
const TOKEN_KEY_PREFIX = "@marttrack_access_token_";

const readRegistry = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(store => store?.id && store?.name) : [];
  } catch {
    return [];
  }
};

const writeRegistry = stores => AsyncStorage.setItem(STORES_KEY, JSON.stringify(stores));

export const ensureStoreRegistry = async () => {
  let stores = await readRegistry();
  if (!stores.some(store => store.id === LEGACY_STORE_ID)) {
    stores = [
      {
        id: LEGACY_STORE_ID,
        name: "My shop",
        role: "owner",
        location: "device",
        serverUrl: null,
        createdAt: new Date().toISOString(),
      },
      ...stores,
    ];
    await writeRegistry(stores);
  }

  let activeStoreId = await AsyncStorage.getItem(ACTIVE_STORE_KEY);
  if (!stores.some(store => store.id === activeStoreId)) {
    activeStoreId = LEGACY_STORE_ID;
    await AsyncStorage.setItem(ACTIVE_STORE_KEY, activeStoreId);
  }

  return { stores, activeStoreId };
};

export const getStoreDataKey = store =>
  store?.id === LEGACY_STORE_ID && store.location === "device"
    ? STORAGE_KEY
    : `@marttrack_store_${store?.id || LEGACY_STORE_ID}`;

export const createLocalStore = async ({ name, ownerName = "" }) => {
  const store = {
    id: `local-${Crypto.randomUUID()}`,
    name: name.trim(),
    ownerName: ownerName.trim(),
    role: "owner",
    location: "device",
    serverUrl: null,
    createdAt: new Date().toISOString(),
  };
  const stores = await readRegistry();
  await writeRegistry([...stores, store]);
  await AsyncStorage.setItem(ACTIVE_STORE_KEY, store.id);
  return store;
};

export const addRemoteStore = async store => {
  const stores = await readRegistry();
  const existing = stores.findIndex(item => item.id === store.id);
  const next = [...stores];
  if (existing >= 0) next[existing] = { ...next[existing], ...store };
  else next.push(store);
  await writeRegistry(next);
};

export const setActiveStoreId = async storeId => {
  const stores = await readRegistry();
  if (!stores.some(store => store.id === storeId)) {
    throw new Error("That store is no longer on this device");
  }
  await AsyncStorage.setItem(ACTIVE_STORE_KEY, storeId);
  return stores.find(store => store.id === storeId);
};

export const removeStore = async storeId => {
  if (storeId === LEGACY_STORE_ID) {
    throw new Error("The original My shop store cannot be removed");
  }
  const stores = await readRegistry();
  await writeRegistry(stores.filter(store => store.id !== storeId));
  await AsyncStorage.removeItem(`@marttrack_store_${storeId}`);
  await deleteStoreAccessToken(storeId);
  const activeStoreId = await AsyncStorage.getItem(ACTIVE_STORE_KEY);
  if (activeStoreId === storeId) {
    await AsyncStorage.setItem(ACTIVE_STORE_KEY, LEGACY_STORE_ID);
  }
};

const secureTokenSet = async (key, value) => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // SecureStore is unavailable on web; keep tokens local to this browser.
    await AsyncStorage.setItem(key, value);
  }
};

const secureTokenGet = async key => {
  try {
    const value = await SecureStore.getItemAsync(key);
    if (value) return value;
  } catch {
    // Fall through to the web storage used by the browser build.
  }
  return AsyncStorage.getItem(key);
};

export const setStoreAccessToken = (storeId, token) =>
  secureTokenSet(`${TOKEN_KEY_PREFIX}${storeId}`, token);

export const getStoreAccessToken = storeId =>
  secureTokenGet(`${TOKEN_KEY_PREFIX}${storeId}`);

export const deleteStoreAccessToken = async storeId => {
  const key = `${TOKEN_KEY_PREFIX}${storeId}`;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // SecureStore is unavailable on web.
  }
  await AsyncStorage.removeItem(key);
};

export const getStoreList = readRegistry;
export const getLegacyStoreId = () => LEGACY_STORE_ID;
