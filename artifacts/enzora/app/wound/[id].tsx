import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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

export default function WoundDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { wounds, sensor, activeWound, readings, markHealed, addNote, setActiveWound } =
    useApp();
  const wound = wounds.find((w) => w.id === id);
  const isActive = activeWound?.id === wound?.id;
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);

  if (!wound) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <GradientHeader back onBack={() => router.back()} title="—" />
      </View>
    );
  }

  const handleHealed = () => {
    Alert.alert(t("markHealed"), t("markHealedConfirm"), [
      { text: t("notYet"), style: "cancel" },
      {
        text: t("yesHealed"),
        onPress: async () => {
          setConfetti(true);
          await markHealed(wound.id);
          setTimeout(() => router.back(), 2300);
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

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader
        title={wound.name}
        subtitle={wound.location}
        back
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 80, gap: 16 }}>
        {!isActive && (
          <Pressable
            onPress={() => void setActiveWound(wound.id)}
            style={styles.activateBtn}
          >
            <Feather name="radio" size={16} color={c.primary} />
            <Text style={styles.activateText}>
              {t("monitoring")}: {wound.name}
            </Text>
          </Pressable>
        )}

        {isActive && sensor.status ? (
          <StatusCard status={sensor.status} />
        ) : (
          <Card style={{ alignItems: "center", padding: 20, gap: 8 }}>
            <Feather name="activity" size={32} color={c.textSecondary} />
            <Text style={styles.muted}>{t("noReadingsYet")}</Text>
          </Card>
        )}

        {wound.status === "active" && (
          <HealingProgress
            wound={wound}
            readings={woundReadings}
            sensorStatus={isActive ? sensor.status : null}
          />
        )}

        {lastReading && (
          <Text style={styles.meta}>
            {t("lastReading")}:{" "}
            {new Date(lastReading.timestamp).toLocaleString()}
          </Text>
        )}

        {!!wound.description && (
          <Card>
            <Text style={styles.section}>{wound.description}</Text>
          </Card>
        )}

        {!!wound.notes && (
          <Card>
            <Text style={styles.sectionTitle}>{t("notes")}</Text>
            <Text style={styles.noteText}>{wound.notes}</Text>
          </Card>
        )}

        {woundReadings.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>{t("readingTimeline")}</Text>
            {woundReadings.slice(0, 20).map((r) => {
              const color =
                r.status === "yellow"
                  ? c.normal
                  : r.status === "green"
                    ? c.warning
                    : c.alert;
              return (
                <View
                  key={r.id}
                  style={[styles.timeline, { borderLeftColor: color }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timelineLabel}>
                      R {r.red} · G {r.green} · B {r.blue}
                    </Text>
                    <Text style={styles.timelineTime}>
                      {new Date(r.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ gap: 10, marginTop: 8 }}>
          <PrimaryButton
            label={t("doctorReport")}
            icon="file-text"
            variant="outline"
            onPress={() => setReportOpen(true)}
          />
          {isActive && sensor.status === "yellow" && (
            <PrimaryButton
              label={t("markHealed")}
              icon="check-circle"
              onPress={handleHealed}
            />
          )}
          <PrimaryButton
            label={t("addNote")}
            icon="edit-2"
            variant="outline"
            onPress={() => setNoteOpen(true)}
          />
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
  activateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: c.tabBg,
    borderRadius: 12,
  },
  activateText: {
    color: c.primary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    fontSize: 13,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  muted: {
    fontSize: 14,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  section: {
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
    marginBottom: 6,
    fontFamily: "Inter_700Bold",
  },
  noteText: {
    fontSize: 14,
    color: c.textPrimary,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  timeline: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: c.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    borderLeftWidth: 4,
  },
  timelineLabel: {
    fontSize: 13,
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  timelineTime: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
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
});
