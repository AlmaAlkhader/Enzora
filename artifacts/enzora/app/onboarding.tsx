import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { LanguageToggle, PrimaryButton } from "@/components/Brand";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

const c = colors.light;

interface Slide {
  bg: [string, string];
  icon: React.ReactNode;
  titleKey: string;
  subKey: string;
}

const colorDotStyle = {
  width: 56,
  height: 56,
  borderRadius: 28,
};

const slides: Slide[] = [
  {
    bg: ["#EEF2FF", "#F8F9FF"],
    icon: (
      <MaterialCommunityIcons name="bandage" size={120} color="#6E75BF" />
    ),
    titleKey: "onboard1Title",
    subKey: "onboard1Sub",
  },
  {
    bg: ["#F0FDF4", "#F8F9FF"],
    icon: (
      <View style={{ flexDirection: "row", gap: 16 }}>
        <View style={[colorDotStyle, { backgroundColor: "#FFB703" }]} />
        <View style={[colorDotStyle, { backgroundColor: "#FF6B6B" }]} />
        <View style={[colorDotStyle, { backgroundColor: "#EF233C" }]} />
      </View>
    ),
    titleKey: "onboard2Title",
    subKey: "onboard2Sub",
  },
  {
    bg: ["#FFF7ED", "#F8F9FF"],
    icon: <Feather name="bell" size={120} color="#6E75BF" />,
    titleKey: "onboard3Title",
    subKey: "onboard3Sub",
  },
];

export default function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setHasSeenOnboarding } = useApp();
  const [index, setIndex] = useState(0);

  const next = async () => {
    if (index < slides.length - 1) {
      setIndex(index + 1);
    } else {
      await setHasSeenOnboarding(true);
      router.replace("/auth");
    }
  };

  const skip = async () => {
    await setHasSeenOnboarding(true);
    router.replace("/auth");
  };

  const slide = slides[index]!;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.topBar}>
        <Pressable
          onPress={skip}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("skip")}
        >
          <Text style={styles.skip}>{t("skip")}</Text>
        </Pressable>
        <LanguageToggle />
      </View>
      <LinearGradient colors={slide.bg} style={styles.slide}>
        <View style={styles.illustration}>{slide.icon}</View>
        <Text style={styles.title}>{t(slide.titleKey)}</Text>
        <Text style={styles.subtitle}>{t(slide.subKey)}</Text>
      </LinearGradient>
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <Pressable
            key={i}
            onPress={() => setIndex(i)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Slide ${i + 1}`}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? c.primary : c.border,
                width: i === index ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.actions}>
        <PrimaryButton
          label={index === slides.length - 1 ? t("getStarted") : t("continue")}
          icon={index === slides.length - 1 ? "arrow-right" : undefined}
          onPress={next}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  illustration: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: c.textPrimary,
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: c.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
  },
  dot: { height: 8, borderRadius: 4 },
  actions: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 },
  skip: {
    color: c.textSecondary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  colorRow: { flexDirection: "row", gap: 16 },
  colorDot: { width: 56, height: 56, borderRadius: 28 },
});
