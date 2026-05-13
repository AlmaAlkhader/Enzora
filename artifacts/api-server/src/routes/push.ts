import { Router, type IRouter } from "express";
import { eq, and, ne, sql } from "drizzle-orm";

import { db, pushSubscriptionsTable } from "@workspace/db";
import {
  SyncPushSubscriptionBody,
  ClearPushSubscriptionsBody,
} from "@workspace/api-zod";

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
