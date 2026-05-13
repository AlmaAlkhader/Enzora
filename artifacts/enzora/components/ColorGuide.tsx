import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  I18nManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import colors from "@/constants/colors";

const c = colors.light;

const webCursor =
  Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : null;

const COLOR_DOTS = {
  yellow: "#FFB703",
  green: "#06D6A0",
  blue: "#4DABF7",
} as const;

type StatusColor = keyof typeof COLOR_DOTS;

interface RowSpec {
  key: StatusColor;
  titleKey: string;
  bodyKey: string;
}

const ROWS: RowSpec[] = [
  { key: "yellow", titleKey: "colorYellowTitle", bodyKey: "colorYellowBody" },
  { key: "green", titleKey: "colorGreenTitle", bodyKey: "colorGreenBody" },
  { key: "blue", titleKey: "colorBlueTitle", bodyKey: "colorBlueBody" },
];

// =============== Shared color rows (used in collapsible card + full screen) =================
export function ColorGuideRows({ large = false }: { large?: boolean }) {
  const { t } = useTranslation();
  return (
    <View>
      {ROWS.map((row, i) => (
        <View
          key={row.key}
          style={[
            rowStyles.row,
            i < ROWS.length - 1 && rowStyles.rowDivider,
            large && { paddingVertical: 18 },
          ]}
        >
          <View
            style={[
              rowStyles.dot,
              {
                backgroundColor: COLOR_DOTS[row.key],
                width: large ? 32 : 24,
                height: large ? 32 : 24,
                borderRadius: large ? 16 : 12,
              },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text style={[rowStyles.title, large && { fontSize: 17 }]}>
              {t(row.titleKey)}
            </Text>
            <Text style={[rowStyles.body, large && { fontSize: 15, lineHeight: 22 }]}>
              {t(row.bodyKey)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// =============== Collapsible "What the colors mean" card =================
export function ColorMeaningCard() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rotate = useSharedValue(0);

  useEffect(() => {
    rotate.value = withTiming(open ? 1 : 0, { duration: 180 });
  }, [open, rotate]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value * 180}deg` }],
  }));

  return (
    <View style={cardStyles.card}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={t("colorMeaningTitle")}
        style={[cardStyles.header, webCursor]}
      >
        <Text style={cardStyles.headerTitle}>{t("colorMeaningTitle")}</Text>
        <Animated.View style={chevronStyle}>
          <Feather name="chevron-down" size={20} color={c.primary} />
        </Animated.View>
      </Pressable>
      {open ? (
        <View style={cardStyles.body}>
          <ColorGuideRows />
        </View>
      ) : null}
    </View>
  );
}

// =============== Friendly explanation banner (shown above hero on green/blue) =================
export function ColorAlertBanner({
  status,
  onDismiss,
}: {
  status: "green" | "blue";
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const palette =
    status === "green"
      ? {
          bg: "#FFF3CD",
          border: "#FFB703",
          icon: "🟢",
          textKey: "colorBannerGreen",
        }
      : {
          bg: "#FDEDF0",
          border: "#EF233C",
          icon: "🔵",
          textKey: "colorBannerBlue",
        };

  return (
    <View
      style={[
        bannerStyles.banner,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <View style={bannerStyles.iconWrap}>
        <Text style={bannerStyles.icon}>{palette.icon}</Text>
      </View>
      <Text style={bannerStyles.text}>{t(palette.textKey)}</Text>
      <Pressable
        onPress={onDismiss}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("dismiss")}
        style={[bannerStyles.close, webCursor]}
      >
        <Feather name="x" size={18} color={c.textSecondary} />
      </Pressable>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  dot: {
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    marginBottom: 4,
  },
  body: {
    fontSize: 16,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});

const bannerStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    // Reserve space on the trailing side for the close button (RTL-aware).
    paddingEnd: 40,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 18 },
  text: {
    flex: 1,
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_500Medium",
    lineHeight: 22,
  },
  close: {
    position: "absolute",
    top: 8,
    // Use logical end so the close button mirrors correctly in RTL.
    ...(I18nManager.isRTL ? { left: 8 } : { right: 8 }),
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
