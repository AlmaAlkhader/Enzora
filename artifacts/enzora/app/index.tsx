import { Redirect } from "expo-router";
import React from "react";

import { AnimatedSplash } from "@/components/Wellness";
import { useApp } from "@/contexts/AppContext";

export default function Index() {
  const { user, profile, loading, hasSeenOnboarding, prefsLoaded } = useApp();

  if (!prefsLoaded) return <AnimatedSplash />;
  if (!hasSeenOnboarding) return <Redirect href="/onboarding" />;

  if (!user) {
    if (loading) return <AnimatedSplash />;
    return <Redirect href="/auth" />;
  }

  if (loading || !profile) return <AnimatedSplash />;

  if (!profile.medicalProfile) return <Redirect href="/medical-profile" />;

  return <Redirect href="/(tabs)" />;
}
