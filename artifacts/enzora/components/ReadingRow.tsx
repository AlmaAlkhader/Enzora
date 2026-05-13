import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import colors from "@/constants/colors";
import { type Reading } from "@/contexts/AppContext";

const c = colors.light;

export function ReadingRow({ reading }: { reading: Reading }) {
  const { t } = useTranslation();
  const color =
    reading.status === "yellow"
      ? c.normal
      : reading.status === "green"
        ? c.warning
        : c.alert;
  const label =
    reading.status === "yellow"
      ? t("normalLabel")
      : reading.status === "green"
        ? t("cautionLabel")
        : t("alertFullLabel");
  return (
    <View style={[styles.row, { borderLeftColor: color }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.meta}>
          R {reading.red} · G {reading.green} · B {reading.blue}
        </Text>
      </View>
      <Text style={styles.time}>
        {new Date(reading.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    gap: 10,
  },
  label: {
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
  },
  meta: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
});
