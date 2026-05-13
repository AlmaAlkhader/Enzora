import { and, eq, isNotNull } from "drizzle-orm";

import { db, pushSubscriptionsTable } from "@workspace/db";

import { sendExpoPush } from "./expo-push";
import { logger } from "./logger";
import {
  contentForTransition,
  isNotifiableTransition,
  type Language,
  type SensorStatus,
} from "./notification-content";

// REST polling against Firebase RTDB. We chose REST over the Admin SDK so the
// backend doesn't need a service account secret — the existing public RTDB
// URL already serves the same data the mobile app reads. Override the URL via
// FIREBASE_DATABASE_URL on the api-server, otherwise we fall back to the
// EXPO_PUBLIC_FIREBASE_DATABASE_URL secret that's already configured for the
// mobile app.
const RTDB_URL =
  process.env.FIREBASE_DATABASE_URL ??
  process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ??
  null;

const POLL_INTERVAL_MS = 15_000;
// Per-status cooldown — if the same status fires repeatedly (e.g. flapping)
// we still won't push the same content twice within this window.
const COOLDOWN_MS = 10 * 60 * 1000;

interface SensorReading {
  status: SensorStatus | null;
  red?: number;
  green?: number;
  blue?: number;
}

async function fetchSensor(deviceId: string): Promise<SensorReading | null> {
  if (!RTDB_URL) return null;
  // RTDB REST: append `.json` to any node path. No auth header needed when
  // database rules permit anonymous reads (matches the mobile-side reads).
  const url = `${RTDB_URL.replace(/\/$/, "")}/devices/${encodeURIComponent(
    deviceId,
  )}/sensor.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger.debug(
        { deviceId, status: res.status },
        "[poller] non-200 from RTDB",
      );
      return null;
    }
    const v = (await res.json()) as
      | { status?: string; red?: number; green?: number; blue?: number }
      | null;
    if (!v || typeof v !== "object") return null;
    const s = v.status;
    const status =
      s === "yellow" || s === "green" || s === "blue" ? s : null;
    return {
      status,
      red: typeof v.red === "number" ? v.red : undefined,
      green: typeof v.green === "number" ? v.green : undefined,
      blue: typeof v.blue === "number" ? v.blue : undefined,
    };
  } catch (err) {
    logger.warn({ err, deviceId }, "[poller] RTDB fetch failed");
    return null;
  }
}

async function pollOnce(): Promise<void> {
  // Active subs: notifications on, not healed, has token, has device.
  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(
      and(
        eq(pushSubscriptionsTable.notificationsEnabled, true),
        eq(pushSubscriptionsTable.woundHealed, false),
        isNotNull(pushSubscriptionsTable.expoPushToken),
        isNotNull(pushSubscriptionsTable.deviceId),
      ),
    );
  if (subs.length === 0) return;

  // Group by deviceId so each device is fetched only once per tick.
  const byDevice = new Map<string, typeof subs>();
  for (const sub of subs) {
    if (!sub.deviceId) continue;
    const list = byDevice.get(sub.deviceId) ?? [];
    list.push(sub);
    byDevice.set(sub.deviceId, list);
  }

  await Promise.all(
    Array.from(byDevice.entries()).map(async ([deviceId, deviceSubs]) => {
      const reading = await fetchSensor(deviceId);
      if (!reading) return;
      const now = new Date();
      for (const sub of deviceSubs) {
        const previous = sub.lastSensorStatus as SensorStatus | null;
        const next = reading.status;

        // Always record the freshest reading timestamp regardless of
        // notification decision — useful for "device last seen" diagnostics.
        const baseUpdate: Partial<typeof pushSubscriptionsTable.$inferInsert> =
          {
            lastSensorReadingAt: now,
          };

        // Track status itself even on no-notify transitions (e.g. null→x).
        if (next !== previous) {
          baseUpdate.lastSensorStatus = next;
          baseUpdate.lastSensorStatusChangedAt = now;
        }

        const shouldNotify = isNotifiableTransition(previous, next);

        // Cooldown — same status pushed within the window is suppressed.
        const lastNotifAt = sub.lastNotifiedAt
          ? new Date(sub.lastNotifiedAt).getTime()
          : 0;
        const inCooldown =
          shouldNotify &&
          sub.lastNotifiedStatus === next &&
          now.getTime() - lastNotifAt < COOLDOWN_MS;

        if (shouldNotify && !inCooldown && sub.expoPushToken) {
          const content = contentForTransition({
            previousStatus: previous,
            newStatus: next,
            language: (sub.language as Language) ?? "en",
          });
          const result = await sendExpoPush({
            to: sub.expoPushToken,
            title: content.title,
            body: content.body,
            sound: "default",
            priority: next === "blue" ? "high" : "default",
            channelId: next === "blue" ? "alerts" : "default",
            data: {
              type: "wound_status_change",
              status: next,
              previousStatus: previous,
              woundId: sub.woundId,
            },
          });
          if (result.ok) {
            baseUpdate.lastNotifiedStatus = next;
            baseUpdate.lastNotifiedAt = now;
            baseUpdate.notificationsSent = (sub.notificationsSent ?? 0) + 1;
          } else if (result.invalidToken) {
            // Token is dead — clear it so we stop trying. The mobile app will
            // re-register on next launch.
            baseUpdate.expoPushToken = null;
            logger.info(
              { email: sub.email, woundId: sub.woundId, reason: result.reason },
              "[poller] dropped invalid Expo push token",
            );
          }
        }

        await db
          .update(pushSubscriptionsTable)
          .set(baseUpdate)
          .where(eq(pushSubscriptionsTable.id, sub.id));
      }
    }),
  );
}

let timer: NodeJS.Timeout | null = null;
let inFlight = false;

export function startFirebasePoller(): void {
  if (!RTDB_URL) {
    logger.warn(
      "[poller] FIREBASE_DATABASE_URL / EXPO_PUBLIC_FIREBASE_DATABASE_URL not set — wound status push notifications disabled",
    );
    return;
  }
  if (timer) return;
  logger.info(
    { intervalMs: POLL_INTERVAL_MS },
    "[poller] starting Firebase sensor monitor",
  );
  const tick = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      await pollOnce();
    } catch (err) {
      logger.warn({ err }, "[poller] tick failed");
    } finally {
      inFlight = false;
    }
  };
  // Fire immediately so a fresh boot doesn't wait a full interval.
  void tick();
  timer = setInterval(() => void tick(), POLL_INTERVAL_MS);
}

export function stopFirebasePoller(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
