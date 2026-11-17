/**
 * App-wide settings from the App Management configuration form (businessConfig in
 * app.commerce.config.ts), read at the global scope. Missing or unreadable settings fall back to
 * the defaults, so a fresh install behaves predictably.
 */

export const DEFAULT_SETTINGS = {
  cacheSeconds: 300,
  labelsEnabled: true,
  maxPerPosition: 2,
};

function toBool(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }
  return fallback;
}

function toWhole(value, fallback, { min, max }) {
  const number = Number(value);
  if (value === "" || !Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(number)));
}

/** Turns stored config entries ([{ name, value }]) into typed settings. */
export function parseSettings(entries = []) {
  const raw = Object.fromEntries(
    entries
      .filter((entry) => entry?.value !== undefined && entry?.value !== null)
      .map((entry) => [entry.name, entry.value]),
  );
  return {
    cacheSeconds: toWhole(raw.cacheSeconds, DEFAULT_SETTINGS.cacheSeconds, {
      max: 86_400,
      min: 0,
    }),
    labelsEnabled: toBool(raw.labelsEnabled, DEFAULT_SETTINGS.labelsEnabled),
    maxPerPosition: toWhole(
      raw.maxPerPosition,
      DEFAULT_SETTINGS.maxPerPosition,
      { max: 10, min: 1 },
    ),
  };
}

export async function loadSettings(logger = console) {
  try {
    const [{ default: appConfig }, libConfig] = await Promise.all([
      import("#app.commerce.config"),
      import("@adobe/aio-commerce-lib-config"),
    ]);
    await libConfig.initialize({ schema: appConfig.businessConfig.schema });
    const result = await libConfig.getConfiguration(
      libConfig.byCodeAndLevel("global", "global"),
    );
    return parseSettings(result?.config);
  } catch (error) {
    logger.warn(`Using default settings: ${error.message}`);
    return { ...DEFAULT_SETTINGS };
  }
}
