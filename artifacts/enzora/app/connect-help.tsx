import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { GradientHeader, PrimaryButton } from "@/components/Brand";
import colors from "@/constants/colors";

const c = colors.light;

export default function ConnectHelp() {
  const { t } = useTranslation();
  const router = useRouter();

  const steps = [
    {
      icon: "power" as const,
      title: t("setupStep1Title"),
      body: t("setupStep1"),
    },
    {
      icon: "wifi" as const,
      title: t("setupStep2Title"),
      body: t("setupStep2"),
    },
    {
      icon: "smartphone" as const,
      title: t("setupStep3Title"),
      body: t("setupStep3"),
    },
  ];
  const trouble = [t("trouble1"), t("trouble2"), t("trouble3"), t("trouble4")];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader
        title={t("setupTitle")}
        back
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
        {steps.map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.stepIcon}>
              <Feather name={s.icon} size={28} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.stepTitle}>
                {i + 1}. {s.title}
              </Text>
              <Text style={styles.stepBody}>{s.body}</Text>
            </View>
          </View>
        ))}

        <View style={styles.troubleCard}>
          <Text style={styles.troubleTitle}>{t("troubleshooting")}</Text>
          {trouble.map((line, i) => (
            <View key={i} style={styles.troubleRow}>
              <Text style={styles.troubleNum}>{i + 1}.</Text>
              <Text style={styles.troubleText}>{line}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton
          label={t("gotIt")}
          icon="check"
          onPress={() => router.back()}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  step: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: c.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  stepIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(110,117,191,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  stepBody: {
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  troubleCard: {
    backgroundColor: c.normalBg,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  troubleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: c.textPrimary,
    marginBottom: 4,
    fontFamily: "Inter_700Bold",
  },
  troubleRow: { flexDirection: "row", gap: 8 },
  troubleNum: {
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
  },
  troubleText: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
  },
});
