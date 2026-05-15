import { Feather } from "@expo/vector-icons";
import { ref, update } from "firebase/database";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { softShadow } from "@/components/Brand";
import colors from "@/constants/colors";
import { rtdb } from "@/lib/firebase";

const c = colors.light;

const DEMO_ACCENT = "#6E75BF";

interface DemoColor {
  labelKey: string;
  status: "yellow" | "green" | "blue";
  red: number;
  green: number;
  blue: number;
  bg: string;
  border: string;
  text: string;
}

const DEMO_COLORS: DemoColor[] = [
  {
    labelKey: "demoModeSetYellow",
    status: "yellow",
    red: 255,
    green: 190,
    blue: 20,
    bg: "#FFF8E5",
    border: "#F7D98A",
    text: "#8A6A00",
  },
  {
    labelKey: "demoModeSetGreen",
    status: "green",
    red: 80,
    green: 180,
    blue: 90,
    bg: "#EAF4E5",
    border: "#A8CFA0",
    text: "#2D6B3A",
  },
  {
    labelKey: "demoModeSetBlue",
    status: "blue",
    red: 60,
    green: 90,
    blue: 220,
    bg: "#E5EEFF",
    border: "#A6C4FF",
    text: "#1A3EA0",
  },
];

interface Props {
  visible: boolean;
  deviceId: string;
  onClose: () => void;
}

export function DemoModeModal({ visible, deviceId, onClose }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const writeColor = async (demo: DemoColor) => {
    if (!rtdb) {
      Alert.alert(t("somethingWrong"), t("deviceNoFirebase"));
      return;
    }
    setBusy(true);
    try {
      const path = `devices/${deviceId}/sensor${deviceId}/sensor`;
      await update(ref(rtdb, path), {
        status: demo.status,
        red: demo.red,
        green: demo.green,
        blue: demo.blue,
        deviceId,
        timestamp: Date.now(),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert(t("somethingWrong"), msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, softShadow]}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>{t("demoModeTitle")}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t("close")}
              style={({ pressed }) => [
                styles.closeBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Feather name="x" size={22} color={c.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>{t("demoModeSubtitle")}</Text>

          <View style={styles.deviceRow}>
            <Feather name="cpu" size={14} color={DEMO_ACCENT} />
            <Text style={styles.deviceLabel}>
              {t("demoModeDevice")}: <Text style={styles.deviceId}>{deviceId}</Text>
            </Text>
          </View>

          <View style={styles.colorBtns}>
            {DEMO_COLORS.map((dc) => (
              <Pressable
                key={dc.status}
                onPress={() => void writeColor(dc)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t(dc.labelKey)}
                style={({ pressed }) => [
                  styles.colorBtn,
                  { backgroundColor: dc.bg, borderColor: dc.border, opacity: pressed || busy ? 0.7 : 1 },
                ]}
              >
                <View style={[styles.colorDot, { backgroundColor: dc.border }]} />
                <Text style={[styles.colorBtnText, { color: dc.text }]}>
                  {t(dc.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.safetyNote}>{t("demoModeSafetyNote")}</Text>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("demoModeDone")}
            style={({ pressed }) => [
              styles.doneBtn,
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Text style={styles.doneBtnText}>{t("demoModeDone")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: 36,
    paddingTop: 14,
    gap: 14,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8DAE8",
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: DEMO_ACCENT,
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
    marginTop: -4,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deviceLabel: {
    fontSize: 13,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  deviceId: {
    color: DEMO_ACCENT,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  colorBtns: {
    gap: 10,
  },
  colorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minHeight: 52,
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  colorBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  safetyNote: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  doneBtn: {
    backgroundColor: DEMO_ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
    marginTop: 2,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
