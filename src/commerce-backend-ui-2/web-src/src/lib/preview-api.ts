import { validateRule } from "#engine";

import { DEFAULT_RULES } from "../../../../common/labels/default-rules.js";
import { ApiError } from "../hooks/use-labels-api.ts";

import type { LabelsApi } from "../hooks/use-labels-api.ts";
import type { LabelRule } from "./types.ts";

const STORAGE_KEY = "product-labels-preview:rules";

/** The examples, switched on, so the preview opens with something to look at. */
export function seedRules(): LabelRule[] {
  return (DEFAULT_RULES as LabelRule[]).map((rule) => ({
    ...structuredClone(rule),
    enabled: true,
  }));
}

function read(): LabelRule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as LabelRule[];
    }
  } catch {
    // Storage blocked or corrupt: start from the examples.
  }
  return seedRules();
}

function write(rules: LabelRule[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // Storage blocked: changes last until the page reloads.
  }
}

function sorted(rules: LabelRule[]): LabelRule[] {
  return [...rules].sort(
    (a, b) =>
      (a.priority ?? 0) - (b.priority ?? 0) || a.code.localeCompare(b.code),
  );
}

const wait = () => new Promise((resolve) => setTimeout(resolve, 150));

/**
 * The Admin API without App Builder: rules live in this browser's localStorage and are checked
 * with the same validateRule as the rule-save action. For local preview only.
 */
export function createPreviewApi(): LabelsApi {
  let rules = read();

  return {
    async deleteRule(code) {
      await wait();
      const before = rules.length;
      rules = rules.filter((rule) => rule.code !== code);
      write(rules);
      return { deleted: rules.length < before };
    },

    async listRules() {
      await wait();
      return {
        examples: structuredClone(DEFAULT_RULES as LabelRule[]),
        rules: sorted(structuredClone(rules)),
      };
    },

    async lookups() {
      await wait();
      return {
        storeViews: [
          { code: "default", id: 1, label: "Default Store View" },
          { code: "fr", id: 2, label: "French Store View" },
        ],
      };
    },

    async saveRule(rule, previousCode) {
      await wait();
      const errors = validateRule(rule);
      if (errors.length) {
        throw new ApiError(`Invalid label rule: ${errors.join("; ")}`, errors);
      }
      const renamed = previousCode && previousCode !== rule.code;
      if (
        (renamed || !previousCode) &&
        rules.some((existing) => existing.code === rule.code)
      ) {
        throw new ApiError("Invalid label rule", [
          `a rule with code "${rule.code}" already exists`,
        ]);
      }
      const saved = { ...rule, updatedAt: new Date().toISOString() };
      rules = [
        ...rules.filter(
          (existing) =>
            existing.code !== rule.code && existing.code !== previousCode,
        ),
        saved,
      ];
      write(rules);
      return { rule: saved };
    },
  };
}

/** Puts the examples back and forgets the preview's changes. */
export function resetPreview() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
}
