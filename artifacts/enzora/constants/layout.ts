import { Platform } from "react-native";

export const SCREEN_H_PAD = 20;
export const CARD_PAD = 18;
export const CARD_RADIUS = 20;
export const CARD_GAP = 16;

export const TAB_BAR_BASE_H = Platform.OS === "web" ? 88 : 70;

export const TAB_BAR_INNER_PAD = 10;

// Width threshold for "large phone" tweaks (iPhone Pro Max / Plus class).
// Used by responsive components to scale up typography and padding so
// extra screen real-estate doesn't feel sparse.
export const LARGE_PHONE_MIN_WIDTH = 430;
