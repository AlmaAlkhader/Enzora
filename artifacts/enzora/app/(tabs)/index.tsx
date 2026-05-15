import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  I18nManager,
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
  IconChip,
  PrimaryButton,
  StatusCard,
  softShadow,
} from "@/components/Brand";
import { BandageColorCard } from "@/components/BandageColorCard";
import { CareTipCard } from "@/components/CareTipCard";
import { ColorAlertBanner } from "@/components/ColorGuide";
import { DemoModeModal } from "@/components/DemoModeModal";
import { PendingConfirmationCard } from "@/components/PendingConfirmation";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { SUPPORT_PHONE } from "@/lib/support";

const SHOW_DEMO_MODE = true;

const c = colors.light;

// Urgent red used only for the infected hero card. Intentionally NOT added to
// the global palette so the rest of the app stays calm/medical-pastel.
const URGENT_RED = "#EF233C";
const URGENT_RED_BG = "#FFE5E8";
const URGENT_RED_BORDER = "#F4B5BD";

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
  const {
    profile,
    sensor,
    activeWound,
    readings,
    statusLock,
    wounds,
    connectedDeviceId,
  } = useApp();
  // Effective device id: matches AppContext's resolution order so the
  // connection pill reflects the same device the sensor listener is watching.
  const effectiveDeviceId = activeWound?.deviceId ?? connectedDeviceId ?? null;
  const currentWoundsCount = wounds.filter(
    (w) => w.status === "active",
  ).length;
  const hasNoCurrentWounds = currentWoundsCount === 0;
  // Family-monitoring banner: "Monitoring: [person name]". For self-monitoring
  // we fall back to the user's own first name; for caregiver scenarios we
  // prefer the typed person name and fall back to the relationship label.
  const med = profile?.medicalProfile;
  const relLabelMap: Record<string, string> = {
    self: t("relSelf"),
    father: t("relFather"),
    mother: t("relMother"),
    grandparent: t("relGrandparent"),
    other: t("relOther"),
  };
  const monitoredDisplay = (() => {
    const userFirst = (profile?.name ?? "").split(" ")[0] ?? "";
    if (!med || med.relationship === "self") return userFirst || t("relSelf");
    const rel = relLabelMap[med.relationship] ?? t("relOther");
    return med.monitoredName?.trim() || rel;
  })();
  const [alertOpen, setAlertOpen] = useState(false);
  const [lastDismissed, setLastDismissed] = useState<number | null>(null);
  const [bannerDismissedFor, setBannerDismissedFor] = useState<
    "green" | "blue" | null
  >(null);
  const [demoOpen, setDemoOpen] = useState(false);

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
      <GradientHeader
        greeting={t("greetingHello")}
        title={firstName || t("welcomeBack")}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Monitoring banner — clearly identifies who this app is currently
            tracking. Tappable so caregivers can quickly switch in profile. */}
        <Pressable
          onPress={() => router.push("/medical-profile")}
          style={({ pressed }) => [
            styles.monitoringBanner,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="users" size={16} color={c.primary} />
          <Text style={styles.monitoringBannerText} numberOfLines={1}>
            <Text style={styles.monitoringBannerLabel}>{t("monitoring")}: </Text>
            {monitoredDisplay}
          </Text>
        </Pressable>

        {/* Connection pill — four patient-facing states:
            no-device → "Connect your device"
            device set, no data → "Device not found…"
            connected, no status yet → "Waiting for sensor reading…"
            connected with status → "Device Connected" */}
        {(() => {
          let label: string;
          let on = false;
          if (sensor.connected && sensor.status) {
            label = t("connStateConnected");
            on = true;
          } else if (sensor.connected) {
            label = t("connStateWaiting");
          } else if (effectiveDeviceId) {
            label = t("connStateNotFound");
          } else {
            label = t("connStateConnect");
          }
          return (
            <View style={styles.connPillWrap}>
              <View
                style={[
                  styles.connPill,
                  on ? styles.connPillOn : styles.connPillOff,
                ]}
              >
                <View
                  style={[
                    styles.connDot,
                    { backgroundColor: on ? c.warning : c.alert },
                  ]}
                />
                <Text
                  style={[
                    styles.connText,
                    { color: on ? "#3F8F4F" : "#1F60B0" },
                  ]}
                >
                  {label}
                </Text>
              </View>
              {SHOW_DEMO_MODE ? (
                <Pressable
                  onPress={() => {
                    if (!effectiveDeviceId) {
                      Alert.alert("", t("demoModeConnectFirst"));
                    } else {
                      setDemoOpen(true);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("demoModeLink")}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={styles.demoLink}>{t("demoModeLink")}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })()}

        {/* Friendly explanation banner */}
        {showBanner && sensor.status ? (
          <ColorAlertBanner
            status={sensor.status as "green" | "blue"}
            onDismiss={() =>
              setBannerDismissedFor(sensor.status as "green" | "blue")
            }
          />
        ) : null}

        {/* HERO — main status. Blue/infected gets a dedicated urgent card so
            the patient instantly understands they need to act. */}
        {hasNoCurrentWounds ? (
          <View style={[styles.connectCard, softShadow]}>
            <View style={styles.connectIconWrap}>
              <Feather name="heart" size={36} color={c.primary} />
            </View>
            <Text style={styles.connectTitle}>
              {t("noActiveWoundMonitored")}
            </Text>
            <PrimaryButton
              label={t("addNewWound")}
              icon="plus"
              onPress={() => router.push("/wound/new")}
              style={{ alignSelf: "stretch", marginTop: 6 }}
            />
          </View>
        ) : showPending && statusLock ? (
          <PendingConfirmationCard status={statusLock.status} />
        ) : hasActiveSensor && sensor.status === "blue" ? (
          <UrgentInfectionCard
            lastCheckLabel={`${t("lastCheck")}: ${lastCheckText}`}
            onViewDetails={
              activeWound
                ? () => router.push(`/wound/${activeWound.id}`)
                : undefined
            }
          />
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

        {/* Soft "Bandage Color" glowing card — replaces the old technical RGB
            tile. Patient-facing: only shows status meaning, never raw R/G/B. */}
        {hasActiveSensor && sensor.status !== "blue" ? (
          <BandageColorCard status={sensor.status} />
        ) : null}

        {/* Three supporting facts — calm row. Hidden when infected so the
            urgent card and its actions dominate the screen. */}
        {sensor.status !== "blue" ? (
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
        ) : null}

        {/* Today's Care Tip — personalized AI message based on current wound
            context. Shown for all statuses (including blue) because that's
            exactly when warm, practical advice matters most. */}
        {!hasNoCurrentWounds ? <CareTipCard /> : null}

        {/* Primary action */}
        <PrimaryButton
          label={t("viewMyWounds")}
          icon="heart"
          onPress={() => router.push("/(tabs)/wounds")}
          variant={sensor.status === "blue" ? "outline" : "gradient"}
        />

        {/* Secondary — color guide accordion-style row. Hidden when infected
            so the screen stays focused on the urgent action. */}
        {sensor.status !== "blue" ? (
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
            <Feather
              name={I18nManager.isRTL ? "chevron-left" : "chevron-right"}
              size={22}
              color={c.textSecondary}
            />
          </Pressable>
        ) : null}

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

      {SHOW_DEMO_MODE && effectiveDeviceId ? (
        <DemoModeModal
          visible={demoOpen}
          deviceId={effectiveDeviceId}
          onClose={() => setDemoOpen(false)}
        />
      ) : null}
    </View>
  );
}

// =============== Urgent Infection Hero =================
// Rendered only when sensor.status === "blue". Visually distinct from the
// calm StatusCard so the patient cannot miss that they need to act today.
function UrgentInfectionCard({
  lastCheckLabel,
  onViewDetails,
}: {
  lastCheckLabel?: string;
  onViewDetails?: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useApp();
  const doctorPhone = profile?.medicalProfile?.doctorPhone?.trim();
  const emergencyPhone = profile?.medicalProfile?.emergencyPhone?.trim();

  const dial = useCallback(async (raw: string) => {
    const phone = raw.replace(/[^+\d]/g, "");
    if (!phone) return;
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch (err) {
      console.warn("[home] tel failed", err);
    }
  }, []);

  return (
    <View style={[urgentStyles.card, softShadow]}>
      <View style={urgentStyles.accent} />
      <View style={urgentStyles.iconWrap}>
        <Feather name="alert-octagon" size={34} color={URGENT_RED} />
      </View>
      <Text style={urgentStyles.title}>{t("infectionDetected")}</Text>
      <Text style={urgentStyles.body}>{t("infectionUrgentBody")}</Text>
      {lastCheckLabel ? (
        <View style={urgentStyles.metaRow}>
          <Feather name="clock" size={14} color={URGENT_RED} />
          <Text style={urgentStyles.meta}>{lastCheckLabel}</Text>
        </View>
      ) : null}

      {/* Primary urgent action */}
      <Pressable
        onPress={() =>
          doctorPhone ? void dial(doctorPhone) : router.push("/medical-profile")
        }
        accessibilityRole="button"
        accessibilityLabel={
          doctorPhone ? t("callDoctorNow") : t("addDoctorContact")
        }
        style={({ pressed }) => [
          urgentStyles.primaryBtn,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Feather
          name={doctorPhone ? "phone-call" : "user-plus"}
          size={20}
          color="#FFFFFF"
        />
        <Text style={urgentStyles.primaryBtnText}>
          {doctorPhone ? t("callDoctorNow") : t("addDoctorContact")}
        </Text>
      </Pressable>

      {/* Secondary — view details */}
      {onViewDetails ? (
        <Pressable
          onPress={onViewDetails}
          accessibilityRole="button"
          accessibilityLabel={t("viewDetails")}
          style={({ pressed }) => [
            urgentStyles.secondaryBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={urgentStyles.secondaryBtnText}>{t("viewDetails")}</Text>
          <Feather
            name={I18nManager.isRTL ? "chevron-left" : "chevron-right"}
            size={18}
            color={URGENT_RED}
          />
        </Pressable>
      ) : null}

      {/* Emergency contact (only if present) */}
      {emergencyPhone ? (
        <Pressable
          onPress={() => void dial(emergencyPhone)}
          accessibilityRole="button"
          accessibilityLabel={t("callEmergencyContactBtn")}
          style={({ pressed }) => [
            urgentStyles.tertiaryBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="phone" size={16} color={c.textSecondary} />
          <Text style={urgentStyles.tertiaryBtnText}>
            {t("callEmergencyContactBtn")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const urgentStyles = StyleSheet.create({
  card: {
    backgroundColor: URGENT_RED_BG,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: URGENT_RED_BORDER,
    padding: 24,
    gap: 12,
    overflow: "hidden",
  },
  accent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: URGENT_RED,
  },
  iconWrap: {
    alignSelf: "flex-start",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  title: {
    fontSize: 26,
    color: URGENT_RED,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  body: {
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_500Medium",
    lineHeight: 23,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  meta: {
    fontSize: 13,
    color: URGENT_RED,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  primaryBtn: {
    marginTop: 6,
    backgroundColor: URGENT_RED,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 56,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: URGENT_RED_BORDER,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
  },
  secondaryBtnText: {
    color: URGENT_RED,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  tertiaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  tertiaryBtnText: {
    color: c.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

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
      <Text style={styles.factValue} numberOfLines={2}>
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
  const { profile, sensor } = useApp();
  const callEmergency = async () => {
    const phone = profile?.medicalProfile?.emergencyPhone?.trim();
    if (!phone) {
      onClose();
      return;
    }
    try {
      await Linking.openURL(`tel:${phone.replace(/[^+\d]/g, "")}`);
    } catch (err) {
      console.warn("[home] tel failed", err);
    }
    onClose();
  };
  const shareWhatsApp = async () => {
    const status = sensor.status ?? "blue";
    const key =
      status === "yellow"
        ? "whatsappShareYellow"
        : status === "green"
          ? "whatsappShareGreen"
          : "whatsappShareBlue";
    const number = SUPPORT_PHONE.replace(/[^+\d]/g, "").replace(/^\+/, "");
    const text = encodeURIComponent(t(key));
    const url = `https://wa.me/${number}?text=${text}`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn("[home] whatsapp share failed", err);
    }
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
            label={t("shareStatusWhatsApp")}
            icon="message-circle"
            variant="outline"
            onPress={() => void shareWhatsApp()}
            style={{ marginTop: 8 }}
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
  monitoringBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(110,117,191,0.10)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(110,117,191,0.25)",
    marginBottom: 4,
  },
  monitoringBannerText: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  monitoringBannerLabel: {
    color: c.primary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 64,
    gap: 20,
  },

  // Connection
  connPillWrap: {
    alignItems: "center",
    gap: 6,
  },
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
  demoLink: {
    fontSize: 13,
    color: "#6E75BF",
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    textDecorationLine: "underline",
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
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 10,
    minHeight: 140,
  },
  factValue: {
    fontSize: 18,
    color: c.navy,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
    lineHeight: 22,
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
