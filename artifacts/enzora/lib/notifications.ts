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
const ANDROID_CHANNEL_ID = "enzora-alerts";

// ---------------------------------------------------------------------------
// Module-level setup
//
// 1. Foreground notification handler — without this, local notifications
//    fire silently when the app is in the foreground on SDK 53+ (the
//    default for shouldShowBanner / shouldShowList is false). This was the
//    reason status-change notifications looked broken even though the
//    listener was firing them correctly.
// 2. Android notification channel — Android requires an explicit channel
//    for any visible notification on API 26+; without it, scheduled local
//    notifications are dropped.
// ---------------------------------------------------------------------------
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        // New SDK 53+ flags — show a banner + list entry while the app is
        // foregrounded so the user actually sees status-change alerts.
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        // Older flag kept for back-compat with any intermediate runtime.
        shouldShowAlert: true,
      }),
    });
  } catch (err) {
    console.warn("[notifications] setNotificationHandler failed", err);
  }
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Enzora alerts",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    }).catch((err) => {
      console.warn("[notifications] android channel failed", err);
    });
  }
}

// ---------------------------------------------------------------------------
// Local notification helpers
//
// These work in Expo Go (unlike remote push, which requires a development
// build for SDK 53+). Currently used internally to mirror real Firebase
// status changes as a local notification while the app is open or recently
// backgrounded — until the production dev build is ready and the backend
// push transport can deliver to a closed app.
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

// Public alias — used by callers that want a clearly-named entry point for
// kicking off the OS permission prompt (e.g. when enabling notifications
// from settings). Returns true once permission is granted.
export const requestNotificationPermission = ensurePermission;

interface LocalAlertCopy {
  title: string;
  body: string;
}

function infectionCopy(language: "en" | "ar"): LocalAlertCopy {
  return language === "ar"
    ? {
        title: "تنبيه عدوى",
        body: "اتصل بطبيبك اليوم.",
      }
    : {
        title: "Infection alert",
        body: "Call your doctor today.",
      };
}

function transitionCopy(
  next: "yellow" | "green" | "blue",
  prev: "yellow" | "green" | "blue" | null,
  language: "en" | "ar",
): LocalAlertCopy | null {
  const en = language === "en";
  if (next === "blue") return infectionCopy(language);
  // "Small change" only on yellow → green. A blue → green improvement is
  // handled below as a recovery (no separate "small change" alert) so we
  // don't surprise the patient with a worsening-toned message right after
  // an infection alert resolves.
  if (next === "green" && prev === "yellow") {
    return en
      ? {
          title: "Small change detected",
          body: "Please check your wound today.",
        }
      : {
          title: "تم اكتشاف تغير بسيط",
          body: "يرجى فحص الجرح اليوم.",
        };
  }
  if (next === "yellow" && (prev === "green" || prev === "blue")) {
    return en
      ? {
          title: "Wound looks better",
          body: "Your reading is back to normal.",
        }
      : {
          title: "تحسنت حالة الجرح",
          body: "عادت القراءة إلى الوضع الطبيعي.",
        };
  }
  return null;
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
        ...(Platform.OS === "android"
          ? { channelId: ANDROID_CHANNEL_ID }
          : {}),
      },
      trigger: null,
    });
  } catch (err) {
    console.warn("[notifications] transition mirror failed", err);
  }
}

// Spec-named alias so callers can read as "notify status change". Behaves
// identically to presentLocalTransition.
export const notifyStatusChange = presentLocalTransition;

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
    // Short, warm reminder that nudges the user to open the app and read
    // today's personalized AI care tip. We deliberately do NOT embed the
    // full tip in the scheduled notification body — local schedules are
    // pre-baked and would otherwise become stale before they fire.
    const title =
      language === "ar"
        ? "نصيحة إنزورا جاهزة"
        : "Your Enzora care tip is ready";
    const body =
      language === "ar"
        ? "افتح إنزورا لقراءة نصيحة العناية اليوم."
        : "Open Enzora for today's wound-care advice.";
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
