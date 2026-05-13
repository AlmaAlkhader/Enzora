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

// ---------------------------------------------------------------------------
// Local notification helpers
//
// These work in Expo Go (unlike remote push, which requires a development
// build for SDK 53+). We use them for:
//   1. The "Test Local Notification" / "Simulate Wound Change Alert" buttons
//      in the Profile diagnostics card.
//   2. A foreground/backgrounded mirror of real Firebase status changes so
//      the user sees something while we wait for a development build.
// ---------------------------------------------------------------------------

async function ensurePermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

export async function scheduleLocalTestNotification(): Promise<boolean> {
  if (!Notifications) return false;
  if (!(await ensurePermission())) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Enzora test",
        body: "Local notifications are working on this phone.",
        data: { type: "local_test" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
      },
    });
    return true;
  } catch (err) {
    console.warn("[notifications] local test schedule failed", err);
    return false;
  }
}

interface LocalAlertCopy {
  title: string;
  body: string;
}

function infectionCopy(language: "en" | "ar"): LocalAlertCopy {
  return language === "ar"
    ? {
        title: "تنبيه عدوى",
        body: "يرجى الاتصال بطبيبك اليوم. إذا كنت تشعر بتوعك، اذهب إلى المستشفى.",
      }
    : {
        title: "Infection alert",
        body: "Please call your doctor today. If you feel unwell, go to the hospital.",
      };
}

function transitionCopy(
  next: "yellow" | "green" | "blue",
  prev: "yellow" | "green" | "blue" | null,
  language: "en" | "ar",
): LocalAlertCopy | null {
  const en = language === "en";
  if (next === "blue") return infectionCopy(language);
  if (next === "green") {
    return en
      ? {
          title: "Small change detected",
          body: "Please keep an eye on your wound today.",
        }
      : {
          title: "تم اكتشاف تغير بسيط",
          body: "يرجى مراقبة الجرح اليوم.",
        };
  }
  if (next === "yellow" && (prev === "green" || prev === "blue")) {
    return en
      ? {
          title: "Wound status improved",
          body: "Your wound reading is back to normal.",
        }
      : {
          title: "تحسنت حالة الجرح",
          body: "عادت قراءة الجرح إلى الحالة الطبيعية.",
        };
  }
  return null;
}

// Fire an immediate local notification for the infected (blue) state. Used by
// the "Simulate Wound Change Alert" button in the diagnostics card.
export async function showLocalInfectionAlert(
  language: "en" | "ar",
): Promise<boolean> {
  if (!Notifications) return false;
  if (!(await ensurePermission())) return false;
  const { title, body } = infectionCopy(language);
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: "wound_status_change", status: "blue", local: true },
      },
      // null trigger = present immediately.
      trigger: null,
    });
    return true;
  } catch (err) {
    console.warn("[notifications] infection alert failed", err);
    return false;
  }
}

// Called from AppContext when the Firebase sensor status transitions while
// the app is open/backgrounded. Expo Go can show these even though it can't
// receive remote push — that's why we mirror them locally as a stop-gap
// until a development build is ready.
export async function presentLocalTransition(input: {
  previousStatus: "yellow" | "green" | "blue" | null;
  newStatus: "yellow" | "green" | "blue";
  language: "en" | "ar";
}): Promise<void> {
  if (!Notifications) return;
  const copy = transitionCopy(
    input.newStatus,
    input.previousStatus,
    input.language,
  );
  if (!copy) return;
  if (!(await ensurePermission())) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.title,
        body: copy.body,
        data: {
          type: "wound_status_change",
          status: input.newStatus,
          local: true,
        },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn("[notifications] transition mirror failed", err);
  }
}

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
