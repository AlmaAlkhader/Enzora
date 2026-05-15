import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  I18nManager,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { EnzoraLogo, LanguageToggle } from "@/components/Brand";
import colors, { brandGradient } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

const c = colors.light;
const { width: SCREEN_W } = Dimensions.get("window");

const DOT_COLORS = ["#FFB703", "#7BC47F", "#4A90E2"] as const;

// ---------------- Background blobs ----------------
function BlobBackground() {
  const opacity1 = useSharedValue(0);
  const opacity2 = useSharedValue(0);

  useEffect(() => {
    opacity1.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.5, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
    opacity2.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [opacity1, opacity2]);

  const blob1Style = useAnimatedStyle(() => ({ opacity: opacity1.value }));
  const blob2Style = useAnimatedStyle(() => ({ opacity: opacity2.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.blob1, blob1Style]}>
        <LinearGradient
          colors={["#C9C3F4", "transparent"]}
          style={{ flex: 1, borderRadius: 160 }}
        />
      </Animated.View>
      <Animated.View style={[styles.blob2, blob2Style]}>
        <LinearGradient
          colors={["#DFF3FF", "transparent"]}
          style={{ flex: 1, borderRadius: 140 }}
        />
      </Animated.View>
    </View>
  );
}

// ---------------- Reusable pulsing dot ----------------
function PulsingDot({
  color,
  delay,
  size = 16,
}: {
  color: string;
  delay: number;
  size?: number;
}) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.25, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    glowOpacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.55, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.2, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [scale, glowOpacity, delay]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const halo = Math.round(size * 1.5);

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: halo,
        height: halo,
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            width: halo,
            height: halo,
            borderRadius: halo / 2,
            backgroundColor: color,
          },
          glowStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          dotStyle,
        ]}
      />
    </View>
  );
}

// ---------------- Floating wrapper ----------------
function Floating({ children }: { children: React.ReactNode }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [y]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// ---------------- Page 1: smart bandage card ----------------
function HeroBandage() {
  const { t } = useTranslation();
  const glow = useSharedValue(0.25);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.2, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [glow]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View style={styles.heroOuter}>
      <Animated.View style={[styles.heroGlow, glowStyle]} />
      <Floating>
        <View style={styles.heroCard}>
          <MaterialCommunityIcons name="bandage" size={56} color={c.primary} />
          <View style={styles.dotsRowSmall}>
            {DOT_COLORS.map((color, i) => (
              <PulsingDot key={color} color={color} delay={i * 350} size={12} />
            ))}
          </View>
          <Text style={styles.heroLabel}>{t("landingHeroLabel")}</Text>
        </View>
      </Floating>
    </View>
  );
}

// ---------------- Page 2: three color pills ----------------
function HeroColors() {
  return (
    <View style={styles.heroOuter}>
      <Floating>
        <View style={styles.colorsCard}>
          {DOT_COLORS.map((color, i) => (
            <View key={color} style={styles.colorCell}>
              <PulsingDot color={color} delay={i * 400} size={28} />
            </View>
          ))}
        </View>
      </Floating>
    </View>
  );
}

// ---------------- Page 3: doctor report card ----------------
function HeroSupport() {
  const checkScale = useSharedValue(0.9);
  useEffect(() => {
    checkScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.95, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [checkScale]);
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <View style={styles.heroOuter}>
      <Floating>
        <View style={styles.reportCard}>
          <View style={styles.reportHeaderRow}>
            <View style={styles.reportIconChip}>
              <Feather name="file-text" size={18} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.reportLineLong} />
              <View style={styles.reportLineShort} />
            </View>
          </View>
          <View style={{ gap: 8, marginTop: 14 }}>
            <View style={styles.reportLineFull} />
            <View style={styles.reportLineFull} />
            <View style={styles.reportLineMid} />
          </View>
          <View style={styles.reportFooter}>
            <View style={styles.chatChip}>
              <Feather name="message-circle" size={14} color={c.primary} />
            </View>
            <Animated.View style={[styles.shieldChip, checkStyle]}>
              <Feather name="check" size={16} color="#FFFFFF" />
            </Animated.View>
          </View>
        </View>
      </Floating>
    </View>
  );
}

// ---------------- Pages metadata ----------------
type Page = {
  Hero: React.ComponentType;
  titleKey: string;
  subKey: string;
};

const PAGES: Page[] = [
  { Hero: HeroBandage, titleKey: "onboardSmartTitle", subKey: "onboardSmartSub" },
  { Hero: HeroColors, titleKey: "onboardAlertsTitle", subKey: "onboardAlertsSub" },
  { Hero: HeroSupport, titleKey: "onboardSupportTitle", subKey: "onboardSupportSub" },
];

// ---------------- Main screen ----------------
export default function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setHasSeenOnboarding } = useApp();
  const insets = useSafeAreaInsets();

  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });
    logoScale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.back(1.2)),
    });
  }, [logoOpacity, logoScale]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const goToAuth = async (intent: "signup" | "login") => {
    await setHasSeenOnboarding(true);
    router.replace(`/auth?intent=${intent}`);
  };

  const onSkip = () => {
    void goToAuth("signup");
  };

  const onNext = () => {
    if (index < PAGES.length - 1) {
      const nextIdx = index + 1;
      setIndex(nextIdx);
      scrollRef.current?.scrollTo({ x: nextIdx * SCREEN_W, animated: true });
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / SCREEN_W);
    if (i !== index) setIndex(i);
  };

  const isRTL = I18nManager.isRTL;
  const isLast = index === PAGES.length - 1;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <BlobBackground />

      {/* Top bar: logo + language toggle */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 12 },
        ]}
      >
        <Animated.View style={logoStyle}>
          <EnzoraLogo variant="auth" />
        </Animated.View>
        <View
          style={[
            styles.langWrap,
            isRTL ? { left: 20 } : { right: 20 },
          ]}
        >
          <LanguageToggle />
        </View>
      </View>

      {/* Pager */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        bounces={false}
        style={{ flex: 1 }}
      >
        {PAGES.map((p, i) => {
          const Hero = p.Hero;
          return (
            <View key={i} style={[styles.page, { width: SCREEN_W }]}>
              <Hero />
              <View style={styles.textBlock}>
                <Text style={styles.title}>{t(p.titleKey)}</Text>
                <Text style={styles.subtitle}>{t(p.subKey)}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <Pressable
            key={i}
            onPress={() => {
              setIndex(i);
              scrollRef.current?.scrollTo({ x: i * SCREEN_W, animated: true });
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Page ${i + 1}`}
            style={[
              styles.dot,
              {
                width: i === index ? 24 : 8,
                backgroundColor: i === index ? c.primary : c.lavender,
              },
            ]}
          />
        ))}
      </View>

      {/* Bottom actions */}
      <View
        style={[
          styles.actions,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        {isLast ? (
          <>
            <Pressable
              onPress={() => void goToAuth("signup")}
              accessibilityRole="button"
              accessibilityLabel={t("landingCta")}
              style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
            >
              <LinearGradient
                colors={brandGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>{t("landingCta")}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => void goToAuth("login")}
              accessibilityRole="button"
              accessibilityLabel={t("landingSecondary")}
              hitSlop={10}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.secondaryBtnText}>
                {t("landingSecondary")}
              </Text>
            </Pressable>
          </>
        ) : (
          <View
            style={[
              styles.row,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
            <Pressable
              onPress={onSkip}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("skipShort")}
              style={({ pressed }) => [
                styles.skipBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={styles.skipText}>{t("skipShort")}</Text>
            </Pressable>
            <Pressable
              onPress={onNext}
              accessibilityRole="button"
              accessibilityLabel={t("nextStep")}
              style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1, flex: 1 }]}
            >
              <LinearGradient
                colors={brandGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextBtn}
              >
                <Text style={styles.primaryBtnText}>{t("nextStep")}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blob1: {
    position: "absolute",
    top: -60,
    left: -80,
    width: 320,
    height: 320,
  },
  blob2: {
    position: "absolute",
    bottom: 80,
    right: -60,
    width: 280,
    height: 280,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    minHeight: 60,
  },
  langWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  page: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  // ---- Hero common ----
  heroOuter: {
    alignItems: "center",
    justifyContent: "center",
    height: 220,
    width: "100%",
    marginBottom: 24,
  },
  // ---- Page 1: bandage ----
  heroGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: c.lavender,
  },
  heroCard: {
    backgroundColor: c.card,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 22,
    alignItems: "center",
    gap: 12,
    shadowColor: "#1B2A6B",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    borderWidth: 1,
    borderColor: c.border,
  },
  dotsRowSmall: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.4,
  },
  // ---- Page 2: colors ----
  colorsCard: {
    backgroundColor: c.card,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#1B2A6B",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    borderWidth: 1,
    borderColor: c.border,
  },
  colorCell: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  // ---- Page 3: report ----
  reportCard: {
    backgroundColor: c.card,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    width: 240,
    shadowColor: "#1B2A6B",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    borderWidth: 1,
    borderColor: c.border,
  },
  reportHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reportIconChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EDEBFF",
    alignItems: "center",
    justifyContent: "center",
  },
  reportLineLong: {
    height: 8,
    width: "75%",
    borderRadius: 4,
    backgroundColor: c.lavender,
  },
  reportLineShort: {
    height: 6,
    width: "45%",
    borderRadius: 3,
    backgroundColor: c.border,
  },
  reportLineFull: {
    height: 6,
    width: "100%",
    borderRadius: 3,
    backgroundColor: c.border,
  },
  reportLineMid: {
    height: 6,
    width: "60%",
    borderRadius: 3,
    backgroundColor: c.border,
  },
  reportFooter: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EDEBFF",
    alignItems: "center",
    justifyContent: "center",
  },
  shieldChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7BC47F",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7BC47F",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  // ---- Text ----
  textBlock: {
    gap: 10,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    lineHeight: 36,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 320,
  },
  // ---- Dots ----
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 18,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  // ---- Actions ----
  actions: {
    paddingHorizontal: 24,
    gap: 12,
    paddingTop: 4,
  },
  row: {
    alignItems: "center",
    gap: 12,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: c.textSecondary,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  nextBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  skipText: {
    color: c.textSecondary,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});
