import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { AIChatScreen } from "@/components/AI";
import { GradientHeader } from "@/components/Brand";
import colors from "@/constants/colors";

const c = colors.light;

export default function AskAIScreen() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GradientHeader layout="split" logoSize="lg" title={t("askAITitle")} />
      <AIChatScreen />
    </View>
  );
}
