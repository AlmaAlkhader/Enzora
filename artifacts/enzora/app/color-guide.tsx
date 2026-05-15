import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  I18nManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { GradientHeader } from "@/components/Brand";
import { useScrollContentStyle } from "@/components/ScreenContainer";
import { ColorGuideRows } from "@/components/ColorGuide";
import colors from "@/constants/colors";

const c = colors.light;

export default function ColorGuideScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const scrollContentStyle = useScrollContentStyle(24, false);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader layout="split" logoSize="lg" title={t("colorGuide")} />
      <ScrollView
        contentContainerStyle={[{ paddingTop: 20, gap: 18 }, scrollContentStyle]}
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Feather
            name={I18nManager.isRTL ? "chevron-right" : "chevron-left"}
            size={22}
            color={c.primary}
          />
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>

        <Text style={styles.intro}>{t("colorGuideIntro")}</Text>

        <View style={styles.card}>
          <ColorGuideRows large />
        </View>

        <Text style={styles.disclaimer}>{t("colorGuideDisclaimer")}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  backText: {
    color: c.primary,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
    fontSize: 16,
  },
  intro: {
    fontSize: 17,
    color: c.textPrimary,
    fontFamily: "Inter_500Medium",
    lineHeight: 25,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 18,
  },
  disclaimer: {
    fontSize: 14,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    textAlign: "center",
  },
});
