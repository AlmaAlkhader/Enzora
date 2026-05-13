import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

import { PrimaryButton } from "@/components/Brand";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

const c = colors.light;

const webCursor =
  Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : null;

type Mode = "self" | "doctor" | null;

export function PendingConfirmationCard({
  status,
  onStillConcerned,
}: {
  status: "green" | "blue";
  onStillConcerned?: () => void;
}) {
  const { t } = useTranslation();
  const { confirmStatusCheck } = useApp();
  const [mode, setMode] = useState<Mode>(null);
  const [note, setNote] = useState("");

  const isBlue = status === "blue";
  const bg = isBlue ? "#FDEDF0" : "#FFF0F0";
  const accent = isBlue ? "#B91C1C" : "#B45309";
  const icon: keyof typeof Feather.glyphMap = isBlue
    ? "alert-octagon"
    : "alert-triangle";

  const submit = async () => {
    if (!mode) return;
    await confirmStatusCheck({ by: mode, note: note.trim() || undefined });
    setMode(null);
    setNote("");
  };

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View style={[styles.iconWrap, { backgroundColor: "#fff" }]}>
        <Feather name={icon} size={32} color={accent} />
      </View>
      <Text style={[styles.title, { color: accent }]}>
        {isBlue ? t("pendingBlueTitle") : t("pendingGreenTitle")}
      </Text>
      <Text style={styles.body}>
        {isBlue ? t("pendingBlueBody") : t("pendingGreenBody")}
      </Text>

      <View style={{ gap: 10, marginTop: 6, alignSelf: "stretch" }}>
        <PrimaryButton
          label={t("confirmCheckedSelf")}
          onPress={() => setMode("self")}
        />
        <PrimaryButton
          label={t("confirmCheckedDoctor")}
          variant="outline"
          onPress={() => setMode("doctor")}
        />
        <Pressable
          onPress={onStillConcerned}
          style={[styles.linkBtn, webCursor]}
          hitSlop={8}
        >
          <Text style={styles.linkText}>{t("stillConcerned")}</Text>
        </Pressable>
      </View>

      <Modal
        visible={mode !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setMode(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("addOptionalNote")}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t("addOptionalNotePlaceholder")}
              placeholderTextColor={c.textSecondary}
              style={styles.input}
              multiline
              numberOfLines={3}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <PrimaryButton
                label={t("skip")}
                variant="outline"
                onPress={() => void submit()}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                label={t("save")}
                onPress={() => void submit()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  linkBtn: { alignSelf: "center", paddingVertical: 6 },
  linkText: {
    color: c.primary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    textDecorationLine: "underline",
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
    gap: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: c.textPrimary,
  },
  input: {
    minHeight: 90,
    backgroundColor: "#F4F4FB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: c.text,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "top",
  },
});
