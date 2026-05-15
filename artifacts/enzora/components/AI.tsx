import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import {
  callClaude,
  readChatHistory,
  writeChatHistory,
  type ChatMessage,
} from "@/lib/ai";

const c = colors.light;

const webCursor =
  Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : null;

const COLOR_RULES = `Color meanings:
YELLOW = wound is safe and healing normally
GREEN = early signs of infection — monitor closely, consider calling doctor
BLUE = infection confirmed — call doctor now

Exact script when asked what a color means (use these verbatim):
YELLOW EN: "Yellow means your wound is safe and healing normally. Keep it clean and dry."
GREEN EN: "Green means early signs of infection. Monitor your wound closely and call your doctor if it does not improve."
BLUE EN: "Blue means infection is confirmed. Call your doctor now."
YELLOW AR: "الأصفر يعني أن الجرح آمن ويلتئم بشكل طبيعي. حافظ عليه نظيفاً وجافاً."
GREEN AR: "الأخضر يعني ظهور علامات مبكرة للعدوى. راقب الجرح عن كثب واتصل بطبيبك إذا لم تتحسن الحال."
BLUE AR: "الأزرق يعني تأكد وجود عدوى. اتصل بطبيبك الآن."`;

// Urgent mode: 2–3 sentences with a clear action; normal mode: 2–4 sentences.

const SUGGESTED_KEYS = [
  "chatChip1",
  "chatChip2",
  "chatChip3",
  "chatChip4",
  "chatChip5",
];

// =================== Animated dots loader ===================
function AnimatedDots() {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [v]);
  const s1 = useAnimatedStyle(() => ({ opacity: 0.3 + 0.7 * v.value }));
  const s2 = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * Math.abs(v.value - 0.5) * 2,
  }));
  const s3 = useAnimatedStyle(() => ({ opacity: 1 - 0.7 * v.value }));
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      <Animated.View style={[loaderStyles.dot, s1]} />
      <Animated.View style={[loaderStyles.dot, s2]} />
      <Animated.View style={[loaderStyles.dot, s3]} />
    </View>
  );
}

const loaderStyles = StyleSheet.create({
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.primary,
  },
});

function daysBetween(from: number, to: number): number {
  return Math.max(0, Math.floor((to - from) / (1000 * 60 * 60 * 24)));
}

function formatTime(ts: number, language: string): string {
  return new Date(ts).toLocaleTimeString(language === "ar" ? "ar" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

type StampedMessage = ChatMessage & { ts?: number };

// =================== Inline Ask AI screen ===================
export function AIChatScreen() {
  const { t, i18n } = useTranslation();
  const { user, profile, activeWound, sensor } = useApp();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<StampedMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const language = i18n.language;

  // Reload history every time the screen gains focus so seeded turns from
  // other screens (e.g. "Ask about this tip") show up immediately.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void readChatHistory(user.email).then((h) =>
        setMessages(h.map((m) => ({ ...m }))),
      );
    }, [user]),
  );

  // Auto-scroll on new messages or while waiting for a reply.
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length, sending]);

  async function send(textRaw: string): Promise<void> {
    const text = textRaw.trim();
    if (!text || sending || !user) return;
    setInput("");
    const now = Date.now();
    const userMsg: StampedMessage = { role: "user", content: text, ts: now };
    const next = [...messages, userMsg];
    setMessages(next);
    setSending(true);

    const sys = `You are Enzora AI, a clear and practical wound-care assistant. Answer in 2–4 short sentences. Use neutral, direct language — no emotional phrases.
${COLOR_RULES}
Rules:
- Never diagnose
- For green: advise monitoring and mention calling the doctor if it persists
- For blue: tell the patient to call their doctor now
- For fever, severe pain, spreading redness, bad smell, or feeling unwell: advise urgent care immediately
- If asked what a color means, give the one-sentence answer from the color rules above
- End every response with one clear next step`;

    const arabic = language === "ar" ? "\nRespond in Arabic." : "";
    const woundName = activeWound?.name ?? "(no active wound)";
    const status = sensor.status ?? "(no current reading)";
    const conditions = profile?.medicalProfile?.conditions ?? "(none specified)";
    const days = activeWound
      ? daysBetween(activeWound.dateAdded, Date.now()) + 1
      : 0;
    const userPrompt = `Patient name: ${profile?.name ?? "friend"}
Medical conditions: ${conditions}
Current wound: ${woundName}
Current status: ${status}
Days monitored: ${days}
Patient question: ${text}${arabic}`;

    // Send last 10 messages as context (excluding the just-pushed user message).
    const history: ChatMessage[] = messages
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));
    const reply = await callClaude(sys, userPrompt, history, 1024);
    setSending(false);
    const assistant: StampedMessage = {
      role: "assistant",
      content: reply ? reply.trim() : t("aiUnavailable"),
      ts: Date.now(),
    };
    const finalMessages = [...next, assistant];
    setMessages(finalMessages);
    await writeChatHistory(
      user.email,
      finalMessages.map((m) => ({ role: m.role, content: m.content })),
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <Text style={chatStyles.disclaimer}>{t("askAIDisclaimer")}</Text>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, gap: 12, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={chatStyles.emptyWrap}>
            <View style={chatStyles.emptyIconWrap}>
              <Feather name="message-circle" size={42} color={c.primary} />
            </View>
            <Text style={chatStyles.emptyTitle}>{t("askAIEmpty")}</Text>
            <View style={chatStyles.chipsWrap}>
              {SUGGESTED_KEYS.map((k) => (
                <Pressable
                  key={k}
                  onPress={() => void send(t(k))}
                  style={[chatStyles.chip, webCursor]}
                >
                  <Text style={chatStyles.chipText}>{t(k)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          messages.map((m, i) => (
            <View
              key={i}
              style={[
                chatStyles.bubbleRow,
                m.role === "user" ? chatStyles.userRow : chatStyles.aiRow,
              ]}
            >
              <View style={{ maxWidth: "82%" }}>
                {m.role === "assistant" ? (
                  <View style={chatStyles.aiBubble}>
                    <Text style={chatStyles.aiText}>{m.content}</Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={["#7E83C9", "#6E75BF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={chatStyles.userBubble}
                  >
                    <Text style={chatStyles.userText}>{m.content}</Text>
                  </LinearGradient>
                )}
                {m.ts ? (
                  <Text
                    style={[
                      chatStyles.timestamp,
                      m.role === "user"
                        ? chatStyles.timestampRight
                        : chatStyles.timestampLeft,
                    ]}
                  >
                    {formatTime(m.ts, language)}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}
        {sending ? (
          <View style={[chatStyles.bubbleRow, chatStyles.aiRow]}>
            <View style={chatStyles.aiBubble}>
              <AnimatedDots />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={[chatStyles.inputBar, Platform.OS !== "web" && insets.bottom > 0 ? { paddingBottom: insets.bottom + 10 } : null]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t("typeMessage")}
          placeholderTextColor={c.textSecondary}
          style={chatStyles.input}
          onSubmitEditing={() => void send(input)}
          returnKeyType="send"
          editable={!sending}
          multiline={false}
          textAlign={I18nManager.isRTL ? "right" : "left"}
        />
        <Pressable
          onPress={() => void send(input)}
          disabled={sending || !input.trim()}
          style={[
            chatStyles.sendBtn,
            (sending || !input.trim()) && { opacity: 0.5 },
            webCursor,
          ]}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Feather
              name={I18nManager.isRTL ? "arrow-left" : "arrow-right"}
              size={22}
              color="#fff"
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const chatStyles = StyleSheet.create({
  disclaimer: {
    fontSize: 12,
    color: c.textSecondary,
    textAlign: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: c.bg,
    fontFamily: "Inter_400Regular",
  },
  emptyWrap: {
    alignItems: "center",
    gap: 16,
    paddingTop: 32,
    paddingHorizontal: 8,
  },
  emptyIconWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#EEEFFB",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: c.text,
    textAlign: "center",
    paddingHorizontal: 12,
    lineHeight: 24,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: c.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipText: {
    fontSize: 14,
    color: c.primary,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  bubbleRow: {
    flexDirection: "row",
  },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start" },
  aiBubble: {
    backgroundColor: c.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  aiText: {
    fontSize: 16,
    color: "#1B2A6B",
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  userBubble: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  userText: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  timestamp: {
    fontSize: 11,
    color: c.textSecondary,
    marginTop: 4,
    fontFamily: "Inter_400Regular",
  },
  timestampLeft: { textAlign: "left", paddingLeft: 4 },
  timestampRight: { textAlign: "right", paddingRight: 4 },
  inputBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: c.card,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 16,
    backgroundColor: "#F4F4FB",
    borderRadius: 26,
    fontSize: 16,
    color: c.text,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
