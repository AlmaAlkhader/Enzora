import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
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

import { auth, db, rtdb } from "@/lib/firebase";
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

export interface UserProfile {
  name: string;
  email: string;
  createdAt: number;
  medicalProfile: MedicalProfile | null;
  activeWoundId?: string | null;
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
  user: User | null;
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

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

const ONBOARD_KEY = "enzora.onboarded";
const LARGE_TEXT_KEY = "enzora.largeText";
const NOTIF_KEY = "enzora.notif";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { i18n: i18nInst } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
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

  // Load preferences
  useEffect(() => {
    void (async () => {
      const lang = await loadLanguage();
      setLanguageState(lang);
      await i18n.changeLanguage(lang);
      try {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(lang === "ar");
      } catch {
        // ignore
      }
      const onb = await AsyncStorage.getItem(ONBOARD_KEY);
      setHasSeenOnboardingState(onb === "1");
      const lt = await AsyncStorage.getItem(LARGE_TEXT_KEY);
      setLargeTextState(lt === "1");
      const nf = await AsyncStorage.getItem(NOTIF_KEY);
      setNotificationsEnabledState(nf !== "0");
      setPrefsLoaded(true);
    })();
  }, []);

  // Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setWounds([]);
        setReadings([]);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // User profile listener
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const userDoc = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      userDoc,
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [user]);

  // Wounds listener
  useEffect(() => {
    if (!user) return;
    const wq = query(
      collection(db, "users", user.uid, "wounds"),
      orderBy("dateAdded", "desc"),
    );
    const unsub = onSnapshot(wq, (snap) => {
      const list: Wound[] = [];
      snap.forEach((d) => {
        const data = d.data() as Omit<Wound, "id">;
        list.push({ ...data, id: d.id });
      });
      setWounds(list);
    });
    return unsub;
  }, [user]);

  // Readings listener for active wound
  useEffect(() => {
    if (!user || !profile?.activeWoundId) {
      setReadings([]);
      return;
    }
    const rq = query(
      collection(
        db,
        "users",
        user.uid,
        "wounds",
        profile.activeWoundId,
        "readings",
      ),
      orderBy("timestamp", "desc"),
    );
    const unsub = onSnapshot(rq, (snap) => {
      const list: Reading[] = [];
      snap.forEach((d) => {
        const data = d.data() as Omit<Reading, "id">;
        list.push({ ...data, id: d.id });
      });
      setReadings(list);
    });
    return unsub;
  }, [user, profile?.activeWoundId]);

  // Sensor listener
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

  // Save reading to firestore on sensor change
  const lastSavedTs = useRef<number | null>(null);
  useEffect(() => {
    if (!user || !profile?.activeWoundId || !sensor.status || !sensor.lastUpdated)
      return;
    if (lastSavedTs.current === sensor.lastUpdated) return;
    lastSavedTs.current = sensor.lastUpdated;
    const id =
      Date.now().toString() + Math.random().toString(36).substr(2, 9);
    void setDoc(
      doc(
        db,
        "users",
        user.uid,
        "wounds",
        profile.activeWoundId,
        "readings",
        id,
      ),
      {
        status: sensor.status,
        red: sensor.red,
        green: sensor.green,
        blue: sensor.blue,
        timestamp: sensor.lastUpdated,
      },
    );
  }, [
    sensor.status,
    sensor.lastUpdated,
    sensor.red,
    sensor.green,
    sensor.blue,
    user,
    profile?.activeWoundId,
  ]);

  const setLanguage = useCallback(async (lang: "en" | "ar") => {
    setLanguageState(lang);
    await i18nInst.changeLanguage(lang);
    await saveLanguage(lang);
    try {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(lang === "ar");
    } catch {
      // ignore
    }
  }, [i18nInst]);

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
    try {
      const methods = await withTimeout(
        fetchSignInMethodsForEmail(auth, email),
        8000,
        "email-check-timeout",
      );
      return methods.length > 0;
    } catch {
      // If Firebase blocks email enumeration or the call times out,
      // assume the email exists so the login flow proceeds and surfaces
      // the real error from signInWithEmailAndPassword.
      return true;
    }
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      console.log("[signUp] starting", { email });
      const cred = await withTimeout(
        createUserWithEmailAndPassword(auth, email, password),
        15000,
        "auth-timeout",
      );
      console.log("[signUp] auth ok", cred.user.uid);
      const userDoc: UserProfile = {
        name,
        email,
        createdAt: Date.now(),
        medicalProfile: null,
        activeWoundId: null,
      };
      try {
        await withTimeout(
          setDoc(doc(db, "users", cred.user.uid), userDoc),
          10000,
          "firestore-timeout",
        );
        console.log("[signUp] profile saved");
      } catch (err) {
        // Don't block the signup flow if Firestore write fails — the
        // auth account was already created. We'll let the user proceed
        // and the profile will be created on next successful write.
        console.warn("[signUp] failed to write profile", err);
      }
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    await withTimeout(
      signInWithEmailAndPassword(auth, email, password),
      15000,
      "auth-timeout",
    );
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const saveMedicalProfile = useCallback(
    async (p: MedicalProfile) => {
      if (!user) return;
      await updateDoc(doc(db, "users", user.uid), { medicalProfile: p });
    },
    [user],
  );

  const addWound = useCallback(
    async (w: Omit<Wound, "id" | "status" | "dateAdded">) => {
      if (!user) throw new Error("not authenticated");
      const id =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const wound: Omit<Wound, "id"> = {
        ...w,
        status: "active",
        dateAdded: Date.now(),
        healedAt: null,
      };
      await setDoc(doc(db, "users", user.uid, "wounds", id), wound);
      await updateDoc(doc(db, "users", user.uid), { activeWoundId: id });
      return id;
    },
    [user],
  );

  const setActiveWound = useCallback(
    async (id: string) => {
      if (!user) return;
      await updateDoc(doc(db, "users", user.uid), { activeWoundId: id });
    },
    [user],
  );

  const markHealed = useCallback(
    async (id: string) => {
      if (!user) return;
      await updateDoc(doc(db, "users", user.uid, "wounds", id), {
        status: "healed",
        healedAt: Date.now(),
      });
      const remaining = wounds.filter((w) => w.id !== id && w.status === "active");
      if (profile?.activeWoundId === id) {
        await updateDoc(doc(db, "users", user.uid), {
          activeWoundId: remaining[0]?.id ?? null,
        });
      }
    },
    [user, wounds, profile?.activeWoundId],
  );

  const addNote = useCallback(
    async (id: string, note: string) => {
      if (!user) return;
      const w = wounds.find((x) => x.id === id);
      const existing = w?.notes ?? "";
      const stamp = new Date().toLocaleString();
      const combined = existing
        ? `${existing}\n\n[${stamp}] ${note}`
        : `[${stamp}] ${note}`;
      await updateDoc(doc(db, "users", user.uid, "wounds", id), {
        notes: combined,
      });
    },
    [user, wounds],
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

// Re-export for convenience
export type { Timestamp };
