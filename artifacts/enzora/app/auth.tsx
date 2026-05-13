import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  EnzoraLogo,
  Field,
  LanguageToggle,
  PrimaryButton,
  TextField,
} from "@/components/Brand";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import colors, { gradient } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import {
  authenticateWithBiometrics,
  isBiometricAvailable,
} from "@/lib/biometric";

const c = colors.light;
const { height } = Dimensions.get("window");

export default function AuthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signUp, signIn, emailExists, setBiometricEnabled } = useApp();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [bioPromptEmail, setBioPromptEmail] = useState<string | null>(null);
  const [savedBioEmail, setSavedBioEmail] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const last = await AsyncStorage.getItem("enzora.lastBiometricEmail");
        if (!last) return;
        const flag = await AsyncStorage.getItem(
          `enzora.biometric.${last.toLowerCase()}`,
        );
        if (flag !== "1") return;
        const ok = await isBiometricAvailable();
        if (!ok) return;
        setSavedBioEmail(last);
        const success = await authenticateWithBiometrics(t("biometricPromptMessage"));
        if (success) {
          // Treat biometric success as a soft sign-in: pre-fill email so they
          // only need to type their password (we don't store passwords).
          setEmail(last);
          setTab("login");
        }
      } catch (err) {
        console.warn("[auth] biometric check failed", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (tab === "signup" && !name.trim()) errs.name = t("required");
    if (!email.trim()) errs.email = t("required");
    else if (!validateEmail(email)) errs.email = t("invalidEmail");
    if (!password) errs.password = t("required");
    else if (password.length < 8) errs.password = t("passwordTooShort");
    if (tab === "signup" && password !== confirm)
      errs.confirm = t("passwordsDontMatch");
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      if (tab === "signup") {
        await signUp(name.trim(), email.trim(), password);
        router.replace("/medical-profile");
      } else {
        const exists = await emailExists(email.trim());
        if (!exists) {
          setErrors({ email: t("unknownEmail") });
          setSubmitting(false);
          return;
        }
        await signIn(email.trim(), password);
        await AsyncStorage.setItem(
          "enzora.lastBiometricEmail",
          email.trim().toLowerCase(),
        );
        // Offer biometric enrollment after successful login if available and
        // not yet enabled for this account.
        const bioOk = await isBiometricAvailable();
        const flag = await AsyncStorage.getItem(
          `enzora.biometric.${email.trim().toLowerCase()}`,
        );
        if (bioOk && flag !== "1") {
          setBioPromptEmail(email.trim());
          return;
        }
        router.replace("/");
      }
    } catch (err) {
      console.error("[auth] failed", err);
      const code =
        typeof err === "object" && err && "code" in err
          ? String((err as { code?: string }).code)
          : "";
      const raw = err instanceof Error ? err.message : "";
      let friendly = t("somethingWrong");
      if (code === "auth/email-already-in-use") friendly = t("emailInUse");
      else if (code === "auth/invalid-email") friendly = t("invalidEmail");
      else if (code === "auth/weak-password") friendly = t("passwordTooShort");
      else if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found"
      )
        friendly = t("authError");
      else if (code === "auth/network-request-failed" || raw === "auth-timeout")
        friendly = t("networkError");
      else if (code === "auth/operation-not-allowed")
        friendly = t("authNotEnabled");
      else if (raw === "firestore-timeout") friendly = t("networkError");
      else if (raw) friendly = raw;
      setErrors({ form: friendly });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.top,
          { paddingTop: insets.top + 12, minHeight: Math.max(180, height * 0.24) },
        ]}
      >
        <View style={styles.logoWrap}>
          <EnzoraLogo variant="auth" />
        </View>
        <View style={[styles.langAbsolute, { top: insets.top + 12 }]}>
          <LanguageToggle dark />
        </View>
      </LinearGradient>

      <View style={styles.bottom}>
        <KeyboardAwareScrollViewCompat
          bottomOffset={20}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.tabs}>
            <Pressable
              onPress={() => setTab("signup")}
              style={[styles.tab, tab === "signup" && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "signup" && styles.tabTextActive,
                ]}
              >
                {t("signUp")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("login")}
              style={[styles.tab, tab === "login" && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "login" && styles.tabTextActive,
                ]}
              >
                {t("login")}
              </Text>
            </Pressable>
          </View>

          <View style={{ gap: 12, marginTop: 4 }}>
            {tab === "signup" && (
              <Field label={t("fullName")} error={errors.name}>
                <TextField
                  value={name}
                  onChangeText={setName}
                  placeholder={t("yourFullName")}
                  autoCapitalize="words"
                />
              </Field>
            )}
            <Field label={t("email")} error={errors.email}>
              <TextField
                value={email}
                onChangeText={setEmail}
                placeholder={t("emailPlaceholder")}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </Field>
            <Field label={t("password")} error={errors.password}>
              <TextField
                value={password}
                onChangeText={setPassword}
                placeholder={t("passwordPlaceholder")}
                secure
              />
            </Field>
            {tab === "signup" && (
              <Field label={t("confirmPassword")} error={errors.confirm}>
                <TextField
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder={t("repeatPassword")}
                  secure
                />
              </Field>
            )}
            {tab === "login" && (
              <Pressable style={{ alignSelf: "flex-end" }}>
                <Text style={styles.forgot}>{t("forgotPassword")}</Text>
              </Pressable>
            )}
          </View>

          {errors.form && (
            <View style={styles.formError}>
              <Text style={styles.formErrorText}>{errors.form}</Text>
            </View>
          )}
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              label={tab === "signup" ? t("createAccount") : t("signIn")}
              onPress={handleSubmit}
              loading={submitting}
            />
            {tab === "login" && savedBioEmail && (
              <Pressable
                onPress={async () => {
                  const ok = await authenticateWithBiometrics(
                    t("biometricPromptMessage"),
                  );
                  if (ok) setEmail(savedBioEmail);
                }}
                hitSlop={10}
                style={styles.bioBtn}
              >
                <Feather name="shield" size={18} color={c.primary} />
                <Text style={styles.bioText}>{t("biometricLogin")}</Text>
              </Pressable>
            )}
          </View>

          {bioPromptEmail && (
            <View style={styles.bioPromptCard}>
              <Text style={styles.bioPromptTitle}>
                {t("biometricEnableTitle")}
              </Text>
              <Text style={styles.bioPromptSub}>
                {t("biometricEnableSubtitle")}
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <PrimaryButton
                  label={t("maybeLater")}
                  variant="outline"
                  onPress={() => {
                    setBioPromptEmail(null);
                    router.replace("/");
                  }}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  label={t("enable")}
                  onPress={async () => {
                    const ok = await authenticateWithBiometrics(
                      t("biometricPromptMessage"),
                    );
                    if (ok) {
                      await setBiometricEnabled(true);
                    } else {
                      Alert.alert("", t("usePasswordInstead"));
                    }
                    setBioPromptEmail(null);
                    router.replace("/");
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </KeyboardAwareScrollViewCompat>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, position: "relative" },
  langAbsolute: {
    position: "absolute",
    right: 16,
  },
  logoWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 20,
  },
  bottom: {
    flex: 1,
    backgroundColor: c.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: c.tabBg,
    borderRadius: 14,
    padding: 4,
    height: 44,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: c.card,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  tabTextActive: {
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  forgot: {
    color: c.primary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  formError: {
    marginTop: 16,
    backgroundColor: c.alertBg,
    borderColor: c.alert,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  formErrorText: {
    color: c.alert,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  bioBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(110,117,191,0.10)",
  },
  bioText: {
    color: c.primary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
  },
  bioPromptCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  bioPromptTitle: {
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  bioPromptSub: {
    fontSize: 13,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    lineHeight: 19,
  },
});
