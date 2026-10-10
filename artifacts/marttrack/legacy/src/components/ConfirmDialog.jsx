import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";

export default function ConfirmDialog({
  visible, title, message,
  confirmText = "Confirm", cancelText = "Cancel",
  onConfirm, onCancel, confirmColor = COLORS.primary
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, { backgroundColor: COLORS.card }]} onPress={onCancel}>
              <Text style={styles.buttonText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: confirmColor }]} onPress={onConfirm}>
              <Text style={styles.buttonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  dialog: {
    backgroundColor: COLORS.card, borderRadius: 16,
    padding: 24, width: "100%",
  },
  title: { fontSize: 18, fontWeight: "700", color: COLORS.textHeader, marginBottom: 8 },
  message: { fontSize: 14, color: COLORS.textBody, marginBottom: 20, lineHeight: 20 },
  buttonRow: { flexDirection: "row", gap: 12 },
  button: { flex: 1, padding: 14, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
