import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  I18nManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { Card, GradientHeader } from "@/components/Brand";
import { SOSButton } from "@/components/Wellness";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { isBiometricAvailable } from "@/lib/biometric";

const c = colors.light;

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    profile,
    user,
    signOutUser,
    language,
    toggleLanguage,
    largeText,
    setLargeText,
    notificationsEnabled,
    setNotificationsEnabled,
    biometricEnabled,
    setBiometricEnabled,
    dailyReminderEnabled,
    setDailyReminderEnabled,
  } = useApp();
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    void (async () => {
      const ok = await isBiometricAvailable();
      setBioAvailable(ok);
    })();
  }, []);

  const handleLogout = () => {
    const doLogout = async () => {
      await signOutUser();
      router.replace("/auth");
    };
    // react-native-web's Alert.alert maps to window.alert (no buttons), so the
    // destructive button's onPress never fires. Use window.confirm on web and
    // the real Alert dialog on native.
    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined" &&
        window.confirm(t("logoutConfirm"));
      if (ok) void doLogout();
      return;
    }
    Alert.alert(t("logout"), t("logoutConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("logout"),
        style: "destructive",
        onPress: () => {
          void doLogout();
        },
      },
    ]);
  };

  const med = profile?.medicalProfile;
  const relLabelMap: Record<string, string> = {
    self: t("relSelf"),
    father: t("relFather"),
    mother: t("relMother"),
    grandparent: t("relGrandparent"),
    other: t("relOther"),
  };
  const relLabel = med ? relLabelMap[med.relationship] ?? t("relSelf") : "";
  const monitoredPersonLabel =
    med && med.relationship !== "self"
      ? med.monitoredName
        ? `${med.monitoredName} (${relLabel})`
        : relLabel
      : t("relSelf");

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader
        layout="split"
        logoSize="lg"
        title={t("profile")}
        right={<SOSButton />}
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 80, gap: 16 }}>
        <Card style={{ alignItems: "center", gap: 8, padding: 24 }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.name ?? user?.email ?? "?")[0]?.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.name ?? "—"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </Card>

        <Card>
          <Text style={styles.section}>{t("medicalProfile")}</Text>
          {med ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Row label={t("monitoredPerson")} value={monitoredPersonLabel} />
              <Row label={t("age")} value={med.age || "—"} />
              <Row label={t("gender")} value={med.gender || "—"} />
              <Row
                label={t("conditions")}
                value={med.conditions || "—"}
              />
              <Row label={t("doctor")} value={med.doctorName || "—"} />
              <Row
                label={t("emergencyContact")}
                value={med.emergencyContact || "—"}
              />
            </View>
          ) : (
            <Text style={styles.muted}>{t("noProfile")}</Text>
          )}
          <Pressable
            onPress={() => router.push("/medical-profile")}
            style={styles.editBtn}
          >
            <Feather name="edit-2" size={14} color={c.primary} />
            <Text style={styles.editText}>{t("editProfile")}</Text>
          </Pressable>
        </Card>

        <Pressable
          onPress={() => router.push("/color-guide")}
          style={styles.colorGuideRow}
        >
          <View style={styles.settingLeft}>
            <View style={styles.colorGuideIcons}>
              <View style={[styles.colorGuideDot, { backgroundColor: c.normal }]} />
              <View
                style={[
                  styles.colorGuideDot,
                  { backgroundColor: c.warning, marginLeft: -6 },
                ]}
              />
              <View
                style={[
                  styles.colorGuideDot,
                  { backgroundColor: c.alert, marginLeft: -6 },
                ]}
              />
            </View>
            <Text style={styles.colorGuideText}>{t("colorGuide")}</Text>
          </View>
          <Feather
            name={I18nManager.isRTL ? "chevron-left" : "chevron-right"}
            size={20}
            color={c.textSecondary}
          />
        </Pressable>

        <Card>
          <Text style={styles.section}>{t("settings")}</Text>
          <View style={{ gap: 4, marginTop: 8 }}>
            <Pressable
              onPress={() => void toggleLanguage()}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <Feather name="globe" size={20} color={c.primary} />
                <Text style={styles.settingLabel}>{t("language")}</Text>
              </View>
              <Text style={styles.settingValue}>
                {language === "en" ? "English" : "العربية"}
              </Text>
            </Pressable>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Feather name="bell" size={20} color={c.primary} />
                <Text style={styles.settingLabel}>{t("notifications")}</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ true: c.primary, false: c.border }}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Feather name="sun" size={20} color={c.primary} />
                <Text style={styles.settingLabel}>{t("dailyReminder")}</Text>
              </View>
              <Switch
                value={dailyReminderEnabled}
                onValueChange={setDailyReminderEnabled}
                trackColor={{ true: c.primary, false: c.border }}
              />
            </View>
            {bioAvailable && (
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Feather name="shield" size={20} color={c.primary} />
                  <Text style={styles.settingLabel}>{t("biometricLogin")}</Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={setBiometricEnabled}
                  trackColor={{ true: c.primary, false: c.border }}
                />
              </View>
            )}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Feather name="type" size={20} color={c.primary} />
                <Text style={styles.settingLabel}>{t("largeText")}</Text>
              </View>
              <Switch
                value={largeText}
                onValueChange={setLargeText}
                trackColor={{ true: c.primary, false: c.border }}
              />
            </View>
          </View>
        </Card>

        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={18} color={c.alert} />
          <Text style={styles.logoutText}>{t("logout")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: c.textWhite,
    fontSize: 32,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  email: {
    fontSize: 14,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  section: {
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  muted: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 8,
    fontFamily: "Inter_400Regular",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    gap: 12,
  },
  rowLabel: {
    fontSize: 13,
    color: c.textSecondary,
    flex: 1,
    fontFamily: "Inter_500Medium",
  },
  rowValue: {
    fontSize: 14,
    color: c.textPrimary,
    flex: 1,
    textAlign: "right",
    fontFamily: "Inter_600SemiBold",
  },
  editBtn: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 12,
  },
  editText: {
    color: c.primary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingLabel: {
    fontSize: 15,
    color: c.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  settingValue: {
    fontSize: 14,
    color: c.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: c.alertBg,
    borderWidth: 1,
    borderColor: c.alert,
  },
  logoutText: {
    color: c.alert,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  colorGuideRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  colorGuideIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorGuideDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: c.card,
  },
  colorGuideText: {
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
  },
});
