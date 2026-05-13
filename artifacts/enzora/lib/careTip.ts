import AsyncStorage from "@react-native-async-storage/async-storage";

import { callClaude } from "@/lib/ai";

// ---------------------------------------------------------------------------
// Daily personalized AI care tip
//
// One AI-generated message per (user, wound, calendar day). Cached in
// AsyncStorage so the tip stays stable across app opens within the same day
// and we don't burn Claude credits on every Home screen render. The user can
// force a refresh from the card via the "Refresh Tip" button.
// ---------------------------------------------------------------------------

export type SensorStatus = "yellow" | "green" | "blue";
export type Language = "en" | "ar";

export interface CareTipContext {
  patientName: string;
  monitoringPerson: string; // e.g. "Sarah (daughter)" or "self"
  isSelfMonitoring: boolean;
  medicalConditions: string;
  woundName: string;
  status: SensorStatus | null;
  daysMonitored: number;
  recentStatuses: SensorStatus[]; // newest first, up to 10
  notes: string;
  language: Language;
}

export interface CachedCareTip {
  userId: string;
  woundId: string;
  date: string; // YYYY-MM-DD (local)
  statusAtGeneration: SensorStatus | null;
  language: Language;
  message: string;
  createdAt: number;
}

const CACHE_PREFIX = "enzora_care_tip_";
const cacheKey = (email: string, woundId: string, date: string) =>
  `${CACHE_PREFIX}${email.toLowerCase()}_${woundId}_${date}`;

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function readCachedTip(
  email: string,
  woundId: string,
  date: string,
): Promise<CachedCareTip | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(email, woundId, date));
    return raw ? (JSON.parse(raw) as CachedCareTip) : null;
  } catch {
    return null;
  }
}

export async function writeCachedTip(tip: CachedCareTip): Promise<void> {
  try {
    await AsyncStorage.setItem(
      cacheKey(tip.userId, tip.woundId, tip.date),
      JSON.stringify(tip),
    );
  } catch {
    /* ignore */
  }
}

const SYSTEM_PROMPT_EN =
  "You are Enzora Care Assistant. Write short, warm wound-care tips. Do " +
  "not diagnose. Do not scare the patient. Use simple words. Maximum 3 " +
  "short sentences. Give one helpful tip and one clear action for today. " +
  "Use at most one gentle motivational phrase — do not repeat 'you are " +
  "doing great' every time. If the status is an alert, be urgent but " +
  "brief. Do not use raw RGB values. Do not use the word 'diagnosis'. " +
  "Respond in English.";

const SYSTEM_PROMPT_AR =
  "أنت مساعد إنزورا للعناية. اكتب نصائح قصيرة ودافئة للعناية بالجروح. لا " +
  "تقدم تشخيصاً. لا تخيف المريض. استخدم كلمات بسيطة. ثلاث جمل قصيرة كحد " +
  "أقصى. قدم نصيحة مفيدة واحدة وإجراءً واضحاً واحداً لليوم. استخدم عبارة " +
  "تشجيعية لطيفة واحدة على الأكثر — لا تكرر 'أنت تقوم بعمل رائع' في كل " +
  "مرة. إذا كانت الحالة تنبيهاً، كن عاجلاً لكن مختصراً. لا تستخدم قيم RGB " +
  "الخام. لا تستخدم كلمة 'تشخيص'. أجب بالعربية.";

function statusLabel(s: SensorStatus | null, lang: Language): string {
  if (!s) return lang === "ar" ? "غير معروفة" : "unknown";
  if (lang === "ar") {
    if (s === "yellow") return "طبيعية";
    if (s === "green") return "تغير بسيط";
    return "تنبيه — احتمال عدوى";
  }
  if (s === "yellow") return "normal";
  if (s === "green") return "small change";
  return "alert — possible infection";
}

function buildUserMessage(ctx: CareTipContext): string {
  const lang = ctx.language;
  const recent = ctx.recentStatuses.length
    ? ctx.recentStatuses.map((s) => statusLabel(s, lang)).join(", ")
    : lang === "ar"
      ? "لا توجد قراءات سابقة بعد"
      : "no previous readings yet";
  const monitoringLine = ctx.isSelfMonitoring
    ? lang === "ar"
      ? "المريض يراقب نفسه."
      : "The patient is monitoring themself."
    : lang === "ar"
      ? `الشخص الذي يراقب: ${ctx.monitoringPerson}.`
      : `Monitoring person: ${ctx.monitoringPerson}.`;

  if (lang === "ar") {
    return [
      `اسم المريض: ${ctx.patientName || "—"}`,
      monitoringLine,
      `الحالات الطبية: ${ctx.medicalConditions || "لا يوجد"}`,
      `الجرح الحالي: ${ctx.woundName || "—"}`,
      `الحالة الحالية: ${statusLabel(ctx.status, lang)}`,
      `أيام المراقبة: ${ctx.daysMonitored}`,
      `القراءات الأخيرة: ${recent}`,
      `ملاحظات: ${ctx.notes || "لا يوجد"}`,
      "",
      "اكتب رسالة عناية اليوم لهذا المريض بثلاث جمل قصيرة كحد أقصى.",
    ].join("\n");
  }
  return [
    `Patient name: ${ctx.patientName || "—"}`,
    monitoringLine,
    `Medical conditions: ${ctx.medicalConditions || "none"}`,
    `Current wound: ${ctx.woundName || "—"}`,
    `Current status: ${statusLabel(ctx.status, lang)}`,
    `Days monitored: ${ctx.daysMonitored}`,
    `Recent readings: ${recent}`,
    `Notes: ${ctx.notes || "none"}`,
    "",
    "Write today's care message for this patient in at most 3 short sentences.",
  ].join("\n");
}

// Calm fallback message used when the AI server is unreachable. Still
// personalized and language-aware so the card never looks broken.
function fallbackMessage(ctx: CareTipContext): string {
  const first = (ctx.patientName || "").split(" ")[0]?.trim() || "";
  if (ctx.language === "ar") {
    if (ctx.status === "blue") {
      return `صباح الخير${first ? " يا " + first : ""}. اكتشف إنزورا قراءة تنبيه. اتصل بطبيبك اليوم.`;
    }
    if (ctx.status === "green") {
      return `صباح الخير${first ? " يا " + first : ""}. تم ملاحظة تغير بسيط. افحص الجرح اليوم واتصل بالطبيب إذا زاد الألم أو التورم.`;
    }
    return `صباح الخير${first ? " يا " + first : ""}. يبدو الجرح مستقراً اليوم. حافظ عليه نظيفاً وجافاً.`;
  }
  if (ctx.status === "blue") {
    return `Good morning${first ? ", " + first : ""}. Enzora detected an alert reading. Call your doctor today.`;
  }
  if (ctx.status === "green") {
    return `Good morning${first ? ", " + first : ""}. A small change was noticed. Check the wound today and call your doctor if pain or swelling increases.`;
  }
  return `Good morning${first ? ", " + first : ""}. Your wound looks stable today. Keep it clean and dry.`;
}

export interface GenerateOptions {
  email: string;
  woundId: string;
  ctx: CareTipContext;
  forceRefresh?: boolean;
}

export interface GenerateResult {
  tip: CachedCareTip;
  fromCache: boolean;
  usedFallback: boolean;
}

// Fetch today's tip from cache, or generate (and cache) a new one. When
// `forceRefresh` is true (Refresh Tip button) the cache is bypassed and
// overwritten with the fresh result.
export async function getOrGenerateDailyTip(
  opts: GenerateOptions,
): Promise<GenerateResult> {
  const date = todayKey();
  if (!opts.forceRefresh) {
    const cached = await readCachedTip(opts.email, opts.woundId, date);
    // Reuse the cached tip only if the language AND the wound status are
    // unchanged. A same-day status transition (e.g. yellow -> blue) must
    // regenerate so the message matches the new urgency level.
    if (
      cached &&
      cached.language === opts.ctx.language &&
      cached.statusAtGeneration === opts.ctx.status
    ) {
      return { tip: cached, fromCache: true, usedFallback: false };
    }
  }

  const system =
    opts.ctx.language === "ar" ? SYSTEM_PROMPT_AR : SYSTEM_PROMPT_EN;
  const userMessage = buildUserMessage(opts.ctx);
  const aiText = await callClaude(system, userMessage, [], 400);
  const usedFallback = !aiText;
  const message = (aiText ?? fallbackMessage(opts.ctx)).trim();

  const tip: CachedCareTip = {
    userId: opts.email,
    woundId: opts.woundId,
    date,
    statusAtGeneration: opts.ctx.status,
    language: opts.ctx.language,
    message,
    createdAt: Date.now(),
  };
  await writeCachedTip(tip);
  return { tip, fromCache: false, usedFallback };
}
