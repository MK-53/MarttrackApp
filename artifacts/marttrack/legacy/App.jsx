import React, { useState } from "react";
import { SafeAreaView, StatusBar, ActivityIndicator } from "react-native";
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
import BottomNav from "./src/components/BottomNav";

function MainApp() {
  const { isLoading, colors, theme } = useMartTrack();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState("summary");
  const [editItemId, setEditItemId] = useState(null);

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
    setEditItemId(id === "edit" ? params?.itemId ?? null : null);
    setScreen(id);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={theme === "light" ? "dark-content" : "light-content"} backgroundColor={colors.background} />

      {screen === "summary"   && <DashboardScreen onNavigate={handleNavigate} />}
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
