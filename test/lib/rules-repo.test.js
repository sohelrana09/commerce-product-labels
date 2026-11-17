import { beforeEach, describe, expect, test } from "vitest";

import { findOneOrNull, toRule } from "../../src/common/labels/db.js";
import {
  clearRulesCache,
  deleteRule,
  listRules,
  listRulesCached,
  RULES_CACHE_MS,
  RuleValidationError,
  saveRule,
} from "../../src/common/labels/rules-repo.js";
import { createFakeDb } from "../fixtures/fake-db.js";

const rule = (overrides = {}) => ({
  code: "sale",
  name: "Sale",
  priority: 10,
  text: "Sale",
  ...overrides,
});

describe("rules repository", () => {
  let db;
  beforeEach(() => {
    db = createFakeDb();
    clearRulesCache();
  });

  test("saves, lists in priority order and deletes rules", async () => {
    await saveRule(
      rule({ code: "b", priority: 20 }),
      {},
      { connect: db.connect },
    );
    await saveRule(
      rule({ code: "a", priority: 10 }),
      {},
      { connect: db.connect },
    );
    const rules = await listRules({}, db.connect);
    expect(rules.map((r) => r.code)).toEqual(["a", "b"]);
    expect(rules[0]).not.toHaveProperty("_id");
    expect(rules[0].updatedAt).toEqual(expect.any(String));
    expect(await deleteRule("a", {}, db.connect)).toBe(true);
    expect(await deleteRule("a", {}, db.connect)).toBe(false);
  });

  test("rejects invalid rules and duplicate codes", async () => {
    await expect(
      saveRule(rule({ text: "" }), {}, { connect: db.connect }),
    ).rejects.toBeInstanceOf(RuleValidationError);
    await saveRule(rule(), {}, { connect: db.connect });
    await expect(saveRule(rule(), {}, { connect: db.connect })).rejects.toThrow(
      'a rule with code "sale" already exists',
    );
  });

  test("updates in place and renames", async () => {
    await saveRule(rule(), {}, { connect: db.connect });
    await saveRule(
      rule({ text: "Deal" }),
      {},
      { connect: db.connect, previousCode: "sale" },
    );
    await saveRule(
      rule({ code: "deal" }),
      {},
      { connect: db.connect, previousCode: "sale" },
    );
    const rules = await listRules({}, db.connect);
    expect(rules.map((r) => r.code)).toEqual(["deal"]);
  });

  test("caches rules per container until a save", async () => {
    await saveRule(rule(), {}, { connect: db.connect });
    const now = Date.now();
    const first = await listRulesCached({}, db.connect, now);
    await db
      .connect()
      .then((c) => c.collection("label_rules").deleteOne({ code: "sale" }));
    expect(await listRulesCached({}, db.connect, now + 1)).toBe(first);
    expect(
      await listRulesCached({}, db.connect, now + RULES_CACHE_MS + 1),
    ).toEqual([]);
  });
});

describe("db helpers", () => {
  test("findOneOrNull turns not-found errors into null", async () => {
    const missing = {
      findOne: () =>
        Promise.reject(Object.assign(new Error("Document not found"))),
    };
    const notFound = { findOne: () => Promise.reject({ httpStatusCode: 404 }) };
    const broken = { findOne: () => Promise.reject(new Error("boom")) };
    expect(await findOneOrNull(missing, {})).toBeNull();
    expect(await findOneOrNull(notFound, {})).toBeNull();
    await expect(findOneOrNull(broken, {})).rejects.toThrow("boom");
  });

  test("toRule strips the database id", () => {
    expect(toRule(null)).toBeNull();
    expect(toRule({ _id: 1, code: "x" })).toEqual({ code: "x" });
  });
});
