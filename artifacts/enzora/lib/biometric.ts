import { Platform } from "react-native";

let LA: typeof import("expo-local-authentication") | null = null;
try {
  if (Platform.OS !== "web") {
    LA = require("expo-local-authentication") as typeof import("expo-local-authentication");
  }
} catch {
  LA = null;
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!LA) return false;
  try {
    const compatible = await LA.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LA.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometrics(message: string): Promise<boolean> {
  if (!LA) return false;
  try {
    const res = await LA.authenticateAsync({
      promptMessage: message,
      fallbackLabel: "",
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}
