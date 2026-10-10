import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_STORAGE_KEY } from "../constants/config.js";

// NOTE: In production, use expo-secure-store or react-native-keychain
// This is a simplified placeholder. The PIN is stored in AsyncStorage
// for demo purposes. A real app must hash and use secure storage.

export const hasPin = async () => {
  try {
    const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    return stored !== null;
  } catch (error) {
    console.warn("Auth check failed", error);
    return false;
  }
};

export const createPin = async (pin) => {
  try {
    // In production: hash the PIN with a salt before storing
    const data = { pinHash: pin, created: Date.now() };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Create PIN failed", error);
    throw error;
  }
};

export const verifyPin = async (pin) => {
  try {
    const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return false;
    const { pinHash } = JSON.parse(stored);
    return pinHash === pin;
  } catch (error) {
    console.warn("Verify PIN failed", error);
    return false;
  }
};

export const clearPin = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.warn("Clear PIN failed", error);
  }
};
