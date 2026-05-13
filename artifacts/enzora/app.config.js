// Wraps app.json so we can inject build-time values from environment
// variables. Static config (name, slug, plugins, etc.) stays in app.json.
//
// EAS_PROJECT_ID is the project's UUID from https://expo.dev/accounts/<you>/projects/<slug>.
// We accept either name so it works whether you set it locally as
// EAS_PROJECT_ID (the convention in EAS docs) or as
// EXPO_PUBLIC_EAS_PROJECT_ID (which Expo also exposes to the JS runtime).
const appJson = require("./app.json");

const easProjectId =
  process.env.EAS_PROJECT_ID ||
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
  undefined;

module.exports = ({ config }) => {
  const merged = { ...config, ...appJson.expo };
  merged.extra = {
    ...(appJson.expo.extra || {}),
    ...(merged.extra || {}),
    eas: {
      ...((appJson.expo.extra && appJson.expo.extra.eas) || {}),
      // Only set projectId when it's actually configured. Leaving it
      // undefined makes the diagnostic card show "(missing)" so the
      // developer knows to provide it instead of getting a fake value.
      ...(easProjectId ? { projectId: easProjectId } : {}),
    },
  };
  return merged;
};
