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
import {
  presentLocalTransition,
  scheduleDailyReminder,
} from "@/lib/notifications";
import { clearPushSubscription, syncPushSubscription } from "@/lib/push";
import {
  type Patient,
  readActivePatientId,
  readPatients,
  writeActivePatientId,
  writePatients,
} from "@/lib/wellness";

export type SensorStatus = "yellow" | "green" | "blue";

// Relationship of the user to the person being monitored. "self" means the
// user is monitoring their own wounds. The remaining values describe a
// caregiver scenario (e.g. an adult child monitoring an elderly parent).
export type MonitoredRelationship =
  | "self"
  | "father"
  | "mother"
  | "grandparent"
  | "other";

export interface MedicalProfile {
  age: string;
  gender: string;
  conditions: string;
  doctorName: string;
  doctorPhone: string;
  emergencyContact: string;
  emergencyPhone: string;
  // Who is being monitored. Defaults to "self" / empty name for legacy
  // accounts that were created before family-monitoring shipped.
  relationship: MonitoredRelationship;
  monitoredName: string;
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

export interface StatusLock {
  status: "green" | "blue";
  at: number;
}

export type WoundEventType =
  | "lock_green"
  | "lock_blue"
  | "awaiting_confirmation"
  | "confirmed";

export interface WoundEvent {
  id: string;
  type: WoundEventType;
  at: number;
  by?: "self" | "doctor";
  note?: string;
  previousStatus?: "green" | "blue";
}

export interface StatusConfirmation {
  by: "self" | "doctor";
  note?: string;
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
  patients: Patient[];
  activePatientId: string | null;
  biometricEnabled: boolean;
  dailyReminderEnabled: boolean;
  isOnline: boolean;
  connectedDeviceId: string | null;
  // Status lock (safety feature)
  statusLock: StatusLock | null;
  woundEvents: WoundEvent[];
  confirmStatusCheck: (c: StatusConfirmation) => Promise<void>;
  // Demo / Judge mode — lets a presenter inject synthetic sensor readings
  // without changing the real ESP32. When `demoMode` is on, `simulateStatus`
  // pushes a synthetic SensorData into the merged `sensor` value, which
  // drives the same downstream effects (status lock, history reading, urgent
  // flow) as a real Firebase update.
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  simulateStatus: (s: SensorStatus) => void;
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
  addPatient: (
    p: Omit<Patient, "id" | "createdAt">,
  ) => Promise<string>;
  setActivePatient: (id: string | null) => Promise<void>;
  removePatient: (id: string) => Promise<void>;
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
const statusLockKey = (email: string, woundId: string) =>
  `enzora_status_lock_${email.toLowerCase()}_${woundId}`;
const woundEventsKey = (email: string, woundId: string) =>
  `enzora_events_${email.toLowerCase()}_${woundId}`;

async function readStatusLock(
  email: string,
  woundId: string,
): Promise<StatusLock | null> {
  try {
    const raw = await AsyncStorage.getItem(statusLockKey(email, woundId));
    return raw ? (JSON.parse(raw) as StatusLock) : null;
  } catch {
    return null;
  }
}

async function writeStatusLock(
  email: string,
  woundId: string,
  lock: StatusLock | null,
): Promise<void> {
  const k = statusLockKey(email, woundId);
  if (lock) await AsyncStorage.setItem(k, JSON.stringify(lock));
  else await AsyncStorage.removeItem(k);
}

async function readWoundEvents(
  email: string,
  woundId: string,
): Promise<WoundEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(woundEventsKey(email, woundId));
    return raw ? (JSON.parse(raw) as WoundEvent[]) : [];
  } catch {
    return [];
  }
}

async function writeWoundEvents(
  email: string,
  woundId: string,
  list: WoundEvent[],
): Promise<void> {
  await AsyncStorage.setItem(
    woundEventsKey(email, woundId),
    JSON.stringify(list.slice(0, 200)),
  );
}

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

// Backfill fields added after launch so profiles persisted by older builds
// keep working without a migration step. Defaults map the legacy single-user
// flow to "monitoring myself".
function normalizeMedicalProfile(
  m: MedicalProfile | null,
): MedicalProfile | null {
  if (!m) return m;
  return {
    ...m,
    relationship: m.relationship ?? "self",
    monitoredName: m.monitoredName ?? "",
  };
}

function accountToProfile(acc: StoredAccount): UserProfile {
  return {
    name: acc.name,
    email: acc.email,
    createdAt: acc.createdAt,
    medicalProfile: normalizeMedicalProfile(acc.medicalProfile),
    activeWoundId: acc.activeWoundId,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { i18n: i18nInst } = useTranslation();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wounds, setWounds] = useState<Wound[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  // Real Firebase-driven sensor state. The exposed `sensor` below merges this
  // with `demoSensor` so demo mode can shadow the live device without
  // touching the Firebase listener.
  const [firebaseSensor, setFirebaseSensor] = useState<SensorData>({
    status: null,
    red: 0,
    green: 0,
    blue: 0,
    lastUpdated: null,
    connected: false,
  });
  const [demoMode, setDemoMode] = useState(false);
  const [demoSensor, setDemoSensor] = useState<SensorData | null>(null);
  // Merged view: when a demo reading is active, it wins. When demo mode is
  // turned off we clear the override so the real device readings take over
  // again on the very next render.
  const sensor = useMemo<SensorData>(
    () => (demoSensor ?? firebaseSensor),
    [demoSensor, firebaseSensor],
  );
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<"en" | "ar">("en");
  const [largeText, setLargeTextState] = useState(false);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
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
  const [statusLock, setStatusLock] = useState<StatusLock | null>(null);
  const [woundEvents, setWoundEvents] = useState<WoundEvent[]>([]);


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
            const [pts, apId, bio, dev] = await Promise.all([
              readPatients(acc.email),
              readActivePatientId(acc.email),
              AsyncStorage.getItem(biometricKey(acc.email)),
              AsyncStorage.getItem(deviceKey(acc.email)),
            ]);
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

  // Load status lock + events when active wound changes
  useEffect(() => {
    if (!user || !profile?.activeWoundId) {
      setStatusLock(null);
      setWoundEvents([]);
      return;
    }
    const email = user.email;
    const wid = profile.activeWoundId;
    void Promise.all([
      readStatusLock(email, wid),
      readWoundEvents(email, wid),
    ]).then(([l, e]) => {
      setStatusLock(l);
      setWoundEvents(e);
    });
  }, [user, profile?.activeWoundId]);

  // Per-wound serialization queue. All read-modify-write transitions on a
  // wound's lock + event log run through this queue so a burst of sensor
  // readings (or a confirmation racing with a reading) cannot interleave and
  // overwrite each other. Keyed by `${email}::${woundId}`.
  const lockQueues = useRef<Map<string, Promise<unknown>>>(new Map());
  const runSerialized = useCallback(
    <T,>(email: string, woundId: string, fn: () => Promise<T>): Promise<T> => {
      const key = `${email}::${woundId}`;
      const prev = lockQueues.current.get(key) ?? Promise.resolve();
      const next = prev.then(fn, fn);
      lockQueues.current.set(
        key,
        next.catch(() => undefined),
      );
      return next;
    },
    [],
  );

  // Status lock evaluator — runs once per new sensor reading. Refs are scoped
  // by `${email}::${woundId}` so switching wounds doesn't carry over the prior
  // wound's "previous status" into the new wound's incident detection.
  const lockProcessedTs = useRef<Map<string, number>>(new Map());
  const prevSensorStatus = useRef<Map<string, SensorStatus>>(new Map());
  useEffect(() => {
    if (
      !user ||
      !profile?.activeWoundId ||
      !sensor.status ||
      !sensor.lastUpdated
    )
      return;
    const email = user.email;
    const woundId = profile.activeWoundId;
    const refKey = `${email}::${woundId}`;
    if (lockProcessedTs.current.get(refKey) === sensor.lastUpdated) return;
    lockProcessedTs.current.set(refKey, sensor.lastUpdated);
    const cur = sensor.status;
    const prev = prevSensorStatus.current.get(refKey) ?? null;
    prevSensorStatus.current.set(refKey, cur);

    // Expo Go fallback: mirror status transitions as local notifications.
    // Remote push from the backend poller still runs (and will work once a
    // development build exists), but Expo Go drops those silently. Firing a
    // local notification here means the user actually sees the change while
    // the app is open or recently backgrounded.
    if (notificationsEnabled && prev && prev !== cur) {
      void presentLocalTransition({
        previousStatus: prev,
        newStatus: cur,
        language,
      });
    }

    void runSerialized(email, woundId, async () => {
      const existing = await readStatusLock(email, woundId);
      const events = await readWoundEvents(email, woundId);

      const appendEventInline = async (ev: Omit<WoundEvent, "id" | "at">) => {
        const fresh = await readWoundEvents(email, woundId);
        const next: WoundEvent[] = [
          {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
            at: Date.now(),
            ...ev,
          },
          ...fresh,
        ];
        await writeWoundEvents(email, woundId, next);
        setWoundEvents(next);
      };

      if (cur === "green" || cur === "blue") {
        // Determine if this is a new incident worth recording.
        // Rules:
        //   - No lock yet -> new lock + event
        //   - green-lock + new blue reading -> upgrade to blue + event
        //   - same color but previous reading was yellow -> new incident
        //     (e.g. green -> yellow -> green resets the lock timer)
        //   - blue-lock + new green reading -> keep blue (more serious wins)
        const isNewIncident =
          !existing ||
          (existing.status === "green" && cur === "blue") ||
          (existing.status === cur && prev === "yellow");
        if (isNewIncident) {
          const nextLock: StatusLock = {
            status:
              existing?.status === "blue" || cur === "blue" ? "blue" : "green",
            at: Date.now(),
          };
          await writeStatusLock(email, woundId, nextLock);
          setStatusLock(nextLock);
          await appendEventInline({
            type: nextLock.status === "blue" ? "lock_blue" : "lock_green",
          });
        }
      } else if (cur === "yellow" && existing) {
        // Yellow returned while a lock is still in place — log "awaiting
        // confirmation" once per incident (skip if last event already is one
        // newer than the current lock).
        const last = events[0];
        const alreadyLogged =
          last &&
          last.type === "awaiting_confirmation" &&
          last.at > existing.at;
        if (!alreadyLogged && prev !== "yellow") {
          await appendEventInline({ type: "awaiting_confirmation" });
        }
      }
    });
  }, [
    user,
    profile?.activeWoundId,
    sensor.status,
    sensor.lastUpdated,
    runSerialized,
  ]);

  const confirmStatusCheck = useCallback(
    async (c: StatusConfirmation) => {
      if (!user || !profile?.activeWoundId) return;
      const email = user.email;
      const woundId = profile.activeWoundId;
      await runSerialized(email, woundId, async () => {
        const existing = await readStatusLock(email, woundId);
        const previousStatus = existing?.status;
        await writeStatusLock(email, woundId, null);
        setStatusLock(null);
        const fresh = await readWoundEvents(email, woundId);
        const next: WoundEvent[] = [
          {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
            type: "confirmed",
            at: Date.now(),
            by: c.by,
            note: c.note?.trim() || undefined,
            previousStatus,
          },
          ...fresh,
        ];
        await writeWoundEvents(email, woundId, next);
        setWoundEvents(next);
      });
    },
    [user, profile?.activeWoundId, runSerialized],
  );

  // Demo mode controls. Each call to `simulateStatus` builds a fresh
  // SensorData with `lastUpdated = Date.now()` so the lock-evaluator and
  // reading-saver effects (which key off `sensor.lastUpdated`) treat each
  // press as a brand new reading — the UI then behaves exactly as if a
  // matching Firebase update had arrived.
  const simulateStatus = useCallback((s: SensorStatus) => {
    setDemoMode(true);
    const channel =
      s === "yellow"
        ? { red: 255, green: 200, blue: 0 }
        : s === "green"
          ? { red: 0, green: 200, blue: 0 }
          : s === "blue"
            ? { red: 0, green: 0, blue: 255 }
            : { red: 0, green: 0, blue: 0 };
    setDemoSensor({
      status: s,
      ...channel,
      lastUpdated: Date.now(),
      connected: true,
    });
  }, []);

  // Wrap setDemoMode so turning demo OFF also clears the synthetic reading,
  // letting the real Firebase value (or its disconnected state) take over
  // immediately.
  const setDemoModeWrapped = useCallback((v: boolean) => {
    setDemoMode(v);
    if (!v) setDemoSensor(null);
  }, []);

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
  // /sensor{deviceId}/sensor/status for the currently-active device.
  useEffect(() => {
    console.log("[sensor] effect mount — rtdb:", !!rtdb, "deviceId:", effectiveDeviceId);
    if (!rtdb) {
      console.warn("[sensor] rtdb is null — listener NOT attached");
      return;
    }
    if (!effectiveDeviceId) {
      console.log("[sensor] no deviceId — skipping listener");
      setFirebaseSensor((s) => ({ ...s, connected: false, status: null }));
      return;
    }
    const path = `devices/${effectiveDeviceId}/sensor${effectiveDeviceId}/sensor`;
    const sensorRef = ref(rtdb, path);
    console.log("[sensor] attaching listener", {
      effectiveDeviceId,
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
        // Node reachable === device exists in RTDB. Status may still be
        // missing on a brand-new device that hasn't pushed its first
        // reading yet — in that case we surface a "waiting" state on Home
        // rather than treating the device as not-found.
        const nodeExists = !!v;
        const hasStatus = !!(v && v.status);
        console.log("[sensor] nodeExists:", nodeExists, "hasStatus:", hasStatus);
        if (hasStatus) {
          setFirebaseSensor({
            status: v.status as SensorStatus,
            red: typeof v.red === "number" ? v.red : 0,
            green: typeof v.green === "number" ? v.green : 0,
            blue: typeof v.blue === "number" ? v.blue : 0,
            lastUpdated:
              typeof v.timestamp === "number" ? v.timestamp : Date.now(),
            connected: true,
          });
        } else if (nodeExists) {
          // Device node is present but no reading yet — keep `connected`
          // true so Home can show "Waiting for sensor reading…", but
          // status is null so downstream `hasActiveSensor` stays false.
          setFirebaseSensor((s) => ({ ...s, connected: true, status: null }));
        } else {
          setFirebaseSensor((s) => ({ ...s, connected: false, status: null }));
        }
      },
      (err) => {
        console.warn("[sensor] listener ERROR", err);
        setFirebaseSensor((s) => ({ ...s, connected: false }));
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

  // Sync the push subscription to the backend whenever any input that
  // affects polling/delivery changes (active wound, linked device, healed
  // flag, notification toggle, language). One effect keeps the wiring in
  // a single place — no mutation site needs to remember to call this.
  const activeWoundForSync = useMemo(
    () => wounds.find((w) => w.id === profile?.activeWoundId) ?? null,
    [wounds, profile?.activeWoundId],
  );
  useEffect(() => {
    if (!user || !profile?.activeWoundId) return;
    const woundDeviceId = activeWoundForSync?.deviceId ?? connectedDeviceId ?? null;
    const isHealed = activeWoundForSync?.status === "healed";
    void syncPushSubscription({
      email: user.email,
      woundId: profile.activeWoundId,
      deviceId: woundDeviceId,
      language,
      notificationsEnabled,
      woundHealed: isHealed,
    });
  }, [
    user,
    profile?.activeWoundId,
    activeWoundForSync?.deviceId,
    activeWoundForSync?.status,
    connectedDeviceId,
    language,
    notificationsEnabled,
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
    const [ws, pts, apId, bio, dev] = await Promise.all([
      readWounds(normEmail),
      readPatients(normEmail),
      readActivePatientId(normEmail),
      AsyncStorage.getItem(biometricKey(normEmail)),
      AsyncStorage.getItem(deviceKey(normEmail)),
    ]);
    setWounds(ws);
    setPatients(pts);
    setActivePatientIdState(apId);
    setBiometricEnabledState(bio === "1");
    setConnectedDeviceIdState(dev);
  }, []);

  const signOutUser = useCallback(async () => {
    // Tell the backend to stop pushing to this device's token before we drop
    // local user state. Best-effort — failures here shouldn't block logout.
    if (user) {
      void clearPushSubscription(user.email);
    }
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
    setProfile(null);
    setWounds([]);
    setReadings([]);
    setPatients([]);
    setActivePatientIdState(null);
    setBiometricEnabledState(false);
    setConnectedDeviceIdState(null);
  }, [user]);

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
      console.log("[device] connect attempt — raw:", rawId, "normalised:", deviceId);
      if (!deviceId) return { ok: false, reason: "not-found" };
      if (!rtdb) return { ok: false, reason: "no-firebase" };
      try {
        const checkPath = `devices/${deviceId}/sensor${deviceId}/sensor`;
        console.log("[device] checking Firebase path:", checkPath);
        const snap = await Promise.race([
          get(ref(rtdb, checkPath)),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 10000),
          ),
        ]);
        const v = snap.val();
        console.log("[device] snapshot exists:", snap.exists(), "value:", v, "status:", v?.status);
        // Accept the device as long as the node exists — a freshly-paired
        // device may not have pushed its first status reading yet, and
        // we don't want to reject the pairing in that case.
        if (!v) {
          console.log("[device] node not found at path:", checkPath);
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
    addPatient,
    setActivePatient,
    removePatient,
    connectedDeviceId,
    connectDevice,
    disconnectDevice,
    statusLock,
    woundEvents,
    confirmStatusCheck,
    demoMode,
    setDemoMode: setDemoModeWrapped,
    simulateStatus,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
