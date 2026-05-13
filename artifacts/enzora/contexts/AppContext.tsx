import AsyncStorage from "@react-native-async-storage/async-storage";
import { onValue, ref } from "firebase/database";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { I18nManager } from "react-native";
import { useTranslation } from "react-i18next";

import { rtdb } from "@/lib/firebase";
import i18n, { loadLanguage, saveLanguage } from "@/lib/i18n";

export type SensorStatus = "yellow" | "green" | "blue";

export interface MedicalProfile {
  age: string;
  gender: string;
  conditions: string;
  doctorName: string;
  doctorPhone: string;
  emergencyContact: string;
  emergencyPhone: string;
}

export interface LocalUser {
  uid: string;
  email: string;
}

export interface UserProfile {
  name: string;
  email: string;
  createdAt: number;
  medicalProfile: MedicalProfile | null;
  activeWoundId?: string | null;
}

interface StoredAccount {
  name: string;
  email: string;
  passwordHash: string;
  createdAt: number;
  medicalProfile: MedicalProfile | null;
  activeWoundId: string | null;
}

export interface Wound {
  id: string;
  name: string;
  location: string;
  dateAdded: number;
  description: string;
  notes: string;
  status: "active" | "healed";
  healedAt?: number | null;
}

export interface Reading {
  id: string;
  status: SensorStatus;
  red: number;
  green: number;
  blue: number;
  timestamp: number;
}

interface SensorData {
  status: SensorStatus | null;
  red: number;
  green: number;
  blue: number;
  lastUpdated: number | null;
  connected: boolean;
}

interface AppCtx {
  user: LocalUser | null;
  profile: UserProfile | null;
  wounds: Wound[];
  activeWound: Wound | null;
  readings: Reading[];
  sensor: SensorData;
  loading: boolean;
  prefsLoaded: boolean;
  language: "en" | "ar";
  largeText: boolean;
  notificationsEnabled: boolean;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (v: boolean) => Promise<void>;
  setLanguage: (lang: "en" | "ar") => Promise<void>;
  toggleLanguage: () => Promise<void>;
  setLargeText: (v: boolean) => Promise<void>;
  setNotificationsEnabled: (v: boolean) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  saveMedicalProfile: (p: MedicalProfile) => Promise<void>;
  addWound: (w: Omit<Wound, "id" | "status" | "dateAdded">) => Promise<string>;
  setActiveWound: (id: string) => Promise<void>;
  markHealed: (id: string) => Promise<void>;
  addNote: (id: string, note: string) => Promise<void>;
  emailExists: (email: string) => Promise<boolean>;
}

const Ctx = createContext<AppCtx | null>(null);

const ONBOARD_KEY = "enzora.onboarded";
const LARGE_TEXT_KEY = "enzora.largeText";
const NOTIF_KEY = "enzora.notif";
const SESSION_KEY = "enzora_session";

const userKey = (email: string) => `enzora_user_${email.toLowerCase()}`;
const woundsKey = (email: string) => `enzora_wounds_${email.toLowerCase()}`;
const readingsKey = (email: string, woundId: string) =>
  `enzora_readings_${email.toLowerCase()}_${woundId}`;

function hashPassword(password: string): string {
  // Lightweight salted hash. Not cryptographically strong, but fine for a
  // local-only demo account store. Don't use this for real secrets.
  const salt = "enzora.v1";
  let h = 0;
  const s = salt + password;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return `h1:${h.toString(36)}:${s.length}`;
}

async function readAccount(email: string): Promise<StoredAccount | null> {
  const raw = await AsyncStorage.getItem(userKey(email));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAccount;
  } catch {
    return null;
  }
}

async function writeAccount(acc: StoredAccount): Promise<void> {
  await AsyncStorage.setItem(userKey(acc.email), JSON.stringify(acc));
}

async function readWounds(email: string): Promise<Wound[]> {
  const raw = await AsyncStorage.getItem(woundsKey(email));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Wound[];
  } catch {
    return [];
  }
}

async function writeWounds(email: string, list: Wound[]): Promise<void> {
  await AsyncStorage.setItem(woundsKey(email), JSON.stringify(list));
}

async function readReadings(
  email: string,
  woundId: string,
): Promise<Reading[]> {
  const raw = await AsyncStorage.getItem(readingsKey(email, woundId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Reading[];
  } catch {
    return [];
  }
}

async function writeReadings(
  email: string,
  woundId: string,
  list: Reading[],
): Promise<void> {
  await AsyncStorage.setItem(
    readingsKey(email, woundId),
    JSON.stringify(list),
  );
}

function accountToProfile(acc: StoredAccount): UserProfile {
  return {
    name: acc.name,
    email: acc.email,
    createdAt: acc.createdAt,
    medicalProfile: acc.medicalProfile,
    activeWoundId: acc.activeWoundId,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { i18n: i18nInst } = useTranslation();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wounds, setWounds] = useState<Wound[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [sensor, setSensor] = useState<SensorData>({
    status: null,
    red: 0,
    green: 0,
    blue: 0,
    lastUpdated: null,
    connected: false,
  });
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<"en" | "ar">("en");
  const [largeText, setLargeTextState] = useState(false);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load preferences + restore session
  useEffect(() => {
    void (async () => {
      try {
        const lang = await loadLanguage();
        setLanguageState(lang);
        await i18n.changeLanguage(lang);
        try {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(lang === "ar");
        } catch {
          // ignore
        }
        const [onb, lt, nf, session] = await Promise.all([
          AsyncStorage.getItem(ONBOARD_KEY),
          AsyncStorage.getItem(LARGE_TEXT_KEY),
          AsyncStorage.getItem(NOTIF_KEY),
          AsyncStorage.getItem(SESSION_KEY),
        ]);
        setHasSeenOnboardingState(onb === "1");
        setLargeTextState(lt === "1");
        setNotificationsEnabledState(nf !== "0");

        if (session) {
          const acc = await readAccount(session);
          if (acc) {
            setUser({ uid: acc.email, email: acc.email });
            setProfile(accountToProfile(acc));
            const ws = await readWounds(acc.email);
            setWounds(ws);
          } else {
            await AsyncStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (err) {
        console.warn("[app] failed to restore session", err);
      } finally {
        setPrefsLoaded(true);
        setLoading(false);
      }
    })();
  }, []);

  // Load readings when active wound changes
  useEffect(() => {
    if (!user || !profile?.activeWoundId) {
      setReadings([]);
      return;
    }
    void readReadings(user.email, profile.activeWoundId).then(setReadings);
  }, [user, profile?.activeWoundId]);

  // Sensor listener (Firebase RTDB — only for ESP32 sensor data)
  useEffect(() => {
    if (!rtdb) return;
    const sensorRef = ref(rtdb, "sensor");
    const unsub = onValue(sensorRef, (snap) => {
      const v = snap.val() as
        | {
            status?: SensorStatus;
            red?: number;
            green?: number;
            blue?: number;
            timestamp?: number;
          }
        | null;
      if (!v) {
        setSensor((s) => ({ ...s, connected: false, lastUpdated: null }));
        return;
      }
      const ts = typeof v.timestamp === "number" ? v.timestamp : Date.now();
      setSensor({
        status: (v.status as SensorStatus) ?? null,
        red: v.red ?? 0,
        green: v.green ?? 0,
        blue: v.blue ?? 0,
        lastUpdated: ts,
        connected: true,
      });
    });
    return unsub;
  }, []);

  // Connection freshness check
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setSensor((s) => {
        if (!s.lastUpdated) return s;
        const fresh = Date.now() - s.lastUpdated < 5 * 60 * 1000;
        if (s.connected !== fresh) return { ...s, connected: fresh };
        return s;
      });
    }, 30000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Save reading locally on sensor change
  const lastSavedTs = useRef<number | null>(null);
  useEffect(() => {
    if (
      !user ||
      !profile?.activeWoundId ||
      !sensor.status ||
      !sensor.lastUpdated
    )
      return;
    if (lastSavedTs.current === sensor.lastUpdated) return;
    lastSavedTs.current = sensor.lastUpdated;
    const reading: Reading = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
      status: sensor.status,
      red: sensor.red,
      green: sensor.green,
      blue: sensor.blue,
      timestamp: sensor.lastUpdated,
    };
    const woundId = profile.activeWoundId;
    void (async () => {
      const existing = await readReadings(user.email, woundId);
      const updated = [reading, ...existing].slice(0, 500);
      await writeReadings(user.email, woundId, updated);
      setReadings(updated);
    })();
  }, [
    sensor.status,
    sensor.lastUpdated,
    sensor.red,
    sensor.green,
    sensor.blue,
    user,
    profile?.activeWoundId,
  ]);

  const setLanguage = useCallback(
    async (lang: "en" | "ar") => {
      setLanguageState(lang);
      await i18nInst.changeLanguage(lang);
      await saveLanguage(lang);
      try {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(lang === "ar");
      } catch {
        // ignore
      }
    },
    [i18nInst],
  );

  const toggleLanguage = useCallback(async () => {
    const next: "en" | "ar" = language === "en" ? "ar" : "en";
    await setLanguage(next);
  }, [language, setLanguage]);

  const setLargeText = useCallback(async (v: boolean) => {
    setLargeTextState(v);
    await AsyncStorage.setItem(LARGE_TEXT_KEY, v ? "1" : "0");
  }, []);

  const setNotificationsEnabled = useCallback(async (v: boolean) => {
    setNotificationsEnabledState(v);
    await AsyncStorage.setItem(NOTIF_KEY, v ? "1" : "0");
  }, []);

  const setHasSeenOnboarding = useCallback(async (v: boolean) => {
    setHasSeenOnboardingState(v);
    await AsyncStorage.setItem(ONBOARD_KEY, v ? "1" : "0");
  }, []);

  const emailExists = useCallback(async (email: string) => {
    const acc = await readAccount(email);
    return !!acc;
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const normEmail = email.trim().toLowerCase();
      const existing = await readAccount(normEmail);
      if (existing) {
        const err = new Error("email-already-in-use");
        (err as Error & { code?: string }).code = "auth/email-already-in-use";
        throw err;
      }
      const acc: StoredAccount = {
        name: name.trim(),
        email: normEmail,
        passwordHash: hashPassword(password),
        createdAt: Date.now(),
        medicalProfile: null,
        activeWoundId: null,
      };
      await writeAccount(acc);
      await AsyncStorage.setItem(SESSION_KEY, normEmail);
      setUser({ uid: normEmail, email: normEmail });
      setProfile(accountToProfile(acc));
      setWounds([]);
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const normEmail = email.trim().toLowerCase();
    const acc = await readAccount(normEmail);
    if (!acc) {
      const err = new Error("user-not-found");
      (err as Error & { code?: string }).code = "auth/user-not-found";
      throw err;
    }
    if (acc.passwordHash !== hashPassword(password)) {
      const err = new Error("wrong-password");
      (err as Error & { code?: string }).code = "auth/wrong-password";
      throw err;
    }
    await AsyncStorage.setItem(SESSION_KEY, normEmail);
    setUser({ uid: normEmail, email: normEmail });
    setProfile(accountToProfile(acc));
    const ws = await readWounds(normEmail);
    setWounds(ws);
  }, []);

  const signOutUser = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
    setProfile(null);
    setWounds([]);
    setReadings([]);
  }, []);

  const updateAccount = useCallback(
    async (mutate: (acc: StoredAccount) => StoredAccount) => {
      if (!user) return;
      const current = await readAccount(user.email);
      if (!current) return;
      const next = mutate(current);
      await writeAccount(next);
      setProfile(accountToProfile(next));
    },
    [user],
  );

  const saveMedicalProfile = useCallback(
    async (p: MedicalProfile) => {
      await updateAccount((acc) => ({ ...acc, medicalProfile: p }));
    },
    [updateAccount],
  );

  const addWound = useCallback(
    async (w: Omit<Wound, "id" | "status" | "dateAdded">) => {
      if (!user) throw new Error("not authenticated");
      const id =
        Date.now().toString() + Math.random().toString(36).slice(2, 11);
      const wound: Wound = {
        ...w,
        id,
        status: "active",
        dateAdded: Date.now(),
        healedAt: null,
      };
      const list = await readWounds(user.email);
      const updated = [wound, ...list];
      await writeWounds(user.email, updated);
      setWounds(updated);
      await updateAccount((acc) => ({ ...acc, activeWoundId: id }));
      return id;
    },
    [user, updateAccount],
  );

  const setActiveWound = useCallback(
    async (id: string) => {
      await updateAccount((acc) => ({ ...acc, activeWoundId: id }));
    },
    [updateAccount],
  );

  const markHealed = useCallback(
    async (id: string) => {
      if (!user) return;
      const list = await readWounds(user.email);
      const updated = list.map((w) =>
        w.id === id ? { ...w, status: "healed" as const, healedAt: Date.now() } : w,
      );
      await writeWounds(user.email, updated);
      setWounds(updated);
      if (profile?.activeWoundId === id) {
        const remaining = updated.find((w) => w.status === "active");
        await updateAccount((acc) => ({
          ...acc,
          activeWoundId: remaining?.id ?? null,
        }));
      }
    },
    [user, profile?.activeWoundId, updateAccount],
  );

  const addNote = useCallback(
    async (id: string, note: string) => {
      if (!user) return;
      const list = await readWounds(user.email);
      const stamp = new Date().toLocaleString();
      const updated = list.map((w) => {
        if (w.id !== id) return w;
        const existing = w.notes ?? "";
        const combined = existing
          ? `${existing}\n\n[${stamp}] ${note}`
          : `[${stamp}] ${note}`;
        return { ...w, notes: combined };
      });
      await writeWounds(user.email, updated);
      setWounds(updated);
    },
    [user],
  );

  const activeWound = useMemo(
    () => wounds.find((w) => w.id === profile?.activeWoundId) ?? null,
    [wounds, profile?.activeWoundId],
  );

  const value: AppCtx = {
    user,
    profile,
    wounds,
    activeWound,
    readings,
    sensor,
    loading,
    prefsLoaded,
    language,
    largeText,
    notificationsEnabled,
    hasSeenOnboarding,
    setHasSeenOnboarding,
    setLanguage,
    toggleLanguage,
    setLargeText,
    setNotificationsEnabled,
    signUp,
    signIn,
    signOutUser,
    saveMedicalProfile,
    addWound,
    setActiveWound,
    markHealed,
    addNote,
    emailExists,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
