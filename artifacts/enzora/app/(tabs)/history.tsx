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
  const { readings, wounds, activeWound } = useApp();
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
          <Text style={styles.sectionTitle}>{t("statusJourney")}</Text>
          <ColorTrend readings={filtered} counts={counts} />
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

function ColorTrend({
  readings,
  counts,
}: {
  readings: { status: "yellow" | "green" | "blue"; timestamp: number }[];
  counts: { yellow: number; green: number; blue: number };
}) {
  const { t } = useTranslation();

  if (readings.length === 0) {
    return (
      <Text style={trendStyles.emptyText}>{t("trendSummaryEmpty")}</Text>
    );
  }

  // Oldest -> newest, cap at 30 dots so the row stays readable.
  const dots = [...readings].reverse().slice(-30);

  const summaryKey =
    counts.blue > 0
      ? "trendSummaryAlert"
      : counts.green > 0
        ? "trendSummaryWatch"
        : "trendSummaryNormal";

  const colorOf = (s: "yellow" | "green" | "blue") =>
    s === "yellow" ? c.normal : s === "green" ? c.warning : c.alert;

  return (
    <View style={{ marginTop: 12, gap: 14 }}>
      <View style={trendStyles.dotRow}>
        {dots.map((r, i) => (
          <View
            key={i}
            style={[trendStyles.trendDot, { backgroundColor: colorOf(r.status) }]}
          />
        ))}
      </View>

      <View style={trendStyles.countRow}>
        <CountChip
          color={c.normal}
          label={t("statusNormalTitle")}
          value={counts.yellow}
        />
        <CountChip
          color={c.warning}
          label={t("statusWatchTitle")}
          value={counts.green}
        />
        <CountChip
          color={c.alert}
          label={t("statusAlertTitle")}
          value={counts.blue}
        />
      </View>

      <Text style={trendStyles.summary}>{t(summaryKey)}</Text>
    </View>
  );
}

function CountChip({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <View style={trendStyles.chip}>
      <View style={[trendStyles.chipDot, { backgroundColor: color }]} />
      <Text style={trendStyles.chipLabel}>{label}</Text>
      <Text style={[trendStyles.chipValue, { color }]}>{value}</Text>
    </View>
  );
}

const trendStyles = StyleSheet.create({
  dotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  trendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  countRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: c.bg,
  },
  chipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chipLabel: {
    fontSize: 13,
    color: c.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  chipValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  summary: {
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: "center",
    paddingVertical: 18,
    fontFamily: "Inter_400Regular",
  },
});

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
