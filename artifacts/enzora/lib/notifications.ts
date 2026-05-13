import { Platform } from "react-native";

// Lazy import — expo-notifications throws on web during module load in some
// setups, so we guard the require.
let Notifications: typeof import("expo-notifications") | null = null;
try {
  if (Platform.OS !== "web") {
    Notifications = require("expo-notifications") as typeof import("expo-notifications");
  }
} catch {
  Notifications = null;
}

const DAILY_ID = "enzora-daily-reminder";

export async function scheduleDailyReminder({
  enabled,
  language,
  hasActiveWound,
}: {
  enabled: boolean;
  language: "en" | "ar";
  hasActiveWound: boolean;
}): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => undefined);
    if (!enabled || !hasActiveWound) return;
    const perm = await Notifications.getPermissionsAsync();
    let granted = perm.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return;
    const title =
      language === "ar"
        ? "صباح الخير من إنزورا 💙"
        : "Good morning from Enzora 💙";
    const body =
      language === "ar"
        ? "جهازك يراقب جرحك. اشرب الماء واسترح جيداً اليوم."
        : "Your device is monitoring your wound. Stay hydrated and rest well today.";
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 9,
        minute: 0,
        repeats: true,
      },
    });
  } catch (err) {
    console.warn("[notifications] schedule failed", err);
  }
}
