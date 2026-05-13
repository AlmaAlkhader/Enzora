import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
// @ts-expect-error - getReactNativePersistence is exported but not in types
import { initializeAuth, getAuth, getReactNativePersistence, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";
import { Platform } from "react-native";

const missing: string[] = [];
for (const k of [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
] as const) {
  if (!process.env[k]) missing.push(k);
}
if (missing.length > 0) {
  console.error(
    "[firebase] Missing required config:",
    missing.join(", "),
    "— sign up / login will not work until these are set.",
  );
}

const rawDbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
const validDbUrl =
  rawDbUrl &&
  /^https:\/\/[^/]+\.(firebaseio\.com|firebasedatabase\.app)/i.test(rawDbUrl)
    ? rawDbUrl
    : undefined;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  ...(validDbUrl ? { databaseURL: validDbUrl } : {}),
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

let auth: Auth;
try {
  if (Platform.OS === "web") {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch {
  auth = getAuth(app);
}

const db: Firestore = getFirestore(app);

let rtdb: Database | null = null;
try {
  if (validDbUrl) {
    rtdb = getDatabase(app);
  }
} catch {
  rtdb = null;
}

export { app, auth, db, rtdb };

