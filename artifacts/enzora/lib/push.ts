import { Platform } from "react-native";

// expo-notifications crashes on web during module load in some setups, so we
// guard the require behind a try/catch (matches the pattern in
// ./notifications.ts).
let Notifications: typeof import("expo-notifications") | null = null;
try {
  if (Platform.OS !== "web") {
    Notifications =
      require("expo-notifications") as typeof import("expo-notifications");
  }
} catch {
  Notifications = null;
}

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
const PROJECT_ID =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
  process.env.EXPO_PUBLIC_PROJECT_ID ??
  undefined;

export interface PushSyncInput {
  email: string;
  woundId: string;
  deviceId: string | null;
  language: "en" | "ar";
  notificationsEnabled: boolean;
  woundHealed: boolean;
}

// Cached so we don't re-prompt the user or hit Expo's services on every
// AppContext re-render. The token is otherwise stable for the install.
let cachedToken: string | null = null;
let permissionAsked = false;

// Configure Android notification channels once. Required for Android 8+ to
// pick the right priority/sound for urgent infection alerts.
let channelsConfigured = false;
async function ensureAndroidChannels(): Promise<void> {
  if (channelsConfigured || !Notifications || Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
    await Notifications.setNotificationChannelAsync("alerts", {
      name: "Wound alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      sound: "default",
    });
    channelsConfigured = true;
  } catch {
    // Non-fatal — the channel will just default.
  }
}

export function getCachedExpoPushToken(): string | null {
  return cachedToken;
}

export async function getNotificationPermissionStatus(): Promise<
  "granted" | "denied" | "undetermined" | "unavailable"
> {
  if (!Notifications) return "unavailable";
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.granted) return "granted";
    if (perm.canAskAgain) return "undetermined";
    return "denied";
  } catch {
    return "unavailable";
  }
}

export interface PushTestResponse {
  ok: boolean;
  tokenOnFile: boolean;
  tokenPreview: string | null;
  notificationsEnabled: boolean;
  expoStatus: string | null;
  reason: string | null;
}

// Calls the backend's /push/test diagnostic endpoint. Returns parsed result
// or throws on transport / non-200 errors so the UI can show the cause.
export async function sendBackendTestPush(input: {
  email: string;
  woundId: string;
}): Promise<PushTestResponse> {
  if (!API_BASE) throw new Error("API base URL not configured");
  const res = await fetch(`${API_BASE}/api/push/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`Backend returned HTTP ${res.status}`);
  }
  return (await res.json()) as PushTestResponse;
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!Notifications) return null;
  if (cachedToken) return cachedToken;
  try {
    await ensureAndroidChannels();
    const perm = await Notifications.getPermissionsAsync();
    let granted = perm.granted;
    if (!granted && !permissionAsked) {
      permissionAsked = true;
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return null;
    // PROJECT_ID is required on Android in Expo SDK 49+; on iOS it's also
    // strongly recommended. If absent we still try — getExpoPushTokenAsync
    // will surface a clear error message.
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      PROJECT_ID ? { projectId: PROJECT_ID } : undefined,
    );
    cachedToken = tokenResult.data ?? null;
    return cachedToken;
  } catch (err) {
    console.warn("[push] failed to get Expo push token", err);
    return null;
  }
}

// Sync the current subscription state to the backend. Safe to call repeatedly
// — the backend upserts on (email, woundId). When notifications are disabled
// or there's no token, we still sync so the backend updates the row instead
// of stale-polling.
export async function syncPushSubscription(
  input: PushSyncInput,
): Promise<void> {
  if (!API_BASE) return;
  // Only request a token when notifications are enabled. If the user opted
  // out, we send a null token so the backend stops trying to push.
  const expoPushToken = input.notificationsEnabled
    ? await getExpoPushToken()
    : null;
  try {
    await fetch(`${API_BASE}/api/push/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        woundId: input.woundId,
        deviceId: input.deviceId,
        expoPushToken,
        language: input.language,
        notificationsEnabled: input.notificationsEnabled,
        woundHealed: input.woundHealed,
      }),
    });
  } catch (err) {
    console.warn("[push] sync failed", err);
  }
}

// Called on logout. We send the cached token (if any) so the backend can
// match and clear the right subscription rows even if the user re-signs-in
// later with a different account on the same device.
export async function clearPushSubscription(email: string): Promise<void> {
  if (!API_BASE) return;
  try {
    await fetch(`${API_BASE}/api/push/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, expoPushToken: cachedToken }),
    });
  } catch (err) {
    console.warn("[push] clear failed", err);
  }
}

// Foreground display behavior. Without this Expo silently drops notifications
// while the app is open. We still want a visible banner so the user notices
// status changes during the demo too.
export function configureForegroundHandler(): void {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function routeFromResponse(
  response: import("expo-notifications").NotificationResponse,
  navigate: (path: string) => void,
): void {
  const data = response.notification.request.content.data as
    | { type?: string; woundId?: string }
    | undefined;
  if (!data || data.type !== "wound_status_change") return;
  if (data.woundId) {
    navigate(`/wound/${data.woundId}`);
  } else {
    navigate("/(tabs)");
  }
}

// Tracks whether we already consumed the cold-start response so a remount of
// the listener does not re-navigate the user.
let coldStartConsumed = false;

// Subscribe to taps on push notifications and route the user to the right
// screen. Also handles the cold-start case where the user opened the app by
// tapping a push from a fully-killed state — Expo surfaces that via
// getLastNotificationResponseAsync rather than the live listener.
export function attachNotificationTapHandler(
  navigate: (path: string) => void,
): () => void {
  if (!Notifications) return () => undefined;
  if (!coldStartConsumed) {
    coldStartConsumed = true;
    void Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (resp) routeFromResponse(resp, navigate);
    });
  }
  const sub = Notifications.addNotificationResponseReceivedListener(
    (response) => routeFromResponse(response, navigate),
  );
  return () => sub.remove();
}
