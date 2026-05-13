import { Router, type IRouter } from "express";
import { eq, and, ne, sql } from "drizzle-orm";

import { db, pushSubscriptionsTable } from "@workspace/db";
import {
  SyncPushSubscriptionBody,
  ClearPushSubscriptionsBody,
  SendTestPushBody,
} from "@workspace/api-zod";

import { sendExpoPush } from "../lib/expo-push";
import {
  contentForTransition,
  type Language,
} from "../lib/notification-content";

const router: IRouter = Router();

// Upsert the caller's subscription row keyed by (email, woundId). Idempotent —
// the mobile app may call this on every relevant state change.
router.post("/push/sync", async (req, res) => {
  const parsed = SyncPushSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const input = parsed.data;
  const email = input.email.trim().toLowerCase();
  const values = {
    email,
    woundId: input.woundId,
    deviceId: input.deviceId ?? null,
    expoPushToken: input.expoPushToken ?? null,
    language: input.language ?? "en",
    notificationsEnabled: input.notificationsEnabled ?? true,
    woundHealed: input.woundHealed ?? false,
  };
  try {
    await db
      .insert(pushSubscriptionsTable)
      .values(values)
      .onConflictDoUpdate({
        target: [
          pushSubscriptionsTable.email,
          pushSubscriptionsTable.woundId,
        ],
        set: {
          deviceId: values.deviceId,
          expoPushToken: values.expoPushToken,
          language: values.language,
          notificationsEnabled: values.notificationsEnabled,
          woundHealed: values.woundHealed,
          updatedAt: sql`now()`,
        },
      });
    // Only one wound is "active" at a time per user. Disable notifications on
    // every OTHER row for this email so the poller stops emitting pushes for
    // wounds the user has switched away from.
    await db
      .update(pushSubscriptionsTable)
      .set({ notificationsEnabled: false })
      .where(
        and(
          eq(pushSubscriptionsTable.email, email),
          ne(pushSubscriptionsTable.woundId, values.woundId),
        ),
      );
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "push/sync failed");
    res.status(500).json({ error: "Sync failed" });
  }
});

// Developer diagnostic — sends a real Expo push to the token saved on the
// (email, woundId) row and returns full diagnostic info so the in-app "Send
// Test Notification" button can show success/error and confirm the token is
// stored on the backend. This endpoint is intentionally simple and email-
// trusted, matching the existing trust model.
router.post("/push/test", async (req, res) => {
  const parsed = SendTestPushBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const woundId = parsed.data.woundId;
  try {
    const rows = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(
        and(
          eq(pushSubscriptionsTable.email, email),
          eq(pushSubscriptionsTable.woundId, woundId),
        ),
      )
      .limit(1);
    const sub = rows[0];
    if (!sub) {
      res.json({
        ok: false,
        tokenOnFile: false,
        tokenPreview: null,
        notificationsEnabled: false,
        expoStatus: null,
        reason: "no-subscription",
      });
      return;
    }
    const token = sub.expoPushToken;
    const tokenPreview = token
      ? `${token.slice(0, 18)}…${token.slice(-6)}`
      : null;
    if (!token) {
      res.json({
        ok: false,
        tokenOnFile: false,
        tokenPreview: null,
        notificationsEnabled: sub.notificationsEnabled,
        expoStatus: null,
        reason: "no-token-on-file",
      });
      return;
    }
    const content = contentForTransition({
      previousStatus: "yellow",
      newStatus: "blue",
      language: (sub.language as Language) ?? "en",
    });
    const result = await sendExpoPush({
      to: token,
      title: `[TEST] ${content.title}`,
      body: content.body,
      sound: "default",
      priority: "high",
      channelId: "alerts",
      data: { type: "wound_status_change", status: "blue", woundId, test: true },
    });
    res.json({
      ok: result.ok,
      tokenOnFile: true,
      tokenPreview,
      notificationsEnabled: sub.notificationsEnabled,
      expoStatus: result.ok ? "ok" : "error",
      reason: result.reason ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "push/test failed");
    res.status(500).json({ error: "Test failed" });
  }
});

// Wipe the Expo push token from every subscription belonging to this email
// (and optionally token). We deliberately keep the row so the next sign-in
// can re-register without losing prior status history.
router.post("/push/clear", async (req, res) => {
  const parsed = ClearPushSubscriptionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const token = parsed.data.expoPushToken ?? null;
  try {
    if (token) {
      await db
        .update(pushSubscriptionsTable)
        .set({ expoPushToken: null, notificationsEnabled: false })
        .where(
          and(
            eq(pushSubscriptionsTable.email, email),
            eq(pushSubscriptionsTable.expoPushToken, token),
          ),
        );
    } else {
      await db
        .update(pushSubscriptionsTable)
        .set({ expoPushToken: null, notificationsEnabled: false })
        .where(eq(pushSubscriptionsTable.email, email));
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "push/clear failed");
    res.status(500).json({ error: "Clear failed" });
  }
});

export default router;
