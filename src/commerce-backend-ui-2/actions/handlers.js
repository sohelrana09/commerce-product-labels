/**
 * Admin action handlers: manage label rules and load the store views the rule editor offers.
 * The label preview runs in the browser with the same engine as the storefront, so there's no
 * preview action. Dependencies are injectable for tests.
 */

import { getCommerceClient } from "@adobe/aio-commerce-lib-app";
import { resolveImsAuthParams } from "@adobe/aio-commerce-lib-auth";

import { json } from "../../common/http.js";
import { DEFAULT_RULES } from "../../common/labels/default-rules.js";
import {
  deleteRule,
  listRules,
  RuleValidationError,
  saveRule,
} from "../../common/labels/rules-repo.js";

function getCommerce(params) {
  return getCommerceClient(resolveImsAuthParams(params));
}

const realDeps = { deleteRule, getCommerce, listRules, saveRule };

function requireCode(code) {
  if (typeof code !== "string" || !code) {
    throw new RuleValidationError(["code is required"]);
  }
  return code;
}

export function createHandlers(overrides = {}) {
  const deps = { ...realDeps, ...overrides };

  return {
    async lookups(_body, params, logger) {
      try {
        const commerce = await deps.getCommerce(params);
        const storeViews = await commerce.get("store/storeViews").json();
        return json(200, {
          storeViews: (storeViews ?? [])
            .filter((s) => Number(s.id) !== 0)
            .map((s) => ({ code: s.code, id: s.id, label: s.name })),
        });
      } catch (error) {
        // The editor still works with typed store view codes when Commerce can't be reached.
        logger.warn(`lookups unavailable: ${error.message}`);
        return json(200, { storeViews: [], unavailable: true });
      }
    },

    async ruleDelete(body, params) {
      const deleted = await deps.deleteRule(requireCode(body.code), params);
      return deleted
        ? json(200, { deleted: true })
        : json(404, { error: "Rule not found" });
    },

    async ruleSave(body, params) {
      if (!body.rule || typeof body.rule !== "object") {
        throw new RuleValidationError(["rule is required"]);
      }
      const saved = await deps.saveRule(body.rule, params, {
        previousCode: body.previousCode,
      });
      return json(200, { rule: saved });
    },

    async rulesList(_body, params) {
      const rules = await deps.listRules(params);
      return json(200, { examples: DEFAULT_RULES, rules });
    },
  };
}

export const handlers = createHandlers();
