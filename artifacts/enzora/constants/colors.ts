// Enzora — pastel-medical-dashboard palette.
// Source of truth for all UI colors. Token names are kept stable so existing
// screens keep working; only the underlying values shift to the new system.
const enzora = {
  // Brand
  primary: "#6E75BF", // indigo
  primaryDark: "#8879B8", // violet
  navy: "#1B2A6B",

  // Surfaces
  bg: "#F4F8FF", // app background (very pale blue)
  card: "#FFFFFF",
  input: "#F4F8FF",

  // Text
  textPrimary: "#1B2A6B",
  textSecondary: "#6B7FA3",
  textMuted: "#9AAAC4",
  textWhite: "#FFFFFF",

  // Status (semantic) — yellow=normal, green=watch, blue=call doctor.
  // NOTE: token names (normal/warning/alert) are kept for backward compat
  // with existing screens but their VALUES now match the new pastel system.
  normal: "#FFB703", // yellow
  normalBg: "#FFF6E0",
  warning: "#7BC47F", // green (watch closely)
  warningBg: "#E6F5EA",
  alert: "#4A90E2", // blue (call doctor)
  alertBg: "#DFF3FF",

  // Pastel accent fills (for icon chips, decorative backgrounds, etc.)
  lavender: "#C9C3F4",
  paleBlue: "#DFF3FF",
  mint: "#BFEBD8",
  paleYellow: "#FFF6E0",

  // Lines & misc
  border: "#E4EAF5",
  navActive: "#6E75BF",
  navInactive: "#6B7FA3",
  tabBg: "#FFFFFF",
  shadow: "rgba(27, 42, 107, 0.06)",
};

// Soft pastel header gradient (lavender → pale-blue) — replaces the old
// dark purple gradient. Kept as `gradient` export for components that still
// reference it.
export const gradient: [string, string] = [enzora.lavender, enzora.paleBlue];

// Legacy dark brand gradient (kept for the splash / logo treatment only).
export const brandGradient: [string, string] = [
  enzora.primary,
  enzora.primaryDark,
];

const colors = {
  light: {
    text: enzora.textPrimary,
    tint: enzora.primary,
    background: enzora.bg,
    foreground: enzora.textPrimary,
    card: enzora.card,
    cardForeground: enzora.textPrimary,
    primary: enzora.primary,
    primaryForeground: enzora.textWhite,
    secondary: enzora.tabBg,
    secondaryForeground: enzora.textPrimary,
    muted: enzora.input,
    mutedForeground: enzora.textSecondary,
    accent: enzora.tabBg,
    accentForeground: enzora.textPrimary,
    destructive: enzora.alert,
    destructiveForeground: enzora.textWhite,
    border: enzora.border,
    input: enzora.input,
    textPrimary: enzora.textPrimary,
    primaryDark: enzora.primaryDark,
    textSecondary: enzora.textSecondary,
    textMuted: enzora.textMuted,
    textWhite: enzora.textWhite,
    navy: enzora.navy,
    normal: enzora.normal,
    normalBg: enzora.normalBg,
    warning: enzora.warning,
    warningBg: enzora.warningBg,
    alert: enzora.alert,
    alertBg: enzora.alertBg,
    lavender: enzora.lavender,
    paleBlue: enzora.paleBlue,
    mint: enzora.mint,
    paleYellow: enzora.paleYellow,
    navActive: enzora.navActive,
    navInactive: enzora.navInactive,
    tabBg: enzora.tabBg,
    shadow: enzora.shadow,
    bg: enzora.bg,
  },
  radius: 20,
};

export default colors;
