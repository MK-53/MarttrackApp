import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, Alert } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import { removeStore } from "../services/stores";
import Card from "../components/Card";
import Button from "../components/Button";
import ScreenHeader from "../components/ScreenHeader";

export default function StoreManagementScreen({ onNavigate }) {
  const {
    stores,
    activeStore,
    switchStore,
    refreshStores,
    isOwner,
    colors,
  } = useMartTrack();
  const [switchingId, setSwitchingId] = useState(null);

  useEffect(() => {
    refreshStores().catch(error => Alert.alert("Stores", error.message));
  }, [refreshStores]);

  const handleSwitch = async id => {
    setSwitchingId(id);
    try {
      await switchStore(id);
    } catch (error) {
      Alert.alert("Could not switch stores", error.message);
    } finally {
      setSwitchingId(null);
    }
  };

  const confirmRemove = store => {
    Alert.alert(
      "Remove this store from this phone?",
      "This removes its saved copy and access token from this device. The host's store data is not deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeStore(store.id);
              await refreshStores();
            } catch (error) {
              Alert.alert("Could not remove store", error.message);
            }
          },
        },
      ],
    );
  };

  const openTeam = async store => {
    if (store.id !== activeStore?.id) await handleSwitch(store.id);
    onNavigate("store-team");
  };

  const isRemoteOwner = activeStore?.location !== "device" && isOwner;

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <ScreenHeader title="My Stores" onBack={() => onNavigate("summary")} />
      <Text style={[styles.intro, { color: colors.textBody }]}>
        Keep each shop separate, and switch to the store you are working in.
      </Text>
      {stores.map(store => {
        const isCurrent = store.id === activeStore?.id;
        return (
          <Card key={store.id} style={styles.storeCard}>
            <View style={styles.storeTop}>
              <View style={styles.copy}>
                <Text style={[styles.storeName, { color: colors.textHeader }]}>{store.name}</Text>
                <Text style={[styles.storeMeta, { color: colors.textBody }]}>
                  {store.location === "device" ? "On this phone" : "PC host"} · {store.role === "owner" ? "Owner" : "Seller"}
                </Text>
              </View>
              <View style={[styles.rolePill, { backgroundColor: store.role === "owner" ? `${COLORS.primary}26` : `${COLORS.secondary}26` }]}>
                <Text style={[styles.roleText, { color: store.role === "owner" ? COLORS.primary : COLORS.secondary }]}>
                  {store.role === "owner" ? "OWNER" : "SELLER"}
                </Text>
              </View>
            </View>
            <View style={styles.storeActions}>
              {isCurrent ? (
                <Text style={[styles.activeLabel, { color: colors.secondary }]}>Current store</Text>
              ) : (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => handleSwitch(store.id)}
                  disabled={Boolean(switchingId)}
                  style={[styles.linkButton, { borderColor: colors.border }]}
                >
                  <Text style={[styles.linkText, { color: colors.textHeader }]}>
                    {switchingId === store.id ? "Opening…" : "Switch to this store"}
                  </Text>
                </TouchableOpacity>
              )}
              {store.location !== "device" && store.role === "owner" && (
                <TouchableOpacity onPress={() => openTeam(store)} style={styles.textButton}>
                  <Text style={[styles.textButtonLabel, { color: colors.primary }]}>Manage team</Text>
                </TouchableOpacity>
              )}
              {store.location !== "device" && (
                <TouchableOpacity onPress={() => confirmRemove(store)} style={styles.textButton}>
                  <Text style={[styles.textButtonLabel, { color: colors.danger }]}>Remove from phone</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        );
      })}

      <Button title="Create a store" onPress={() => onNavigate("create-store")} style={styles.action} />
      <Button title="Join a store by QR" onPress={() => onNavigate("scan-store")} color={COLORS.secondary} style={styles.action} textStyle={{ color: colors.background }} />
      {isRemoteOwner && (
        <>
          <Button title="Show worker QR code" onPress={() => onNavigate("show-store-qr")} color={COLORS.textBody} style={styles.action} />
          <Button title="Manage team" onPress={() => onNavigate("store-team")} color={COLORS.textBody} style={styles.action} />
        </>
      )}
      <View style={styles.note}>
        <Text style={[styles.noteText, { color: colors.textMuted }]}>
          Phone-based Wi-Fi hosting is not enabled yet. Create a private phone store or connect to a PC host.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, paddingBottom: 130 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  storeCard: { padding: 15, marginBottom: 10 },
  storeTop: { flexDirection: "row", alignItems: "center" },
  copy: { flex: 1, paddingRight: 8 },
  storeName: { fontSize: 17, fontWeight: "800" },
  storeMeta: { fontSize: 12, marginTop: 4 },
  rolePill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14 },
  roleText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  storeActions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 13 },
  activeLabel: { fontSize: 12, fontWeight: "700", marginRight: 12 },
  linkButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginRight: 10 },
  linkText: { fontSize: 12, fontWeight: "700" },
  textButton: { paddingVertical: 7, paddingHorizontal: 6 },
  textButtonLabel: { fontSize: 12, fontWeight: "700" },
  action: { marginTop: 10 },
  note: { paddingHorizontal: 5, paddingTop: 14 },
  noteText: { fontSize: 12, lineHeight: 18 },
});
