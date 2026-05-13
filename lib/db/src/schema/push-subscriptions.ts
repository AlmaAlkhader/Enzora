import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// One row per (email, woundId). The mobile app upserts this whenever the
// active wound, device, push token, language, or notification toggle changes.
// The backend Firebase poller reads this table to know what devices to watch
// and where to deliver notifications. Auth is intentionally email-only — it
// matches the existing AsyncStorage-based mobile auth and does not introduce
// a new auth system.
export const pushSubscriptionsTable = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    woundId: text("wound_id").notNull(),
    deviceId: text("device_id"),
    expoPushToken: text("expo_push_token"),
    language: text("language").notNull().default("en"),
    notificationsEnabled: boolean("notifications_enabled")
      .notNull()
      .default(true),
    woundHealed: boolean("wound_healed").notNull().default(false),
    // Last status read from Firebase by the poller (yellow|green|blue|null).
    lastSensorStatus: text("last_sensor_status"),
    lastSensorStatusChangedAt: timestamp("last_sensor_status_changed_at", {
      withTimezone: true,
    }),
    lastSensorReadingAt: timestamp("last_sensor_reading_at", {
      withTimezone: true,
    }),
    // Tracks the most recent push so we can apply a per-status cooldown.
    lastNotifiedStatus: text("last_notified_status"),
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
    // Counter for diagnostics — incremented on every successful Expo push.
    notificationsSent: integer("notifications_sent").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    emailWoundIdx: uniqueIndex("push_subs_email_wound_idx").on(
      table.email,
      table.woundId,
    ),
  }),
);

export const insertPushSubscriptionSchema = createInsertSchema(
  pushSubscriptionsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSensorStatus: true,
  lastSensorStatusChangedAt: true,
  lastSensorReadingAt: true,
  lastNotifiedStatus: true,
  lastNotifiedAt: true,
  notificationsSent: true,
});
export type InsertPushSubscription = z.infer<
  typeof insertPushSubscriptionSchema
>;
export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;
