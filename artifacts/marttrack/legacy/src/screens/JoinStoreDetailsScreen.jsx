import React, { useState } from "react";
import { ScrollView, Text, StyleSheet, Alert } from "react-native";
import { useMartTrack } from "../state/MartTrackContext";
import { joinPcStore } from "../services/storeClient";
import Input from "../components/Input";
import Card from "../components/Card";
import Button from "../components/Button";
import ScreenHeader from "../components/ScreenHeader";

export default function JoinStoreDetailsScreen({ onNavigate, pairing }) {
  const { colors, refreshStores, switchStore } = useMartTrack();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const submit = async () => {
    setError("");
    if (!name.trim()) return setError("Enter your name.");
    if (!/^\d{4,12}$/.test(pin)) return setError("Use a PIN with 4 to 12 digits.");
    setJoining(true);
    try {
      const store = await joinPcStore(pairing, { name, pin });
      await refreshStores();
      await switchStore(store.id);
      onNavigate("summary");
    } catch (joinError) {
      const message = joinError instanceof Error ? joinError.message : "Could not join this store.";
      setError(message);
      Alert.alert("Could not join store", message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Join store" onBack={() => onNavigate("scan-store")} />
      <Card style={styles.card}>
        <Text style={[styles.storeName, { color: colors.textHeader }]}>Store invitation scanned</Text>
        <Text style={[styles.helpText, { color: colors.textBody }]}>
          You will join as a seller. Enter a name and a PIN for this device.
        </Text>
        <Input label="Your name" value={name} onChangeText={setName} placeholder="Name" maxLength={80} />
        <Input
          label="PIN"
          value={pin}
          onChangeText={setPin}
          placeholder="4–12 digits"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={12}
        />
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <Button title={joining ? "Joining…" : "Join as seller"} onPress={submit} loading={joining} disabled={joining} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, paddingBottom: 130 },
  card: { padding: 16 },
  storeName: { fontSize: 17, fontWeight: "800", marginBottom: 6 },
  helpText: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  error: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
});
