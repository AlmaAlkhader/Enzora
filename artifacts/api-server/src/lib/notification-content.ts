// Patient-friendly push copy for wound status transitions. Strings live here
// (not in lib/i18n on the mobile app) because they are sent from the backend
// and chosen using the language the mobile app last reported on its
// subscription row.

export type SensorStatus = "yellow" | "green" | "blue";
export type Language = "en" | "ar";

export interface NotificationContent {
  title: string;
  body: string;
}

interface TransitionInput {
  previousStatus: SensorStatus | null;
  newStatus: SensorStatus;
  language: Language;
}

// Maps a (previousStatus, newStatus) pair to user-facing copy. We keep this
// pure so it's easy to unit test or call from a different transport later.
export function contentForTransition({
  previousStatus,
  newStatus,
  language,
}: TransitionInput): NotificationContent {
  const en = language === "en";
  // Yellow after a non-baseline status — wound is back to normal.
  if (
    newStatus === "yellow" &&
    (previousStatus === "green" || previousStatus === "blue")
  ) {
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
  if (newStatus === "green") {
    return en
      ? {
          title: "Small change detected",
          body: "Check your wound today.",
        }
      : {
          title: "تم اكتشاف تغير بسيط",
          body: "افحص جرحك اليوم.",
        };
  }
  if (newStatus === "blue") {
    return en
      ? {
          title: "Infection alert",
          body: "Call your doctor today. Go to emergency if you feel unwell.",
        }
      : {
          title: "تنبيه عدوى",
          body: "اتصل بطبيبك اليوم. اذهب إلى الطوارئ إذا شعرت بتوعك.",
        };
  }
  // Fallback — yellow as the very first reading or after null. We do not
  // notify in that case (the caller should already have skipped it), but we
  // return safe copy just in case.
  return en
    ? { title: "Sensor reading", body: "A new wound reading was recorded." }
    : { title: "قراءة الجهاز", body: "تم تسجيل قراءة جديدة للجرح." };
}

// True if a transition is worth pushing. Used by the poller to skip the
// initial null → first-reading edge and the no-change case.
export function isNotifiableTransition(
  previousStatus: SensorStatus | null,
  newStatus: SensorStatus | null,
): newStatus is SensorStatus {
  if (newStatus !== "yellow" && newStatus !== "green" && newStatus !== "blue")
    return false;
  if (previousStatus === newStatus) return false;
  if (previousStatus === null) return false;
  return true;
}
