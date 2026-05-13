import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { EmptyState, GradientHeader, PrimaryButton } from "@/components/Brand";
import colors from "@/constants/colors";
import { useApp, type Wound } from "@/contexts/AppContext";

const c = colors.light;

export default function WoundsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { wounds, sensor, activeWound } = useApp();
  const active = wounds.filter((w) => w.status === "active");

  const subtitle = `${active.length} ${active.length === 1 ? t("activeWounds") : t("activeWoundsPlural")}`;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader title={t("myWounds")} subtitle={subtitle} />
      <FlatList
        data={active}
        keyExtractor={(w) => w.id}
        contentContainerStyle={{ padding: 18, paddingBottom: 100, gap: 12 }}
        ListEmptyComponent={
          <EmptyState
            icon="heart"
            title={t("noWoundsYet")}
            action={
              <PrimaryButton
                label={t("addNewWound")}
                icon="plus"
                onPress={() => router.push("/wound/new")}
              />
            }
          />
        }
        renderItem={({ item }) => (
          <WoundCard
            wound={item}
            isActive={activeWound?.id === item.id}
            currentStatus={
              activeWound?.id === item.id ? sensor.status ?? null : null
            }
            onPress={() => router.push(`/wound/${item.id}`)}
          />
        )}
        ListFooterComponent={
          active.length > 0 ? (
            <PrimaryButton
              label={t("addNewWound")}
              icon="plus"
              onPress={() => router.push("/wound/new")}
              style={{ marginTop: 12 }}
            />
          ) : null
        }
      />
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
        isActive && { borderColor: c.primary, borderWidth: 2 },
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="bandage" size={24} color={c.primary} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.name}>{wound.name}</Text>
        {!!wound.location && (
          <Text style={styles.meta}>{wound.location}</Text>
        )}
        <Text style={styles.meta}>
          {new Date(wound.dateAdded).toLocaleDateString()}
        </Text>
      </View>
      <View
        style={[styles.badge, { backgroundColor: statusBg }]}
      >
        <Text style={[styles.badgeText, { color: statusColor }]}>
          {statusText}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={c.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.card,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(110,117,191,0.12)",
    alignItems: "center",
    justifyContent: "center",
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
