import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
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
import { useApp } from "@/contexts/AppContext";

const c = colors.light;

export default function NewWound() {
  const { t } = useTranslation();
  const router = useRouter();
  const { addWound } = useApp();
  const scrollContentStyle = useScrollContentStyle(24, false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t("required");
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      await addWound({
        name: name.trim(),
        location: location.trim(),
        description: description.trim() ? `${date} — ${description.trim()}` : date,
        notes: notes.trim(),
        healedAt: null,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader
        title={t("addNewWound")}
        back
        onBack={() => router.back()}
      />
      <KeyboardAwareScrollViewCompat
        bottomOffset={20}
        contentContainerStyle={[styles.content, scrollContentStyle]}
      >
        <Field label={t("woundName")} error={errors.name}>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder={t("woundNamePlaceholder")}
          />
        </Field>
        <Field label={t("whereWound")}>
          <TextField
            value={location}
            onChangeText={setLocation}
            placeholder={t("whereWoundPlaceholder")}
          />
        </Field>
        <Field label={t("whenHappened")}>
          <TextField
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
        </Field>
        <Field label={t("howHappened")}>
          <TextField
            value={description}
            onChangeText={setDescription}
            placeholder=""
            multiline
            numberOfLines={3}
            style={{ height: 90, textAlignVertical: "top", paddingTop: 14 }}
          />
        </Field>
        <Field label={t("notes")}>
          <TextField
            value={notes}
            onChangeText={setNotes}
            placeholder=""
            multiline
            numberOfLines={3}
            style={{ height: 90, textAlignVertical: "top", paddingTop: 14 }}
          />
        </Field>
        <PrimaryButton
          label={t("startMonitoring")}
          icon="check"
          onPress={submit}
          loading={saving}
          style={{ marginTop: 8 }}
        />
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, gap: 16 },
});
