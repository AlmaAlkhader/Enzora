import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

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

let app: FirebaseApp | null = null;
let rtdb: Database | null = null;

try {
  if (validDbUrl && firebaseConfig.apiKey) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    rtdb = getDatabase(app);
  } else if (!validDbUrl) {
    console.warn(
      "[firebase] EXPO_PUBLIC_FIREBASE_DATABASE_URL not set — sensor data will be offline.",
    );
  }
} catch (err) {
  console.warn("[firebase] failed to initialize RTDB:", err);
  rtdb = null;
}

export { app, rtdb };
