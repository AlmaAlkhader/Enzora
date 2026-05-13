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
import {
  getCachedExpoPushToken,
  registerForPushNotificationsAsync,
  sendBackendTestPush,
  syncPushSubscription,
  type PushRegistration,
  type PushSyncResult,
  type PushTestResponse,
} from "@/lib/push";

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
    demoMode,
    setDemoMode,
    simulateStatus,
    wounds,
    connectedDeviceId,
  } = useApp();
  const [bioAvailable, setBioAvailable] = useState(false);
  // Dev-only push diagnostics state. The card is always visible so the
  // tester can see what's wrong without the hidden 7-tap gesture.
  const [registration, setRegistration] = useState<PushRegistration | null>(
    null,
  );
  const [registerBusy, setRegisterBusy] = useState(false);
  const [saveResult, setSaveResult] = useState<PushSyncResult | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<
    | (PushTestResponse & { transportError?: string })
    | { transportError: string }
    | null
  >(null);

  // On mount: probe state without prompting. We do NOT call
  // registerForPushNotificationsAsync here because it would trigger the
  // permission prompt on first visit. The user must press the button.
  useEffect(() => {
    const cached = getCachedExpoPushToken();
    if (cached) {
      // We already registered earlier in this session; reflect it.
      setRegistration({
        platform: Platform.OS,
        isDevice: true,
        isExpoGo: false,
        sdkVersion: null,
        permissionStatus: "granted",
        projectId: null,
        token: cached,
        error: null,
        blocker: null,
      });
    }
  }, []);

  const onRegister = async () => {
    setRegisterBusy(true);
    setSaveResult(null);
    try {
      const reg = await registerForPushNotificationsAsync();
      setRegistration(reg);
      // If we got a token AND we have an active wound, save it to the
      // backend immediately so the test push has somewhere to land.
      if (reg.token && user && profile?.activeWoundId) {
        // Mirror the AppContext sync effect so we don't overwrite the
        // existing deviceId / healed status on the row.
        const activeWound =
          wounds.find((w) => w.id === profile.activeWoundId) ?? null;
        const woundDeviceId =
          activeWound?.deviceId ?? connectedDeviceId ?? null;
        const isHealed = activeWound?.status === "healed";
        const result = await syncPushSubscription({
          email: user.email,
          woundId: profile.activeWoundId,
          deviceId: woundDeviceId,
          language,
          notificationsEnabled,
          woundHealed: isHealed,
        });
        setSaveResult(result);
      }
    } finally {
      setRegisterBusy(false);
    }
  };

  const onSendTestPush = async () => {
    if (!user || !profile?.activeWoundId) {
      setTestResult({ transportError: t("pushTestNoWound") });
      return;
    }
    if (!registration?.token) {
      setTestResult({ transportError: t("pushTestRegisterFirst") });
      return;
    }
    setTestBusy(true);
    setTestResult(null);
    try {
      const result = await sendBackendTestPush({
        email: user.email,
        woundId: profile.activeWoundId,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        transportError: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTestBusy(false);
    }
  };

  const localToken = registration?.token ?? getCachedExpoPushToken();
  const tokenPreview = localToken
    ? `${localToken.slice(0, 18)}…${localToken.slice(-6)}`
    : null;
  const projectIdPreview = registration?.projectId
    ? `${registration.projectId.slice(0, 8)}…${registration.projectId.slice(-4)}`
    : null;
  // Map machine-readable blocker codes to localized strings so the card
  // doesn't leak hardcoded English from push.ts.
  const localizedRegistrationError = (() => {
    if (!registration?.error) return null;
    switch (registration.blocker) {
      case "web":
        return t("pushBlockerWeb");
      case "simulator":
        return t("pushBlockerSimulator");
      case "expo-go-sdk53":
        return t("pushBlockerExpoGoSdk53");
      case "permission-denied":
        return t("pushBlockerPermissionDenied");
      case "missing-project-id":
        return t("pushBlockerMissingProjectId");
      case "token-error":
        // Token error: combine the localized headline with the raw Expo
        // error so the developer still sees the underlying message.
        return `${t("pushBlockerTokenError")} ${registration.error}`;
      default:
        return registration.error;
    }
  })();
  // Hidden gesture: 7 quick taps on the avatar reveal Judge Demo Mode.
  // Once demoMode is on, the card stays visible without re-tapping.
  // We use a functional setState (not the closed-over `avatarTaps`) so a fast
  // burst of taps cannot drop increments due to stale closures / batching.
  const lastTapRef = React.useRef<number>(0);
  const onAvatarTap = () => {
    const now = Date.now();
    const within = now - lastTapRef.current < 800;
    lastTapRef.current = now;
    setAvatarTaps((prev) => {
      const next = within ? prev + 1 : 1;
      if (next >= 7) {
        setDemoMode(true);
        return 0;
      }
      return next;
    });
  };
  const [avatarTaps, setAvatarTaps] = useState(0);
  void avatarTaps;

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
          <Pressable onPress={onAvatarTap} style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.name ?? user?.email ?? "?")[0]?.toUpperCase()}
            </Text>
          </Pressable>
          <Text style={styles.name}>{profile?.name ?? "—"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </Card>

        {demoMode && (
          <Card>
            <View style={styles.demoHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.section}>{t("demoMode")}</Text>
                <Text style={styles.muted}>{t("demoModeHint")}</Text>
              </View>
              <Pressable
                onPress={() => setDemoMode(false)}
                style={styles.demoExitBtn}
                hitSlop={8}
              >
                <Feather name="x" size={16} color={c.textSecondary} />
                <Text style={styles.demoExitText}>{t("exitDemo")}</Text>
              </Pressable>
            </View>
            <View style={styles.demoBtnRow}>
              <Pressable
                onPress={() => simulateStatus("yellow")}
                style={[styles.demoBtn, { backgroundColor: c.warning }]}
              >
                <Text style={styles.demoBtnText}>{t("simulateYellow")}</Text>
              </Pressable>
              <Pressable
                onPress={() => simulateStatus("green")}
                style={[styles.demoBtn, { backgroundColor: c.normal }]}
              >
                <Text style={styles.demoBtnText}>{t("simulateGreen")}</Text>
              </Pressable>
              <Pressable
                onPress={() => simulateStatus("blue")}
                style={[styles.demoBtn, { backgroundColor: c.alert }]}
              >
                <Text style={styles.demoBtnText}>{t("simulateBlue")}</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* Always-visible developer card so the test button is findable
            without the hidden 7-tap gesture. Safe to remove before launch. */}
        <Card>
          <View>
            <Text style={styles.section}>{t("pushTestTitle")}</Text>
              <View style={styles.pushDevRow}>
                <Text style={styles.pushDevLabel}>
                  {t("pushTestPlatform")}
                </Text>
                <Text style={styles.pushDevValue}>
                  {registration?.platform ?? Platform.OS}
                </Text>
              </View>
              <View style={styles.pushDevRow}>
                <Text style={styles.pushDevLabel}>{t("pushTestExpoGo")}</Text>
                <Text style={styles.pushDevValue}>
                  {registration
                    ? registration.isExpoGo
                      ? t("pushTestYes")
                      : t("pushTestNo")
                    : t("pushTestUnknown")}
                </Text>
              </View>
              <View style={styles.pushDevRow}>
                <Text style={styles.pushDevLabel}>{t("pushTestSdk")}</Text>
                <Text style={styles.pushDevValue}>
                  {registration?.sdkVersion ?? t("pushTestUnknown")}
                </Text>
              </View>
              <View style={styles.pushDevRow}>
                <Text style={styles.pushDevLabel}>
                  {t("pushTestProjectId")}
                </Text>
                <Text
                  style={[
                    styles.pushDevValueMono,
                    !projectIdPreview && { color: c.alert },
                  ]}
                  numberOfLines={1}
                  selectable
                >
                  {projectIdPreview ?? t("pushTestProjectIdMissing")}
                </Text>
              </View>
              <View style={styles.pushDevRow}>
                <Text style={styles.pushDevLabel}>
                  {t("pushTestPermission")}
                </Text>
                <Text style={styles.pushDevValue}>
                  {registration?.permissionStatus ?? t("pushTestUnknown")}
                </Text>
              </View>
              <View style={styles.pushDevRow}>
                <Text style={styles.pushDevLabel}>
                  {t("pushTestTokenGenStatus")}
                </Text>
                <Text
                  style={[
                    styles.pushDevValue,
                    {
                      color: !registration
                        ? c.textSecondary
                        : registration.token
                          ? c.normal
                          : c.alert,
                    },
                  ]}
                >
                  {!registration
                    ? t("pushTestUnknown")
                    : registration.token
                      ? t("pushTestTokenGenOk")
                      : t("pushTestTokenGenFailed")}
                </Text>
              </View>
              <View style={styles.pushDevRow}>
                <Text style={styles.pushDevLabel}>{t("pushTestToken")}</Text>
                <Text
                  style={styles.pushDevValueMono}
                  numberOfLines={1}
                  selectable
                >
                  {tokenPreview ?? t("pushTestNoToken")}
                </Text>
              </View>
              {localizedRegistrationError && (
                <View style={styles.pushDevRow}>
                  <Text style={styles.pushDevLabel}>
                    {t("pushTestTokenGenError")}
                  </Text>
                  <Text
                    style={[styles.pushDevValueMono, { color: c.alert }]}
                    selectable
                  >
                    {localizedRegistrationError}
                  </Text>
                </View>
              )}
              {/* Always render the backend-save row so the diagnostic is
                  consistent regardless of whether a save was attempted. */}
              <View style={styles.pushDevRow}>
                <Text style={styles.pushDevLabel}>
                  {t("pushTestSaveStatus")}
                </Text>
                <Text
                  style={[
                    styles.pushDevValue,
                    {
                      color: !saveResult
                        ? c.textSecondary
                        : saveResult.ok
                          ? c.normal
                          : c.alert,
                    },
                  ]}
                >
                  {!saveResult
                    ? t("pushTestSaveNotAttempted")
                    : saveResult.ok
                      ? t("pushTestSaveOk", {
                          status: saveResult.status ?? "?",
                        })
                      : `${t("pushTestSaveFail")}: ${saveResult.error ?? "?"}`}
                </Text>
              </View>
              <Pressable
                onPress={() => void onRegister()}
                disabled={registerBusy}
                style={[
                  styles.pushDevBtn,
                  {
                    backgroundColor: registerBusy ? c.border : c.primary,
                    marginTop: 12,
                  },
                ]}
              >
                <Feather name="bell" size={14} color="#fff" />
                <Text style={styles.pushDevBtnText}>
                  {registerBusy
                    ? t("pushTestRegistering")
                    : t("pushTestRegister")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void onSendTestPush()}
                disabled={testBusy || !registration?.token}
                style={[
                  styles.pushDevBtn,
                  {
                    backgroundColor:
                      testBusy || !registration?.token
                        ? c.border
                        : c.primary,
                  },
                ]}
              >
                <Feather name="send" size={14} color="#fff" />
                <Text style={styles.pushDevBtnText}>
                  {testBusy
                    ? t("pushTestSending")
                    : t("pushTestSend")}
                </Text>
              </Pressable>
              {testResult && (
                <View style={styles.pushDevResult}>
                  {"transportError" in testResult && testResult.transportError ? (
                    <Text style={[styles.pushDevValue, { color: c.alert }]}>
                      {t("pushTestError")}: {testResult.transportError}
                    </Text>
                  ) : "ok" in testResult ? (
                    <>
                      <View style={styles.pushDevRow}>
                        <Text style={styles.pushDevLabel}>
                          {t("pushTestResultLabel")}
                        </Text>
                        <Text
                          style={[
                            styles.pushDevValue,
                            { color: testResult.ok ? c.normal : c.alert },
                          ]}
                        >
                          {testResult.ok
                            ? t("pushTestSuccess")
                            : t("pushTestFailed")}
                        </Text>
                      </View>
                      <View style={styles.pushDevRow}>
                        <Text style={styles.pushDevLabel}>
                          {t("pushTestBackendToken")}
                        </Text>
                        <Text
                          style={[
                            styles.pushDevValue,
                            {
                              color: testResult.tokenOnFile
                                ? c.normal
                                : c.alert,
                            },
                          ]}
                        >
                          {testResult.tokenOnFile
                            ? t("pushTestTokenOnFile")
                            : t("pushTestNoTokenSaved")}
                        </Text>
                      </View>
                      {testResult.tokenPreview && (
                        <View style={styles.pushDevRow}>
                          <Text style={styles.pushDevLabel}>
                            {t("pushTestSavedToken")}
                          </Text>
                          <Text
                            style={styles.pushDevValueMono}
                            numberOfLines={1}
                            selectable
                          >
                            {testResult.tokenPreview}
                          </Text>
                        </View>
                      )}
                      {testResult.reason && (
                        <View style={styles.pushDevRow}>
                          <Text style={styles.pushDevLabel}>
                            {t("pushTestReason")}
                          </Text>
                          <Text
                            style={styles.pushDevValueMono}
                            numberOfLines={2}
                            selectable
                          >
                            {testResult.reason}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : null}
                </View>
              )}
          </View>
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
  demoHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  demoExitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.border,
  },
  demoExitText: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  demoBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  demoBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  demoBtnText: {
    color: c.textWhite,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  pushDevSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: 8,
  },
  pushDevTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  pushDevRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  pushDevLabel: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  pushDevValue: {
    fontSize: 12,
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
    textAlign: "right",
  },
  pushDevValueMono: {
    fontSize: 11,
    color: c.textPrimary,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    flexShrink: 1,
    textAlign: "right",
  },
  pushDevBtn: {
    marginTop: 6,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  pushDevBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  pushDevResult: {
    marginTop: 8,
    gap: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: c.bg,
  },
});
