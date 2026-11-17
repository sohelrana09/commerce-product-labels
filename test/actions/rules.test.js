import { describe, expect, test, vi } from "vitest";

import { createRulesFeed } from "../../src/commerce-extensibility-1/actions/rules/handler.js";
import { main } from "../../src/commerce-extensibility-1/actions/rules/index.js";

const RULES = [
  { code: "sale", enabled: true, name: "Sale", priority: 1, text: "Sale" },
  { code: "fr", enabled: true, name: "FR", storeViews: ["fr"], text: "Promo" },
  { code: "off", enabled: false, name: "Off", text: "Off" },
];

const settings = (overrides = {}) => ({
  cacheSeconds: 120,
  labelsEnabled: true,
  maxPerPosition: 3,
  ...overrides,
});

describe("rules feed", () => {
  test("returns the public rules for a store view with a cache header", async () => {
    const feed = createRulesFeed({
      loadRules: async () => RULES,
      loadSettings: async () => settings(),
    });
    const response = await feed({ store: "default" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["Cache-Control"]).toBe("public, max-age=120");
    expect(response.body.maxPerPosition).toBe(3);
    expect(response.body.rules.map((r) => r.code)).toEqual(["sale"]);
    expect(response.body.rules[0]).not.toHaveProperty("name");
  });

  test("ignores an unsafe store code and returns every store's rules", async () => {
    const feed = createRulesFeed({
      loadRules: async () => RULES,
      loadSettings: async () => settings(),
    });
    const response = await feed({ store: "../x" });
    expect(response.body.rules.map((r) => r.code)).toEqual(["fr", "sale"]);
  });

  test("returns no rules and skips the database when labels are off", async () => {
    const loadRules = vi.fn();
    const feed = createRulesFeed({
      loadRules,
      loadSettings: async () => settings({ labelsEnabled: false }),
    });
    const response = await feed({});
    expect(response.body).toEqual({
      enabled: false,
      maxPerPosition: 3,
      rules: [],
    });
    expect(loadRules).not.toHaveBeenCalled();
  });

  test("main answers 500 without details when loading fails", async () => {
    const response = await main({ LABEL_RULES: "{" });
    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe(
      "Product labels are unavailable right now.",
    );
  });

  test("main serves LABEL_RULES", async () => {
    const response = await main({
      LABEL_RULES: JSON.stringify(RULES),
      store: "fr",
    });
    expect(response.statusCode).toBe(200);
    expect(response.body.rules.map((r) => r.code)).toEqual(["fr", "sale"]);
  });
});
