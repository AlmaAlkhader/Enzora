import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_BASE_H } from "@/constants/layout";

/**
 * Returns the effective on-screen height of the bottom tab bar:
 * TAB_BAR_BASE_H + iOS bottom safe-area inset.
 * Use this as the scroll-content bottom clearance on tab screens.
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "web") return TAB_BAR_BASE_H;
  return TAB_BAR_BASE_H + insets.bottom;
}
