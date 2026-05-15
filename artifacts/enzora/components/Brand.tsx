import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import {
  ActivityIndicator,
  I18nManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Svg, { Circle } from "react-native-svg";

import colors from "@/constants/colors";
import { LARGE_PHONE_MIN_WIDTH } from "@/constants/layout";
import { useApp } from "@/contexts/AppContext";

const c = colors.light;

const LOGO_SOURCE = require("@/assets/images/enzora-logo.png");
const LOGO_ASPECT = 787 / 1024;
// Icon-only mark (cropped from the full logo) — used in every in-app header
// so headers carry only the clean Enzora symbol without the "Enzora" wordmark
// or "Smart Wound Patch" tagline. The full logo is reserved for the auth
// screen (the user's first branded entry point).
const MARK_SOURCE = require("@/assets/images/enzora-mark.png");
// The mark asset is intentionally a transparent SQUARE (with the icon glyph
// optically centered inside). Keeping aspect 1:1 here means the rendered
// image is itself a square, which centers cleanly inside the circular
// medallion regardless of size.
const MARK_ASPECT = 1;

const webCursor =
  Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : null;

// Soft elevation used by all white cards. A near-invisible navy shadow plus
// a 1px hairline border that matches the mockup's `border-[#E4EAF5]`.
export const softShadow = Platform.select<ViewStyle>({
  ios: {
    shadowColor: "#1B2A6B",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 2 },
  default: {
    boxShadow: "0 4px 20px rgba(27,42,107,0.04)",
  } as object,
}) as ViewStyle;

// ---------------- Enzora Logo ----------------
export function EnzoraLogo({
  variant = "header",
}: {
  variant?:
    | "header"
    | "headerLg"
    | "splash"
    | "auth"
    | "round"
    | "brandTile"
    | "compactTile";
  color?: string;
}) {
  if (variant === "round") {
    // Small white circle with the icon-only mark inside — used in the
    // compact header.
    const containerH = 40;
    const imageH = Math.round(containerH * 0.7);
    const imageW = Math.round(imageH * MARK_ASPECT);
    return (
      <View style={styles.logoCircle}>
        <Image
          source={MARK_SOURCE}
          style={{ width: imageW, height: imageH, backgroundColor: "transparent" }}
          contentFit="contain"
        />
      </View>
    );
  }
  if (variant === "brandTile") {
    // Premium WHITE CIRCULAR medallion for the Home hero header. Shows the
    // icon-only Enzora mark — no wordmark, no tagline — so the symbol reads
    // as the primary brand element on the screen.
    const tile = 96;
    const imageH = Math.round(tile * 0.7);
    const imageW = Math.round(imageH * MARK_ASPECT);
    return (
      <View
        style={[
          styles.brandCircle,
          { width: tile, height: tile, borderRadius: tile / 2 },
        ]}
      >
        <Image
          source={MARK_SOURCE}
          style={{ width: imageW, height: imageH, backgroundColor: "transparent" }}
          contentFit="contain"
        />
      </View>
    );
  }
  if (variant === "compactTile") {
    // Same white circular medallion, scaled down — used in every inner
    // screen header so all sections clearly belong to one branded family.
    // Icon-only: never the "Enzora" wordmark or "Smart Wound Patch" tagline.
    const tile = 60;
    const imageH = Math.round(tile * 0.7);
    const imageW = Math.round(imageH * MARK_ASPECT);
    return (
      <View
        style={[
          styles.brandCircle,
          { width: tile, height: tile, borderRadius: tile / 2 },
        ]}
      >
        <Image
          source={MARK_SOURCE}
          style={{ width: imageW, height: imageH, backgroundColor: "transparent" }}
          contentFit="contain"
        />
      </View>
    );
  }
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
          style={{ width: imageW, height: imageH, backgroundColor: "transparent" }}
          contentFit="contain"
        />
      </View>
    );
  }
  const height = variant === "splash" ? 160 : variant === "headerLg" ? 56 : 32;
  const width = Math.round(height * LOGO_ASPECT);
  return (
    <Image
      source={LOGO_SOURCE}
      style={{ width, height, backgroundColor: "transparent" }}
      contentFit="contain"
    />
  );
}

export function Logo({ size = "sm" }: { size?: "sm" | "lg"; color?: string }) {
  return <EnzoraLogo variant={size === "lg" ? "splash" : "header"} />;
}

// ---------------- Language Toggle (pill style) ----------------
export function LanguageToggle({ dark: _dark = false }: { dark?: boolean }) {
  const { language, toggleLanguage } = useApp();
  const isEn = language === "en";
  return (
    <Pressable
      onPress={() => void toggleLanguage()}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Toggle language"
      style={({ pressed }) => [
        styles.langWrap,
        webCursor,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.langSeg, isEn && styles.langSegActive]}>
        <Text style={[styles.langText, isEn && styles.langTextActive]}>EN</Text>
      </View>
      <View style={[styles.langSeg, !isEn && styles.langSegActive]}>
        <Text style={[styles.langText, !isEn && styles.langTextActive]}>AR</Text>
      </View>
    </Pressable>
  );
}

// ---------------- App Header (unified branded header, compact variant) ---------
// One reusable header for every inner screen (Wounds, History, Ask AI, Alerts,
// Profile, Wound Detail, Color Guide, modals…). Top row has the Enzora logo
// lockup (or a back button) on the leading side and EN/AR on the trailing
// side. Optional title/subtitle row sits beneath with the same spacing rhythm
// as the home `BrandedHeader`. Legacy props (`layout`, `logoSize`) are
// accepted as no-ops so existing call sites keep working.
export function GradientHeader({
  title,
  subtitle,
  right,
  back,
  onBack,
  titleStyle,
  greeting,
  layout: _layout,
  logoSize: _logoSize,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  back?: boolean;
  onBack?: () => void;
  titleStyle?: StyleProp<TextStyle>;
  /** Optional small line above title, e.g. "Hello,". */
  greeting?: string;
  /** Deprecated — kept for back-compat, ignored. */
  layout?: "centered" | "split";
  /** Deprecated — kept for back-compat, ignored. */
  logoSize?: "sm" | "lg";
}) {
  const insets = useSafeAreaInsets();
  const hasTitleRow = !!(title || subtitle || greeting);
  return (
    <View
      style={[
        styles.appHeader,
        { paddingTop: Math.max(insets.top, 12) + 18 },
        !hasTitleRow && { paddingBottom: 14 },
      ]}
    >
      <View style={styles.appHeaderTopRow}>
        {back ? (
          <Pressable
            onPress={onBack}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [
              styles.appBackBtn,
              webCursor,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather
              name={I18nManager.isRTL ? "chevron-right" : "chevron-left"}
              size={22}
              color={c.navy}
            />
          </Pressable>
        ) : (
          <EnzoraLogo variant="compactTile" />
        )}
        <View style={{ flex: 1 }} />
        {right ? <View style={{ marginRight: 8 }}>{right}</View> : null}
        <LanguageToggle />
      </View>
      {hasTitleRow ? (
        <View style={styles.appTitleBlock}>
          {greeting ? (
            <Text style={styles.appGreeting} numberOfLines={1}>
              {greeting}
            </Text>
          ) : null}
          {title ? (
            <Text
              style={[
                greeting ? styles.appName : styles.appTitle,
                titleStyle,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={styles.appSubtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// Alias for clarity in new code; identical behaviour.
export const AppHeader = GradientHeader;

// ---------------- Branded Header (home screen) ----------------
// Premium two-row header used by the Home screen. Top row centers the
// Enzora mark + wordmark with the language toggle floating top-right.
// Bottom row hosts a large, calm greeting. Generous top breathing room.
export function BrandedHeader({
  greeting,
  name,
}: {
  greeting: string;
  name: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.brandHeader,
        { paddingTop: Math.max(insets.top, 12) + 24 },
      ]}
    >
      <View style={styles.brandTopRow}>
        <View style={styles.brandLockup}>
          <EnzoraLogo variant="brandTile" />
        </View>
        <View style={styles.brandLangAbsolute}>
          <LanguageToggle />
        </View>
      </View>
      <View style={{ marginTop: 22, paddingHorizontal: 4 }}>
        <Text style={styles.brandGreeting}>{greeting}</Text>
        <Text style={styles.brandName} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </View>
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
  variant?: "gradient" | "outline" | "white" | "soft";
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
        {icon ? <Feather name={icon} size={18} color={c.primary} /> : null}
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
          styles.btnWhite,
          webCursor,
          { opacity: pressed ? 0.7 : inactive ? 0.5 : 1 },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <>
            {icon ? <Feather name={icon} size={18} color={c.textPrimary} /> : null}
            <Text style={[styles.btnText, { color: c.textPrimary }]}>{label}</Text>
          </>
        )}
      </Pressable>
    );
  }
  if (variant === "soft") {
    return (
      <Pressable
        onPress={onPress}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: inactive }}
        style={({ pressed }) => [
          styles.btn,
          styles.btnSoft,
          webCursor,
          { opacity: pressed ? 0.7 : inactive ? 0.5 : 1 },
          style,
        ]}
      >
        {icon ? <Feather name={icon} size={18} color={c.primary} /> : null}
        <Text style={[styles.btnText, { color: c.primary }]}>{label}</Text>
      </Pressable>
    );
  }

  // Solid indigo (replaces gradient — flatter, calmer for medical UI).
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive }}
      style={({ pressed }) => [
        styles.btn,
        styles.btnSolid,
        webCursor,
        { opacity: pressed ? 0.85 : inactive ? 0.6 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.textWhite} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={18} color={c.textWhite} /> : null}
          <Text style={styles.btnText}>{label}</Text>
        </>
      )}
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
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
      {error ? (
        <View style={styles.errRow}>
          <Feather name="alert-triangle" size={12} color={c.alert} />
          <Text style={styles.errText}>{error}</Text>
        </View>
      ) : null}
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
  // Merge caller style ON TOP of the base input style. Spreading `...rest`
  // after `style={styles.input}` would replace it entirely (RN does not merge
  // `style` props), which made multiline fields lose the white background,
  // border, font, etc.
  const { style: extraStyle, ...restProps } = rest;
  return (
    <View style={styles.inputWrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textSecondary}
        secureTextEntry={!!hidden}
        autoCapitalize={secure ? "none" : rest.autoCapitalize}
        {...restProps}
        style={[styles.input, extraStyle]}
      />
      {secure ? (
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
      ) : null}
    </View>
  );
}

// ---------------- Card ----------------
export function Card({
  children,
  style,
  flat,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Drop the elevation shadow (e.g. when nested inside another card). */
  flat?: boolean;
}) {
  return (
    <View style={[styles.card, !flat && softShadow, style]}>{children}</View>
  );
}

// ---------------- Section Title ----------------
export function SectionTitle({
  children,
  style,
  right,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, style]}>{children}</Text>
      {right}
    </View>
  );
}

// ---------------- Icon Chip ----------------
// A small rounded square with a tinted background — used in stat cards
// and list rows to host a Feather icon.
export function IconChip({
  icon,
  tone = "primary",
  size = 36,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  tone?: "primary" | "blue" | "green" | "yellow" | "violet" | "neutral";
  size?: number;
}) {
  const palette: Record<string, { bg: string; fg: string }> = {
    primary: { bg: "rgba(110,117,191,0.10)", fg: c.primary },
    blue: { bg: c.paleBlue, fg: c.alert },
    green: { bg: "rgba(123,196,127,0.18)", fg: c.warning },
    yellow: { bg: "rgba(255,183,3,0.14)", fg: c.normal },
    violet: { bg: "rgba(136,121,184,0.14)", fg: c.primaryDark },
    neutral: { bg: c.bg, fg: c.textSecondary },
  };
  const p = palette[tone] ?? palette.primary;
  const iconSize = Math.round(size * 0.5);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: p.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather name={icon} size={iconSize} color={p.fg} />
    </View>
  );
}

// ---------------- Status Pill ----------------
export function StatusPill({
  status,
  label,
}: {
  status: "yellow" | "green" | "blue";
  label?: string;
}) {
  const { t } = useTranslation();
  const cfg = {
    yellow: { dot: c.normal, fg: "#B97A06", bg: c.normalBg, lbl: t("statusYellow") },
    green: { dot: c.warning, fg: "#3F8F4F", bg: c.warningBg, lbl: t("statusGreen") },
    blue: { dot: c.alert, fg: "#1F60B0", bg: c.alertBg, lbl: t("statusBlue") },
  }[status];
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.pillText, { color: cfg.fg }]}>{label ?? cfg.lbl}</Text>
    </View>
  );
}

// ---------------- Circular Progress ----------------
export function CircularProgress({
  size = 64,
  stroke = 6,
  value,
  color,
  trackColor,
  centerText,
  centerSub,
}: {
  size?: number;
  stroke?: number;
  /** 0..100 */
  value: number;
  color?: string;
  trackColor?: string;
  centerText?: string;
  centerSub?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = circ - (circ * pct) / 100;
  const fg = color ?? c.primary;
  const bg = trackColor ?? c.bg;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={bg} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fg}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill as ViewStyle}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {centerText ? (
            <Text
              style={{
                color: c.textPrimary,
                fontFamily: "Inter_700Bold",
                fontWeight: "800",
                fontSize: Math.round(size * 0.26),
                lineHeight: Math.round(size * 0.3),
              }}
            >
              {centerText}
            </Text>
          ) : null}
          {centerSub ? (
            <Text
              style={{
                color: c.textSecondary,
                fontFamily: "Inter_600SemiBold",
                fontSize: Math.round(size * 0.13),
                marginTop: 2,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              {centerSub}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ---------------- Stat Tile (square card with icon + value + caption) ----------------
export function StatTile({
  icon,
  tone = "primary",
  value,
  unit,
  caption,
  style,
}: {
  icon?: React.ComponentProps<typeof Feather>["name"];
  tone?: React.ComponentProps<typeof IconChip>["tone"];
  value: string | number;
  unit?: string;
  caption: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.statTile, softShadow, style]}>
      {icon ? <IconChip icon={icon} tone={tone} size={32} /> : null}
      <View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <Text style={styles.statValue}>{value}</Text>
          {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
        </View>
        <Text style={styles.statCaption} numberOfLines={2}>
          {caption}
        </Text>
      </View>
    </View>
  );
}

// ---------------- Status Card (hero) ----------------
// Calm, elderly-friendly hero card. No percent, no ring — just a clear
// status badge, a friendly title, supporting body, last-check time, and a
// big "View Details" action.
export function StatusCard({
  status,
  lastCheckLabel,
  onPress,
  ctaLabel,
}: {
  status: "yellow" | "green" | "blue";
  /** Deprecated — kept for back-compat, ignored. */
  percent?: number;
  lastCheckLabel?: string;
  onPress?: () => void;
  ctaLabel?: string;
}) {
  const { t } = useTranslation();
  // Pro Max / Plus iPhones (≥430px wide) get a roomier hero so the title
  // and CTA fill the extra width without looking lonely.
  const { width } = useWindowDimensions();
  const isLarge = width >= LARGE_PHONE_MIN_WIDTH;
  const cfg = {
    yellow: {
      color: c.normal,
      bg: c.normalBg,
      icon: "check-circle" as const,
      title: t("woundNormal"),
      sub: t("woundNormalSub"),
      pillFg: "#B97A06",
      pillLabel: t("statusYellow"),
    },
    green: {
      color: c.warning,
      bg: c.warningBg,
      icon: "eye" as const,
      title: t("earlySigns"),
      sub: t("earlySignsSub"),
      pillFg: "#3F8F4F",
      pillLabel: t("statusGreen"),
    },
    blue: {
      color: c.alert,
      bg: c.alertBg,
      icon: "phone-call" as const,
      title: t("infectionDetected"),
      sub: t("infectionDetectedSub"),
      pillFg: "#1F60B0",
      pillLabel: t("statusBlue"),
    },
  }[status];
  return (
    <View
      style={[
        styles.statusCard,
        isLarge && {
          paddingTop: 32,
          paddingBottom: 26,
          paddingHorizontal: 28,
          gap: 14,
        },
        softShadow,
      ]}
    >
      <View style={[styles.statusAccent, { backgroundColor: cfg.color }]} />
      <View style={styles.statusBadgeRow}>
        <View
          style={[
            styles.statusIconWrap,
            isLarge && { width: 64, height: 64, borderRadius: 32 },
            { backgroundColor: cfg.bg },
          ]}
        >
          <Feather name={cfg.icon} size={isLarge ? 32 : 28} color={cfg.color} />
        </View>
        <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
          <View style={[styles.pillDot, { backgroundColor: cfg.color }]} />
          <Text style={[styles.pillText, { color: cfg.pillFg }]}>
            {cfg.pillLabel}
          </Text>
        </View>
      </View>
      <Text
        style={[
          styles.statusTitle,
          isLarge && { fontSize: 28, lineHeight: 34 },
        ]}
      >
        {cfg.title}
      </Text>
      <Text
        style={[
          styles.statusSub,
          isLarge && { fontSize: 17, lineHeight: 25 },
        ]}
      >
        {cfg.sub}
      </Text>
      {lastCheckLabel ? (
        <View style={styles.statusMetaRow}>
          <Feather name="clock" size={isLarge ? 16 : 14} color={c.textSecondary} />
          <Text
            style={[
              styles.statusMeta,
              isLarge && { fontSize: 15 },
            ]}
          >
            {lastCheckLabel}
          </Text>
        </View>
      ) : null}
      {onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.statusCta,
            isLarge && { paddingVertical: 18, marginTop: 12 },
            webCursor,
            { opacity: pressed ? 0.85 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel ?? t("viewDetails")}
        >
          <Text
            style={[
              styles.statusCtaText,
              isLarge && { fontSize: 18 },
            ]}
          >
            {ctaLabel ?? t("viewDetails")}
          </Text>
          <Feather
            name={I18nManager.isRTL ? "chevron-left" : "chevron-right"}
            size={isLarge ? 20 : 18}
            color={c.textWhite}
          />
        </Pressable>
      ) : null}
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
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.bg,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
    minWidth: 0,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerGreeting: {
    fontSize: 13,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  headerName: {
    fontSize: 20,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  headerTitle: {
    fontSize: 20,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  // Language pill
  langWrap: {
    flexDirection: "row",
    backgroundColor: c.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    padding: 3,
    alignItems: "center",
  },
  langSeg: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  langSegActive: {
    backgroundColor: c.primary,
  },
  langText: {
    fontSize: 11,
    fontWeight: "700",
    color: c.textSecondary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  langTextActive: {
    color: c.textWhite,
  },

  // Buttons
  btn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
  },
  btnSolid: {
    backgroundColor: c.primary,
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: c.primary,
  },
  btnWhite: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  btnSoft: {
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.border,
  },
  btnText: {
    color: c.textWhite,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },

  // Inputs
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: c.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "Inter_600SemiBold",
  },
  inputWrap: { position: "relative", justifyContent: "center" },
  input: {
    height: 50,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 14,
    paddingRight: 40,
    fontSize: 15,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
  },
  eye: { position: "absolute", right: 10, height: 48, justifyContent: "center" },
  errRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  errText: { fontSize: 12, color: c.alert, fontFamily: "Inter_500Medium" },

  // Card
  card: {
    backgroundColor: c.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: c.border,
  },

  // Section title
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 17,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  // Status pill
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  // Status card (hero)
  statusCard: {
    backgroundColor: c.card,
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
    gap: 12,
  },
  statusAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  statusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  statusIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    fontSize: 24,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  statusMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  statusMeta: {
    fontSize: 14,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  statusSub: {
    fontSize: 16,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
  },
  statusCta: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.primary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  statusCtaText: {
    fontSize: 16,
    color: c.textWhite,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },

  // Branded home header
  brandHeader: {
    paddingHorizontal: 22,
    paddingBottom: 8,
    backgroundColor: c.bg,
  },
  brandTopRow: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
  },
  brandLockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandTile: {
    borderRadius: 18,
    backgroundColor: "#EDEBFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border,
  },
  brandCircle: {
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#EDEBFF",
    shadowColor: "#1B2A6B",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  brandWordmark: {
    fontSize: 36,
    color: c.navy,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  brandLangAbsolute: {
    position: "absolute",
    right: 0,
    top: 22,
  },
  brandGreeting: {
    fontSize: 18,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  brandName: {
    fontSize: 36,
    color: c.navy,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    letterSpacing: -0.8,
    marginTop: 4,
    lineHeight: 42,
  },

  // Unified inner-screen branded header (compact variant of BrandedHeader)
  appHeader: {
    paddingHorizontal: 22,
    backgroundColor: c.bg,
  },
  appHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  appLockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appWordmark: {
    fontSize: 20,
    color: c.navy,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  appBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  appTitleBlock: {
    marginTop: 18,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  appGreeting: {
    fontSize: 15,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  appTitle: {
    fontSize: 26,
    color: c.navy,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  appName: {
    fontSize: 30,
    color: c.navy,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  appSubtitle: {
    fontSize: 14,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    lineHeight: 20,
  },

  // Stat tile
  statTile: {
    backgroundColor: c.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    flex: 1,
    minHeight: 110,
    justifyContent: "space-between",
    gap: 10,
  },
  statValue: {
    fontSize: 22,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 13,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  statCaption: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },

  // Empty
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
    backgroundColor: "rgba(110,117,191,0.10)",
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
    fontSize: 13,
    color: c.textSecondary,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
});
