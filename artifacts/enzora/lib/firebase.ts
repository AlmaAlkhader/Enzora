import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

const RTDB_URL_RE =
  /^https:\/\/[^/]+\.(firebaseio\.com|firebasedatabase\.app)/i;

const isRtdbUrl = (v?: string | null): v is string =>
  !!v && RTDB_URL_RE.test(v);

// Treat anything that looks like an RTDB host (with or without scheme,
// trailing slash, default-rtdb suffix, or just a project id) as a candidate
// and normalise to a clean https URL.
function normaliseDbUrl(v?: string | null): string | undefined {
  if (!v) return undefined;
  const trimmed = v.trim().replace(/\/+$/, "");
  if (isRtdbUrl(trimmed)) return trimmed;
  // Bare host without scheme (e.g. "foo-default-rtdb.firebaseio.com")
  if (/^[^/\s]+\.(firebaseio\.com|firebasedatabase\.app)$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  // Bare project id (e.g. "enzora-39033") — build the default RTDB host.
  if (/^[a-z0-9-]+$/i.test(trimmed)) {
    return `https://${trimmed}-default-rtdb.firebaseio.com`;
  }
  return undefined;
}

const envDbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
const envAuthDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
const envProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const envAppId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

// Self-healing: try the database URL slot first, then fall back to the
// auth-domain slot, then to the project-id slot. People often paste these
// into the wrong env var.
const validDbUrl =
  normaliseDbUrl(envDbUrl) ??
  normaliseDbUrl(envAuthDomain) ??
  normaliseDbUrl(envProjectId);

// projectId should look like "my-project", not an App ID ("1:123:web:abc")
// and not a URL. Pick the first slot that looks sane.
const looksLikeProjectId = (v?: string | null): v is string =>
  !!v && /^[a-z0-9-]+$/i.test(v) && !v.includes(":") && !v.includes(".");

const validProjectId =
  (looksLikeProjectId(envProjectId) ? envProjectId : undefined) ??
  (looksLikeProjectId(envDbUrl) ? envDbUrl : undefined) ??
  (validDbUrl
    ? validDbUrl.match(/^https:\/\/([^.]+?)(?:-default-rtdb)?\./i)?.[1]
    : undefined);

// authDomain should look like "<project>.firebaseapp.com"
const looksLikeAuthDomain = (v?: string | null): v is string =>
  !!v && /^[^/\s]+\.firebaseapp\.com$/i.test(v);

const validAuthDomain =
  (looksLikeAuthDomain(envAuthDomain) ? envAuthDomain : undefined) ??
  (validProjectId ? `${validProjectId}.firebaseapp.com` : undefined);

// appId should match "1:123:web:abc"
const looksLikeAppId = (v?: string | null): v is string =>
  !!v && /^\d+:\d+:[a-z]+:[a-f0-9]+$/i.test(v);

const validAppId =
  (looksLikeAppId(envAppId) ? envAppId : undefined) ??
  (looksLikeAppId(envProjectId) ? envProjectId : undefined);

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: validAuthDomain,
  ...(validDbUrl ? { databaseURL: validDbUrl } : {}),
  projectId: validProjectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: validAppId,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let rtdb: Database | null = null;

console.log("[firebase] config check", {
  hasApiKey: !!firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  databaseURL: validDbUrl ?? "(missing/invalid)",
  rawEnv: {
    EXPO_PUBLIC_FIREBASE_DATABASE_URL: envDbUrl ?? "(unset)",
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: envAuthDomain ?? "(unset)",
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: envProjectId ?? "(unset)",
  },
});

try {
  if (validDbUrl && firebaseConfig.apiKey) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    rtdb = getDatabase(app);
    console.log("[firebase] initialized", {
      app: !!app,
      appName: app?.name,
      rtdb: !!rtdb,
      databaseURL: validDbUrl,
    });
  } else if (!validDbUrl) {
    console.warn(
      "[firebase] could not derive a valid RTDB URL from any env var — sensor data will be offline.",
      { envDbUrl, envAuthDomain, envProjectId },
    );
  } else {
    console.warn("[firebase] EXPO_PUBLIC_FIREBASE_API_KEY missing.");
  }
} catch (err) {
  console.warn("[firebase] failed to initialize RTDB:", err);
  rtdb = null;
}

export { app, rtdb };
