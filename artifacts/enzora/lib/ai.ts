import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  history: ChatMessage[] = [],
  maxTokens = 1024,
): Promise<string | null> {
  if (!API_BASE) {
    console.warn("[ai] EXPO_PUBLIC_API_BASE_URL is not set");
    return null;
  }
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/claude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, userMessage, history, maxTokens }),
      });
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const data = (await res.json()) as { text?: string };
      if (typeof data.text === "string") return data.text;
      throw new Error("Missing text in response");
    } catch (err) {
      console.warn(`[ai] callClaude attempt ${attempt} failed`, err);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
  return null;
}

// ============ Cache helpers (AsyncStorage) ============
const ASSESS_PREFIX = "enzora_ai_assess_";
const TREND_PREFIX = "enzora_ai_trend_";
const CHAT_PREFIX = "enzora_ai_chat_";

export type CachedAssessment = {
  text: string;
  status: "yellow" | "green" | "blue";
  language: string;
  generatedAt: number;
};

export async function readAssessmentCache(
  woundId: string,
): Promise<CachedAssessment | null> {
  try {
    const raw = await AsyncStorage.getItem(ASSESS_PREFIX + woundId);
    return raw ? (JSON.parse(raw) as CachedAssessment) : null;
  } catch {
    return null;
  }
}

export async function writeAssessmentCache(
  woundId: string,
  data: CachedAssessment,
): Promise<void> {
  try {
    await AsyncStorage.setItem(ASSESS_PREFIX + woundId, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export async function clearAssessmentCache(woundId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(ASSESS_PREFIX + woundId);
  } catch {
    /* ignore */
  }
}

export async function clearTrendCache(woundId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(TREND_PREFIX + woundId);
  } catch {
    /* ignore */
  }
}

// One-time wipe of every cached AI result (assessments + trends), used on
// app startup to recover from any stale entries left over from API outages.
export async function clearAllAICaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter(
      (k) => k.startsWith(ASSESS_PREFIX) || k.startsWith(TREND_PREFIX),
    );
    if (stale.length) await AsyncStorage.multiRemove(stale);
  } catch {
    /* ignore */
  }
}

export type CachedTrend = {
  trend: "improving" | "stable" | "worsening";
  explanation: string;
  recommendation: string;
  language: string;
  readingsCount: number;
  generatedAt: number;
};

export async function readTrendCache(
  woundId: string,
): Promise<CachedTrend | null> {
  try {
    const raw = await AsyncStorage.getItem(TREND_PREFIX + woundId);
    return raw ? (JSON.parse(raw) as CachedTrend) : null;
  } catch {
    return null;
  }
}

export async function writeTrendCache(
  woundId: string,
  data: CachedTrend,
): Promise<void> {
  try {
    await AsyncStorage.setItem(TREND_PREFIX + woundId, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export async function readChatHistory(
  email: string,
): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(
      CHAT_PREFIX + email.toLowerCase(),
    );
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export async function writeChatHistory(
  email: string,
  history: ChatMessage[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CHAT_PREFIX + email.toLowerCase(),
      JSON.stringify(history.slice(-30)),
    );
  } catch {
    /* ignore */
  }
}
