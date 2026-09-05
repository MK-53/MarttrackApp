import React, { useRef, useEffect } from "react";
import {
  Animated, Easing, View, Text, TouchableOpacity, StyleSheet
} from "react-native";
import { COLORS } from "../constants/colors";

const NAV_ITEMS = [
  { id: "summary",   icon: "\u229E", label: "Home" },
  { id: "inventory", icon: "\u2261", label: "Inventory" },
  { id: "sell",      icon: "$",      label: "Sell" },
  { id: "add",       icon: "+",      label: "Add" },
  { id: "more",      icon: "\u22EF", label: "More" },
];

export default function BottomNav({ activeScreen, onNavigate }) {
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

  const activeId = mapScreen(activeScreen);

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateY: floatAnim }] }]}>
      {NAV_ITEMS.map(item => {
        const isActive = item.id === activeId;
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onNavigate(item.id)}
            style={[styles.iconBtn, isActive && styles.iconBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.icon, isActive && styles.iconActive]}>{item.icon}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute", bottom: 30, alignSelf: "center",
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#000", shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28, elevation: 18,
  },
  iconBtn: {
    width: 56, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
  },
  iconBtnActive: { backgroundColor: "rgba(255,255,255,0.15)" },
  icon: { fontSize: 18, fontWeight: "700", color: "rgba(255,255,255,0.55)" },
  iconActive: { color: "rgba(255,255,255,0.95)" },
  label: { fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  labelActive: { color: COLORS.secondary },
});
