import { describe, expect, test, vi } from "vitest";

import {
  DEFAULT_SETTINGS,
  loadSettings,
  parseSettings,
} from "../../src/common/labels/settings.js";
import { loadRules, rulesFromInput } from "../../src/common/labels/sources.js";

describe("parseSettings", () => {
  test("uses defaults for missing values", () => {
    expect(parseSettings()).toEqual(DEFAULT_SETTINGS);
  });

  test("parses and clamps stored values", () => {
    expect(
      parseSettings([
        { name: "labelsEnabled", value: "off" },
        { name: "maxPerPosition", value: "50" },
        { name: "cacheSeconds", value: "-5" },
        { name: "ignored", value: null },
      ]),
    ).toEqual({ cacheSeconds: 0, labelsEnabled: false, maxPerPosition: 10 });
    expect(
      parseSettings([
        { name: "labelsEnabled", value: true },
        { name: "maxPerPosition", value: "x" },
        { name: "cacheSeconds", value: "" },
      ]),
    ).toEqual(DEFAULT_SETTINGS);
    expect(
      parseSettings([{ name: "labelsEnabled", value: 1 }]).labelsEnabled,
    ).toBe(true);
  });

  test("returns the defaults outside App Management", async () => {
    const logger = { warn: vi.fn() };
    expect(await loadSettings(logger)).toEqual(DEFAULT_SETTINGS);
  });
});

describe("rulesFromInput", () => {
  test("is null when LABEL_RULES is unset or blank", () => {
    expect(rulesFromInput({})).toBeNull();
    expect(rulesFromInput({ LABEL_RULES: "  " })).toBeNull();
    expect(rulesFromInput()).toBeNull();
  });

  test("reads an array, a { rules } object or a parsed value", () => {
    expect(rulesFromInput({ LABEL_RULES: '[{"code":"a"}]' })).toEqual([
      { code: "a" },
    ]);
    expect(rulesFromInput({ LABEL_RULES: '{"rules":[]}' })).toEqual([]);
    expect(rulesFromInput({ LABEL_RULES: [{ code: "b" }] })).toEqual([
      { code: "b" },
    ]);
  });

  test("rejects bad input", () => {
    expect(() => rulesFromInput({ LABEL_RULES: "{" })).toThrow(
      "not valid JSON",
    );
    expect(() => rulesFromInput({ LABEL_RULES: '{"x":1}' })).toThrow(
      "must be an array",
    );
  });

  test("loadRules prefers LABEL_RULES", async () => {
    expect(await loadRules({ LABEL_RULES: "[]" })).toEqual([]);
  });
});
