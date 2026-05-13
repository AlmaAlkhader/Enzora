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

// expo-device tells us if we're on a real device (push tokens cannot be
// generated on simulators). expo-constants tells us the EAS projectId, the
// SDK version and whether we're running inside Expo Go.
let Device: typeof import("expo-device") | null = null;
try {
  Device = require("expo-device") as typeof import("expo-device");
} catch {
  Device = null;
}

let Constants: typeof import("expo-constants").default | null = null;
try {
  Constants = (require("expo-constants") as typeof import("expo-constants"))
    .default;
} catch {
  Constants = null;
}

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

// Resolve the EAS projectId from the standard locations. Constants is the
// authoritative source on a real build; the env var is a dev-time fallback so
// we can iterate without rebuilding.
function resolveProjectId(): string | null {
  const fromConfig =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    // easConfig is the legacy location; keep as a fallback.
    (Constants as unknown as { easConfig?: { projectId?: string } } | null)
      ?.easConfig?.projectId ??
    null;
  if (fromConfig) return fromConfig;
  const fromEnv =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    process.env.EXPO_PUBLIC_PROJECT_ID;
  return fromEnv ?? null;
}

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

// Detect the Expo Go runtime. Modern SDKs expose this via
// `executionEnvironment === 'storeClient'`; older ones via
// `appOwnership === 'expo'`. We accept either.
function isRunningInExpoGo(): boolean {
  if (!Constants) return false;
  const env = (Constants as unknown as { executionEnvironment?: string })
    .executionEnvironment;
  if (env) return env === "storeClient";
  const ownership = (Constants as unknown as { appOwnership?: string })
    .appOwnership;
  return ownership === "expo";
}

function getExpoSdkVersion(): string | null {
  if (!Constants) return null;
  return (
    Constants.expoConfig?.sdkVersion ??
    (Constants as unknown as { expoVersion?: string }).expoVersion ??
    null
  );
}

function sdkMajor(version: string | null): number | null {
  if (!version) return null;
  const m = /^(\d+)/.exec(version);
  return m ? Number(m[1]) : null;
}

export interface PushRegistration {
  platform: typeof Platform.OS;
  isDevice: boolean;
  isExpoGo: boolean;
  sdkVersion: string | null;
  permissionStatus: "granted" | "denied" | "undetermined" | "unavailable";
  projectId: string | null;
  token: string | null;
  // Human-readable error if token generation failed. Null on success.
  error: string | null;
  // Machine-readable blocker code so the UI can show targeted guidance.
  blocker:
    | "web"
    | "simulator"
    | "expo-go-sdk53"
    | "permission-denied"
    | "missing-project-id"
    | "token-error"
    | null;
}

// The full registration flow. Idempotent and safe to call repeatedly. Returns
// a structured diagnostic that the UI renders directly — this is the single
// source of truth for "why doesn't push work right now?".
export async function registerForPushNotificationsAsync(): Promise<PushRegistration> {
  const sdkVersion = getExpoSdkVersion();
  const isExpoGo = isRunningInExpoGo();
  const isDevice = Device?.isDevice ?? false;
  const projectId = resolveProjectId();
  const base: Omit<PushRegistration, "permissionStatus"> & {
    permissionStatus: PushRegistration["permissionStatus"];
  } = {
    platform: Platform.OS,
    isDevice,
    isExpoGo,
    sdkVersion,
    permissionStatus: "unavailable",
    projectId,
    token: null,
    error: null,
    blocker: null,
  };

  if (Platform.OS === "web" || !Notifications) {
    return {
      ...base,
      error: "Push notifications cannot be tested in the web preview.",
      blocker: "web",
    };
  }

  if (!isDevice) {
    return {
      ...base,
      error:
        "Push notifications require a physical device or supported native build.",
      blocker: "simulator",
    };
  }

  // Expo Go dropped support for remote push notifications in SDK 53. Detect
  // and explain instead of silently failing inside getExpoPushTokenAsync.
  const major = sdkMajor(sdkVersion);
  if (isExpoGo && major !== null && major >= 53) {
    base.permissionStatus = await getNotificationPermissionStatus();
    return {
      ...base,
      error:
        "Remote push notifications do not work in Expo Go for SDK 53+. Use a development build to test closed-app push notifications.",
      blocker: "expo-go-sdk53",
    };
  }

  await ensureAndroidChannels();

  // Permission flow: check first, request only if not already decided.
  let permissionStatus: PushRegistration["permissionStatus"] = "unavailable";
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) {
      permissionStatus = "granted";
    } else if (existing.canAskAgain) {
      const requested = await Notifications.requestPermissionsAsync();
      permissionStatus = requested.granted
        ? "granted"
        : requested.canAskAgain
          ? "undetermined"
          : "denied";
    } else {
      permissionStatus = "denied";
    }
  } catch (err) {
    return {
      ...base,
      error:
        "Failed to read notification permission: " +
        (err instanceof Error ? err.message : String(err)),
      blocker: "permission-denied",
    };
  }

  base.permissionStatus = permissionStatus;
  if (permissionStatus !== "granted") {
    return {
      ...base,
      error: "Notification permission was not granted.",
      blocker: "permission-denied",
    };
  }

  if (!projectId) {
    return {
      ...base,
      error:
        "Missing EAS projectId. Add expo.extra.eas.projectId in app.json (or set EXPO_PUBLIC_EAS_PROJECT_ID).",
      blocker: "missing-project-id",
    };
  }

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    cachedToken = tokenResult.data ?? null;
    return {
      ...base,
      token: cachedToken,
      error: cachedToken ? null : "getExpoPushTokenAsync returned empty data.",
      blocker: cachedToken ? null : "token-error",
    };
  } catch (err) {
    return {
      ...base,
      error:
        "getExpoPushTokenAsync failed: " +
        (err instanceof Error ? err.message : String(err)),
      blocker: "token-error",
    };
  }
}

// Backwards-compatible token getter used by syncPushSubscription. Delegates
// to the full registration so behaviour stays consistent.
export async function getExpoPushToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  const reg = await registerForPushNotificationsAsync();
  return reg.token;
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

export interface PushSyncResult {
  ok: boolean;
  status: number | null;
  error: string | null;
}

// Sync the current subscription state to the backend. Safe to call repeatedly
// — the backend upserts on (email, woundId). When notifications are disabled
// or there's no token, we still sync so the backend updates the row instead
// of stale-polling. Returns a result so callers (e.g. the dev panel) can
// show the outcome; the AppContext effect ignores it.
export async function syncPushSubscription(
  input: PushSyncInput,
): Promise<PushSyncResult> {
  if (!API_BASE) {
    return { ok: false, status: null, error: "API base URL not configured" };
  }
  // Only request a token when notifications are enabled. If the user opted
  // out, we send a null token so the backend stops trying to push.
  const expoPushToken = input.notificationsEnabled
    ? await getExpoPushToken()
    : null;
  try {
    const res = await fetch(`${API_BASE}/api/push/sync`, {
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
    return {
      ok: res.ok,
      status: res.status,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.warn("[push] sync failed", err);
    return { ok: false, status: null, error };
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
