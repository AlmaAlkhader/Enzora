import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import {
  EmptyState,
  GradientHeader,
  IconChip,
  PrimaryButton,
  softShadow,
} from "@/components/Brand";
import { useScrollContentStyle } from "@/components/ScreenContainer";
import colors from "@/constants/colors";
import { useApp, type Wound } from "@/contexts/AppContext";

const c = colors.light;

export default function WoundsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { wounds, sensor, activeWound } = useApp();
  const scrollContentStyle = useScrollContentStyle();
  const current = wounds.filter((w) => w.status === "active");
  const healed = wounds
    .filter((w) => w.status === "healed")
    .sort((a, b) => (b.healedAt ?? 0) - (a.healedAt ?? 0));

  const subtitle = `${current.length} ${current.length === 1 ? t("activeWounds") : t("activeWoundsPlural")}`;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader
        layout="split"
        logoSize="lg"
        title={t("myWounds")}
        subtitle={subtitle}
      />
      <ScrollView contentContainerStyle={[{ gap: 18 }, scrollContentStyle]}>
        {/* CURRENT WOUNDS */}
        <View style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>{t("currentWoundsTitle")}</Text>
          {current.length === 0 ? (
            <EmptyState
              icon="heart"
              title={t("noCurrentWounds")}
              action={
                <PrimaryButton
                  label={t("addNewWound")}
                  icon="plus"
                  onPress={() => router.push("/wound/new")}
                />
              }
            />
          ) : (
            <View style={{ gap: 12 }}>
              {current.map((w) => (
                <WoundCard
                  key={w.id}
                  wound={w}
                  isActive={activeWound?.id === w.id}
                  currentStatus={
                    activeWound?.id === w.id ? sensor.status ?? null : null
                  }
                  onPress={() => router.push(`/wound/${w.id}`)}
                />
              ))}
              <PrimaryButton
                label={t("addNewWound")}
                icon="plus"
                onPress={() => router.push("/wound/new")}
                style={{ marginTop: 4 }}
              />
            </View>
          )}
        </View>

        {/* HEALED WOUNDS */}
        <View style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>{t("healedWoundsTitle")}</Text>
          {healed.length === 0 ? (
            <EmptyState icon="check-circle" title={t("noHealedWoundsYet")} />
          ) : (
            <View style={{ gap: 12 }}>
              {healed.map((w) => (
                <HealedWoundCard
                  key={w.id}
                  wound={w}
                  onPress={() => router.push(`/wound/${w.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function WoundCard({
  wound,
  isActive,
  currentStatus,
  onPress,
}: {
  wound: Wound;
  isActive: boolean;
  currentStatus: "yellow" | "green" | "blue" | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const statusBg =
    currentStatus === "yellow"
      ? c.normalBg
      : currentStatus === "green"
        ? c.warningBg
        : currentStatus === "blue"
          ? c.alertBg
          : c.input;
  const statusColor =
    currentStatus === "yellow"
      ? c.normal
      : currentStatus === "green"
        ? c.warning
        : currentStatus === "blue"
          ? c.alert
          : c.textSecondary;
  const statusText =
    currentStatus === "yellow"
      ? t("normal")
      : currentStatus === "green"
        ? t("caution")
        : currentStatus === "blue"
          ? t("alertLabel")
          : "—";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        softShadow,
        isActive && { borderColor: c.primary, borderWidth: 2 },
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <IconChip icon="heart" tone="primary" size={44} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.name}>{wound.name}</Text>
        {!!wound.location && (
          <Text style={styles.meta}>{wound.location}</Text>
        )}
        <Text style={styles.meta}>
          {new Date(wound.dateAdded).toLocaleDateString()}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: statusBg }]}>
        <Text style={[styles.badgeText, { color: statusColor }]}>
          {statusText}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={c.textSecondary} />
    </Pressable>
  );
}

function HealedWoundCard({
  wound,
  onPress,
}: {
  wound: Wound;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation();
  const healedDateStr = wound.healedAt
    ? new Date(wound.healedAt).toLocaleDateString(
        i18n.language === "ar" ? "ar" : "en-US",
        { year: "numeric", month: "long", day: "numeric" },
      )
    : null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        softShadow,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <IconChip icon="check-circle" tone="green" size={44} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.name}>{wound.name}</Text>
        {!!wound.location && (
          <Text style={styles.meta}>{wound.location}</Text>
        )}
        {healedDateStr ? (
          <Text style={styles.meta}>
            {t("healedOn", { date: healedDateStr })}
          </Text>
        ) : null}
      </View>
      <View style={[styles.badge, { backgroundColor: c.normalBg }]}>
        <Text style={[styles.badgeText, { color: c.normal }]}>
          {t("healedBadge")}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={c.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.card,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  meta: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
  },
});
