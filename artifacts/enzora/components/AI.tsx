import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  I18nManager,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
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
  clearAssessmentCache,
  clearTrendCache,
  readAssessmentCache,
  readChatHistory,
  readTrendCache,
  writeAssessmentCache,
  writeChatHistory,
  writeTrendCache,
  type CachedTrend,
  type ChatMessage,
} from "@/lib/ai";

const c = colors.light;

const webCursor =
  Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : null;

const COLOR_RULES = `Color meanings:
YELLOW = wound is safe and healing normally
GREEN = early signs of infection — monitor closely, consider calling doctor
BLUE = infection confirmed — call doctor now`;

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

// =================== Helpers ===================
function patientContext(args: {
  name: string;
  conditions: string;
  woundName: string;
  location: string;
  status: string;
  daysMonitored: number;
  recentStatuses: string[];
  language: string;
}): string {
  const arabic =
    args.language === "ar" ? "\nRespond in Arabic." : "";
  return `Patient name: ${args.name}
Medical conditions: ${args.conditions || "(none specified)"}
Wound name: ${args.woundName}
Location: ${args.location || "(unspecified)"}
Current status: ${args.status}
Days monitored: ${args.daysMonitored}
Last 5 readings: [${args.recentStatuses.join(", ")}]
Write a short 3-sentence assessment addressed directly to this patient.${arabic}`;
}

function daysBetween(from: number, to: number): number {
  return Math.max(0, Math.floor((to - from) / (1000 * 60 * 60 * 24)));
}

// =================== AI Wound Assessment ===================
export function AIAssessment({ woundId }: { woundId: string }) {
  const { t, i18n } = useTranslation();
  const { profile, wounds, sensor, readings } = useApp();
  const wound = wounds.find((w) => w.id === woundId);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // Bumping this nonce forces the fetch effect to re-run (used by Retry).
  const [retryNonce, setRetryNonce] = useState(0);

  const status = sensor.status;
  const language = i18n.language;
  const conditions = profile?.medicalProfile?.conditions ?? "";

  const lastTrigger = useRef<string>("");

  useEffect(() => {
    if (!wound || !status) return;
    const triggerKey = `${woundId}::${status}::${language}::${retryNonce}`;
    if (lastTrigger.current === triggerKey) return;
    lastTrigger.current = triggerKey;

    let cancelled = false;
    const bypassCache = retryNonce > 0;
    void (async () => {
      if (!bypassCache) {
        const cached = await readAssessmentCache(woundId);
        if (
          cached &&
          cached.status === status &&
          cached.language === language
        ) {
          if (!cancelled) {
            setText(cached.text);
            setError(false);
          }
          return;
        }
      }
      if (!cancelled) {
        setLoading(true);
        setError(false);
      }
      const recent = readings
        .slice(0, 5)
        .map((r) => r.status);
      const days = daysBetween(wound.dateAdded, Date.now()) + 1;
      const sys = `You are a warm caring medical assistant for the Enzora smart wound monitoring app.
Users are elderly patients, diabetics, and post-surgery patients.
${COLOR_RULES}
Rules:
- Address the patient warmly by name
- No medical jargon
- Never diagnose
- Maximum 3 sentences
- End with one simple action to take now
- Encourage calling doctor for green or blue
- Be calm, never cause panic`;
      const user = patientContext({
        name: profile?.name ?? "friend",
        conditions,
        woundName: wound.name,
        location: wound.location,
        status,
        daysMonitored: days,
        recentStatuses: recent,
        language,
      });
      const result = await callClaude(sys, user);
      if (cancelled) return;
      if (result) {
        setText(result.trim());
        setError(false);
        await writeAssessmentCache(woundId, {
          text: result.trim(),
          status,
          language,
          generatedAt: Date.now(),
        });
      } else {
        setError(true);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [woundId, status, language, wound, profile, conditions, readings, retryNonce]);

  const retry = () => {
    setError(false);
    setText(null);
    // Drop any cached entry for this wound so the next fetch is forced fresh.
    void clearAssessmentCache(woundId);
    setRetryNonce((n) => n + 1);
  };

  if (!wound || !status) return null;

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <Text style={cardStyles.title}>✨ {t("aiAssessmentTitle")}</Text>
      </View>
      <View style={cardStyles.body}>
        {loading ? (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Text style={cardStyles.loadingText}>{t("aiAnalyzing")}</Text>
            <AnimatedDots />
          </View>
        ) : error ? (
          <View style={{ gap: 10 }}>
            <Text style={cardStyles.errorText}>{t("aiUnavailable")}</Text>
            <Pressable onPress={retry} style={[cardStyles.retryBtn, webCursor]}>
              <Feather name="refresh-cw" size={14} color={c.primary} />
              <Text style={cardStyles.retryText}>{t("retry")}</Text>
            </Pressable>
          </View>
        ) : text ? (
          <Text style={cardStyles.bodyText}>{text}</Text>
        ) : null}
      </View>
      <Text style={cardStyles.footer}>{t("aiDisclaimer")}</Text>
    </View>
  );
}

// =================== AI Trend Prediction ===================
export function AITrend({ woundId }: { woundId: string }) {
  const { t, i18n } = useTranslation();
  const { profile, wounds, readings } = useApp();
  const wound = wounds.find((w) => w.id === woundId);
  const [data, setData] = useState<CachedTrend | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const language = i18n.language;
  const conditions = profile?.medicalProfile?.conditions ?? "";
  const readingsCount = readings.length;

  // Load cache on mount or wound change
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cached = await readTrendCache(woundId);
      if (!cancelled) setData(cached);
    })();
    return () => {
      cancelled = true;
    };
  }, [woundId]);

  // Auto-refresh if 5+ new readings since last prediction
  useEffect(() => {
    if (!data) return;
    if (readingsCount - data.readingsCount >= 5) {
      void runPrediction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingsCount, data?.readingsCount]);

  async function runPrediction() {
    if (!wound) return;
    if (readingsCount < 3) return;
    // Manual / forced refresh always discards the cached entry first so the
    // next render can't fall back to stale data.
    await clearTrendCache(woundId);
    setLoading(true);
    setError(false);
    const last10 = readings
      .slice(0, 10)
      .reverse()
      .map((r) => ({ status: r.status, timestamp: r.timestamp }));
    const days = daysBetween(wound.dateAdded, Date.now()) + 1;
    const sys = `You are a medical AI for the Enzora app.
Analyze wound readings and predict the trend.
YELLOW = safe (best), GREEN = early infection, BLUE = confirmed infection.
YELLOW→GREEN→BLUE = worsening.
BLUE→GREEN→YELLOW = improving.
Same status repeated = stable.
Use simple language for elderly patients.
Maximum 2 sentences. Never diagnose.`;
    const arabic = language === "ar" ? "\nRespond in Arabic." : "";
    const user = `Patient: ${profile?.name ?? "friend"}
Conditions: ${conditions || "(none specified)"}
Wound: ${wound.name}, Days: ${days}
Last 10 readings oldest to newest:
${JSON.stringify(last10)}
Respond ONLY in JSON with this exact shape:
{
  "trend": "improving" | "stable" | "worsening",
  "explanation": "string (max 2 sentences)",
  "recommendation": "string (one action)"
}${arabic}`;
    const result = await callClaude(sys, user, [], 512);
    if (!result) {
      setError(true);
      setLoading(false);
      return;
    }
    try {
      // Extract the first {...} block — tolerates code fences or extra prose.
      const fenceStripped = result
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      const match = fenceStripped.match(/\{[\s\S]*\}/);
      const jsonText = match ? match[0] : fenceStripped;
      const raw = JSON.parse(jsonText) as Record<string, unknown>;
      const trendRaw =
        typeof raw.trend === "string" ? raw.trend.toLowerCase().trim() : "";
      const trend: "improving" | "stable" | "worsening" =
        trendRaw === "improving" || trendRaw === "worsening"
          ? trendRaw
          : "stable";
      const explanation =
        typeof raw.explanation === "string" && raw.explanation.trim()
          ? raw.explanation.trim()
          : "";
      const recommendation =
        typeof raw.recommendation === "string"
          ? raw.recommendation.trim()
          : "";
      if (!explanation) {
        setError(true);
        setLoading(false);
        return;
      }
      const next: CachedTrend = {
        trend,
        explanation,
        recommendation,
        language,
        readingsCount,
        generatedAt: Date.now(),
      };
      setData(next);
      await writeTrendCache(woundId, next);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (!wound) return null;

  const tooFew = readingsCount < 3;

  const badge =
    data?.trend === "improving"
      ? { bg: "#DCFCE7", color: "#15803D", label: t("trendImproving") }
      : data?.trend === "worsening"
        ? { bg: "#FEE2E2", color: "#B91C1C", label: t("trendWorsening") }
        : { bg: "#FEF3C7", color: "#A16207", label: t("trendStable") };

  return (
    <View style={cardStyles.card}>
      <View
        style={[
          cardStyles.header,
          { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
        ]}
      >
        <Text style={cardStyles.title}>🔮 {t("aiPredictionTitle")}</Text>
        <Pressable
          onPress={() => void runPrediction()}
          disabled={loading || tooFew}
          hitSlop={10}
          style={[webCursor]}
        >
          <Feather
            name="refresh-cw"
            size={18}
            color={loading || tooFew ? c.textSecondary : c.primary}
          />
        </Pressable>
      </View>
      <View style={cardStyles.body}>
        {tooFew ? (
          <Text style={cardStyles.bodyText}>{t("aiNotEnoughReadings")}</Text>
        ) : loading ? (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Text style={cardStyles.loadingText}>{t("aiAnalyzingHistory")}</Text>
            <AnimatedDots />
          </View>
        ) : error ? (
          <View style={{ gap: 10 }}>
            <Text style={cardStyles.errorText}>{t("aiUnavailable")}</Text>
            <Pressable
              onPress={() => void runPrediction()}
              style={[cardStyles.retryBtn, webCursor]}
            >
              <Feather name="refresh-cw" size={14} color={c.primary} />
              <Text style={cardStyles.retryText}>{t("retry")}</Text>
            </Pressable>
          </View>
        ) : data ? (
          <View style={{ gap: 10 }}>
            <View style={[trendStyles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[trendStyles.badgeText, { color: badge.color }]}>
                {badge.label}
              </Text>
            </View>
            <Text style={cardStyles.bodyText}>{data.explanation}</Text>
            {data.recommendation ? (
              <Text style={trendStyles.recommendation}>
                → {data.recommendation}
              </Text>
            ) : null}
            <Text style={trendStyles.updated}>
              {t("aiLastUpdated")}:{" "}
              {new Date(data.generatedAt).toLocaleString(
                language === "ar" ? "ar" : "en-US",
              )}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => void runPrediction()}
            style={[cardStyles.retryBtn, webCursor]}
          >
            <Feather name="zap" size={14} color={c.primary} />
            <Text style={cardStyles.retryText}>{t("aiPredict")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const trendStyles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  recommendation: {
    fontSize: 16,
    color: c.primary,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
    lineHeight: 22,
  },
  updated: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
});

// =================== AI Chatbot ===================
const SUGGESTED_KEYS_EN = [
  "chatChip1",
  "chatChip2",
  "chatChip3",
  "chatChip4",
  "chatChip5",
];

export function AIChatButton() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("askEnzoraAI")}
        style={[chatStyles.fab, webCursor]}
      >
        <LinearGradient
          colors={["#7E83C9", "#6E75BF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={chatStyles.fabGradient}
        >
          <Feather name="message-circle" size={26} color="#fff" />
        </LinearGradient>
      </Pressable>
      <AIChatModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AIChatModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { user, profile, activeWound, sensor } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  // Load history when modal opens
  useEffect(() => {
    if (!visible || !user) return;
    void readChatHistory(user.email).then(setMessages);
  }, [visible, user]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [visible, messages.length]);

  async function send(textRaw: string) {
    const text = textRaw.trim();
    if (!text || sending || !user) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setSending(true);

    const sys = `You are Enzora AI, a friendly caring medical assistant. Speak like a kind, patient nurse explaining things to a grandparent.
${COLOR_RULES}
Rules:
- Maximum 4 sentences
- Simple warm language
- Never diagnose
- Suggest doctor for green or blue
- If patient mentions pain, swelling, or fever, always recommend calling their doctor`;

    const arabic = i18n.language === "ar" ? "\nRespond in Arabic." : "";
    const woundName = activeWound?.name ?? "(no active wound)";
    const status = sensor.status ?? "(no current reading)";
    const conditions = profile?.medicalProfile?.conditions ?? "(none specified)";
    const days = activeWound
      ? daysBetween(activeWound.dateAdded, Date.now()) + 1
      : 0;
    const userMsg = `Patient name: ${profile?.name ?? "friend"}
Conditions: ${conditions}
Wound: ${woundName}, Status: ${status}
Days monitored: ${days}
Question: ${text}${arabic}`;

    // Send last 10 messages as context (excluding the just-pushed user message)
    const history = messages.slice(-10);
    const reply = await callClaude(sys, userMsg, history, 1024);
    setSending(false);
    const finalMessages: ChatMessage[] = reply
      ? [...next, { role: "assistant", content: reply.trim() }]
      : [
          ...next,
          { role: "assistant", content: t("aiUnavailable") },
        ];
    setMessages(finalMessages);
    await writeChatHistory(user.email, finalMessages);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: c.bg }}
      >
        <LinearGradient
          colors={["#7E83C9", "#6E75BF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={chatStyles.modalHeader}
        >
          <Text style={chatStyles.headerTitle}>{t("askEnzoraAI")} 🤖</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("close")}
            style={[chatStyles.headerClose, webCursor]}
          >
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
        </LinearGradient>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 18, gap: 12 }}
        >
          {messages.length === 0 ? (
            <View style={{ gap: 12, paddingVertical: 12 }}>
              <Text style={chatStyles.helperText}>{t("chatIntro")}</Text>
              <View style={chatStyles.chipsWrap}>
                {SUGGESTED_KEYS_EN.map((k) => (
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
                  m.role === "user"
                    ? chatStyles.userRow
                    : chatStyles.aiRow,
                ]}
              >
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

        <View style={chatStyles.inputBar}>
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
              <Feather name="send" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// =================== Shared card styles ===================
const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  title: {
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
  },
  bodyText: {
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  errorText: {
    fontSize: 16,
    color: c.alert,
    fontFamily: "Inter_500Medium",
    lineHeight: 22,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.primary,
  },
  retryText: {
    fontSize: 14,
    color: c.primary,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
  },
  footer: {
    fontSize: 12,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
    paddingBottom: 12,
    lineHeight: 17,
  },
});

// =================== Chat-specific styles ===================
const chatStyles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 92,
    ...(I18nManager.isRTL ? { left: 18 } : { right: 18 }),
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  fabGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeader: {
    paddingTop: Platform.OS === "ios" ? 56 : 22,
    paddingBottom: 18,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  headerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  helperText: {
    fontSize: 16,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 22,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  chip: {
    backgroundColor: c.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipText: {
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  bubbleRow: {
    flexDirection: "row",
  },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start" },
  userBubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  userText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    lineHeight: 22,
  },
  aiBubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  aiText: {
    color: c.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.card,
  },
  input: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
    backgroundColor: c.bg,
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
