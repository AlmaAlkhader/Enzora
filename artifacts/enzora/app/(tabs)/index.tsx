import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  GradientHeader,
  PrimaryButton,
  StatusCard,
} from "@/components/Brand";
import colors from "@/constants/colors";
import { useApp, type Reading } from "@/contexts/AppContext";

const c = colors.light;

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, sensor, activeWound, wounds, readings } = useApp();
  const [alertOpen, setAlertOpen] = useState(false);
  const [lastDismissed, setLastDismissed] = useState<number | null>(null);

  useEffect(() => {
    if (
      sensor.connected &&
      sensor.status === "blue" &&
      sensor.lastUpdated &&
      sensor.lastUpdated !== lastDismissed
    ) {
      setAlertOpen(true);
    }
  }, [sensor.status, sensor.connected, sensor.lastUpdated, lastDismissed]);

  const firstName = (profile?.name ?? "").split(" ")[0] ?? "";
  const todayCount = readings.filter(
    (r) => Date.now() - r.timestamp < 24 * 60 * 60 * 1000,
  ).length;
  const monitoringSince = activeWound
    ? new Date(activeWound.dateAdded).toLocaleDateString()
    : "—";
  const lastReading = readings[0];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader
        layout="split"
        logoSize="lg"
        title={`${t("hello")}, ${firstName || ""}`.trim()}
        right={
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Alerts"
            onPress={() => router.push("/(tabs)/alerts")}
            style={({ pressed }) => [
              styles.bell,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="bell" size={20} color={c.textWhite} />
            {readings.some((r) => r.status !== "yellow") && (
              <View style={styles.bellDot} />
            )}
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {sensor.connected ? (
          <View style={styles.devicePill}>
            <View style={[styles.dot, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.devicePillText}>
              {t("deviceConnected")}
              {activeWound ? ` — ${t("monitoring")} ${activeWound.name}` : ""}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push("/connect-help")}
            style={styles.devicePillOff}
          >
            <View style={[styles.dot, { backgroundColor: c.alert }]} />
            <Text style={[styles.devicePillText, { color: c.alert }]}>
              {t("deviceNotConnected")} — {t("tapToConnect")}
            </Text>
          </Pressable>
        )}

        {!sensor.connected ? (
          <Card style={{ alignItems: "center", padding: 24, gap: 12 }}>
            <View style={styles.illIcon}>
              <Feather name="wifi-off" size={42} color={c.textSecondary} />
            </View>
            <Text style={styles.cardTitle}>{t("deviceOfflineTitle")}</Text>
            <Text style={styles.cardSub}>{t("deviceOfflineSub")}</Text>
            <PrimaryButton
              label={t("howToConnect")}
              icon="radio"
              onPress={() => router.push("/connect-help")}
              style={{ alignSelf: "stretch", marginTop: 4 }}
            />
          </Card>
        ) : sensor.status && activeWound ? (
          <StatusCard status={sensor.status} />
        ) : sensor.status && wounds.length === 0 ? (
          <Card style={{ alignItems: "center", padding: 20, gap: 10 }}>
            <Feather name="plus-circle" size={36} color={c.primary} />
            <Text style={styles.cardTitle}>{t("selectWoundTitle")}</Text>
            <PrimaryButton
              label={t("addNewWound")}
              icon="plus"
              onPress={() => router.push("/wound/new")}
              style={{ alignSelf: "stretch" }}
            />
          </Card>
        ) : sensor.status ? (
          <Card style={{ alignItems: "center", padding: 20, gap: 10 }}>
            <Text style={styles.cardTitle}>{t("selectWoundTitle")}</Text>
            <PrimaryButton
              label={t("addNewWound")}
              icon="plus"
              variant="outline"
              onPress={() => router.push("/wound/new")}
              style={{ alignSelf: "stretch" }}
            />
          </Card>
        ) : (
          <Card style={{ alignItems: "center", padding: 24, gap: 8 }}>
            <Feather name="activity" size={36} color={c.textSecondary} />
            <Text style={styles.cardTitle}>{t("noReadingsYet")}</Text>
            <Text style={styles.cardSub}>{t("waitingForDevice")}</Text>
          </Card>
        )}

        {sensor.connected && activeWound && (
          <View style={styles.statsRow}>
            <Stat
              label={t("lastReading")}
              value={
                lastReading
                  ? new Date(lastReading.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"
              }
            />
            <Stat label={t("todaysChecks")} value={String(todayCount)} />
            <Stat label={t("monitoringSince")} value={monitoringSince} />
          </View>
        )}

        {readings.length > 0 && (
          <View style={{ gap: 10 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("recentReadings")}</Text>
              <Pressable onPress={() => router.push("/(tabs)/history")}>
                <Text style={styles.link}>{t("seeAll")}</Text>
              </Pressable>
            </View>
            {readings.slice(0, 5).map((r) => (
              <ReadingRow key={r.id} reading={r} />
            ))}
          </View>
        )}
      </ScrollView>

      <InfectionModal
        visible={alertOpen}
        onClose={() => {
          setLastDismissed(sensor.lastUpdated);
          setAlertOpen(false);
        }}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

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
    <View style={[styles.timelineRow, { borderLeftColor: color }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.timelineLabel}>{label}</Text>
        <Text style={styles.timelineMeta}>
          R {reading.red} · G {reading.green} · B {reading.blue}
        </Text>
      </View>
      <Text style={styles.timelineTime}>
        {new Date(reading.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );
}

function InfectionModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const steps = [
    { icon: "shield" as const, text: t("alertStep1") },
    { icon: "eye" as const, text: t("alertStep2") },
    { icon: "phone" as const, text: t("alertStep3") },
    { icon: "alert-triangle" as const, text: t("alertStep4") },
  ];
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.alertBg, padding: 24 }}>
        <ScrollView contentContainerStyle={{ paddingTop: 60, gap: 20 }}>
          <View style={styles.alertIconWrap}>
            <Feather name="alert-octagon" size={56} color={c.alert} />
          </View>
          <Text style={styles.alertTitle}>{t("alertTitle")}</Text>
          <Text style={styles.alertBody}>{t("alertBody")}</Text>
          <View style={{ gap: 12 }}>
            {steps.map((s, i) => (
              <View key={i} style={styles.alertStep}>
                <View style={styles.stepIcon}>
                  <Feather name={s.icon} size={18} color={c.alert} />
                </View>
                <Text style={styles.stepText}>{s.text}</Text>
              </View>
            ))}
          </View>
          <View style={{ gap: 10, marginTop: 12 }}>
            <PrimaryButton
              label={t("callDoctor")}
              icon="phone"
              onPress={onClose}
            />
            <PrimaryButton
              label={t("understand")}
              variant="white"
              onPress={onClose}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.alert,
  },
  devicePill: {
    backgroundColor: c.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  devicePillOff: {
    backgroundColor: c.alertBg,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.alert,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  devicePillText: {
    color: c.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  illIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: c.input,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.textPrimary,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
  },
  cardSub: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: c.border,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  link: {
    color: c.primary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    borderLeftWidth: 4,
    gap: 12,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  timelineMeta: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  timelineTime: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  alertIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  alertTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: c.alert,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
  },
  alertBody: {
    fontSize: 18,
    color: c.textPrimary,
    textAlign: "center",
    lineHeight: 26,
    fontFamily: "Inter_400Regular",
  },
  alertStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.card,
    padding: 14,
    borderRadius: 14,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.alertBg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_500Medium",
  },
});
