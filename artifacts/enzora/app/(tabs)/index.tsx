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
  GradientHeader,
  PrimaryButton,
  StatusCard,
} from "@/components/Brand";
import { ColorAlertBanner, ColorMeaningCard } from "@/components/ColorGuide";
import { PendingConfirmationCard } from "@/components/PendingConfirmation";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

const c = colors.light;

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, sensor, activeWound, readings, statusLock } = useApp();
  const [alertOpen, setAlertOpen] = useState(false);
  const [lastDismissed, setLastDismissed] = useState<number | null>(null);
  // Track which STATUS the user has dismissed the friendly banner for, so it
  // reappears only when the status transitions to a different category — not
  // on every new reading at the same status.
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
      // The infection modal is the urgent escalation; it should fire on every
      // genuinely new blue reading regardless of the lock state. The lock card
      // covers the *follow-up* flow once the sensor returns to yellow.
      setAlertOpen(true);
    }
  }, [sensor.status, sensor.connected, sensor.lastUpdated, lastDismissed]);

  // Reset the dismissal whenever the status leaves the dismissed category, so
  // a future transition back into green/blue shows the banner again.
  useEffect(() => {
    if (bannerDismissedFor && sensor.status !== bannerDismissedFor) {
      setBannerDismissedFor(null);
    }
  }, [sensor.status, bannerDismissedFor]);

  // While a lock is awaiting confirmation, suppress the normal status card
  // and replace it with a Pending Confirmation card. The lock applies when
  // either there is no current sensor reading (e.g. just opened the app) or
  // the latest reading is back to yellow.
  const showPending =
    !!statusLock &&
    (!sensor.status || sensor.status === "yellow");

  const showBanner =
    sensor.connected &&
    !showPending &&
    (sensor.status === "green" || sensor.status === "blue") &&
    sensor.status !== bannerDismissedFor;

  const firstName = (profile?.name ?? "").split(" ")[0] ?? "";
  const lastReading = readings[0];
  const lastReadingTime = lastReading
    ? new Date(lastReading.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader
        layout="split"
        logoSize="lg"
        title={`${t("hello")}, ${firstName || ""}`.trim()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Subtle connection pill */}
        <View
          style={[
            styles.pill,
            sensor.connected ? styles.pillOn : styles.pillOff,
          ]}
        >
          <View
            style={[
              styles.dot,
              { backgroundColor: sensor.connected ? c.normal : c.alert },
            ]}
          />
          <Text
            style={[
              styles.pillText,
              { color: sensor.connected ? c.normal : c.alert },
            ]}
          >
            {sensor.connected ? t("deviceConnected") : t("deviceNotConnected")}
          </Text>
        </View>

        {/* 2a. Friendly explanation banner — appears above hero on green/blue */}
        {showBanner && sensor.status ? (
          <ColorAlertBanner
            status={sensor.status as "green" | "blue"}
            onDismiss={() =>
              setBannerDismissedFor(sensor.status as "green" | "blue")
            }
          />
        ) : null}

        {/* 2. Hero status card — the focus of the screen */}
        {showPending && statusLock ? (
          <PendingConfirmationCard status={statusLock.status} />
        ) : sensor.connected && sensor.status ? (
          <StatusCard status={sensor.status} />
        ) : (
          <View style={styles.calmCard}>
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
          </View>
        )}

        {/* 3. Last reading — small, calm */}
        {sensor.connected && lastReadingTime ? (
          <Text style={styles.lastReading}>
            {t("lastReading")}: {t("today")} {t("at")} {lastReadingTime}
          </Text>
        ) : null}

        {/* 3b. Collapsed color meaning card */}
        <ColorMeaningCard />

        {/* 4. One quick action */}
        <View style={{ marginTop: 8 }}>
          <PrimaryButton
            label={
              activeWound
                ? `${t("viewMyWounds")}  →`
                : `${t("addNewWound")}  →`
            }
            variant="outline"
            onPress={() =>
              activeWound
                ? router.push("/(tabs)/wounds")
                : router.push("/wound/new")
            }
          />
        </View>
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.bg}>
        <View style={modalStyles.card}>
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
    padding: 22,
    paddingTop: 18,
    paddingBottom: 48,
    gap: 18,
  },
  pill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillOn: { backgroundColor: c.normalBg, borderColor: c.normal },
  pillOff: { backgroundColor: c.alertBg, borderColor: c.alert },
  pillText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  calmCard: {
    backgroundColor: c.card,
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    gap: 12,
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
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 26,
  },
  lastReading: {
    fontSize: 14,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});

const modalStyles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 22,
    justifyContent: "center",
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 22,
    padding: 22,
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
