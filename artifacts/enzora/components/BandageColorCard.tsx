import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { softShadow } from "@/components/Brand";
import colors from "@/constants/colors";
import type { SensorStatus } from "@/contexts/AppContext";

const c = colors.light;

type BandageStatus = SensorStatus | null;

interface ToneSpec {
  glow: string;
  ring: string;
  bg: string;
}

const tones: Record<"yellow" | "green" | "blue" | "waiting", ToneSpec> = {
  yellow: { glow: "#F4C95D", ring: "#F7D98A", bg: "#FFF8E5" },
  green: { glow: "#7FB069", ring: "#A8CFA0", bg: "#EAF4E5" },
  blue: { glow: "#6EA8FE", ring: "#A6C4FF", bg: "#E5EEFF" },
  waiting: { glow: "#C9CCD9", ring: "#DCDFE8", bg: "#F2F3F7" },
};

// Soft, patient-facing card. Shows a gently pulsing color circle keyed off
// `status` only — no raw R/G/B numbers exposed to elderly users.
export function BandageColorCard({ status }: { status: BandageStatus }) {
  const { t } = useTranslation();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const key: "yellow" | "green" | "blue" | "waiting" =
    status === "yellow" || status === "green" || status === "blue"
      ? status
      : "waiting";
  const tone = tones[key];

  const labelMap = {
    yellow: t("bandageColorYellowLabel"),
    green: t("bandageColorGreenLabel"),
    blue: t("bandageColorBlueLabel"),
    waiting: t("bandageColorWaitingLabel"),
  } as const;
  const helperMap = {
    yellow: t("bandageColorYellowHelper"),
    green: t("bandageColorGreenHelper"),
    blue: t("bandageColorBlueHelper"),
    waiting: t("bandageColorWaitingHelper"),
  } as const;

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0.15],
  });

  return (
    <View style={[styles.card, { backgroundColor: tone.bg }, softShadow]}>
      <Text style={styles.title}>{t("bandageColorTitle")}</Text>

      <View style={styles.glowWrap}>
        <Animated.View
          style={[
            styles.glowOuter,
            { backgroundColor: tone.glow, transform: [{ scale }], opacity },
          ]}
        />
        <View style={[styles.ring, { borderColor: tone.ring }]}>
          <View style={[styles.inner, { backgroundColor: tone.glow }]} />
        </View>
      </View>

      <Text style={styles.label}>{labelMap[key]}</Text>
      <Text style={styles.helper}>{helperMap[key]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 13,
    color: c.textSecondary,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  glowWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  glowOuter: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  ring: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  label: {
    fontSize: 20,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  helper: {
    fontSize: 15,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 21,
  },
});
