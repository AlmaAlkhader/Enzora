import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  I18nManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";

const LOGO_SOURCE = require("@/assets/images/enzora-logo.png");
// Original PNG aspect ratio (width / height) — used to derive width from height
// while keeping object-fit: contain. Image is ~787x1024.
const LOGO_ASPECT = 787 / 1024;

const webCursor =
  Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : null;
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import colors, { gradient } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

const c = colors.light;

// ---------------- Enzora Logo ----------------
// Variants:
//  - "header": 36px tall (small header)
//  - "headerLg": 72px tall (prominent header — used on home)
//  - "splash": 160px tall (splash/loading screen)
//  - "auth": 90px container with overflow hidden — crops the
//    "Smart Wound Patch" tagline at the bottom
export function EnzoraLogo({
  variant = "header",
}: {
  variant?: "header" | "headerLg" | "splash" | "auth";
  color?: string;
}) {
  if (variant === "auth") {
    const containerH = 90;
    const imageH = Math.round(containerH / 0.78);
    const imageW = Math.round(imageH * LOGO_ASPECT);
    return (
      <View
        style={{
          height: containerH,
          width: imageW,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "flex-start",
          backgroundColor: "transparent",
        }}
      >
        <Image
          source={LOGO_SOURCE}
          style={{
            width: imageW,
            height: imageH,
            backgroundColor: "transparent",
          }}
          contentFit="contain"
        />
      </View>
    );
  }

  if (variant === "headerLg") {
    // Crop the PNG to show ONLY the swoosh icon (no wordmark, no tagline),
    // then render "Enzora" below as white text so it reads cleanly on the
    // purple gradient header. Icon occupies ~top 60% of the source image.
    const iconH = 78;
    const imageH = Math.round(iconH / 0.6);
    const imageW = Math.round(imageH * LOGO_ASPECT);
    return (
      <View style={{ alignItems: "center", marginTop: 24 }}>
        <View
          style={{
            height: iconH,
            width: imageW,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "flex-start",
            backgroundColor: "transparent",
          }}
        >
          <Image
            source={LOGO_SOURCE}
            style={{
              width: imageW,
              height: imageH,
              backgroundColor: "transparent",
            }}
            contentFit="contain"
          />
        </View>
        <Text
          style={{
            color: "#ffffff",
            fontSize: 20,
            fontWeight: "100",
            letterSpacing: 0.5,
            marginTop: 2,
          }}
        >
          Enzora
        </Text>
      </View>
    );
  }

  const height = variant === "splash" ? 160 : 36;
  const width = Math.round(height * LOGO_ASPECT);
  return (
    <Image
      source={LOGO_SOURCE}
      style={{ width, height, backgroundColor: "transparent" }}
      contentFit="contain"
    />
  );
}

// ---------------- Logo (back-compat wrapper) ----------------
export function Logo({
  size = "sm",
}: {
  size?: "sm" | "lg";
  color?: string;
}) {
  return <EnzoraLogo variant={size === "lg" ? "splash" : "header"} />;
}

// ---------------- Language Toggle ----------------
export function LanguageToggle({ dark = false }: { dark?: boolean }) {
  const { language, toggleLanguage } = useApp();
  return (
    <Pressable
      onPress={() => void toggleLanguage()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Toggle language"
      style={({ pressed }) => [
        styles.langPill,
        webCursor,
        {
          backgroundColor: dark ? "rgba(255,255,255,0.18)" : c.card,
          borderColor: dark ? "rgba(255,255,255,0.3)" : c.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Feather name="globe" size={14} color={dark ? c.textWhite : c.primary} />
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: dark ? c.textWhite : c.primary,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        {language === "en" ? "العربية" : "English"}
      </Text>
    </Pressable>
  );
}

// ---------------- Gradient Header ----------------
export function GradientHeader({
  title,
  subtitle,
  right,
  back,
  onBack,
  layout = "centered",
  logoSize = "sm",
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  back?: boolean;
  onBack?: () => void;
  /**
   * "centered": logo + title stacked and centered. `right` sits in the top-right
   * cluster next to the language toggle. (default — used by most screens)
   * "split": logo centered (and typically larger) on top, title on bottom-LEFT
   * and `right` slot on bottom-RIGHT. Language toggle stays top-right.
   */
  layout?: "centered" | "split";
  logoSize?: "sm" | "lg";
}) {
  const insets = useSafeAreaInsets();
  const isSplit = layout === "split";
  const topPad = Math.max(insets.top, 0) + (isSplit ? 16 : 60);
  const bottomReserve = isSplit ? 8 : 0;
  const minHeight = topPad + (logoSize === "lg" ? 110 : 80) + bottomReserve;
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.header,
        {
          paddingTop: topPad,
          paddingBottom: isSplit ? 16 : 20,
          minHeight,
        },
      ]}
    >
      {back && (
        <Pressable
          onPress={onBack}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [
            styles.backBtnAbs,
            webCursor,
            { top: Math.max(insets.top, 0) + 44, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather
            name={I18nManager.isRTL ? "chevron-right" : "chevron-left"}
            size={22}
            color={c.textWhite}
          />
        </Pressable>
      )}
      <View
        style={[
          styles.headerLangAbs,
          { top: Math.max(insets.top, 0) + 44 },
        ]}
      >
        {!isSplit && right}
        <LanguageToggle dark />
      </View>
      <View style={styles.headerCenter}>
        <EnzoraLogo variant={logoSize === "lg" ? "headerLg" : "header"} />
        {!isSplit && title && (
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
        )}
        {!isSplit && subtitle && (
          <Text
            style={styles.headerSubtitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        )}
      </View>
      {isSplit && (
        <View style={styles.headerSplitBottom}>
          <View style={{ flex: 1, paddingRight: 12, alignItems: "flex-start" }}>
            {title && (
              <Text
                style={[styles.headerTitle, { textAlign: "left", marginTop: 0 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text
                style={[styles.headerSubtitle, { textAlign: "left" }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {subtitle}
              </Text>
            )}
          </View>
          {right}
        </View>
      )}
    </LinearGradient>
  );
}

// ---------------- Primary Button ----------------
export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  icon,
  variant = "gradient",
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  variant?: "gradient" | "outline" | "white";
  style?: ViewStyle;
}) {
  const inactive = disabled || loading;
  if (variant === "outline") {
    return (
      <Pressable
        onPress={onPress}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: inactive }}
        style={({ pressed }) => [
          styles.btn,
          styles.btnOutline,
          webCursor,
          { opacity: pressed ? 0.7 : inactive ? 0.5 : 1 },
          style,
        ]}
      >
        {icon && <Feather name={icon} size={18} color={c.primary} />}
        <Text style={[styles.btnText, { color: c.primary }]}>{label}</Text>
      </Pressable>
    );
  }
  if (variant === "white") {
    return (
      <Pressable
        onPress={onPress}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: inactive }}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
          webCursor,
          { opacity: pressed ? 0.7 : inactive ? 0.5 : 1 },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <>
            {icon && <Feather name={icon} size={18} color={c.textPrimary} />}
            <Text style={[styles.btnText, { color: c.textPrimary }]}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive }}
      style={({ pressed }) => [
        { opacity: pressed ? 0.85 : inactive ? 0.6 : 1, borderRadius: 14 },
        webCursor,
        style,
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.btn, Platform.OS === "web" ? { pointerEvents: "none" } as ViewStyle : null]}
      >
        {loading ? (
          <ActivityIndicator color={c.textWhite} />
        ) : (
          <>
            {icon && <Feather name={icon} size={20} color={c.textWhite} />}
            <Text style={styles.btnText}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// ---------------- Field / Input ----------------
export function Field({
  label,
  error,
  children,
}: {
  label?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      {children}
      {error && (
        <View style={styles.errRow}>
          <Feather name="alert-triangle" size={12} color={c.alert} />
          <Text style={styles.errText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  secure,
  ...rest
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
} & Omit<TextInputProps, "value" | "onChangeText" | "placeholder">) {
  const [hidden, setHidden] = React.useState(secure);
  return (
    <View style={styles.inputWrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textSecondary}
        secureTextEntry={!!hidden}
        style={styles.input}
        autoCapitalize={secure ? "none" : rest.autoCapitalize}
        {...rest}
      />
      {secure && (
        <Pressable
          onPress={() => setHidden((h) => !h)}
          hitSlop={10}
          style={styles.eye}
        >
          <Feather
            name={hidden ? "eye" : "eye-off"}
            size={18}
            color={c.textSecondary}
          />
        </Pressable>
      )}
    </View>
  );
}

// ---------------- Card ----------------
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------------- Status Card ----------------
export function StatusCard({ status }: { status: "yellow" | "green" | "blue" }) {
  const { t } = useTranslation();
  const config =
    status === "yellow"
      ? {
          bg: c.normalBg,
          border: c.normal,
          icon: "check-circle" as const,
          iconColor: c.normal,
          title: t("woundNormal"),
          sub: t("woundNormalSub"),
        }
      : status === "green"
        ? {
            bg: c.warningBg,
            border: c.warning,
            icon: "alert-triangle" as const,
            iconColor: c.warning,
            title: t("earlySigns"),
            sub: t("earlySignsSub"),
          }
        : {
            bg: c.alertBg,
            border: c.alert,
            icon: "alert-octagon" as const,
            iconColor: c.alert,
            title: t("infectionDetected"),
            sub: t("infectionDetectedSub"),
          };

  return (
    <View
      style={[
        styles.statusCard,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
    >
      <View
        style={[
          styles.statusIconWrap,
          { backgroundColor: "rgba(255,255,255,0.7)" },
        ]}
      >
        <Feather name={config.icon} size={36} color={config.iconColor} />
      </View>
      <Text style={[styles.statusTitle, { color: config.iconColor }]}>
        {config.title}
      </Text>
      <Text style={styles.statusSub}>{config.sub}</Text>
    </View>
  );
}

// ---------------- Empty State ----------------
export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={42} color={c.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
      {action && <View style={{ marginTop: 16 }}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerLangAbs: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: 200,
    zIndex: 2,
  },
  headerSplitBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  backBtnAbs: {
    position: "absolute",
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  headerTitle: {
    color: "#f7f8fa",
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    marginTop: 6,
    textAlign: "center",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  btn: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: c.primary,
  },
  btnText: {
    color: c.textWhite,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: c.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "Inter_600SemiBold",
  },
  inputWrap: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    height: 48,
    borderRadius: 10,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
    paddingHorizontal: 14,
    paddingRight: 40,
    fontSize: 15,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
  },
  eye: {
    position: "absolute",
    right: 10,
    height: 48,
    justifyContent: "center",
  },
  errRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  errText: { fontSize: 12, color: c.alert, fontFamily: "Inter_500Medium" },
  card: {
    backgroundColor: c.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  statusCard: {
    borderRadius: 22,
    borderWidth: 2,
    padding: 22,
    alignItems: "center",
    gap: 12,
  },
  statusIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    fontSize: 19,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  statusSub: {
    fontSize: 13,
    color: c.textPrimary,
    textAlign: "center",
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 8,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(110,117,191,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
  },
  emptySub: {
    fontSize: 12,
    color: c.textSecondary,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
});
