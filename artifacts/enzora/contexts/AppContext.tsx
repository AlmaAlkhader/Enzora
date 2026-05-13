import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { get, onValue, ref } from "firebase/database";
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
import { scheduleDailyReminder } from "@/lib/notifications";
import {
  type Mood,
  type MoodEntry,
  type Patient,
  readActivePatientId,
  readMoods,
  readPatients,
  saveMood as persistMood,
  todayKey,
  writeActivePatientId,
  writePatients,
} from "@/lib/wellness";

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
  deviceId?: string | null;
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
  // Wellness extensions
  moods: MoodEntry[];
  patients: Patient[];
  activePatientId: string | null;
  biometricEnabled: boolean;
  dailyReminderEnabled: boolean;
  isOnline: boolean;
  connectedDeviceId: string | null;
  // Setters
  setHasSeenOnboarding: (v: boolean) => Promise<void>;
  setLanguage: (lang: "en" | "ar") => Promise<void>;
  toggleLanguage: () => Promise<void>;
  setLargeText: (v: boolean) => Promise<void>;
  setNotificationsEnabled: (v: boolean) => Promise<void>;
  setBiometricEnabled: (v: boolean) => Promise<void>;
  setDailyReminderEnabled: (v: boolean) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  saveMedicalProfile: (p: MedicalProfile) => Promise<void>;
  addWound: (w: Omit<Wound, "id" | "status" | "dateAdded">) => Promise<string>;
  setActiveWound: (id: string) => Promise<void>;
  markHealed: (id: string) => Promise<void>;
  addNote: (id: string, note: string) => Promise<void>;
  emailExists: (email: string) => Promise<boolean>;
  recordMood: (mood: Mood) => Promise<void>;
  addPatient: (
    p: Omit<Patient, "id" | "createdAt">,
  ) => Promise<string>;
  setActivePatient: (id: string | null) => Promise<void>;
  removePatient: (id: string) => Promise<void>;
  hasMoodToday: boolean;
  connectDevice: (
    deviceId: string,
  ) => Promise<{ ok: true } | { ok: false; reason: "not-found" | "no-firebase" | "error" }>;
  disconnectDevice: () => Promise<void>;
}

const Ctx = createContext<AppCtx | null>(null);

const ONBOARD_KEY = "enzora.onboarded";
const LARGE_TEXT_KEY = "enzora.largeText";
const NOTIF_KEY = "enzora.notif";
const SESSION_KEY = "enzora_session";
const DAILY_REMINDER_KEY = "enzora.dailyReminder";

const userKey = (email: string) => `enzora_user_${email.toLowerCase()}`;
const woundsKey = (email: string) => `enzora_wounds_${email.toLowerCase()}`;
const readingsKey = (email: string, woundId: string) =>
  `enzora_readings_${email.toLowerCase()}_${woundId}`;
const biometricKey = (email: string) =>
  `enzora.biometric.${email.toLowerCase()}`;
const deviceKey = (email: string) => `enzora.device.${email.toLowerCase()}`;

export function normaliseDeviceId(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

function hashPassword(password: string): string {
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
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatientId, setActivePatientIdState] = useState<string | null>(
    null,
  );
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [dailyReminderEnabled, setDailyReminderEnabledState] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [connectedDeviceId, setConnectedDeviceIdState] = useState<string | null>(
    null,
  );


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
        const [onb, lt, nf, dr, session] = await Promise.all([
          AsyncStorage.getItem(ONBOARD_KEY),
          AsyncStorage.getItem(LARGE_TEXT_KEY),
          AsyncStorage.getItem(NOTIF_KEY),
          AsyncStorage.getItem(DAILY_REMINDER_KEY),
          AsyncStorage.getItem(SESSION_KEY),
        ]);
        setHasSeenOnboardingState(onb === "1");
        setLargeTextState(lt === "1");
        setNotificationsEnabledState(nf !== "0");
        setDailyReminderEnabledState(dr !== "0");

        if (session) {
          const acc = await readAccount(session);
          if (acc) {
            setUser({ uid: acc.email, email: acc.email });
            setProfile(accountToProfile(acc));
            const ws = await readWounds(acc.email);
            setWounds(ws);
            const [ms, pts, apId, bio, dev] = await Promise.all([
              readMoods(acc.email),
              readPatients(acc.email),
              readActivePatientId(acc.email),
              AsyncStorage.getItem(biometricKey(acc.email)),
              AsyncStorage.getItem(deviceKey(acc.email)),
            ]);
            setMoods(ms);
            setPatients(pts);
            setActivePatientIdState(apId);
            setBiometricEnabledState(bio === "1");
            setConnectedDeviceIdState(dev);
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

  // NetInfo subscription
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });
    return unsub;
  }, []);

  // Load readings when active wound changes
  useEffect(() => {
    if (!user || !profile?.activeWoundId) {
      setReadings([]);
      return;
    }
    void readReadings(user.email, profile.activeWoundId).then(setReadings);
  }, [user, profile?.activeWoundId]);

  // Resolve which device path to read from. Priority:
  //   1. The active wound's linked deviceId
  //   2. The user's currently-connected deviceId (fallback)
  const activeWoundForDevice = useMemo(
    () => wounds.find((w) => w.id === profile?.activeWoundId) ?? null,
    [wounds, profile?.activeWoundId],
  );
  const effectiveDeviceId =
    activeWoundForDevice?.deviceId ?? connectedDeviceId ?? null;

  // Sensor listener (Firebase RTDB — only for ESP32 sensor data).
  // Connection state is driven *solely* by the presence of
  // /devices/{deviceId}/sensor/status for the currently-active device.
  useEffect(() => {
    console.log("[sensor] effect mount — rtdb:", !!rtdb, "deviceId:", effectiveDeviceId);
    if (!rtdb) {
      console.warn("[sensor] rtdb is null — listener NOT attached");
      return;
    }
    if (!effectiveDeviceId) {
      console.log("[sensor] no deviceId — skipping listener");
      setSensor((s) => ({ ...s, connected: false, status: null }));
      return;
    }
    const path = `devices/${effectiveDeviceId}/sensor`;
    const sensorRef = ref(rtdb, path);
    console.log("[sensor] attaching listener", {
      path,
      refToString: sensorRef.toString(),
    });
    const unsub = onValue(
      sensorRef,
      (snap) => {
        const v = snap.val();
        console.log("[sensor] Firebase listener triggered");
        console.log("[sensor] Snapshot value:", v);
        console.log("[sensor] Status:", v?.status);
        const isConnected = !!(v && v.status);
        console.log("[sensor] Connected state ->", isConnected);
        if (isConnected) {
          setSensor({
            status: v.status as SensorStatus,
            red: typeof v.red === "number" ? v.red : 0,
            green: typeof v.green === "number" ? v.green : 0,
            blue: typeof v.blue === "number" ? v.blue : 0,
            lastUpdated:
              typeof v.timestamp === "number" ? v.timestamp : Date.now(),
            connected: true,
          });
        } else {
          setSensor((s) => ({ ...s, connected: false, status: null }));
        }
      },
      (err) => {
        console.warn("[sensor] listener ERROR", err);
        setSensor((s) => ({ ...s, connected: false }));
      },
    );
    return () => {
      console.log("[sensor] detaching listener");
      unsub();
    };
  }, [effectiveDeviceId]);

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

  // Re-schedule daily reminder when relevant prefs change
  useEffect(() => {
    if (!prefsLoaded) return;
    void scheduleDailyReminder({
      enabled: dailyReminderEnabled && notificationsEnabled,
      language,
      hasActiveWound: !!profile?.activeWoundId,
    });
  }, [
    dailyReminderEnabled,
    notificationsEnabled,
    language,
    profile?.activeWoundId,
    prefsLoaded,
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

  const setDailyReminderEnabled = useCallback(async (v: boolean) => {
    setDailyReminderEnabledState(v);
    await AsyncStorage.setItem(DAILY_REMINDER_KEY, v ? "1" : "0");
  }, []);

  const setBiometricEnabled = useCallback(
    async (v: boolean) => {
      setBiometricEnabledState(v);
      if (user)
        await AsyncStorage.setItem(biometricKey(user.email), v ? "1" : "0");
    },
    [user],
  );

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
      setMoods([]);
      setPatients([]);
      setActivePatientIdState(null);
      setBiometricEnabledState(false);
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
    const [ws, ms, pts, apId, bio, dev] = await Promise.all([
      readWounds(normEmail),
      readMoods(normEmail),
      readPatients(normEmail),
      readActivePatientId(normEmail),
      AsyncStorage.getItem(biometricKey(normEmail)),
      AsyncStorage.getItem(deviceKey(normEmail)),
    ]);
    setWounds(ws);
    setMoods(ms);
    setPatients(pts);
    setActivePatientIdState(apId);
    setBiometricEnabledState(bio === "1");
    setConnectedDeviceIdState(dev);
  }, []);

  const signOutUser = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
    setProfile(null);
    setWounds([]);
    setReadings([]);
    setMoods([]);
    setPatients([]);
    setActivePatientIdState(null);
    setBiometricEnabledState(false);
    setConnectedDeviceIdState(null);
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
        // Inherit the user's currently-connected device unless caller
        // already specified one explicitly.
        deviceId: w.deviceId ?? connectedDeviceId ?? null,
      };
      const list = await readWounds(user.email);
      const updated = [wound, ...list];
      await writeWounds(user.email, updated);
      setWounds(updated);
      await updateAccount((acc) => ({ ...acc, activeWoundId: id }));
      return id;
    },
    [user, updateAccount, connectedDeviceId],
  );

  const connectDevice = useCallback(
    async (
      rawId: string,
    ): Promise<
      { ok: true } | { ok: false; reason: "not-found" | "no-firebase" | "error" }
    > => {
      const deviceId = normaliseDeviceId(rawId);
      if (!deviceId) return { ok: false, reason: "not-found" };
      if (!rtdb) return { ok: false, reason: "no-firebase" };
      try {
        const snap = await Promise.race([
          get(ref(rtdb, `devices/${deviceId}/sensor`)),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 10000),
          ),
        ]);
        const v = snap.val();
        if (!v || !v.status) {
          return { ok: false, reason: "not-found" };
        }
        if (user) {
          await AsyncStorage.setItem(deviceKey(user.email), deviceId);
          // Also link this device to the active wound, if one exists and it
          // doesn't already have its own device assigned.
          if (profile?.activeWoundId) {
            const list = await readWounds(user.email);
            const updated = list.map((w) =>
              w.id === profile.activeWoundId && !w.deviceId
                ? { ...w, deviceId }
                : w,
            );
            await writeWounds(user.email, updated);
            setWounds(updated);
          }
        }
        setConnectedDeviceIdState(deviceId);
        return { ok: true };
      } catch (err) {
        console.warn("[device] connect failed", err);
        return { ok: false, reason: "error" };
      }
    },
    [user, profile?.activeWoundId],
  );

  const disconnectDevice = useCallback(async () => {
    if (user) {
      await AsyncStorage.removeItem(deviceKey(user.email));
      // Also unlink the device from any wounds, otherwise the sensor
      // listener would stay attached via activeWound.deviceId.
      const list = await readWounds(user.email);
      const updated = list.map((w) =>
        w.deviceId ? { ...w, deviceId: null } : w,
      );
      if (updated.some((w, i) => w !== list[i])) {
        await writeWounds(user.email, updated);
        setWounds(updated);
      }
    }
    setConnectedDeviceIdState(null);
  }, [user]);

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

  const recordMood = useCallback(
    async (mood: Mood) => {
      if (!user) return;
      const next = await persistMood(user.email, mood);
      setMoods(next);
    },
    [user],
  );

  const addPatient = useCallback(
    async (p: Omit<Patient, "id" | "createdAt">) => {
      if (!user) throw new Error("not authenticated");
      const id =
        Date.now().toString() + Math.random().toString(36).slice(2, 11);
      const next: Patient = { ...p, id, createdAt: Date.now() };
      const updated = [next, ...patients];
      await writePatients(user.email, updated);
      setPatients(updated);
      return id;
    },
    [user, patients],
  );

  const setActivePatient = useCallback(
    async (id: string | null) => {
      if (!user) return;
      await writeActivePatientId(user.email, id);
      setActivePatientIdState(id);
    },
    [user],
  );

  const removePatient = useCallback(
    async (id: string) => {
      if (!user) return;
      const updated = patients.filter((p) => p.id !== id);
      await writePatients(user.email, updated);
      setPatients(updated);
      if (activePatientId === id) {
        await writeActivePatientId(user.email, null);
        setActivePatientIdState(null);
      }
    },
    [user, patients, activePatientId],
  );

  const activeWound = useMemo(
    () => wounds.find((w) => w.id === profile?.activeWoundId) ?? null,
    [wounds, profile?.activeWoundId],
  );

  const hasMoodToday = useMemo(() => {
    const tk = todayKey();
    return moods.some((m) => m.date === tk);
  }, [moods]);

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
    moods,
    patients,
    activePatientId,
    biometricEnabled,
    dailyReminderEnabled,
    isOnline,
    setHasSeenOnboarding,
    setLanguage,
    toggleLanguage,
    setLargeText,
    setNotificationsEnabled,
    setBiometricEnabled,
    setDailyReminderEnabled,
    signUp,
    signIn,
    signOutUser,
    saveMedicalProfile,
    addWound,
    setActiveWound,
    markHealed,
    addNote,
    emailExists,
    recordMood,
    addPatient,
    setActivePatient,
    removePatient,
    hasMoodToday,
    connectedDeviceId,
    connectDevice,
    disconnectDevice,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
