import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from "react";
import { martTrackReducer, defaultState } from "./martTrackReducer";
import { loadDataForStore, saveDataForStore } from "../services/storage";
import {
  ensureStoreRegistry,
  getStoreAccessToken,
  setActiveStoreId,
  getStoreList,
} from "../services/stores";
import { fetchStoreSnapshot, sendStoreAction } from "../services/storeClient";
import { DARK_COLORS, LIGHT_COLORS } from "../constants/colors";
import * as Crypto from "expo-crypto";

export const MartTrackContext = createContext(null);
const POLL_INTERVAL_MS = 3000;

export function MartTrackProvider({ children }) {
  const [state, reducerDispatch] = useReducer(martTrackReducer, defaultState);
  const [isLoading, setIsLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [activeStore, setActiveStore] = useState(null);
  const [registryReady, setRegistryReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("local");
  const [isDispatching, setIsDispatching] = useState(false);
  const stateRef = useRef(state);
  const versionRef = useRef(0);
  const activeStoreRef = useRef(activeStore);
  const connectionRef = useRef(connectionStatus);

  stateRef.current = state;
  activeStoreRef.current = activeStore;
  connectionRef.current = connectionStatus;

  useEffect(() => {
    let cancelled = false;
    const initializeRegistry = async () => {
      const registry = await ensureStoreRegistry();
      if (cancelled) return;
      setStores(registry.stores);
      setActiveStore(registry.stores.find(store => store.id === registry.activeStoreId) || null);
      setRegistryReady(true);
    };
    initializeRegistry().catch(error => {
      console.warn("Store registry could not be loaded", error);
      if (!cancelled) {
        setStores([]);
        setRegistryReady(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!registryReady || !activeStore) return undefined;
    let cancelled = false;
    setIsLoading(true);
    versionRef.current = 0;

    const loadActiveStore = async () => {
      let nextState = await loadDataForStore(activeStore);
      let nextConnection = activeStore.location === "device" ? "local" : "offline";

      if (activeStore.location !== "device") {
        try {
          const accessToken = await getStoreAccessToken(activeStore.id);
          if (!accessToken) throw new Error("This store is not connected on this device");
          const snapshot = await fetchStoreSnapshot(activeStore, accessToken);
          if (!snapshot.unchanged && snapshot.state) {
            nextState = snapshot.state;
            await saveDataForStore(nextState, activeStore);
          }
          versionRef.current = snapshot.version ?? 0;
          nextConnection = "connected";
        } catch (error) {
          console.warn("Store host is unavailable; opening the saved read-only snapshot", error);
        }
      }

      if (cancelled) return;
      setConnectionStatus(nextConnection);
      reducerDispatch({ type: "LOAD_STATE", payload: nextState });
      setIsLoading(false);
    };

    loadActiveStore().catch(error => {
      console.warn("Store data could not be loaded", error);
      if (!cancelled) {
        reducerDispatch({ type: "LOAD_STATE", payload: defaultState });
        setConnectionStatus(activeStore.location === "device" ? "local" : "offline");
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [registryReady, activeStore?.id]);

  useEffect(() => {
    if (isLoading || !activeStore) return;
    if (activeStore.location === "device" || connectionStatus === "connected") {
      saveDataForStore(state, activeStore).catch(error => {
        console.warn("Store snapshot could not be saved", error);
      });
    }
  }, [activeStore?.id, connectionStatus, isLoading, state]);

  useEffect(() => {
    if (isLoading || !activeStore || activeStore.location === "device") return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const accessToken = await getStoreAccessToken(activeStore.id);
        if (!accessToken) throw new Error("This store was disconnected from this device");
        const snapshot = await fetchStoreSnapshot(activeStore, accessToken, versionRef.current);
        if (cancelled || activeStoreRef.current?.id !== activeStore.id) return;
        if (!snapshot.unchanged && snapshot.state) {
          versionRef.current = snapshot.version ?? versionRef.current;
          reducerDispatch({ type: "LOAD_STATE", payload: snapshot.state });
          await saveDataForStore(snapshot.state, activeStore);
        } else if (Number.isInteger(snapshot.version)) {
          versionRef.current = snapshot.version;
        }
        setConnectionStatus("connected");
      } catch {
        if (!cancelled && activeStoreRef.current?.id === activeStore.id) {
          setConnectionStatus("offline");
        }
      }
    };
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeStore?.id, isLoading]);

  const switchStore = useCallback(async storeId => {
    const selected = await setActiveStoreId(storeId);
    const latestStores = await getStoreList();
    setStores(latestStores);
    setActiveStore(selected);
  }, []);

  const refreshStores = useCallback(async () => {
    const registry = await ensureStoreRegistry();
    setStores(registry.stores);
    const selected =
      registry.stores.find(store => store.id === activeStoreRef.current?.id) ||
      registry.stores.find(store => store.id === registry.activeStoreId);
    if (selected) setActiveStore(selected);
  }, []);

  const dispatch = async action => {
    if (activeStore?.location === "device") {
      reducerDispatch(action);
      return { ok: true };
    }

    if (connectionRef.current !== "connected") {
      reducerDispatch({
        type: "SET_ACTION_ERROR",
        payload: "Not connected to the store host. This saved copy is read-only.",
      });
      return { ok: false };
    }

    setIsDispatching(true);
    reducerDispatch({ type: "CLEAR_ACTION_ERROR" });
    try {
      const accessToken = await getStoreAccessToken(activeStore.id);
      if (!accessToken) throw new Error("This store is not connected on this device");
      const result = await sendStoreAction(activeStore, accessToken, {
        actionId: Crypto.randomUUID(),
        type: action.type,
        payload: action.payload ?? {},
      });
      if (!result.ok) throw new Error(result.error || "The store rejected this action");
      versionRef.current = result.version ?? versionRef.current;
      if (result.state) reducerDispatch({ type: "LOAD_STATE", payload: result.state });
      setConnectionStatus("connected");
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Store action failed";
      reducerDispatch({ type: "SET_ACTION_ERROR", payload: message });
      setConnectionStatus("offline");
      return { ok: false, error: message };
    } finally {
      setIsDispatching(false);
    }
  };

  const theme = state.settings?.theme === "light" ? "light" : "dark";
  const colors = theme === "light" ? LIGHT_COLORS : DARK_COLORS;
  const isOwner = (activeStore?.role || "owner") === "owner";
  const isConnected = activeStore?.location === "device" || connectionStatus === "connected";

  return (
    <MartTrackContext.Provider
      value={{
        state,
        dispatch,
        isLoading,
        theme,
        colors,
        lastActionError: state.lastActionError,
        stores,
        activeStore,
        role: activeStore?.role || "owner",
        isOwner,
        mode: activeStore?.location === "device" ? "local" : "connected",
        connectionStatus,
        isConnected,
        isDispatching,
        switchStore,
        refreshStores,
      }}
    >
      {children}
    </MartTrackContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(MartTrackContext);
  if (!context) throw new Error("useTheme must be used within MartTrackProvider");
  return context;
}

export function useMartTrack() {
  const context = useContext(MartTrackContext);
  if (!context) {
    throw new Error("useMartTrack must be used within MartTrackProvider");
  }
  return context;
}
