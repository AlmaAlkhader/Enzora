import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";

import {
  attachNotificationTapHandler,
  configureForegroundHandler,
} from "@/lib/push";

// Configure foreground notification display once at module load. Without
// this Expo silently drops notifications while the app is open.
configureForegroundHandler();
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/Wellness";
import { AppProvider } from "@/contexts/AppContext";
import { clearLegacyAICaches } from "@/lib/ai";
import "@/lib/i18n";

import AsyncStorage from "@react-native-async-storage/async-storage";

const AI_CACHE_WIPE_FLAG = "enzora_ai_cache_wiped_v1";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  // Route the user to the right screen when they tap a wound status push.
  useEffect(() => {
    const detach = attachNotificationTapHandler((path) => {
      try {
        router.push(path as never);
      } catch {
        // ignore navigation errors (e.g. before navigator is mounted)
      }
    });
    return detach;
  }, [router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 280,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      <Stack.Screen name="auth" />
      <Stack.Screen name="medical-profile" />
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
      <Stack.Screen
        name="connect-help"
        options={{ presentation: "modal", animation: "fade_from_bottom" }}
      />
      <Stack.Screen
        name="connect-device"
        options={{ presentation: "modal", animation: "fade_from_bottom" }}
      />
      <Stack.Screen
        name="wound/new"
        options={{ presentation: "modal", animation: "fade_from_bottom" }}
      />
      <Stack.Screen name="wound/[id]" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}

function GlobalLayer() {
  return <OfflineBanner />;
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
        await clearLegacyAICaches();
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
