/**
 * Label rules stored in App Builder Database Storage. Reads for the storefront feed are cached
 * per warm action container for RULES_CACHE_MS; the feed's HTTP cache adds a few minutes more.
 */

import { validateRule } from "#engine";

import { findOneOrNull, RULES, toRule, withDb } from "./db.js";

export const RULES_CACHE_MS = 30_000;

let cache = null;

export function clearRulesCache() {
  cache = null;
}

export class RuleValidationError extends Error {
  // biome-ignore lint/style/useConsistentMemberAccessibility: plain JavaScript has no access modifiers
  constructor(errors) {
    super(`Invalid label rule: ${errors.join("; ")}`);
    this.name = "RuleValidationError";
    this.errors = errors;
  }
}

export function listRules(params, connect) {
  return withDb(
    params,
    async (client) => {
      const docs = await client
        .collection(RULES)
        .find({})
        .sort({ priority: 1, code: 1 })
        .toArray();
      return docs.map(toRule);
    },
    connect,
  );
}

/** Rules for the storefront feed: cached per warm container. */
export async function listRulesCached(params, connect, now = Date.now()) {
  if (cache && cache.expiresAt > now) {
    return cache.rules;
  }
  const rules = await listRules(params, connect);
  cache = { expiresAt: now + RULES_CACHE_MS, rules };
  return rules;
}

/**
 * Creates or replaces a rule. When `previousCode` differs from `rule.code` (a rename), the
 * old document is removed. Refuses to overwrite another rule's code.
 */
// Async so validation failures reject like database failures do.
// biome-ignore lint/suspicious/useAwait: see comment above
export async function saveRule(rule, params, { previousCode, connect } = {}) {
  const errors = validateRule(rule);
  if (errors.length) {
    throw new RuleValidationError(errors);
  }
  const { _id: _ignored, ...clean } = rule;
  const doc = { ...clean, updatedAt: new Date().toISOString() };

  return withDb(
    params,
    async (client) => {
      const rules = client.collection(RULES);
      const renamed = previousCode && previousCode !== rule.code;
      if (renamed || !previousCode) {
        const clash = await findOneOrNull(rules, { code: rule.code });
        if (clash) {
          throw new RuleValidationError([
            `a rule with code "${rule.code}" already exists`,
          ]);
        }
      }
      if (renamed) {
        await rules.deleteOne({ code: previousCode });
      }
      await rules.replaceOne({ code: rule.code }, doc, { upsert: true });
      clearRulesCache();
      return doc;
    },
    connect,
  );
}

export function deleteRule(code, params, connect) {
  return withDb(
    params,
    async (client) => {
      const result = await client.collection(RULES).deleteOne({ code });
      clearRulesCache();
      return (result?.deletedCount ?? 0) > 0;
    },
    connect,
  );
}
