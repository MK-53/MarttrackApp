import React, { useRef, useEffect } from "react";
import {
  Animated, Easing, View, Text, TouchableOpacity, StyleSheet
} from "react-native";
import { COLORS } from "../constants/colors";
import { useTheme } from "../state/MartTrackContext";

const NAV_ITEMS = [
  { id: "summary",   icon: "\u229E", label: "Overview" },
  { id: "inventory", icon: "\u2261", label: "Stock" },
  { id: "sell",      icon: "$",      label: "Sell" },
  { id: "add",       icon: "+",      label: "Restock" },
  { id: "more",      icon: "\u22EF", label: "More" },
];

export default function BottomNav({ activeScreen, onNavigate }) {
  const { colors, isOwner, isConnected, activeStore } = useTheme();
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5, duration: 2000,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0, duration: 2000,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const mapScreen = (screen) => {
    if (["edit", "return", "history", "settings"].includes(screen)) return "more";
    return screen;
  };

  const navItems = isOwner
    ? NAV_ITEMS
    : NAV_ITEMS.filter(item => item.id !== "add");
  const activeId = mapScreen(activeScreen);

  return (
    <Animated.View style={[styles.wrapper, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ translateY: floatAnim }] }]}>
      {navItems.map(item => {
        const isActive = item.id === activeId;
        const networkDisabled =
          activeStore?.location !== "device" &&
          !isConnected &&
          ["sell", "add"].includes(item.id);
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onNavigate(item.id)}
            disabled={networkDisabled}
            accessibilityState={{ disabled: networkDisabled }}
            style={[
              styles.iconBtn,
              isActive && { backgroundColor: `${colors.primary}22` },
              networkDisabled && styles.disabled,
            ]}
            activeOpacity={0.8}
          >
            <Text style={[styles.icon, { color: isActive ? colors.textHeader : colors.textMuted }]}>{item.icon}</Text>
            <Text style={[styles.label, { color: isActive ? colors.primary : colors.textMuted }]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute", bottom: 24, alignSelf: "center",
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 36,
    backgroundColor: "rgba(29,32,27,0.96)",
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: "#000", shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28, elevation: 18,
  },
  iconBtn: {
    width: 56, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
  },
  iconBtnActive: { backgroundColor: "rgba(242,107,58,0.16)" },
  icon: { fontSize: 18, fontWeight: "700", color: "rgba(255,255,255,0.55)" },
  iconActive: { color: "rgba(255,255,255,0.95)" },
  label: { fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  labelActive: { color: COLORS.secondary },
  disabled: { opacity: 0.35 },
});
