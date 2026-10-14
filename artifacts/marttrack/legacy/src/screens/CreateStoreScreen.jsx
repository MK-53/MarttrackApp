import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, Alert } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import { addRemoteStore, createLocalStore, setStoreAccessToken } from "../services/stores";
import { createPcStore, normalizeServerUrl } from "../services/storeClient";
import { saveDataForStore } from "../services/storage";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import ScreenHeader from "../components/ScreenHeader";
import { defaultState } from "../state/martTrackReducer";

export default function CreateStoreScreen({ onNavigate }) {
  const { colors, switchStore, refreshStores } = useMartTrack();
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [pin, setPin] = useState("");
  const [serverAddress, setServerAddress] = useState("");
  const [hostMode, setHostMode] = useState("device");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError("");
    if (!name.trim()) return setError("Enter a name for this store.");
    if (hostMode === "pc") {
      if (!ownerName.trim()) return setError("Enter the store owner's name.");
      if (!/^\d{4,12}$/.test(pin)) return setError("Use a PIN with 4 to 12 digits.");
      try {
        normalizeServerUrl(serverAddress);
      } catch (validationError) {
        return setError(validationError.message);
      }
    }

    setSaving(true);
    try {
      if (hostMode === "device") {
        const store = await createLocalStore({ name, ownerName });
        await refreshStores();
        await switchStore(store.id);
      } else {
        const serverUrl = normalizeServerUrl(serverAddress);
        const created = await createPcStore(serverUrl, { name, ownerName, pin });
        const store = {
          id: created.storeId,
          name: created.name,
          role: "owner",
          location: "pc",
          serverUrl,
          memberId: created.memberId,
          createdAt: new Date().toISOString(),
        };
        await addRemoteStore(store);
        await setStoreAccessToken(store.id, created.accessToken);
        await saveDataForStore(created.state || defaultState, store);
        await refreshStores();
        await switchStore(store.id);
      }
      onNavigate("summary");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Store creation failed.");
      Alert.alert("Could not create store", submitError instanceof Error ? submitError.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Create a store" onBack={() => onNavigate("stores")} />
      <Card style={styles.card}>
        <Input label="Store name" value={name} onChangeText={setName} placeholder="e.g. Main shop" maxLength={80} />
        <View style={styles.modeRow}>
          {[
            { value: "device", label: "This phone" },
            { value: "pc", label: "PC host" },
          ].map(option => (
            <TouchableOpacity
              key={option.value}
              onPress={() => { setHostMode(option.value); setError(""); }}
              style={[
                styles.modeOption,
                { borderColor: hostMode === option.value ? colors.primary : colors.border },
                hostMode === option.value && { backgroundColor: `${colors.primary}18` },
              ]}
            >
              <Text style={[styles.modeText, { color: colors.textHeader }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {hostMode === "device" ? (
          <Text style={[styles.helpText, { color: colors.textBody }]}>
            This creates a private local store on this phone. It won't sync with other devices.
          </Text>
        ) : (
          <>
            <Input
              label="PC server address"
              value={serverAddress}
              onChangeText={setServerAddress}
              placeholder="http://192.168.1.20:8080"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input label="Owner name" value={ownerName} onChangeText={setOwnerName} placeholder="Your name" maxLength={80} />
            <Input
              label="Owner PIN"
              value={pin}
              onChangeText={setPin}
              placeholder="4–12 digits"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={12}
            />
            <Text style={[styles.helpText, { color: colors.textBody }]}>
              The API server must already be running on the PC, and this phone must be able to reach its address.
            </Text>
          </>
        )}
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <Button title={saving ? "Creating…" : "Create store"} onPress={submit} loading={saving} disabled={saving} style={styles.button} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, paddingBottom: 130 },
  card: { padding: 16 },
  modeRow: { flexDirection: "row", gap: 9, marginBottom: 16 },
  modeOption: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  modeText: { fontSize: 14, fontWeight: "700" },
  helpText: { fontSize: 12, lineHeight: 18, marginBottom: 14 },
  error: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  button: { marginTop: 5 },
});
