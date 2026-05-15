import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";
import { SCREEN_H_PAD } from "@/constants/layout";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

const c = colors.light;

export function ScreenContainer({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.root, style]}>{children}</View>;
}

/**
 * Returns a scroll-content container style with consistent horizontal padding
 * and a bottom padding that clears either the tab bar (tab screens) or just
 * the safe-area bottom inset (modal / stack screens with no tab bar).
 *
 * @param extraPad   Extra breathing room below the last content item (default 24).
 * @param includeTabBar  Pass `false` on non-tab screens (modals, stack screens)
 *                       to avoid adding phantom tab-bar clearance. Defaults to `true`.
 *
 * Usage — always merge last so it wins over any static paddingBottom:
 *   const scrollStyle = useScrollContentStyle();
 *   <ScrollView contentContainerStyle={[styles.content, scrollStyle]} />
 *
 * Non-tab screen:
 *   const scrollStyle = useScrollContentStyle(24, false);
 */
export function useScrollContentStyle(
  extraPad = 24,
  includeTabBar = true,
): ViewStyle {
  const tabH = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const bottomBase = includeTabBar ? tabH : insets.bottom;
  return {
    paddingHorizontal: SCREEN_H_PAD,
    paddingBottom: bottomBase + extraPad,
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.bg,
  },
});
