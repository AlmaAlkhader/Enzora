import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { Card, EmptyState, GradientHeader } from "@/components/Brand";
import { ReadingRow } from "@/components/ReadingRow";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

const c = colors.light;

type Range = "today" | "7" | "30";

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { readings, wounds } = useApp();
  const [range, setRange] = useState<Range>("7");

  const filtered = useMemo(() => {
    const now = Date.now();
    const span =
      range === "today"
        ? 24 * 60 * 60 * 1000
        : range === "7"
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
    return readings.filter((r) => now - r.timestamp < span);
  }, [readings, range]);

  const counts = {
    yellow: filtered.filter((r) => r.status === "yellow").length,
    green: filtered.filter((r) => r.status === "green").length,
    blue: filtered.filter((r) => r.status === "blue").length,
  };

  const healed = wounds.filter((w) => w.status === "healed");

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader layout="split" logoSize="lg" title={t("history")} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 80, gap: 16 }}>
        <View style={styles.filterRow}>
          {(["today", "7", "30"] as const).map((k) => {
            const label =
              k === "today"
                ? t("today")
                : k === "7"
                  ? t("sevenDays")
                  : t("thirtyDays");
            const active = range === k;
            return (
              <Pressable
                key={k}
                onPress={() => setRange(k)}
                style={[styles.filter, active && styles.filterActive]}
              >
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label={t("normal")}
            value={counts.yellow}
            bg={c.normalBg}
            color={c.normal}
          />
          <StatCard
            label={t("caution")}
            value={counts.green}
            bg={c.warningBg}
            color={c.warning}
          />
          <StatCard
            label={t("alertLabel")}
            value={counts.blue}
            bg={c.alertBg}
            color={c.alert}
          />
        </View>

        <Card>
          <Text style={styles.sectionTitle}>{t("rgbTrend")}</Text>
          <RGBChart readings={filtered.slice(0, 30)} />
        </Card>

        <View style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>{t("readingTimeline")}</Text>
          {filtered.length === 0 ? (
            <EmptyState icon="activity" title={t("noReadingsYet")} />
          ) : (
            filtered.slice(0, 50).map((r) => (
              <ReadingRow key={r.id} reading={r} />
            ))
          )}
        </View>

        {healed.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>{t("healedWounds")}</Text>
            {healed.map((w) => {
              const days = w.healedAt
                ? Math.max(
                    1,
                    Math.round((w.healedAt - w.dateAdded) / (1000 * 60 * 60 * 24)),
                  )
                : 0;
              return (
                <Card key={w.id}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary, fontFamily: "Inter_700Bold" }}>
                    {w.name} · {t("healed")}
                  </Text>
                  <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 4, fontFamily: "Inter_400Regular" }}>
                    {new Date(w.dateAdded).toLocaleDateString()} —{" "}
                    {w.healedAt ? new Date(w.healedAt).toLocaleDateString() : ""}
                  </Text>
                  <Text style={{ fontSize: 13, color: c.primary, marginTop: 4, fontFamily: "Inter_600SemiBold" }}>
                    {t("daysToHeal", { count: days })}
                  </Text>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({
  label,
  value,
  bg,
  color,
}: {
  label: string;
  value: number;
  bg: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

function RGBChart({
  readings,
}: {
  readings: { red: number; green: number; blue: number; timestamp: number }[];
}) {
  if (readings.length === 0) {
    return (
      <Text
        style={{
          fontSize: 13,
          color: c.textSecondary,
          textAlign: "center",
          paddingVertical: 24,
          fontFamily: "Inter_400Regular",
        }}
      >
        —
      </Text>
    );
  }
  const data = [...readings].reverse();
  return (
    <View style={{ flexDirection: "row", height: 120, alignItems: "flex-end", gap: 4, marginTop: 12 }}>
      {data.map((d, i) => (
        <View key={i} style={{ flex: 1, gap: 1, justifyContent: "flex-end" }}>
          <View
            style={{
              height: (d.red / 255) * 120,
              backgroundColor: "#EF233C",
              borderRadius: 2,
              opacity: 0.85,
            }}
          />
          <View
            style={{
              height: (d.green / 255) * 120,
              backgroundColor: "#22C55E",
              borderRadius: 2,
              opacity: 0.85,
            }}
          />
          <View
            style={{
              height: (d.blue / 255) * 120,
              backgroundColor: "#3B82F6",
              borderRadius: 2,
              opacity: 0.85,
            }}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: "row", gap: 8 },
  filter: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
  },
  filterActive: { backgroundColor: c.primary, borderColor: c.primary },
  filterText: { fontSize: 14, color: c.textPrimary, fontFamily: "Inter_500Medium" },
  filterTextActive: { color: c.textWhite, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  statLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },
});
