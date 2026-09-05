import React, { useState, useEffect } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator
} from "react-native";
import { COLORS } from "../constants/colors";
import { hasPin, createPin, verifyPin } from "../services/auth";

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("loading");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const check = async () => {
      const exists = await hasPin();
      setMode(exists ? "enter" : "create");
    };
    check();
  }, []);

  const handleCreatePin = async () => {
    if (pin.length < 4) { setError("PIN must be at least 4 digits."); return; }
    if (pin !== confirmPin) { setError("PINs do not match."); return; }
    try {
      await createPin(pin);
      onLogin();
    } catch {
      setError("Failed to create PIN.");
    }
  };

  const handleEnterPin = async () => {
    if (pin.length < 4) { setError("Enter your PIN."); return; }
    const valid = await verifyPin(pin);
    if (valid) { setError(""); onLogin(); }
    else { setError("Incorrect PIN."); }
  };

  if (mode === "loading") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.content}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>M</Text>
        </View>
        <Text style={styles.title}>MartTrack</Text>
        <Text style={styles.subtitle}>
          {mode === "create" ? "Create a PIN to secure your data" : "Enter your PIN"}
        </Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="PIN"
            placeholderTextColor="#444"
            secureTextEntry
            keyboardType="numeric"
            value={pin}
            onChangeText={setPin}
          />
          {mode === "create" && (
            <TextInput
              style={styles.input}
              placeholder="Confirm PIN"
              placeholderTextColor="#444"
              secureTextEntry
              keyboardType="numeric"
              value={confirmPin}
              onChangeText={setConfirmPin}
            />
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            style={styles.button}
            onPress={mode === "create" ? handleCreatePin : handleEnterPin}
          >
            <Text style={styles.buttonText}>
              {mode === "create" ? "Create PIN" : "Unlock"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footer}>AtlasPeak - Offline-First</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: "center" },
  content: { padding: 24, alignItems: "center" },
  logoMark: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  logoText: { fontSize: 28, fontWeight: "900", color: "#FFF" },
  title: { fontSize: 32, fontWeight: "800", color: COLORS.textHeader, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.textBody, marginTop: 5, marginBottom: 30 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 24, width: "100%" },
  input: {
    backgroundColor: "#1A1A1A", borderRadius: 10, padding: 13,
    fontSize: 16, color: COLORS.textHeader,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 12, textAlign: "center",
  },
  error: { color: COLORS.danger, fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 8 },
  button: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  footer: { textAlign: "center", marginTop: 24, fontSize: 11, color: "#333" },
});
