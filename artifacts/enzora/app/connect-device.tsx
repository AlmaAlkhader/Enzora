import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import {
  Field,
  GradientHeader,
  PrimaryButton,
  TextField,
} from "@/components/Brand";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import colors from "@/constants/colors";
import { normaliseDeviceId, useApp } from "@/contexts/AppContext";

const c = colors.light;

export default function ConnectDevice() {
  const { t } = useTranslation();
  const router = useRouter();
  const { connectDevice, connectedDeviceId, disconnectDevice } = useApp();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onConnect = async () => {
    setError(null);
    const id = normaliseDeviceId(value);
    if (!id) {
      setError(t("deviceIdRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await connectDevice(id);
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.back(), 900);
      } else if (res.reason === "no-firebase") {
        setError(t("deviceNoFirebase"));
      } else {
        setError(t("deviceNotFound"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader
        title={t("connectDeviceTitle")}
        back
        onBack={() => router.back()}
      />
      <KeyboardAwareScrollViewCompat
        bottomOffset={20}
        contentContainerStyle={styles.content}
      >
        <View style={styles.illustration}>
          <View style={styles.deviceShape}>
            <View style={styles.sticker}>
              <Text style={styles.stickerText}>ID</Text>
            </View>
          </View>
        </View>

        <Text style={styles.heading}>{t("connectDeviceHeading")}</Text>
        <Text style={styles.body}>{t("connectDeviceBody")}</Text>

        <Field label={t("deviceIdLabel")} error={error ?? undefined}>
          <TextField
            value={value}
            onChangeText={(s) => {
              setValue(normaliseDeviceId(s));
              if (error) setError(null);
            }}
            placeholder={t("deviceIdPlaceholder")}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={40}
          />
        </Field>

        {success ? (
          <View style={styles.successBox}>
            <Feather name="check-circle" size={20} color={c.normal} />
            <Text style={styles.successText}>{t("deviceConnectedToast")}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label={t("connectDeviceButton")}
          icon="link"
          onPress={onConnect}
          loading={submitting}
          style={{ marginTop: 4 }}
        />

        {connectedDeviceId ? (
          <View style={styles.currentBox}>
            <Text style={styles.currentLabel}>{t("currentlyConnected")}</Text>
            <Text style={styles.currentId}>{connectedDeviceId}</Text>
            <Pressable
              onPress={async () => {
                await disconnectDevice();
              }}
              hitSlop={10}
              style={styles.disconnectBtn}
            >
              <Text style={styles.disconnectText}>{t("disconnectDevice")}</Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 22, gap: 16, paddingBottom: 60 },
  illustration: { alignItems: "center", paddingVertical: 12 },
  deviceShape: {
    width: 130,
    height: 90,
    borderRadius: 18,
    backgroundColor: "rgba(110,117,191,0.10)",
    borderWidth: 1.5,
    borderColor: "rgba(110,117,191,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  sticker: {
    width: 60,
    height: 36,
    borderRadius: 6,
    backgroundColor: "#FFFDEB",
    borderWidth: 1,
    borderColor: "#E6DFAA",
    alignItems: "center",
    justifyContent: "center",
  },
  stickerText: {
    fontSize: 13,
    color: "#8A7A2E",
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: 1,
  },
  heading: {
    fontSize: 22,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.normalBg,
    borderColor: c.normal,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  successText: {
    color: c.normal,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
  },
  currentBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: c.input,
    gap: 4,
  },
  currentLabel: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  currentId: {
    fontSize: 18,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  disconnectBtn: { alignSelf: "flex-start", marginTop: 8 },
  disconnectText: {
    color: c.alert,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
  },
});
