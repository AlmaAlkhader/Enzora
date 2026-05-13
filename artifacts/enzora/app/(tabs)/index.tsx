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
  BrandedHeader,
  Card,
  IconChip,
  PrimaryButton,
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
  const { profile, sensor, activeWound, readings, statusLock } = useApp();
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

  // Three calm supporting facts: days monitored, last check, alert count.
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

  const lastCheckText = sensor.lastUpdated
    ? relativeMinutes(sensor.lastUpdated, t)
    : "—";

  const hasActiveSensor = sensor.connected && sensor.status;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <BrandedHeader
        greeting={t("greetingHello")}
        name={firstName || t("welcomeBack")}
      />

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

        {/* Friendly explanation banner */}
        {showBanner && sensor.status ? (
          <ColorAlertBanner
            status={sensor.status as "green" | "blue"}
            onDismiss={() =>
              setBannerDismissedFor(sensor.status as "green" | "blue")
            }
          />
        ) : null}

        {/* HERO — main status */}
        {showPending && statusLock ? (
          <PendingConfirmationCard status={statusLock.status} />
        ) : hasActiveSensor ? (
          <StatusCard
            status={sensor.status as "yellow" | "green" | "blue"}
            lastCheckLabel={`${t("lastCheck")}: ${lastCheckText}`}
            onPress={
              activeWound
                ? () => router.push(`/wound/${activeWound.id}`)
                : undefined
            }
            ctaLabel={t("viewDetails")}
          />
        ) : (
          <View style={[styles.connectCard, softShadow]}>
            <View style={styles.connectIconWrap}>
              <Feather name="link" size={36} color={c.primary} />
            </View>
            <Text style={styles.connectTitle}>{t("connectToStart")}</Text>
            <Text style={styles.connectSub}>{t("connectToStartSub")}</Text>
            <PrimaryButton
              label={t("howToConnect")}
              icon="radio"
              onPress={() => router.push("/connect-device")}
              style={{ alignSelf: "stretch", marginTop: 6 }}
            />
          </View>
        )}

        {/* Three supporting facts — large, calm, single row */}
        <View style={styles.statRow}>
          <FactTile
            icon="calendar"
            tone="violet"
            value={daysMonitored > 0 ? `${daysMonitored}` : "—"}
            label={t("daysMonitored")}
          />
          <FactTile
            icon="clock"
            tone="primary"
            value={
              hasActiveSensor && sensor.lastUpdated ? lastCheckText : "—"
            }
            label={t("lastCheck")}
          />
          <FactTile
            icon="bell"
            tone={newAlerts > 0 ? "yellow" : "neutral"}
            value={`${newAlerts}`}
            label={t("newAlerts")}
          />
        </View>

        {/* Care tip — single calm card */}
        <Card style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <IconChip icon="sun" tone="yellow" size={36} />
            <Text style={styles.tipKicker}>{t("careTipsToday")}</Text>
          </View>
          <Text style={styles.tipBody}>{t("careTip1")}</Text>
        </Card>

        {/* Primary action */}
        <PrimaryButton
          label={t("viewMyWounds")}
          icon="heart"
          onPress={() => router.push("/(tabs)/wounds")}
        />

        {/* Secondary — color guide accordion-style row */}
        <Pressable
          onPress={() => router.push("/color-guide")}
          style={({ pressed }) => [
            styles.colorRow,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={styles.colorDots}>
            <View style={[styles.colorDot, { backgroundColor: c.normal }]} />
            <View
              style={[
                styles.colorDot,
                { backgroundColor: c.warning, marginLeft: -8 },
              ]}
            />
            <View
              style={[
                styles.colorDot,
                { backgroundColor: c.alert, marginLeft: -8 },
              ]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.colorRowTitle}>{t("colorMeaningTitle")}</Text>
            <Text style={styles.colorRowSub}>{t("colorGuide")}</Text>
          </View>
          <Feather name="chevron-right" size={22} color={c.textSecondary} />
        </Pressable>

        {lastReading ? (
          <Text style={styles.lastReadingFoot}>
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

function FactTile({
  icon,
  tone,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  tone: React.ComponentProps<typeof IconChip>["tone"];
  value: string;
  label: string;
}) {
  return (
    <View style={[styles.factTile, softShadow]}>
      <IconChip icon={icon} tone={tone} size={36} />
      <Text style={styles.factValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.factLabel} numberOfLines={2}>
        {label}
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
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 64,
    gap: 20,
  },

  // Connection
  connPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  connPillOn: { backgroundColor: c.warningBg },
  connPillOff: { backgroundColor: c.alertBg },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  connText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  // Connect-to-start hero (replaces StatusCard when no sensor)
  connectCard: {
    backgroundColor: c.card,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  connectIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#EDEBFF",
    alignItems: "center",
    justifyContent: "center",
  },
  connectTitle: {
    fontSize: 22,
    color: c.navy,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  connectSub: {
    fontSize: 15,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },

  // Fact tile row
  statRow: { flexDirection: "row", gap: 12 },
  factTile: {
    flex: 1,
    backgroundColor: c.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    alignItems: "center",
    gap: 10,
    minHeight: 130,
  },
  factValue: {
    fontSize: 22,
    color: c.navy,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  factLabel: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 16,
  },

  // Care tip card
  tipCard: {
    backgroundColor: "#EDEBFF",
    borderColor: "rgba(110,117,191,0.18)",
    padding: 20,
    gap: 12,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tipKicker: {
    fontSize: 15,
    color: c.navy,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  tipBody: {
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
  },

  // Color guide row
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: c.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  colorDots: { flexDirection: "row", alignItems: "center" },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: c.card,
  },
  colorRowTitle: {
    fontSize: 15,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  colorRowSub: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  lastReadingFoot: {
    fontSize: 12,
    color: c.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
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
