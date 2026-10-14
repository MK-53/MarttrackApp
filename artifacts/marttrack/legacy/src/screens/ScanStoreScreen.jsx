import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useMartTrack } from "../state/MartTrackContext";
import ScreenHeader from "../components/ScreenHeader";
import Button from "../components/Button";
import { COLORS } from "../constants/colors";

export default function ScanStoreScreen({ onNavigate }) {
  const { colors } = useMartTrack();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    try {
      const pairing = JSON.parse(data);
      if (!pairing?.host || !pairing?.store || !pairing?.token) {
        throw new Error("This QR code is not a MartTrack worker invitation.");
      }
      onNavigate("join-details", { pairing });
    } catch (error) {
      setScanned(false);
      Alert.alert("Invalid QR code", error instanceof Error ? error.message : "Scan a MartTrack invite.");
    }
  };

  if (!permission) {
    return <View style={styles.center}><Text style={[styles.copy, { color: colors.textBody }]}>Checking camera access…</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Join a store" onBack={() => onNavigate("stores")} />
        <View style={styles.permissionCard}>
          <Text style={[styles.copy, { color: colors.textBody }]}>
            Camera access is needed to scan a store owner's one-time QR invitation.
          </Text>
          <Button title="Allow camera" onPress={requestPermission} style={styles.permissionButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Scan store QR" onBack={() => onNavigate("stores")} />
      <View style={[styles.cameraFrame, { borderColor: colors.border }]}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned ? undefined : handleScan}
        />
      </View>
      <Text style={[styles.copy, { color: colors.textBody }]}>Point the camera at the owner's MartTrack invitation.</Text>
      {scanned && (
        <TouchableOpacity onPress={() => setScanned(false)} style={styles.rescan}>
          <Text style={styles.rescanText}>Scan again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  cameraFrame: { flex: 1, overflow: "hidden", borderWidth: 1, borderRadius: 18, marginVertical: 12, maxHeight: 460 },
  camera: { flex: 1 },
  permissionCard: { margin: 16, padding: 18, borderRadius: 14, backgroundColor: COLORS.card },
  copy: { fontSize: 14, lineHeight: 20, textAlign: "center", paddingHorizontal: 12 },
  permissionButton: { marginTop: 16 },
  rescan: { alignSelf: "center", padding: 14 },
  rescanText: { color: COLORS.primary, fontWeight: "800" },
});
