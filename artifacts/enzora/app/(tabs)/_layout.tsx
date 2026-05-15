import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import colors from "@/constants/colors";
import { TAB_BAR_BASE_H, TAB_BAR_INNER_PAD } from "@/constants/layout";

const c = colors.light;

export default function TabLayout() {
  const { t } = useTranslation();
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();
  const bottomInset = isWeb ? 0 : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "none",
        tabBarActiveTintColor: c.navActive,
        tabBarInactiveTintColor: c.navInactive,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
          borderTopWidth: 1,
          ...(isWeb
            ? { height: 88 }
            : { height: TAB_BAR_BASE_H + bottomInset, paddingBottom: bottomInset + TAB_BAR_INNER_PAD }),
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: "#1B2A6B",
              shadowOpacity: 0.04,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: -4 },
            },
            android: { elevation: 8 },
            default: {
              boxShadow: "0 -4px 20px rgba(27,42,107,0.04)",
            } as object,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_700Bold",
          fontWeight: "700",
          marginTop: 2,
          letterSpacing: 0.2,
        },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wounds"
        options={{
          title: t("wounds"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bandage" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("history"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: t("askAI"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: t("alerts"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="bell" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
