import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { AUTH_STORAGE_KEY } from "../constants/config.js";

const SECURE_PIN_KEY = "@marttrack_pin_v2";

const readSecurePin = async () => {
  try {
    return await SecureStore.getItemAsync(SECURE_PIN_KEY);
  } catch {
    return AsyncStorage.getItem(SECURE_PIN_KEY);
  }
};

const writeSecurePin = async value => {
  try {
    await SecureStore.setItemAsync(SECURE_PIN_KEY, value);
  } catch {
    // SecureStore is unavailable on web; store only the salted digest there.
    await AsyncStorage.setItem(SECURE_PIN_KEY, value);
  }
};

const createPinRecord = async pin => {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const salt = Array.from(saltBytes, byte => byte.toString(16).padStart(2, "0")).join("");
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
  return JSON.stringify({ version: 2, salt, digest, created: Date.now() });
};

export const hasPin = async () => {
  try {
    return Boolean(
      (await readSecurePin()) ||
      (await AsyncStorage.getItem(AUTH_STORAGE_KEY)),
    );
  } catch (error) {
    console.warn("Auth check failed", error);
    return false;
  }
};

export const createPin = async pin => {
  try {
    if (typeof pin !== "string" || !/^\d{4,12}$/.test(pin)) {
      throw new Error("PIN must be 4 to 12 digits");
    }
    await writeSecurePin(await createPinRecord(pin));
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.warn("Create PIN failed", error);
    throw error;
  }
};

export const verifyPin = async pin => {
  try {
    const secureRecord = await readSecurePin();
    if (secureRecord) {
      const parsed = JSON.parse(secureRecord);
      if (parsed?.version !== 2 || typeof parsed.salt !== "string" || typeof parsed.digest !== "string") {
        return false;
      }
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${parsed.salt}:${pin}`,
      );
      return digest === parsed.digest;
    }

    // Upgrade an existing device's legacy plaintext PIN on its next successful unlock.
    const legacy = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!legacy) return false;
    const parsed = JSON.parse(legacy);
    if (parsed?.pinHash !== pin) return false;
    await writeSecurePin(await createPinRecord(pin));
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    return true;
  } catch (error) {
    console.warn("Verify PIN failed", error);
    return false;
  }
};

export const clearPin = async () => {
  try {
    await SecureStore.deleteItemAsync(SECURE_PIN_KEY);
  } catch {
    // SecureStore is unavailable on web.
  }
  try {
    await AsyncStorage.multiRemove([SECURE_PIN_KEY, AUTH_STORAGE_KEY]);
  } catch (error) {
    console.warn("Clear PIN failed", error);
  }
};
