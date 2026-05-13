import { logger } from "./logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound?: "default" | null;
  data?: Record<string, unknown>;
  priority?: "default" | "normal" | "high";
  channelId?: string;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

interface ExpoResponse {
  data?: ExpoTicket | ExpoTicket[];
  errors?: { code: string; message: string }[];
}

// Returns true when the Expo push API accepted the message. We treat HTTP-
// level failures and per-ticket "error" statuses as failures so the caller
// can decide whether to retry or invalidate the token.
export async function sendExpoPush(message: ExpoPushMessage): Promise<{
  ok: boolean;
  invalidToken: boolean;
  reason?: string;
}> {
  if (!message.to || !message.to.startsWith("ExponentPushToken")) {
    return { ok: false, invalidToken: true, reason: "invalid-token-format" };
  }
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      logger.warn(
        { status: res.status, statusText: res.statusText },
        "[expo-push] http error",
      );
      return { ok: false, invalidToken: false, reason: `http-${res.status}` };
    }
    const json = (await res.json()) as ExpoResponse;
    const tickets = Array.isArray(json.data)
      ? json.data
      : json.data
        ? [json.data]
        : [];
    const t = tickets[0];
    if (!t) {
      return { ok: false, invalidToken: false, reason: "no-ticket" };
    }
    if (t.status === "ok") {
      return { ok: true, invalidToken: false };
    }
    // Common per-ticket error code that means we should drop the token.
    const errCode =
      t.details && typeof t.details["error"] === "string"
        ? (t.details["error"] as string)
        : undefined;
    // Only treat truly per-device errors as "invalid token". InvalidCredentials
    // is a project/credential misconfig — clearing tokens for that would null
    // out every user's token on a setup mistake.
    const invalidToken =
      errCode === "DeviceNotRegistered" ||
      (t.message ?? "").includes("not a registered push notification recipient");
    return {
      ok: false,
      invalidToken,
      reason: t.message ?? errCode ?? "ticket-error",
    };
  } catch (err) {
    logger.warn({ err }, "[expo-push] send failed");
    return { ok: false, invalidToken: false, reason: "fetch-error" };
  }
}
