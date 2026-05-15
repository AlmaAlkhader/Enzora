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
import { useScrollContentStyle } from "@/components/ScreenContainer";
import colors from "@/constants/colors";
import { useApp, type MonitoredRelationship } from "@/contexts/AppContext";

const c = colors.light;

export default function MedicalProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { saveMedicalProfile, profile } = useApp();
  const scrollContentStyle = useScrollContentStyle(24, false);
  const existing = profile?.medicalProfile ?? null;
  const [relationship, setRelationship] = useState<MonitoredRelationship>(
    existing?.relationship ?? "self",
  );
  const [monitoredName, setMonitoredName] = useState(
    existing?.monitoredName ?? "",
  );
  const [age, setAge] = useState(existing?.age ?? "");
  const [gender, setGender] = useState(existing?.gender ?? "");
  // Conditions are persisted as a comma-separated list of canonical English
  // labels (see `conditionOptions[].en`). On edit we parse that list back
  // into chip IDs and a free-text "other" value so re-saving the form does
  // not silently wipe previously stored conditions.
  const KNOWN_CONDITIONS: { v: string; en: string }[] = [
    { v: "diabetes_type_1", en: "Diabetes Type 1" },
    { v: "diabetes_type_2", en: "Diabetes Type 2" },
    { v: "post_surgery", en: "Post-surgery wound" },
    { v: "chronic_wound", en: "Chronic wound" },
    { v: "bed_sore", en: "Bed sore" },
    { v: "diabetic_foot", en: "Diabetic foot" },
  ];
  const parseConditions = (
    raw: string | undefined,
  ): { ids: string[]; other: string } => {
    const parts = (raw ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const ids: string[] = [];
    const otherParts: string[] = [];
    for (const p of parts) {
      const match = KNOWN_CONDITIONS.find((k) => k.en === p);
      if (match) ids.push(match.v);
      else otherParts.push(p);
    }
    if (otherParts.length > 0) ids.push("other");
    // Strip a literal "Other" sentinel — that's just the marker we save when
    // the user picked Other but typed nothing.
    const other = otherParts.filter((p) => p !== "Other").join(", ");
    return { ids, other };
  };
  const initialConditions = parseConditions(existing?.conditions);
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    initialConditions.ids,
  );
  const [otherCondition, setOtherCondition] = useState(initialConditions.other);
  const [docName, setDocName] = useState(existing?.doctorName ?? "");
  const [docPhone, setDocPhone] = useState(existing?.doctorPhone ?? "");
  const [emName, setEmName] = useState(existing?.emergencyContact ?? "");
  const [emPhone, setEmPhone] = useState(existing?.emergencyPhone ?? "");
  const [saving, setSaving] = useState(false);

  // Person being monitored — choices are translated for display, but the
  // value persisted is the stable id (used to render the right label later
  // and to drive logic like the Home banner).
  const relationshipOptions: { v: MonitoredRelationship; l: string }[] = [
    { v: "self", l: t("relSelf") },
    { v: "father", l: t("relFather") },
    { v: "mother", l: t("relMother") },
    { v: "grandparent", l: t("relGrandparent") },
    { v: "other", l: t("relOther") },
  ];

  const genders = [
    { v: "male", l: t("male") },
    { v: "female", l: t("female") },
    { v: "prefer", l: t("preferNotToSay") },
  ];

  // Each option carries:
  //   v  — stable internal id (used in selection state)
  //   l  — translated label rendered in the chip (EN or AR)
  //   en — canonical English label that we PERSIST into
  //        `medicalProfile.conditions`. Downstream readers (AI prompts in
  //        components/AI.tsx, doctor reports, and the regex-based care-tip
  //        logic in lib/wellness.ts that matches /diab/, /surg|post/, …)
  //        all assume English text, so we always store English regardless
  //        of the current UI language.
  const conditionOptions = [
    { v: "diabetes_type_1", l: t("conditionDiabetes1"), en: "Diabetes Type 1" },
    { v: "diabetes_type_2", l: t("conditionDiabetes2"), en: "Diabetes Type 2" },
    { v: "post_surgery", l: t("conditionPostSurgery"), en: "Post-surgery wound" },
    { v: "chronic_wound", l: t("conditionChronic"), en: "Chronic wound" },
    { v: "bed_sore", l: t("conditionBedSore"), en: "Bed sore" },
    { v: "diabetic_foot", l: t("conditionDiabeticFoot"), en: "Diabetic foot" },
    { v: "other", l: t("conditionOther"), en: "Other" },
  ];

  const toggleCondition = (v: string) => {
    setSelectedConditions((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  };

  const buildConditionsString = () => {
    const parts = selectedConditions
      .filter((v) => v !== "other")
      .map((v) => conditionOptions.find((o) => o.v === v)?.en ?? v);
    if (selectedConditions.includes("other")) {
      // Append the user-typed specification when provided; otherwise still
      // record that they picked "Other" so the selection isn't silently lost.
      parts.push(otherCondition.trim() || "Other");
    }
    return parts.join(", ");
  };

  const submit = async () => {
    setSaving(true);
    try {
      await saveMedicalProfile({
        age,
        gender,
        conditions: buildConditionsString(),
        doctorName: docName,
        doctorPhone: docPhone,
        emergencyContact: emName,
        emergencyPhone: emPhone,
        relationship,
        monitoredName: relationship === "self" ? "" : monitoredName.trim(),
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
        relationship: "self",
        monitoredName: "",
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
        contentContainerStyle={[styles.content, scrollContentStyle]}
      >
        <Field label={t("monitoredPersonSection")}>
          <View style={styles.chipRow}>
            {relationshipOptions.map((opt) => {
              const active = relationship === opt.v;
              return (
                <Pressable
                  key={opt.v}
                  onPress={() => setRelationship(opt.v)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextActive,
                    ]}
                  >
                    {opt.l}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {relationship !== "self" && (
            <View style={{ marginTop: 10 }}>
              <TextField
                value={monitoredName}
                onChangeText={setMonitoredName}
                placeholder={t("personNamePlaceholder")}
              />
            </View>
          )}
        </Field>

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
          <View style={styles.chipRow}>
            {conditionOptions.map((opt) => {
              const active = selectedConditions.includes(opt.v);
              return (
                <Pressable
                  key={opt.v}
                  onPress={() => toggleCondition(opt.v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextActive,
                    ]}
                  >
                    {opt.l}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selectedConditions.includes("other") && (
            <View style={{ marginTop: 10 }}>
              <TextField
                value={otherCondition}
                onChangeText={setOtherCondition}
                placeholder={t("pleaseSpecify")}
              />
            </View>
          )}
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
  content: { paddingTop: 16, gap: 16 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 18,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  chipText: {
    fontSize: 15,
    color: c.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  chipTextActive: {
    color: c.textWhite,
    fontFamily: "Inter_600SemiBold",
  },
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
