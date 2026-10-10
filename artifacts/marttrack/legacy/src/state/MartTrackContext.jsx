import React, { createContext, useContext, useReducer, useEffect, useState } from "react";
import { martTrackReducer, defaultState } from "./martTrackReducer";
import { loadData, saveData } from "../services/storage";
import { DARK_COLORS, LIGHT_COLORS } from "../constants/colors";

export const MartTrackContext = createContext(null);

export function MartTrackProvider({ children }) {
  const [state, dispatch] = useReducer(martTrackReducer, defaultState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const loadedState = await loadData();
      dispatch({ type: "LOAD_STATE", payload: loadedState });
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveData(state);
    }
  }, [state, isLoading]);

  const theme = state.settings?.theme === "light" ? "light" : "dark";
  const colors = theme === "light" ? LIGHT_COLORS : DARK_COLORS;

  return (
    <MartTrackContext.Provider
      value={{ state, dispatch, isLoading, theme, colors, lastActionError: state.lastActionError }}
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
