import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  Field,
  GradientHeader,
  PrimaryButton,
  StatusCard,
  TextField,
} from "@/components/Brand";
import {
  ConfettiOverlay,
  DoctorReportModal,
  HealingProgress,
} from "@/components/Wellness";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

const c = colors.light;

function formatNiceDate(ts: number, locale: string): string {
  try {
    return new Date(ts).toLocaleDateString(locale === "ar" ? "ar" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

export default function WoundDetail() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    wounds,
    sensor,
    activeWound,
    readings,
    markHealed,
    addNote,
    setActiveWound,
    woundEvents,
  } = useApp();
  const wound = wounds.find((w) => w.id === id);
  const isActive = activeWound?.id === wound?.id;
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);

  if (!wound) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <GradientHeader layout="split" logoSize="lg" />
        <View style={{ padding: 22 }}>
          <Pressable onPress={() => router.back()} style={styles.backRow}>
            <Feather name="chevron-left" size={22} color={c.primary} />
            <Text style={styles.backText}>{t("back")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const handleHealed = () => {
    const confirmAndRun = async () => {
      setConfetti(true);
      await markHealed(wound.id);
      setTimeout(() => router.back(), 2300);
    };
    // react-native-web's Alert.alert maps to window.alert (no buttons), so the
    // confirm button's onPress never fires on web. Use window.confirm there
    // and the real Alert dialog on native.
    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined" &&
        window.confirm(`${t("markHealed")}\n\n${t("markHealedConfirm")}`);
      if (ok) void confirmAndRun();
      return;
    }
    Alert.alert(t("markHealed"), t("markHealedConfirm"), [
      { text: t("notYet"), style: "cancel" },
      {
        text: t("yesHealed"),
        onPress: () => {
          void confirmAndRun();
        },
      },
    ]);
  };

  const saveNote = async () => {
    if (!note.trim()) {
      setNoteOpen(false);
      return;
    }
    await addNote(wound.id, note.trim());
    setNote("");
    setNoteOpen(false);
  };

  const woundReadings = isActive ? readings : [];
  const lastReading = woundReadings[0];
  const startedOn = formatNiceDate(wound.dateAdded, i18n.language);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader
        layout="split"
        logoSize="lg"
        title={wound.name}
        subtitle={wound.location || undefined}
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 80, gap: 18 }}
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Feather name="chevron-left" size={22} color={c.primary} />
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>

        {/* Monitoring pill + Switch Wound */}
        <View style={{ gap: 6 }}>
          <Pressable
            onPress={() => {
              if (!isActive) void setActiveWound(wound.id);
            }}
            style={isActive ? styles.monitoringPillActive : styles.activateBtn}
          >
            <Feather
              name="radio"
              size={16}
              color={isActive ? c.normal : c.primary}
            />
            <Text
              style={[
                styles.activateText,
                { color: isActive ? c.normal : c.primary },
              ]}
            >
              {t("monitoring")}: {wound.name}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/wounds")}
            hitSlop={8}
            style={styles.switchRow}
          >
            <Text style={styles.switchText}>{t("switchWound")} →</Text>
          </Pressable>
        </View>

        {/* Status card (or calm placeholder) */}
        {isActive && sensor.status ? (
          <StatusCard status={sensor.status} />
        ) : (
          <Card style={{ alignItems: "center", padding: 20, gap: 8 }}>
            <Feather name="activity" size={32} color={c.textSecondary} />
            <Text style={styles.muted}>{t("noReadingsYet")}</Text>
          </Card>
        )}

        {/* Circular healing journey */}
        {wound.status === "active" && (
          <HealingProgress
            wound={wound}
            readings={woundReadings}
            sensorStatus={isActive ? sensor.status : null}
          />
        )}

        {/* Last reading + start date — small, calm */}
        <View style={{ gap: 4 }}>
          {lastReading ? (
            <Text style={styles.meta}>
              {t("lastReading")}:{" "}
              {new Date(lastReading.timestamp).toLocaleString()}
            </Text>
          ) : null}
          <Text style={styles.meta}>
            {t("monitoringSince")}: {startedOn}
          </Text>
        </View>

        {/* Wound activity timeline (lock incidents + confirmations) */}
        {isActive && woundEvents.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.timelineHeader}>{t("woundActivity")}</Text>
            <Card style={{ padding: 14, gap: 10 }}>
              {woundEvents.slice(0, 8).map((ev) => {
                const labelKey =
                  ev.type === "lock_green"
                    ? "eventLockGreen"
                    : ev.type === "lock_blue"
                      ? "eventLockBlue"
                      : ev.type === "awaiting_confirmation"
                        ? "eventAwaitingConfirmation"
                        : ev.by === "doctor"
                          ? "eventConfirmedDoctor"
                          : "eventConfirmedSelf";
                return (
                  <View key={ev.id} style={{ gap: 2 }}>
                    <Text style={styles.timelineLabel}>{t(labelKey)}</Text>
                    {ev.note ? (
                      <Text style={styles.timelineNote}>“{ev.note}”</Text>
                    ) : null}
                    <Text style={styles.timelineTime}>
                      {new Date(ev.at).toLocaleString(
                        i18n.language === "ar" ? "ar" : "en-US",
                      )}
                    </Text>
                  </View>
                );
              })}
            </Card>
          </View>
        ) : null}

        {/* Actions */}
        <View style={{ gap: 10, marginTop: 4 }}>
          <PrimaryButton
            label={t("doctorReport")}
            icon="file-text"
            onPress={() => setReportOpen(true)}
          />
          <PrimaryButton
            label={t("addNote")}
            icon="edit-2"
            variant="outline"
            onPress={() => setNoteOpen(true)}
          />
          {isActive && sensor.status === "yellow" && (
            <PrimaryButton
              label={t("markHealed")}
              icon="check-circle"
              variant="outline"
              onPress={handleHealed}
            />
          )}
        </View>
      </ScrollView>

      <Modal visible={noteOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>{t("addNote")}</Text>
            <Field>
              <TextField
                value={note}
                onChangeText={setNote}
                placeholder={t("notes")}
                multiline
                numberOfLines={4}
                style={{ height: 110, textAlignVertical: "top", paddingTop: 14 }}
              />
            </Field>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <PrimaryButton
                label={t("cancel")}
                variant="outline"
                onPress={() => setNoteOpen(false)}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                label={t("save")}
                onPress={saveNote}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <DoctorReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        wound={wound}
        readings={woundReadings}
      />

      <ConfettiOverlay visible={confetti} onDone={() => setConfetti(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  backText: {
    color: c.primary,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
    fontSize: 15,
  },
  activateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: c.tabBg,
    borderRadius: 999,
    alignSelf: "center",
  },
  monitoringPillActive: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: c.normalBg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.normal,
    alignSelf: "center",
  },
  activateText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
  },
  switchRow: { alignSelf: "center", paddingVertical: 4 },
  switchText: {
    color: c.primary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  muted: {
    fontSize: 14,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
    marginBottom: 6,
    fontFamily: "Inter_700Bold",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: c.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  timelineHeader: {
    fontSize: 15,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  timelineLabel: {
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    lineHeight: 20,
  },
  timelineNote: {
    fontSize: 13,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 18,
  },
  timelineTime: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
  },
});
