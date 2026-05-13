import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { Card, IconChip } from "@/components/Brand";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import {
  getOrGenerateDailyTip,
  type CareTipContext,
  type SensorStatus,
} from "@/lib/careTip";

const c = colors.light;

// Build the short, nicely-formatted WhatsApp share text. We strip the
// leading greeting from the AI tip (if present) so the wrapper's greeting
// doesn't repeat. Blue uses an alert-toned wrapper instead of "Good
// morning" so the recipient sees urgency immediately.
function formatWhatsAppShare(opts: {
  message: string;
  status: SensorStatus | null;
  language: "en" | "ar";
  firstName: string;
}): string {
  const { message, status, language, firstName } = opts;
  // Strip a leading "Good morning, X. " or Arabic equivalent from the AI
  // body so the WhatsApp wrapper isn't double-greeted.
  const tip = message
    .replace(
      /^\s*(Good morning|صباح الخير)[^.!?\n]*[.!?\n]\s*/u,
      "",
    )
    .trim();
  if (status === "blue") {
    return language === "ar"
      ? `تنبيه مهم من إنزورا.\nالحالة: تنبيه عدوى.\nيرجى الاتصال بالطبيب اليوم.\n— إنزورا`
      : `Important alert from Enzora.\nStatus: Infection alert.\nPlease call your doctor today.\n— Enzora`;
  }
  if (language === "ar") {
    const label = status === "green" ? "راقب الجرح" : "طبيعية";
    const greet = firstName ? `صباح الخير يا ${firstName} 🌿` : `صباح الخير 🌿`;
    return `${greet}\nحالة اليوم: ${label}.\nالنصيحة: ${tip || "حافظ على الجرح نظيفاً وجافاً."}\n— إنزورا`;
  }
  const label = status === "green" ? "Watch closely" : "Normal";
  const greet = firstName ? `Good morning, ${firstName} 🌿` : `Good morning 🌿`;
  return `${greet}\nToday's status: ${label}.\nTip: ${tip || "Keep the wound clean and dry."}\n— Enzora`;
}

// Today's Care Tip — personalized AI message for the active wound. Cached
// per (user, wound, day); the user can refresh on demand and share the
// message via WhatsApp.
export function CareTipCard() {
  const { t } = useTranslation();
  const {
    user,
    profile,
    activeWound,
    sensor,
    readings,
    woundEvents,
    language,
  } = useApp();

  const med = profile?.medicalProfile;
  const isSelf = !med || med.relationship === "self";
  const patientName = isSelf
    ? profile?.name ?? ""
    : med?.monitoredName?.trim() || "";
  const monitoringPerson = isSelf
    ? language === "ar"
      ? "المريض نفسه"
      : "self"
    : `${profile?.name ?? ""}${med?.relationship ? ` (${med.relationship})` : ""}`.trim();
  const medicalConditions = med?.conditions?.trim() ?? "";
  const woundName = activeWound?.name ?? "";

  const daysMonitored = useMemo(() => {
    if (!activeWound) return 0;
    return Math.max(
      1,
      Math.round((Date.now() - activeWound.dateAdded) / (1000 * 60 * 60 * 24)),
    );
  }, [activeWound]);

  const recentStatuses = useMemo<SensorStatus[]>(
    () =>
      readings
        .slice(0, 10)
        .map((r) => r.status)
        .filter((s): s is SensorStatus => !!s),
    [readings],
  );

  // Pull the latest free-text note out of the wound event log so the AI has
  // something to anchor "notes" to. We only want the most recent one — older
  // notes would just add noise and burn tokens.
  const latestNote = useMemo(() => {
    const ev = woundEvents.find((e) => !!e.note?.trim());
    return ev?.note?.trim() ?? "";
  }, [woundEvents]);

  const ctx: CareTipContext = useMemo(
    () => ({
      patientName,
      monitoringPerson,
      isSelfMonitoring: isSelf,
      medicalConditions,
      woundName,
      status: sensor.status ?? null,
      daysMonitored,
      recentStatuses,
      notes: latestNote,
      language,
    }),
    [
      patientName,
      monitoringPerson,
      isSelf,
      medicalConditions,
      woundName,
      sensor.status,
      daysMonitored,
      recentStatuses,
      latestNote,
      language,
    ],
  );

  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!user || !activeWound) return;
      setLoading(true);
      setError(null);
      try {
        const result = await getOrGenerateDailyTip({
          email: user.email,
          woundId: activeWound.id,
          ctx,
          forceRefresh,
        });
        setMessage(result.tip.message);
      } catch (err) {
        console.warn("[careTip] load failed", err);
        setError(t("careTipError"));
      } finally {
        setLoading(false);
      }
    },
    [user, activeWound, ctx, t],
  );

  // Load the cached/fresh tip when the wound, status, or language changes.
  useEffect(() => {
    if (!user || !activeWound) {
      setMessage(null);
      return;
    }
    void load(false);
    // We intentionally key the effect on stable identifiers, not the full
    // ctx object, so re-renders don't refetch on every keystroke elsewhere.
  }, [user, activeWound, sensor.status, language, load]);

  const onShareWhatsApp = useCallback(async () => {
    if (!message) return;
    const phoneRaw =
      profile?.medicalProfile?.emergencyPhone?.trim() ?? "";
    const phone = phoneRaw.replace(/[^+\d]/g, "").replace(/^\+/, "");
    const formatted = formatWhatsAppShare({
      message,
      status: sensor.status ?? null,
      language,
      firstName: (patientName || "").split(" ")[0]?.trim() || "",
    });
    const text = encodeURIComponent(formatted);
    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn("[careTip] whatsapp open failed", err);
    }
  }, [
    message,
    profile?.medicalProfile?.emergencyPhone,
    sensor.status,
    language,
    patientName,
  ]);

  if (!activeWound) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <IconChip icon="sun" tone="yellow" size={36} />
        <Text style={styles.kicker}>{t("todaysCareTip")}</Text>
      </View>

      {loading && !message ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={c.primary} />
          <Text style={styles.loadingText}>{t("careTipLoading")}</Text>
        </View>
      ) : (
        <Text style={styles.body}>{message ?? t("careTipLoading")}</Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => void load(true)}
          disabled={loading}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.refreshBtn,
            { opacity: pressed || loading ? 0.7 : 1 },
          ]}
        >
          <Feather name="refresh-ccw" size={14} color={c.primary} />
          <Text style={styles.refreshText}>{t("refreshTip")}</Text>
        </Pressable>
        <Pressable
          onPress={() => void onShareWhatsApp()}
          disabled={!message || loading}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.waBtn,
            {
              opacity: pressed ? 0.85 : 1,
              backgroundColor: !message || loading ? c.border : "#25D366",
            },
          ]}
        >
          <Feather name="message-circle" size={14} color="#fff" />
          <Text style={styles.waText}>{t("sendOnWhatsApp")}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  kicker: {
    fontSize: 14,
    color: c.primary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  body: {
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  loadingText: {
    fontSize: 14,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  error: {
    fontSize: 13,
    color: c.alert,
    fontFamily: "Inter_500Medium",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flex: 1,
    minHeight: 40,
  },
  refreshBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: c.primary,
  },
  refreshText: {
    color: c.primary,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  waBtn: {
    backgroundColor: "#25D366",
  },
  waText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
});
