import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import {
  Card,
  Field,
  GradientHeader,
  PrimaryButton,
  TextField,
} from "@/components/Brand";
import { MoodWeekStrip } from "@/components/Wellness";
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
    moods,
    patients,
    activePatientId,
    setActivePatient,
    removePatient,
    addPatient,
    biometricEnabled,
    setBiometricEnabled,
    dailyReminderEnabled,
    setDailyReminderEnabled,
  } = useApp();
  const [bioAvailable, setBioAvailable] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pName, setPName] = useState("");
  const [pRel, setPRel] =
    useState<"myself" | "mother" | "father" | "spouse" | "child" | "other">("mother");
  const [pConditions, setPConditions] = useState("");

  useEffect(() => {
    void (async () => {
      const ok = await isBiometricAvailable();
      setBioAvailable(ok);
    })();
  }, []);

  const handleLogout = () => {
    Alert.alert(t("logout"), t("logoutConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("logout"),
        style: "destructive",
        onPress: async () => {
          await signOutUser();
          router.replace("/auth");
        },
      },
    ]);
  };

  const med = profile?.medicalProfile;
  const activePatient = patients.find((p) => p.id === activePatientId);

  const submitPatient = async () => {
    if (!pName.trim()) return;
    await addPatient({
      name: pName.trim(),
      relationship: pRel,
      conditions: pConditions.trim(),
    });
    setPName("");
    setPConditions("");
    setPRel("mother");
    setAddOpen(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader layout="split" logoSize="lg" title={t("profile")} />
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
          <MoodWeekStrip moods={moods} />
        </Card>

        <Card>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>{t("monitoringFor")}</Text>
            <Pressable onPress={() => setAddOpen(true)} hitSlop={10}>
              <Text style={styles.editText}>{t("addFamilyMember")}</Text>
            </Pressable>
          </View>
          <View style={{ gap: 6, marginTop: 10 }}>
            <PatientRow
              name={t("myself")}
              active={activePatientId === null}
              onPress={() => void setActivePatient(null)}
            />
            {patients.map((p) => (
              <PatientRow
                key={p.id}
                name={p.name}
                relation={t(p.relationship)}
                active={activePatientId === p.id}
                onPress={() => void setActivePatient(p.id)}
                onRemove={() => {
                  Alert.alert(p.name, "Remove?", [
                    { text: t("cancel"), style: "cancel" },
                    {
                      text: t("logout"),
                      style: "destructive",
                      onPress: () => void removePatient(p.id),
                    },
                  ]);
                }}
              />
            ))}
            {activePatient?.conditions ? (
              <Text style={styles.muted}>{activePatient.conditions}</Text>
            ) : null}
          </View>
        </Card>

        <Card>
          <Text style={styles.section}>{t("medicalProfile")}</Text>
          {med ? (
            <View style={{ gap: 8, marginTop: 8 }}>
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

      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.section}>{t("addFamilyMember")}</Text>
            <Field label={t("whoMonitoring")}>
              <TextField
                value={pName}
                onChangeText={setPName}
                placeholder={t("whoMonitoringPlaceholder")}
                autoCapitalize="words"
              />
            </Field>
            <Field label={t("relationship")}>
              <View style={styles.relRow}>
                {(["mother", "father", "spouse", "child", "other"] as const).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setPRel(r)}
                    style={[
                      styles.relChip,
                      pRel === r && styles.relChipActive,
                      Platform.OS === "web" ? ({ cursor: "pointer" } as never) : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.relChipText,
                        pRel === r && styles.relChipTextActive,
                      ]}
                    >
                      {t(r)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Field>
            <Field label={t("theirConditions")}>
              <TextField
                value={pConditions}
                onChangeText={setPConditions}
                placeholder={t("conditionsPlaceholder")}
              />
            </Field>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <PrimaryButton
                label={t("cancel")}
                variant="outline"
                onPress={() => setAddOpen(false)}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                label={t("save")}
                onPress={() => void submitPatient()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PatientRow({
  name,
  relation,
  active,
  onPress,
  onRemove,
}: {
  name: string;
  relation?: string;
  active: boolean;
  onPress: () => void;
  onRemove?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.patientRow,
        active && styles.patientRowActive,
        Platform.OS === "web" ? ({ cursor: "pointer" } as never) : null,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.patientName}>{name}</Text>
        {relation ? <Text style={styles.patientRel}>{relation}</Text> : null}
      </View>
      {active ? (
        <Feather name="check-circle" size={18} color={c.primary} />
      ) : null}
      {onRemove ? (
        <Pressable hitSlop={10} onPress={onRemove} style={{ marginLeft: 8 }}>
          <Feather name="x" size={16} color={c.textSecondary} />
        </Pressable>
      ) : null}
    </Pressable>
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
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: c.input,
    gap: 8,
  },
  patientRowActive: {
    backgroundColor: "rgba(110,117,191,0.10)",
    borderWidth: 1,
    borderColor: "rgba(110,117,191,0.35)",
  },
  patientName: {
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
  },
  patientRel: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
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
  relRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  relChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.input,
  },
  relChipActive: {
    borderColor: c.primary,
    backgroundColor: "rgba(110,117,191,0.10)",
  },
  relChipText: {
    fontSize: 13,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  relChipTextActive: {
    color: c.primary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
});
