import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useMartTrack } from "../state/MartTrackContext";
import { createJoinToken } from "../services/storeClient";
import { getStoreAccessToken } from "../services/stores";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import Button from "../components/Button";

export default function ShowStoreQrScreen({ onNavigate }) {
  const { activeStore, colors } = useMartTrack();
  const [payload, setPayload] = useState(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!activeStore) return;
    setLoading(true);
    setError("");
    try {
      const accessToken = await getStoreAccessToken(activeStore.id);
      if (!accessToken) throw new Error("Owner access token is missing on this device");
      const result = await createJoinToken(activeStore, accessToken);
      setPayload(result.payload);
      setExpiresAt(result.expiresAt);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not create a worker invitation.");
    } finally {
      setLoading(false);
    }
  }, [activeStore?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <ScreenHeader title="Add a worker" onBack={() => onNavigate("stores")} />
      <Card style={styles.card}>
        <Text style={[styles.storeName, { color: colors.textHeader }]}>{activeStore?.name}</Text>
        <Text style={[styles.copy, { color: colors.textBody }]}>
          Ask the worker to scan this code. It expires in 10 minutes and can be used once.
        </Text>
        {payload ? (
          <View style={styles.qrFrame}>
            <QRCode value={JSON.stringify(payload)} size={224} backgroundColor="#FFFFFF" color="#10110F" />
          </View>
        ) : (
          <View style={styles.qrPlaceholder}>
            <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
              {loading ? "Preparing invitation…" : "Invitation unavailable"}
            </Text>
          </View>
        )}
        {expiresAt ? (
          <Text style={[styles.expiry, { color: colors.textMuted }]}>
            Expires {new Date(expiresAt).toLocaleTimeString()}
          </Text>
        ) : null}
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <Button title="Refresh QR code" onPress={refresh} loading={loading} disabled={loading} style={styles.button} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, paddingBottom: 130 },
  card: { padding: 18, alignItems: "center" },
  storeName: { alignSelf: "stretch", fontSize: 18, fontWeight: "800", marginBottom: 5 },
  copy: { alignSelf: "stretch", fontSize: 13, lineHeight: 19, marginBottom: 15 },
  qrFrame: { width: 250, height: 250, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12 },
  qrPlaceholder: { width: 250, height: 250, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  placeholderText: { fontSize: 13 },
  expiry: { fontSize: 11, marginTop: 10 },
  error: { fontSize: 13, lineHeight: 18, marginTop: 9, textAlign: "center" },
  button: { alignSelf: "stretch", marginTop: 16 },
});
