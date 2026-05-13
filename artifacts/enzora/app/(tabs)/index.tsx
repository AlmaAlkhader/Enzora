import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
  IconChip,
  PrimaryButton,
  SectionTitle,
  StatTile,
  StatusCard,
  softShadow,
} from "@/components/Brand";
import { ColorAlertBanner } from "@/components/ColorGuide";
import { PendingConfirmationCard } from "@/components/PendingConfirmation";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

const c = colors.light;

function relativeMinutes(ts: number, t: (k: string) => string): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("justNow");
  if (m < 60) return `${m} ${t("minAgo")}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${t("hAgo")}`;
  const d = Math.floor(h / 24);
  return `${d} ${t("dAgo")}`;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, sensor, activeWound, readings, statusLock, wounds } = useApp();
  const [alertOpen, setAlertOpen] = useState(false);
  const [lastDismissed, setLastDismissed] = useState<number | null>(null);
  const [bannerDismissedFor, setBannerDismissedFor] = useState<
    "green" | "blue" | null
  >(null);

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

  useEffect(() => {
    if (bannerDismissedFor && sensor.status !== bannerDismissedFor) {
      setBannerDismissedFor(null);
    }
  }, [sensor.status, bannerDismissedFor]);

  const showPending =
    !!statusLock && (!sensor.status || sensor.status === "yellow");

  const showBanner =
    sensor.connected &&
    !showPending &&
    (sensor.status === "green" || sensor.status === "blue") &&
    sensor.status !== bannerDismissedFor;

  const firstName = (profile?.name ?? "").split(" ")[0] ?? "";
  const lastReading = readings[0];

  // Derived stats for the supporting tiles.
  const daysMonitored = useMemo(() => {
    if (!activeWound) return 0;
    return Math.max(
      1,
      Math.round((Date.now() - activeWound.dateAdded) / (1000 * 60 * 60 * 24)),
    );
  }, [activeWound]);

  const newAlerts = useMemo(
    () => readings.filter((r) => r.status !== "yellow").slice(0, 24).length,
    [readings],
  );

  const recentRgb = useMemo(() => {
    const r = readings[0];
    return {
      red: r?.red ?? 0,
      green: r?.green ?? 0,
      blue: r?.blue ?? 0,
    };
  }, [readings]);

  // Healing percent — naive heuristic: fewer non-yellow readings in last 7d
  // means better healing. Capped 0..100. Used for the hero ring.
  const healingPercent = useMemo(() => {
    if (!activeWound) return 0;
    const span = 7 * 24 * 60 * 60 * 1000;
    const recent = readings.filter((r) => Date.now() - r.timestamp < span);
    if (recent.length === 0) return Math.min(100, daysMonitored * 5);
    const yellow = recent.filter((r) => r.status === "yellow").length;
    const score = Math.round((yellow / recent.length) * 100);
    return Math.max(5, Math.min(100, score));
  }, [activeWound, readings, daysMonitored]);

  const hasActiveSensor = sensor.connected && sensor.status;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader greeting={t("greetingHello")} title={firstName || "—"} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Connection pill */}
        <View
          style={[
            styles.connPill,
            sensor.connected ? styles.connPillOn : styles.connPillOff,
          ]}
        >
          <View
            style={[
              styles.connDot,
              { backgroundColor: sensor.connected ? c.warning : c.alert },
            ]}
          />
          <Text
            style={[
              styles.connText,
              { color: sensor.connected ? "#3F8F4F" : "#1F60B0" },
            ]}
          >
            {sensor.connected ? t("deviceConnected") : t("deviceNotConnected")}
          </Text>
        </View>

        {/* Friendly explanation banner — appears above hero on green/blue */}
        {showBanner && sensor.status ? (
          <ColorAlertBanner
            status={sensor.status as "green" | "blue"}
            onDismiss={() =>
              setBannerDismissedFor(sensor.status as "green" | "blue")
            }
          />
        ) : null}

        {/* Hero status card */}
        {showPending && statusLock ? (
          <PendingConfirmationCard status={statusLock.status} />
        ) : hasActiveSensor ? (
          <StatusCard
            status={sensor.status as "yellow" | "green" | "blue"}
            percent={healingPercent}
            lastCheckLabel={
              sensor.lastUpdated
                ? `${t("lastCheck")}: ${relativeMinutes(sensor.lastUpdated, t)}`
                : undefined
            }
            onPress={
              activeWound
                ? () => router.push(`/wound/${activeWound.id}`)
                : undefined
            }
            ctaLabel={t("viewDetails")}
          />
        ) : (
          <Card style={styles.calmCard}>
            <View style={styles.calmIconWrap}>
              <Feather name="link" size={36} color={c.primary} />
            </View>
            <Text style={styles.calmTitle}>{t("connectToStart")}</Text>
            <PrimaryButton
              label={t("howToConnect")}
              icon="radio"
              onPress={() => router.push("/connect-device")}
              style={{ alignSelf: "stretch", marginTop: 6 }}
            />
          </Card>
        )}

        {/* Current readings grid */}
        <View style={{ gap: 12 }}>
          <SectionTitle>{t("currentReadings")}</SectionTitle>
          <View style={styles.statRow}>
            <StatTile
              icon="droplet"
              tone="blue"
              value={recentRgb.red}
              caption={t("redChannel")}
            />
            <StatTile
              icon="activity"
              tone="green"
              value={recentRgb.green}
              caption={t("greenChannel")}
            />
            <StatTile
              icon="circle"
              tone="violet"
              value={recentRgb.blue}
              caption={t("blueChannel")}
            />
          </View>
          <View style={styles.statRow}>
            <StatTile
              icon="calendar"
              tone="green"
              value={daysMonitored}
              unit={t("daysShort")}
              caption={t("daysMonitored")}
            />
            <StatTile
              icon="clock"
              tone="primary"
              value={hasActiveSensor ? "•" : "—"}
              caption={t("nextCheckLabel")}
            />
            <StatTile
              icon="alert-circle"
              tone={newAlerts > 0 ? "yellow" : "neutral"}
              value={newAlerts}
              caption={t("newAlerts")}
            />
          </View>
        </View>

        {/* Care tips */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <IconChip icon="check-circle" tone="primary" size={32} />
            <Text style={styles.cardHeaderTitle}>{t("careTipsToday")}</Text>
          </View>
          <View style={{ gap: 10, marginTop: 12 }}>
            <Tip text={t("careTip1")} />
            <View style={styles.tipDivider} />
            <Tip text={t("careTip2")} />
          </View>
        </Card>

        {/* Status colors guide */}
        <Card>
          <View style={styles.cardHeaderRow}>
            <IconChip icon="info" tone="neutral" size={32} />
            <Text style={styles.cardHeaderTitle}>{t("statusGuide")}</Text>
          </View>
          <View style={{ gap: 10, marginTop: 12 }}>
            <GuideRow color={c.warning} title={t("colorGreenTitle")} body={t("colorGreenBodyShort")} />
            <GuideRow color={c.normal} title={t("colorYellowTitle")} body={t("colorYellowBodyShort")} />
            <GuideRow color={c.alert} title={t("colorBlueTitle")} body={t("colorBlueBodyShort")} />
          </View>
        </Card>

        {/* Quick action */}
        <PrimaryButton
          label={
            activeWound || wounds.length > 0
              ? `${t("viewMyWounds")}  →`
              : `${t("addNewWound")}  →`
          }
          variant="soft"
          onPress={() =>
            activeWound || wounds.length > 0
              ? router.push("/(tabs)/wounds")
              : router.push("/wound/new")
          }
        />

        {lastReading ? (
          <Text style={styles.lastReading}>
            {t("lastReading")}:{" "}
            {new Date(lastReading.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        ) : null}
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

function Tip({ text }: { text: string }) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipDot} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

function GuideRow({
  color,
  title,
  body,
}: {
  color: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.guideRow}>
      <View style={[styles.guideSwatch, { backgroundColor: color + "33" }]}>
        <View style={[styles.guideDot, { backgroundColor: color }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.guideTitle}>{title}</Text>
        <Text style={styles.guideBody}>{body}</Text>
      </View>
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
  const { profile } = useApp();
  const callEmergency = async () => {
    const phone = profile?.medicalProfile?.emergencyPhone?.trim();
    if (!phone) {
      onClose();
      return;
    }
    try {
      const Linking = await import("expo-linking");
      await Linking.openURL(`tel:${phone.replace(/[^+\d]/g, "")}`);
    } catch (err) {
      console.warn("[home] tel failed", err);
    }
    onClose();
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.bg}>
        <View style={[modalStyles.card, softShadow]}>
          <View style={modalStyles.iconWrap}>
            <Feather name="alert-octagon" size={42} color={c.alert} />
          </View>
          <Text style={modalStyles.title}>{t("alertTitle")}</Text>
          <Text style={modalStyles.body}>{t("alertBody")}</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            <Step n="1" text={t("alertStep1")} />
            <Step n="2" text={t("alertStep2")} />
            <Step n="3" text={t("alertStep3")} />
            <Step n="4" text={t("alertStep4")} />
          </View>
          <PrimaryButton
            label={t("callEmergencyNow")}
            icon="phone"
            onPress={() => void callEmergency()}
            style={{ marginTop: 14 }}
          />
          <PrimaryButton
            label={t("understand")}
            variant="outline"
            onPress={onClose}
            style={{ marginTop: 8 }}
          />
        </View>
      </View>
    </Modal>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <View style={modalStyles.stepRow}>
      <View style={modalStyles.stepNum}>
        <Text style={modalStyles.stepNumText}>{n}</Text>
      </View>
      <Text style={modalStyles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 56,
    gap: 18,
  },
  connPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  connPillOn: { backgroundColor: c.warningBg },
  connPillOff: { backgroundColor: c.alertBg },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  connText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  calmCard: {
    alignItems: "center",
    gap: 12,
    padding: 26,
  },
  calmIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "rgba(110,117,191,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  calmTitle: {
    fontSize: 18,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 24,
  },
  statRow: { flexDirection: "row", gap: 12 },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardHeaderTitle: {
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  tipRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.primary,
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  tipDivider: { height: 1, backgroundColor: c.border, opacity: 0.5 },
  guideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.bg,
    borderRadius: 14,
    padding: 12,
  },
  guideSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  guideDot: { width: 12, height: 12, borderRadius: 6 },
  guideTitle: {
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  guideBody: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  lastReading: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});

const modalStyles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "rgba(27,42,107,0.55)",
    padding: 22,
    justifyContent: "center",
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: c.border,
  },
  iconWrap: {
    alignSelf: "center",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: c.alertBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    color: c.alert,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  stepRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.alertBg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    color: c.alert,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    fontSize: 13,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
});
