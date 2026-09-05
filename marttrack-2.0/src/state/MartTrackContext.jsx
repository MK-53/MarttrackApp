import React, { createContext, useContext, useReducer, useEffect, useState } from "react";
import { martTrackReducer, defaultState } from "./martTrackReducer";
import { loadData, saveData } from "../services/storage";

const MartTrackContext = createContext(null);

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

  return (
    <MartTrackContext.Provider value={{ state, dispatch, isLoading }}>
      {children}
    </MartTrackContext.Provider>
  );
}

export function useMartTrack() {
  const context = useContext(MartTrackContext);
  if (!context) {
    throw new Error("useMartTrack must be used within MartTrackProvider");
  }
  return context;
}
