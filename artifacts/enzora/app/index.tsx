import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Logo } from "@/components/Brand";
import { gradient } from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";

export default function Index() {
  const { user, profile, loading, hasSeenOnboarding, prefsLoaded } = useApp();

  if (!prefsLoaded) return <SplashView />;
  if (!hasSeenOnboarding) return <Redirect href="/onboarding" />;

  if (!user) {
    if (loading) return <SplashView />;
    return <Redirect href="/auth" />;
  }

  if (loading || !profile) return <SplashView />;

  if (!profile.medicalProfile) return <Redirect href="/medical-profile" />;

  return <Redirect href="/(tabs)" />;
}

function SplashView() {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.splash}
    >
      <Logo size="lg" />
      <ActivityIndicator
        color="#ffffff"
        size="large"
        style={{ marginTop: 32 }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
