import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { EmptyState, GradientHeader } from "@/components/Brand";
import colors from "@/constants/colors";
import { useApp, type Reading } from "@/contexts/AppContext";

const c = colors.light;

export default function AlertsScreen() {
  const { t } = useTranslation();
  const { readings } = useApp();

  const alerts = useMemo(
    () => readings.filter((r) => r.status !== "yellow"),
    [readings],
  );

  const grouped = useMemo(() => {
    const today: Reading[] = [];
    const yesterday: Reading[] = [];
    const earlier: Reading[] = [];
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startYesterday = startToday - 24 * 60 * 60 * 1000;
    alerts.forEach((a) => {
      if (a.timestamp >= startToday) today.push(a);
      else if (a.timestamp >= startYesterday) yesterday.push(a);
      else earlier.push(a);
    });
    return { today, yesterday, earlier };
  }, [alerts]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader layout="split" logoSize="lg" title={t("alerts")} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 80, gap: 18 }}>
        {alerts.length === 0 ? (
          <EmptyState
            icon="bell-off"
            title={t("noAlerts")}
          />
        ) : (
          <>
            {grouped.today.length > 0 && (
              <Group label={t("today")} items={grouped.today} />
            )}
            {grouped.yesterday.length > 0 && (
              <Group label={t("yesterday")} items={grouped.yesterday} />
            )}
            {grouped.earlier.length > 0 && (
              <Group label={t("earlier")} items={grouped.earlier} />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Group({ label, items }: { label: string; items: Reading[] }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.groupTitle}>{label}</Text>
      {items.map((r) => (
        <AlertCard key={r.id} reading={r} />
      ))}
    </View>
  );
}

function AlertCard({ reading }: { reading: Reading }) {
  const { t } = useTranslation();
  const isBlue = reading.status === "blue";
  const color = isBlue ? c.alert : c.warning;
  const bg = isBlue ? c.alertBg : c.warningBg;
  const title = isBlue ? t("infectionDetected") : t("earlySigns");
  const sub = isBlue ? t("infectionDetectedSub") : t("earlySignsSub");
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bg, borderLeftColor: color },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: c.card }]}>
        <Feather
          name={isBlue ? "alert-octagon" : "alert-triangle"}
          size={20}
          color={color}
        />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.title, { color }]}>{title}</Text>
        <Text style={styles.sub} numberOfLines={2}>
          {sub}
        </Text>
        <Text style={styles.time}>
          {new Date(reading.timestamp).toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: c.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "Inter_600SemiBold",
  },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  sub: {
    fontSize: 13,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
  },
  time: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
});
