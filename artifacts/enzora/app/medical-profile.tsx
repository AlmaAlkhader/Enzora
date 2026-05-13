import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  Field,
  GradientHeader,
  PrimaryButton,
  TextField,
} from "@/components/Brand";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

const c = colors.light;

export default function MedicalProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { saveMedicalProfile } = useApp();
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [conditions, setConditions] = useState("");
  const [docName, setDocName] = useState("");
  const [docPhone, setDocPhone] = useState("");
  const [emName, setEmName] = useState("");
  const [emPhone, setEmPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const genders = [
    { v: "male", l: t("male") },
    { v: "female", l: t("female") },
    { v: "other", l: t("other") },
    { v: "prefer", l: t("preferNotToSay") },
  ];

  const submit = async () => {
    setSaving(true);
    try {
      await saveMedicalProfile({
        age,
        gender,
        conditions,
        doctorName: docName,
        doctorPhone: docPhone,
        emergencyContact: emName,
        emergencyPhone: emPhone,
      });
      router.replace("/(tabs)");
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    setSaving(true);
    try {
      await saveMedicalProfile({
        age: "",
        gender: "",
        conditions: "",
        doctorName: "",
        doctorPhone: "",
        emergencyContact: "",
        emergencyPhone: "",
      });
      router.replace("/(tabs)");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader title={t("medicalProfile")} />
      <KeyboardAwareScrollViewCompat
        bottomOffset={20}
        contentContainerStyle={styles.content}
      >
        <Field label={t("age")}>
          <TextField
            value={age}
            onChangeText={setAge}
            placeholder={t("agePlaceholder")}
            keyboardType="number-pad"
          />
        </Field>

        <Field label={t("gender")}>
          <View style={styles.pillRow}>
            {genders.map((g) => {
              const active = gender === g.v;
              return (
                <Pressable
                  key={g.v}
                  onPress={() => setGender(g.v)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {g.l}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label={t("conditions")}>
          <TextField
            value={conditions}
            onChangeText={setConditions}
            placeholder={t("conditionsPlaceholder")}
            multiline
            numberOfLines={3}
            style={{
              height: undefined,
              minHeight: 80,
              backgroundColor: "#FFFFFF",
              borderColor: "#E2E8F0",
              borderWidth: 1.5,
              borderRadius: 12,
              paddingTop: 12,
              paddingBottom: 12,
              paddingHorizontal: 16,
              fontSize: 15,
              color: "#1B2A6B",
              textAlignVertical: "top",
            }}
          />
        </Field>

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={styles.section}>{t("doctor")}</Text>
            <Text style={styles.optional}>{t("optional")}</Text>
          </View>
          <TextField
            value={docName}
            onChangeText={setDocName}
            placeholder={t("doctorName")}
          />
          <TextField
            value={docPhone}
            onChangeText={setDocPhone}
            placeholder={t("doctorPhone")}
            keyboardType="phone-pad"
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={styles.section}>{t("emergencyContact")}</Text>
          <TextField
            value={emName}
            onChangeText={setEmName}
            placeholder={t("emergencyName")}
          />
          <TextField
            value={emPhone}
            onChangeText={setEmPhone}
            placeholder={t("emergencyPhone")}
            keyboardType="phone-pad"
          />
        </View>

        <PrimaryButton
          label={t("saveProfile")}
          onPress={submit}
          loading={saving}
          style={{ marginTop: 12, marginBottom: 24 }}
        />
        <Pressable onPress={skip} style={{ alignSelf: "center", padding: 12 }}>
          <Text style={styles.skip}>{t("skip")}</Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 16, paddingBottom: 32 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  pillText: {
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  pillTextActive: {
    color: c.textWhite,
    fontFamily: "Inter_600SemiBold",
  },
  section: {
    fontSize: 16,
    fontWeight: "700",
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  optional: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  skip: {
    color: c.textSecondary,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textDecorationLine: "underline",
  },
});
