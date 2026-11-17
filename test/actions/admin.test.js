import { describe, expect, test, vi } from "vitest";

import { createHandlers } from "../../src/commerce-backend-ui-2/actions/handlers.js";
import { adminAction } from "../../src/commerce-backend-ui-2/actions/http.js";
import { RuleValidationError } from "../../src/common/labels/rules-repo.js";

const logger = { error: vi.fn(), warn: vi.fn() };

describe("admin handlers", () => {
  test("rulesList returns rules and examples", async () => {
    const handlers = createHandlers({ listRules: async () => [{ code: "a" }] });
    const response = await handlers.rulesList({}, {});
    expect(response.body.rules).toEqual([{ code: "a" }]);
    expect(response.body.examples.length).toBeGreaterThan(0);
    expect(response.body.examples.every((e) => e.enabled === false)).toBe(true);
  });

  test("ruleSave validates input and passes the previous code", async () => {
    const saveRule = vi.fn(async (rule) => rule);
    const handlers = createHandlers({ saveRule });
    await expect(handlers.ruleSave({}, {})).rejects.toBeInstanceOf(
      RuleValidationError,
    );
    const response = await handlers.ruleSave(
      { previousCode: "old", rule: { code: "new" } },
      {},
    );
    expect(response.body.rule).toEqual({ code: "new" });
    expect(saveRule).toHaveBeenCalledWith(
      { code: "new" },
      {},
      { previousCode: "old" },
    );
  });

  test("ruleDelete answers 404 for a missing rule", async () => {
    const handlers = createHandlers({
      deleteRule: async (code) => code === "a",
    });
    expect((await handlers.ruleDelete({ code: "a" }, {})).statusCode).toBe(200);
    expect((await handlers.ruleDelete({ code: "b" }, {})).statusCode).toBe(404);
    await expect(handlers.ruleDelete({}, {})).rejects.toBeInstanceOf(
      RuleValidationError,
    );
  });

  test("lookups lists store views, and degrades when Commerce is unreachable", async () => {
    const ok = createHandlers({
      getCommerce: async () => ({
        get: () => ({
          json: async () => [
            { code: "admin", id: 0, name: "Admin" },
            { code: "default", id: 1, name: "Default" },
          ],
        }),
      }),
    });
    expect((await ok.lookups({}, {}, logger)).body).toEqual({
      storeViews: [{ code: "default", id: 1, label: "Default" }],
    });
    const down = createHandlers({
      getCommerce: async () => {
        throw new Error("no");
      },
    });
    expect((await down.lookups({}, {}, logger)).body).toEqual({
      storeViews: [],
      unavailable: true,
    });
  });
});

describe("adminAction", () => {
  test("maps validation errors to 400 and others to a generic 500", async () => {
    const invalid = adminAction("x", async () => {
      throw new RuleValidationError(["bad"]);
    });
    const broken = adminAction("x", async () => {
      throw new Error("secret detail");
    });
    const ok = adminAction("x", async (body) => ({ body, statusCode: 200 }));
    expect((await invalid({})).statusCode).toBe(400);
    const failed = await broken({});
    expect(failed.statusCode).toBe(500);
    expect(JSON.stringify(failed.body)).not.toContain("secret");
    expect((await ok({ body: '{"a":1}' })).body).toEqual({ a: 1 });
  });
});
