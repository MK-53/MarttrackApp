import React, { useState } from "react";
import { SafeAreaView, StatusBar, ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { COLORS } from "./src/constants/colors";
import { MartTrackProvider, useMartTrack } from "./src/state/MartTrackContext";
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import InventoryScreen from "./src/screens/InventoryScreen";
import SellScreen from "./src/screens/SellScreen";
import AddStockScreen from "./src/screens/AddStockScreen";
import ReturnScreen from "./src/screens/ReturnScreen";
import EditItemScreen from "./src/screens/EditItemScreen";
import EditBatchScreen from "./src/screens/EditBatchScreen";
import BusinessBriefingScreen from "./src/screens/BusinessBriefingScreen";
import SupplierQuotesScreen from "./src/screens/SupplierQuotesScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import MoreScreen from "./src/screens/MoreScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import SellerHomeScreen from "./src/screens/SellerHomeScreen";
import StoreManagementScreen from "./src/screens/StoreManagementScreen";
import CreateStoreScreen from "./src/screens/CreateStoreScreen";
import ScanStoreScreen from "./src/screens/ScanStoreScreen";
import JoinStoreDetailsScreen from "./src/screens/JoinStoreDetailsScreen";
import ShowStoreQrScreen from "./src/screens/ShowStoreQrScreen";
import StoreTeamScreen from "./src/screens/StoreTeamScreen";
import BottomNav from "./src/components/BottomNav";

function MainApp() {
  const {
    isLoading,
    colors,
    theme,
    isOwner,
    isConnected,
    activeStore,
    connectionStatus,
  } = useMartTrack();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState("summary");
  const [editItemId, setEditItemId] = useState(null);
  const [navigationParams, setNavigationParams] = useState(null);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" }}>
        <StatusBar barStyle={theme === "light" ? "dark-content" : "light-content"} backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  const handleNavigate = (id, params = null) => {
    const sellerScreens = new Set([
      "summary", "inventory", "sell", "more", "stores", "create-store",
      "scan-store", "join-details",
    ]);
    if (!isOwner && !sellerScreens.has(id)) return;
    if (
      activeStore?.location !== "device" &&
      !isConnected &&
      ["sell", "add"].includes(id)
    ) return;
    setEditItemId(id === "edit" ? params?.itemId ?? null : null);
    setNavigationParams(params);
    setScreen(id);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={theme === "light" ? "dark-content" : "light-content"} backgroundColor={colors.background} />
      {activeStore?.location !== "device" && (
        <View style={[
          styles.connectionBanner,
          { backgroundColor: connectionStatus === "connected" ? `${colors.secondary}20` : `${colors.danger}20` },
        ]}>
          <View style={[
            styles.connectionDot,
            { backgroundColor: connectionStatus === "connected" ? colors.secondary : colors.danger },
          ]} />
          <Text style={[
            styles.connectionText,
            { color: connectionStatus === "connected" ? colors.secondary : colors.danger },
          ]}>
            {connectionStatus === "connected"
              ? `Connected to ${activeStore.name}`
              : `Not connected to ${activeStore.name} · read only`}
          </Text>
        </View>
      )}

      {screen === "summary"   && (isOwner
        ? <DashboardScreen onNavigate={handleNavigate} />
        : <SellerHomeScreen onNavigate={handleNavigate} />)}
      {screen === "add"       && <AddStockScreen onNavigate={handleNavigate} />}
      {screen === "sell"      && <SellScreen onNavigate={handleNavigate} />}
      {screen === "return"    && <ReturnScreen onNavigate={handleNavigate} />}
      {screen === "inventory" && <InventoryScreen onNavigate={handleNavigate} />}
      {screen === "edit"      && <EditItemScreen onNavigate={handleNavigate} initialItemId={editItemId} />}
      {screen === "edit-batch" && <EditBatchScreen onNavigate={handleNavigate} />}
      {screen === "briefing" && <BusinessBriefingScreen onNavigate={handleNavigate} />}
      {screen === "suppliers" && <SupplierQuotesScreen onNavigate={handleNavigate} />}
      {screen === "history"   && <HistoryScreen onNavigate={handleNavigate} />}
      {screen === "more"      && <MoreScreen onNavigate={handleNavigate} />}
      {screen === "settings"  && <SettingsScreen onNavigate={handleNavigate} onLogout={() => setIsLoggedIn(false)} />}
      {screen === "stores" && <StoreManagementScreen onNavigate={handleNavigate} />}
      {screen === "create-store" && <CreateStoreScreen onNavigate={handleNavigate} />}
      {screen === "scan-store" && <ScanStoreScreen onNavigate={handleNavigate} />}
      {screen === "join-details" && (
        <JoinStoreDetailsScreen onNavigate={handleNavigate} pairing={navigationParams?.pairing} />
      )}
      {screen === "show-store-qr" && <ShowStoreQrScreen onNavigate={handleNavigate} />}
      {screen === "store-team" && <StoreTeamScreen onNavigate={handleNavigate} />}

      <BottomNav activeScreen={screen} onNavigate={handleNavigate} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <MartTrackProvider>
      <MainApp />
    </MartTrackProvider>
  );
}

const styles = StyleSheet.create({
  connectionBanner: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  connectionDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  connectionText: { fontSize: 11, fontWeight: "700" },
});
