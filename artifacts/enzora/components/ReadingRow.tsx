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
  const title =
    reading.status === "yellow"
      ? t("statusNormalTitle")
      : reading.status === "green"
        ? t("statusWatchTitle")
        : t("statusAlertTitle");
  const sub =
    reading.status === "yellow"
      ? t("statusNormalSub")
      : reading.status === "green"
        ? t("statusWatchSub")
        : t("statusAlertSub");
  return (
    <View style={[styles.row, { borderLeftColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.meta}>{sub}</Text>
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
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  label: {
    fontSize: 15,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
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
