import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MoodModal, OfflineBanner } from "@/components/Wellness";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { clearAllAICaches } from "@/lib/ai";
import "@/lib/i18n";

import AsyncStorage from "@react-native-async-storage/async-storage";

const AI_CACHE_WIPE_FLAG = "enzora_ai_cache_wiped_v1";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="medical-profile" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="connect-help"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="connect-device"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="wound/new" options={{ presentation: "modal" }} />
      <Stack.Screen name="wound/[id]" />
    </Stack>
  );
}

function GlobalLayer() {
  const { user, profile, hasMoodToday } = useApp();
  const pathname = usePathname();
  const [moodOpen, setMoodOpen] = useState(false);

  // Trigger mood check-in once per day, after the user is signed in with a
  // medical profile, while they're inside the main app tabs (not during
  // auth, onboarding, medical profile, or wound flows).
  useEffect(() => {
    if (!user || !profile?.medicalProfile) return;
    if (hasMoodToday) return;
    const p = pathname ?? "";
    const inMainApp =
      p === "/" ||
      /^\/(home|wounds|history|alerts|profile)\/?$/.test(p);
    if (!inMainApp) return;
    const id = setTimeout(() => setMoodOpen(true), 1500);
    return () => clearTimeout(id);
  }, [user, profile?.medicalProfile, hasMoodToday, pathname]);

  return (
    <>
      <OfflineBanner />
      <MoodModal visible={moodOpen} onClose={() => setMoodOpen(false)} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // One-time wipe of stale AI cache entries left over from earlier API
  // outages. Runs once per install (gated by an AsyncStorage flag).
  useEffect(() => {
    void (async () => {
      try {
        const done = await AsyncStorage.getItem(AI_CACHE_WIPE_FLAG);
        if (done) return;
        await clearAllAICaches();
        await AsyncStorage.setItem(AI_CACHE_WIPE_FLAG, "1");
      } catch {
        /* ignore */
      }
    })();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  const Inner = (
    <AppProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <GlobalLayer />
        <View style={{ flex: 1 }}>
          <RootLayoutNav />
        </View>
      </View>
    </AppProvider>
  );

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            {Platform.OS === "web" ? (
              Inner
            ) : (
              <KeyboardProvider>{Inner}</KeyboardProvider>
            )}
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
