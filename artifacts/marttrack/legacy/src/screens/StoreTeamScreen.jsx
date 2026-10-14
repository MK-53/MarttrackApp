import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, StyleSheet, View } from "react-native";
import { COLORS } from "../constants/colors";
import { useMartTrack } from "../state/MartTrackContext";
import { changeStoreMemberRole, fetchStoreMembers, removeStoreMember } from "../services/storeClient";
import { getStoreAccessToken } from "../services/stores";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import Button from "../components/Button";

export default function StoreTeamScreen({ onNavigate }) {
  const { activeStore, colors } = useMartTrack();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyMemberId, setBusyMemberId] = useState(null);

  const loadMembers = useCallback(async () => {
    if (!activeStore) return;
    setLoading(true);
    setError("");
    try {
      const token = await getStoreAccessToken(activeStore.id);
      if (!token) throw new Error("Owner access token is missing on this device");
      const result = await fetchStoreMembers(activeStore, token);
      setMembers(result.members || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load team members.");
    } finally {
      setLoading(false);
    }
  }, [activeStore?.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const updateRole = async member => {
    const nextRole = member.role === "seller" ? "owner" : "seller";
    setBusyMemberId(member.id);
    try {
      const token = await getStoreAccessToken(activeStore.id);
      await changeStoreMemberRole(activeStore, token, member.id, nextRole);
      await loadMembers();
    } catch (updateError) {
      Alert.alert("Could not update role", updateError instanceof Error ? updateError.message : "Try again.");
    } finally {
      setBusyMemberId(null);
    }
  };

  const confirmRemove = member => {
    Alert.alert("Remove worker?", `${member.name} will lose access the next time they connect.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setBusyMemberId(member.id);
          try {
            const token = await getStoreAccessToken(activeStore.id);
            await removeStoreMember(activeStore, token, member.id);
            await loadMembers();
          } catch (removeError) {
            Alert.alert("Could not remove member", removeError instanceof Error ? removeError.message : "Try again.");
          } finally {
            setBusyMemberId(null);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <ScreenHeader title="Store team" onBack={() => onNavigate("stores")} />
      <Text style={[styles.intro, { color: colors.textBody }]}>
        Owners manage the store and finances. Sellers can view stock and record sales.
      </Text>
      <Button title="Add worker" onPress={() => onNavigate("show-store-qr")} style={styles.addButton} />
      {loading ? <Text style={[styles.notice, { color: colors.textMuted }]}>Loading team…</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {!loading && !error && members.map(member => (
        <Card key={member.id} style={styles.memberCard}>
          <View style={styles.memberTop}>
            <View style={styles.memberCopy}>
              <Text style={[styles.memberName, { color: colors.textHeader }]}>{member.name}</Text>
              <Text style={[styles.memberMeta, { color: colors.textBody }]}>{member.role === "owner" ? "Owner" : "Seller"}</Text>
            </View>
            <View style={[styles.rolePill, { backgroundColor: member.role === "owner" ? `${COLORS.primary}26` : `${COLORS.secondary}26` }]}>
              <Text style={[styles.roleText, { color: member.role === "owner" ? COLORS.primary : COLORS.secondary }]}>
                {member.role.toUpperCase()}
              </Text>
            </View>
          </View>
          {member.role !== "owner" && (
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => updateRole(member)}
                disabled={Boolean(busyMemberId)}
                style={[styles.outlineButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.actionText, { color: colors.textHeader }]}>
                  {busyMemberId === member.id ? "Saving…" : "Make owner"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmRemove(member)} disabled={Boolean(busyMemberId)} style={styles.removeButton}>
                <Text style={[styles.actionText, { color: colors.danger }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
          {member.role === "owner" && member.id !== activeStore.memberId && (
            <TouchableOpacity onPress={() => updateRole(member)} disabled={Boolean(busyMemberId)} style={styles.removeButton}>
              <Text style={[styles.actionText, { color: colors.danger }]}>Make seller</Text>
            </TouchableOpacity>
          )}
        </Card>
      ))}
      {!loading && !error && members.length === 0 && (
        <Text style={[styles.notice, { color: colors.textMuted }]}>No team members yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, paddingBottom: 130 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  addButton: { marginBottom: 16 },
  notice: { fontSize: 13, marginTop: 12 },
  error: { fontSize: 13, lineHeight: 18, marginTop: 10 },
  memberCard: { padding: 15, marginBottom: 10 },
  memberTop: { flexDirection: "row", alignItems: "center" },
  memberCopy: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: "800" },
  memberMeta: { fontSize: 12, marginTop: 3 },
  rolePill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14 },
  roleText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  actions: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  outlineButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  actionText: { fontSize: 12, fontWeight: "700" },
  removeButton: { marginLeft: 10, paddingHorizontal: 8, paddingVertical: 7 },
});
