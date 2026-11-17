/**
 * The storefront's rules feed: the enabled, unexpired label rules for one store view, with only
 * the fields the engine needs. Responses are cacheable, since every shopper gets the same rules.
 */

import { publicRules } from "#engine";

import { json } from "../../../common/http.js";
import { loadSettings } from "../../../common/labels/settings.js";
import { loadRules } from "../../../common/labels/sources.js";

const STORE_CODE = /^[a-z0-9_]{1,64}$/iu;

export function createRulesFeed(overrides = {}) {
  const deps = { loadRules, loadSettings, now: () => Date.now(), ...overrides };

  return async (params = {}, logger = console) => {
    const store =
      typeof params.store === "string" && STORE_CODE.test(params.store)
        ? params.store
        : undefined;
    const settings = await deps.loadSettings(logger);
    const rules = settings.labelsEnabled ? await deps.loadRules(params) : [];
    const response = json(200, {
      enabled: settings.labelsEnabled,
      maxPerPosition: settings.maxPerPosition,
      rules: publicRules(rules, { now: deps.now(), storeView: store }),
    });
    response.headers["Cache-Control"] =
      `public, max-age=${settings.cacheSeconds}`;
    return response;
  };
}
