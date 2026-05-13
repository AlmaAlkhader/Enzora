import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  Field,
  LanguageToggle,
  Logo,
  PrimaryButton,
  TextField,
} from "@/components/Brand";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import colors, { gradient } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

const c = colors.light;
const { height } = Dimensions.get("window");

export default function AuthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signUp, signIn, emailExists } = useApp();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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
        router.replace("/");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("somethingWrong");
      setErrors({
        password: msg.includes("password") ? t("authError") : msg,
      });
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
          { paddingTop: insets.top + 8, height: height * 0.28 },
        ]}
      >
        <View style={styles.topBar}>
          <View />
          <LanguageToggle dark />
        </View>
        <View style={styles.logoWrap}>
          <Logo size="lg" />
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

          <View style={{ marginTop: 24 }}>
            <PrimaryButton
              label={tab === "signup" ? t("createAccount") : t("signIn")}
              onPress={handleSubmit}
              loading={submitting}
            />
          </View>
        </KeyboardAwareScrollViewCompat>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 18 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
});
