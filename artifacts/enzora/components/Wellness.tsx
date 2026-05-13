import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { Card, EnzoraLogo, PrimaryButton } from "@/components/Brand";
import colors from "@/constants/colors";
import { useApp, type Reading, type Wound } from "@/contexts/AppContext";
import { SUPPORT_PHONE } from "@/lib/support";
import {
  calcHealingDays,
  calcHealingProgress,
  generateCareTips,
  generateDoctorReport,
  lastNMoodDays,
  type Mood,
  type MoodEntry,
  type Patient,
} from "@/lib/wellness";

const c = colors.light;

const webCursor =
  Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : null;

const MOOD_META: Record<
  Mood,
  { emoji: string; color: string; labelKey: string; responseKey: string }
> = {
  great: {
    emoji: "😊",
    color: "#06D6A0",
    labelKey: "moodGreat",
    responseKey: "moodResponseGreat",
  },
  okay: {
    emoji: "😐",
    color: "#FFB703",
    labelKey: "moodOkay",
    responseKey: "moodResponseOkay",
  },
  notgreat: {
    emoji: "😔",
    color: "#6B7FA3",
    labelKey: "moodNotGreat",
    responseKey: "moodResponseNotGreat",
  },
  pain: {
    emoji: "😣",
    color: "#EF233C",
    labelKey: "moodPain",
    responseKey: "moodResponsePain",
  },
};

// =============== Animated Splash =================
export function AnimatedSplash() {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 700 });
    scale.value = withSequence(
      withTiming(1.05, { duration: 700, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 350, easing: Easing.inOut(Easing.cubic) }),
    );
  }, [opacity, scale]);
  const aStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <LinearGradient
      colors={[c.primary, c.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={splashStyles.wrap}
    >
      <Animated.View style={[{ alignItems: "center" }, aStyle]}>
        <EnzoraLogo variant="splash" />
      </Animated.View>
      <PulsingDots />
    </LinearGradient>
  );
}

function PulsingDots() {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 36 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 200} />
      ))}
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const o = useSharedValue(0.3);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0.3, { duration: 500 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        { width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" },
        a,
      ]}
    />
  );
}

const splashStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center" },
});

// =============== Live Color Circle =================
export function LiveColorCircle({
  red,
  green,
  blue,
  status,
  connected,
}: {
  red: number;
  green: number;
  blue: number;
  status: "yellow" | "green" | "blue" | null;
  connected: boolean;
}) {
  const { t } = useTranslation();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (status === "blue" && connected) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(1, { duration: 300 });
    }
  }, [status, connected, pulse]);
  const a = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const fill = connected
    ? `rgb(${clamp(red)}, ${clamp(green)}, ${clamp(blue)})`
    : "#A0AEC0";
  const ring =
    status === "blue"
      ? "#EF233C"
      : status === "green"
        ? "#FF6B6B"
        : status === "yellow"
          ? "#FFB703"
          : "#A0AEC0";

  return (
    <View style={liveStyles.row}>
      <Animated.View style={[liveStyles.outerRing, { borderColor: ring }, a]}>
        <View style={[liveStyles.inner, { backgroundColor: fill }]} />
      </Animated.View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={liveStyles.label}>{t("liveSensor")}</Text>
        <Text style={liveStyles.rgb}>
          R {clamp(red)} · G {clamp(green)} · B {clamp(blue)}
        </Text>
        <Text style={[liveStyles.state, { color: ring }]}>
          {connected
            ? status === "blue"
              ? t("alertLabel")
              : status === "green"
                ? t("caution")
                : t("normal")
            : t("notConnected")}
        </Text>
      </View>
    </View>
  );
}

function clamp(v: number): number {
  if (typeof v !== "number" || isNaN(v)) return 0;
  return Math.max(0, Math.min(255, Math.round(v)));
}

const liveStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: c.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  outerRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: { width: 64, height: 64, borderRadius: 32 },
  label: {
    fontSize: 11,
    color: c.textSecondary,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  rgb: {
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  state: { fontSize: 16, fontFamily: "Inter_700Bold", fontWeight: "800" },
});

// =============== Healing Progress =================
export function HealingProgress({
  wound,
  readings,
  sensorStatus,
}: {
  wound: Wound;
  readings: Reading[];
  sensorStatus: "yellow" | "green" | "blue" | null;
}) {
  const { t } = useTranslation();
  const pct = calcHealingProgress(wound, readings);
  const days = calcHealingDays(wound);
  const msg =
    sensorStatus === "blue"
      ? t("healMessageBlue")
      : sensorStatus === "green"
        ? t("healMessageGreen")
        : t("healMessageYellow");
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(pct, { duration: 800 });
  }, [pct, w]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={hpStyles.wrap}>
      <View style={hpStyles.headerRow}>
        <Text style={hpStyles.title}>{t("healingJourney")}</Text>
        <Text style={hpStyles.pct}>{pct}%</Text>
      </View>
      <View style={hpStyles.track}>
        <Animated.View style={[hpStyles.fill, fillStyle]}>
          <LinearGradient
            colors={[c.primary, c.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <View style={hpStyles.metaRow}>
        <Text style={hpStyles.day}>
          {t("dayOfMonitoring", { day: days })}
        </Text>
        <Text style={hpStyles.msg}>{msg}</Text>
      </View>
    </View>
  );
}

const hpStyles = StyleSheet.create({
  wrap: {
    backgroundColor: c.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  pct: {
    fontSize: 22,
    color: c.primary,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
  },
  track: {
    height: 14,
    backgroundColor: c.tabBg,
    borderRadius: 7,
    overflow: "hidden",
  },
  fill: { height: 14, borderRadius: 7, overflow: "hidden" },
  metaRow: { gap: 2 },
  day: {
    fontSize: 13,
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  msg: { fontSize: 13, color: c.textPrimary, fontFamily: "Inter_600SemiBold" },
});

// =============== Tips Carousel =================
export function TipsCarousel() {
  const { t } = useTranslation();
  const { profile, sensor, activeWound, language } = useApp();
  const days = activeWound ? calcHealingDays(activeWound) : 0;
  const tips = useMemo(
    () =>
      generateCareTips({
        profile: profile?.medicalProfile ?? null,
        status: sensor.status,
        location: activeWound?.location ?? "",
        days,
        language,
      }),
    [profile?.medicalProfile, sensor.status, activeWound?.location, days, language],
  );
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % tips.length),
      6000,
    );
    return () => clearInterval(id);
  }, [tips.length]);
  if (!tips.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={tipsStyles.heading}>{t("careTips")}</Text>
      <View style={tipsStyles.card}>
        <View style={tipsStyles.iconWrap}>
          <Feather name="zap" size={20} color={c.primary} />
        </View>
        <Text style={tipsStyles.text}>{tips[index]}</Text>
        <View style={tipsStyles.dots}>
          {tips.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => setIndex(i)}
              hitSlop={6}
              style={[
                tipsStyles.dot,
                i === index && { backgroundColor: c.primary, width: 18 },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const tipsStyles = StyleSheet.create({
  heading: {
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(110,117,191,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  dots: {
    flexDirection: "column",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.border,
  },
});

// =============== Mood Modal =================
export function MoodModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { recordMood } = useApp();
  const [picked, setPicked] = useState<Mood | null>(null);
  const moods: Mood[] = ["great", "okay", "notgreat", "pain"];

  const choose = async (m: Mood) => {
    setPicked(m);
    await recordMood(m);
    if (Platform.OS !== "web") {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      setPicked(null);
      onClose();
    }, 1800);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={moodStyles.bg} onPress={onClose}>
        <Pressable style={moodStyles.card} onPress={() => undefined}>
          {!picked ? (
            <>
              <Text style={moodStyles.title}>{t("moodTitle")}</Text>
              <View style={moodStyles.grid}>
                {moods.map((m) => {
                  const meta = MOOD_META[m];
                  return (
                    <Pressable
                      key={m}
                      onPress={() => void choose(m)}
                      style={({ pressed }) => [
                        moodStyles.item,
                        webCursor,
                        { borderColor: meta.color, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text style={moodStyles.emoji}>{meta.emoji}</Text>
                      <Text style={[moodStyles.label, { color: meta.color }]}>
                        {t(meta.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Text style={moodStyles.skip}>{t("skip")}</Text>
              </Pressable>
            </>
          ) : (
            <View style={{ alignItems: "center", gap: 16, paddingVertical: 12 }}>
              <Text style={{ fontSize: 64 }}>{MOOD_META[picked].emoji}</Text>
              <Text style={moodStyles.response}>
                {t(MOOD_META[picked].responseKey)}
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const moodStyles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 24,
    padding: 24,
    gap: 20,
  },
  title: {
    fontSize: 20,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    textAlign: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  item: {
    width: "45%",
    aspectRatio: 1.4,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  emoji: { fontSize: 38 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", fontWeight: "700" },
  skip: {
    textAlign: "center",
    color: c.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  response: {
    fontSize: 16,
    color: c.textPrimary,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 22,
  },
});

// =============== Mood Week Strip =================
export function MoodWeekStrip({ moods }: { moods: MoodEntry[] }) {
  const { t } = useTranslation();
  const series = useMemo(() => lastNMoodDays(moods, 7), [moods]);
  const empty = series.every((s) => !s);
  return (
    <View style={weekStyles.wrap}>
      <Text style={weekStyles.title}>{t("yourWellnessWeek")}</Text>
      {empty ? (
        <Text style={weekStyles.empty}>{t("noMoodsYet")}</Text>
      ) : (
        <View style={weekStyles.row}>
          {series.map((m, i) => (
            <View key={i} style={weekStyles.cell}>
              {m ? (
                <Text style={{ fontSize: 22 }}>{MOOD_META[m.mood].emoji}</Text>
              ) : (
                <View style={weekStyles.empCell} />
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const weekStyles = StyleSheet.create({
  wrap: { gap: 10 },
  title: {
    fontSize: 16,
    color: c.textPrimary,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 4 },
  cell: {
    flex: 1,
    height: 44,
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  empCell: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.border,
  },
  empty: {
    fontSize: 13,
    color: c.textSecondary,
    fontFamily: "Inter_400Regular",
  },
});

// =============== SOS Button =================
export function SOSButton({ size = 44 }: { size?: number }) {
  const { t } = useTranslation();
  const { profile } = useApp();
  const handle = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {
        // ignore
      }
    }
    const phone = profile?.medicalProfile?.emergencyPhone?.trim();
    if (!phone) {
      Alert.alert(t("sosLabel"), t("noEmergencyContact"));
      return;
    }
    const url = `tel:${phone.replace(/[^+\d]/g, "")}`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn("[sos] open url failed", err);
    }
  };
  return (
    <Pressable
      onPress={() => void handle()}
      accessibilityRole="button"
      accessibilityLabel={t("sosLabel")}
      style={({ pressed }) => [
        sosStyles.btn,
        webCursor,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={sosStyles.text}>{t("sosLabel")}</Text>
    </Pressable>
  );
}

const sosStyles = StyleSheet.create({
  btn: {
    backgroundColor: "#EF233C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EF233C",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});

// =============== Offline Banner =================
export function OfflineBanner() {
  const { t } = useTranslation();
  const { isOnline } = useApp();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
    } else if (wasOffline.current) {
      setShowBackOnline(true);
      const id = setTimeout(() => setShowBackOnline(false), 2500);
      return () => clearTimeout(id);
    }
  }, [isOnline]);

  if (!isOnline) {
    return (
      <View style={[bannerStyles.wrap, { backgroundColor: "#6B7FA3" }]}>
        <Feather name="wifi-off" size={14} color="#fff" />
        <Text style={bannerStyles.text}>{t("offlineBanner")}</Text>
      </View>
    );
  }
  if (showBackOnline) {
    return (
      <View style={[bannerStyles.wrap, { backgroundColor: "#06D6A0" }]}>
        <Feather name="wifi" size={14} color="#fff" />
        <Text style={bannerStyles.text}>{t("backOnlineBanner")}</Text>
      </View>
    );
  }
  return null;
}

const bannerStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});

// =============== Confetti Overlay =================
const CONFETTI_COLORS = ["#6E75BF", "#8879B8", "#06D6A0", "#FFB703", "#EF233C"];

export function ConfettiOverlay({
  visible,
  onDone,
}: {
  visible: boolean;
  onDone?: () => void;
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        key: i,
        left: Math.random() * 100,
        delay: Math.random() * 400,
        duration: 1600 + Math.random() * 800,
        rotate: Math.random() * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 8 + Math.random() * 6,
      })),
    [],
  );
  useEffect(() => {
    if (visible && onDone) {
      const id = setTimeout(onDone, 2400);
      return () => clearTimeout(id);
    }
  }, [visible, onDone]);
  if (!visible) return null;
  return (
    <View pointerEvents="none" style={confStyles.wrap}>
      {pieces.map((p) => {
        const { key, ...rest } = p;
        return <ConfettiPiece key={key} {...rest} />;
      })}
    </View>
  );
}

function ConfettiPiece({
  left,
  delay,
  duration,
  rotate,
  color,
  size,
}: {
  left: number;
  delay: number;
  duration: number;
  rotate: number;
  color: string;
  size: number;
}) {
  const y = useSharedValue(-30);
  const r = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withTiming(900, { duration, easing: Easing.in(Easing.quad) }),
    );
    r.value = withDelay(
      delay,
      withTiming(rotate * 4, { duration, easing: Easing.linear }),
    );
  }, [delay, duration, rotate, y, r]);
  const a = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${r.value}deg` }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: `${left}%`,
          width: size,
          height: size * 1.6,
          backgroundColor: color,
          borderRadius: 2,
        },
        a,
      ]}
    />
  );
}

const confStyles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});

// =============== Doctor Report Modal =================
export function DoctorReportModal({
  visible,
  onClose,
  wound,
  readings,
}: {
  visible: boolean;
  onClose: () => void;
  wound: Wound;
  readings: Reading[];
}) {
  const { t } = useTranslation();
  const { profile, sensor, language, activePatientId, patients } = useApp();
  const patient = patients.find((p) => p.id === activePatientId);
  const patientName = patient?.name ?? profile?.name ?? "—";
  const report = useMemo(
    () =>
      generateDoctorReport({
        patientName,
        profile: profile?.medicalProfile ?? null,
        wound,
        readings,
        status: sensor.status,
        language,
      }),
    [patientName, profile?.medicalProfile, wound, readings, sensor.status, language],
  );

  const share = async () => {
    const body = `${report.title}\n\n${report.sections
      .map((s) => `${s.heading}\n${s.body}`)
      .join("\n\n")}`;
    try {
      if (Platform.OS === "web") {
        const nav =
          typeof globalThis !== "undefined"
            ? (globalThis as { navigator?: { share?: (d: { text?: string; title?: string }) => Promise<void>; clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator
            : undefined;
        if (nav?.share) {
          await nav.share({ title: report.title, text: body });
        } else if (nav?.clipboard) {
          await nav.clipboard.writeText(body);
          Alert.alert(report.title, "Copied to clipboard");
        }
      } else {
        await Share.share({ title: report.title, message: body });
      }
    } catch (err) {
      console.warn("[report] share failed", err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <LinearGradient
          colors={[c.primary, c.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={drStyles.header}
        >
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={drStyles.close}
          >
            <Feather name="x" size={20} color="#fff" />
          </Pressable>
          <Text style={drStyles.headerTitle}>{report.title}</Text>
          <Text style={drStyles.headerDate}>
            {new Date().toLocaleString()}
          </Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 100 }}>
          {report.sections.map((s, i) => (
            <Card key={i}>
              <Text style={drStyles.section}>{s.heading}</Text>
              <Text style={drStyles.body}>{s.body}</Text>
            </Card>
          ))}
        </ScrollView>
        <View style={drStyles.footer}>
          <PrimaryButton label={t("share")} icon="share-2" onPress={() => void share()} />
        </View>
      </View>
    </Modal>
  );
}

const drStyles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  close: {
    position: "absolute",
    right: 14,
    top: 50,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  headerDate: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    fontFamily: "Inter_500Medium",
  },
  section: {
    fontSize: 14,
    color: c.primary,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: c.textPrimary,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: c.bg,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
});

// =============== Patient Pill =================
export function PatientPill({
  patient,
  onPress,
}: {
  patient: Patient | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        patStyles.pill,
        webCursor,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Feather name="users" size={14} color={c.primary} />
      <Text style={patStyles.text} numberOfLines={1}>
        {t("monitoringFor")}: {patient?.name ?? t("myself")}
      </Text>
      <Feather name="chevron-down" size={14} color={c.primary} />
    </Pressable>
  );
}

const patStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(110,117,191,0.10)",
    borderWidth: 1,
    borderColor: "rgba(110,117,191,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    color: c.primary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "700",
    maxWidth: 200,
  },
});
