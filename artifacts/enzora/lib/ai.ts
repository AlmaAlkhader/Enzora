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

// ============ Chat history (AsyncStorage) ============
const CHAT_PREFIX = "enzora_ai_chat_";

// Legacy cache prefixes from the removed AI Assessment / AI Prediction cards.
// Kept here so the one-time wipe in _layout can still purge them on upgrade.
const LEGACY_PREFIXES = ["enzora_ai_assess_", "enzora_ai_trend_"];

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

// Append a user/assistant turn that seeds the chat with today's care tip so
// the AI screen has the tip in-context and the user can ask follow-ups.
export async function seedTipChatHistory(
  email: string,
  seedLabel: string,
  tipText: string,
): Promise<void> {
  const existing = await readChatHistory(email);
  const userTurn: ChatMessage = {
    role: "user",
    content: `${seedLabel} ${tipText}`.trim(),
  };
  const assistantTurn: ChatMessage = {
    role: "assistant",
    content: tipText,
  };
  // Avoid stacking duplicate seed turns when the user taps the action
  // multiple times for the same tip.
  const last = existing[existing.length - 1];
  const prev = existing[existing.length - 2];
  if (
    last?.role === "assistant" &&
    last.content === assistantTurn.content &&
    prev?.role === "user" &&
    prev.content === userTurn.content
  ) {
    return;
  }
  await writeChatHistory(email, [...existing, userTurn, assistantTurn]);
}

export async function clearChatHistory(email: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAT_PREFIX + email.toLowerCase());
  } catch {
    /* ignore */
  }
}

// One-time cleanup of any leftover assessment/trend cache entries from the
// previous AI cards feature. Called once per install on app launch.
export async function clearLegacyAICaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter((k) =>
      LEGACY_PREFIXES.some((p) => k.startsWith(p)),
    );
    if (stale.length) await AsyncStorage.multiRemove(stale);
  } catch {
    /* ignore */
  }
}
