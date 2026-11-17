/**
 * Where the rules come from: the LABEL_RULES action input when set (handy for CI and scripted
 * setups), otherwise the rules managed on the Admin page (App Builder Database Storage).
 */

import { listRulesCached } from "./rules-repo.js";

function parseJson(value) {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error("LABEL_RULES is not valid JSON", { cause: error });
  }
}

/** Rules from the LABEL_RULES input, or null when it isn't set. */
export function rulesFromInput(params = {}) {
  const value = params.LABEL_RULES;
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  const raw = parseJson(value);
  const rules = Array.isArray(raw) ? raw : raw?.rules;
  if (!Array.isArray(rules)) {
    throw new Error(
      "LABEL_RULES must be an array of rules or { rules: [...] }",
    );
  }
  return rules;
}

export function loadRules(params, connect) {
  return rulesFromInput(params) ?? listRulesCached(params, connect);
}
