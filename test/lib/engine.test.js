import { describe, expect, it } from "vitest";

import {
  isActive,
  labelsFor,
  normaliseProduct,
  publicRules,
  renderText,
  testCondition,
  validateRule,
} from "#engine";

const searchProduct = {
  attributes: [
    { name: "is_new", value: "1" },
    { name: "color", value: ["Red", "Blue"] },
  ],
  inStock: true,
  lowStock: true,
  name: "Trail Shoe",
  price: {
    final: { amount: { currency: "USD", value: 75 } },
    regular: { amount: { currency: "USD", value: 100 } },
  },
  sku: "TS-01",
  typename: "SimpleProductView",
};

const pdpProduct = {
  attributes: [{ id: "brand", label: "Brand", value: "Acme" }],
  inStock: false,
  name: "Jacket",
  prices: {
    final: { amount: 90, currency: "EUR" },
    regular: { amount: 120, currency: "EUR" },
  },
  productType: "simple",
  sku: "J-1",
};

function rule(overrides = {}) {
  return {
    code: "sale",
    conditions: [],
    enabled: true,
    name: "Sale",
    position: "top-left",
    text: "Sale",
    ...overrides,
  };
}

describe("normaliseProduct", () => {
  it("reads Product Discovery products", () => {
    const product = normaliseProduct(searchProduct);
    expect(product).toMatchObject({
      currency: "USD",
      discount_amount: 25,
      discount_percent: 25,
      final_price: 75,
      in_stock: true,
      low_stock: true,
      regular_price: 100,
      sku: "TS-01",
      type: "simpleproductview",
    });
    expect(product.attributes.is_new).toBe("1");
  });

  it("reads PDP drop-in products", () => {
    const product = normaliseProduct(pdpProduct);
    expect(product).toMatchObject({
      currency: "EUR",
      discount_percent: 25,
      final_price: 90,
      in_stock: false,
      type: "simple",
    });
    expect(product.attributes.brand).toBe("Acme");
  });

  it("reads the minimum of a price range", () => {
    const product = normaliseProduct({
      priceRange: {
        minimum: {
          final: { amount: { currency: "USD", value: 40 } },
          regular: { amount: { currency: "USD", value: 50 } },
        },
      },
    });
    expect(product.discount_percent).toBe(20);
  });

  it("reports no discount without a lower final price", () => {
    expect(
      normaliseProduct({ finalPrice: 10, regularPrice: 10 }),
    ).toMatchObject({
      discount_amount: 0,
      discount_percent: 0,
    });
    expect(normaliseProduct({}).final_price).toBeNull();
  });

  it("floors the percent so a label never overstates the discount", () => {
    expect(
      normaliseProduct({ finalPrice: 66.67, regularPrice: 100 })
        .discount_percent,
    ).toBe(33);
  });

  it("accepts attributes as a plain object", () => {
    expect(
      normaliseProduct({ attributes: { Brand: "X" } }).attributes.brand,
    ).toBe("X");
  });
});

describe("testCondition", () => {
  const product = normaliseProduct(searchProduct);

  it.each([
    [{ field: "discount_percent", operator: "gte", value: 25 }, true],
    [{ field: "discount_percent", operator: "gt", value: 25 }, false],
    [{ field: "final_price", operator: "lt", value: "80" }, true],
    [{ field: "final_price", operator: "lte", value: 74 }, false],
    [{ field: "final_price", operator: "eq", value: 75 }, true],
    [{ field: "final_price", operator: "neq", value: 75 }, false],
    [{ field: "final_price", operator: "gt", value: "abc" }, false],
    [{ field: "in_stock", operator: "is", value: true }, true],
    [{ field: "low_stock", operator: "is", value: "false" }, false],
    [{ field: "sku", operator: "eq", value: "ts-01" }, true],
    [{ field: "sku", operator: "neq", value: "ts-01" }, false],
    [{ field: "sku", operator: "starts_with", value: "TS" }, true],
    [{ field: "sku", operator: "in", value: "A, TS-01" }, true],
    [{ field: "sku", operator: "not_in", value: ["TS-01"] }, false],
    [{ field: "name", operator: "contains", value: "trail" }, true],
    [{ field: "name", operator: "not_contains", value: "trail" }, false],
    [{ field: "attribute:color", operator: "eq", value: "blue" }, true],
    [{ field: "attribute:color", operator: "in", value: "green,red" }, true],
    [{ field: "attribute:is_new", operator: "exists" }, true],
    [{ field: "attribute:missing", operator: "not_exists" }, true],
    [{ field: "attribute:missing", operator: "eq", value: "x" }, false],
    [{ field: "nope", operator: "eq", value: "x" }, false],
    [{ field: "sku", operator: "bogus", value: "x" }, false],
    [{ field: "final_price", operator: "bogus", value: 1 }, false],
  ])("%j → %s", (condition, expected) => {
    expect(testCondition(product, condition)).toBe(expected);
  });
});

describe("isActive", () => {
  const now = new Date("2026-11-17T12:00:00").getTime();

  it("is open without dates", () => {
    expect(isActive({}, now)).toBe(true);
  });

  it("includes the whole of the start and end days", () => {
    expect(
      isActive({ activeFrom: "2026-11-17", activeTo: "2026-11-17" }, now),
    ).toBe(true);
    expect(isActive({ activeTo: "2026-11-16" }, now)).toBe(false);
    expect(isActive({ activeFrom: "2026-11-18" }, new Date(now))).toBe(false);
  });

  it("ignores unreadable dates", () => {
    expect(isActive({ activeFrom: "soon" }, now)).toBe(true);
  });
});

describe("renderText", () => {
  const product = normaliseProduct(searchProduct);

  it("fills tokens", () => {
    expect(renderText("-{discount_percent}%", product)).toBe("-25%");
    expect(
      renderText("Save {discount_amount}", product, { locale: "en-US" }),
    ).toBe("Save $25");
    expect(
      renderText("{final_price} / {regular_price}", product, {
        locale: "en-US",
      }),
    ).toBe("$75 / $100");
    expect(renderText("{sku} {name}", product)).toBe("TS-01 Trail Shoe");
    expect(renderText("{attribute:is_new}|{attribute:none}", product)).toBe(
      "1|",
    );
  });

  it("keeps unknown tokens and trims to the maximum length", () => {
    expect(renderText("{unknown}", product)).toBe("{unknown}");
    expect(renderText("x".repeat(60), product)).toHaveLength(40);
  });

  it("formats money without a currency as a number", () => {
    expect(
      renderText("{final_price}", normaliseProduct({ finalPrice: 9.5 })),
    ).toBe("9.5");
    expect(renderText("{final_price}", normaliseProduct({}))).toBe("");
  });

  it("falls back when the currency code is invalid", () => {
    const odd = normaliseProduct({ currency: "??", finalPrice: 5 });
    expect(renderText("{final_price}", odd)).toBe("5 ??");
  });
});

describe("labelsFor", () => {
  it("returns the matching labels in priority order", () => {
    const rules = [
      rule({ code: "b", priority: 20, text: "Second" }),
      rule({
        code: "a",
        conditions: [{ field: "discount_percent", operator: "gte", value: 10 }],
        priority: 10,
        shape: "pill",
        text: "-{discount_percent}%",
      }),
      rule({
        code: "c",
        conditions: [{ field: "in_stock", operator: "is", value: false }],
        text: "Sold out",
      }),
    ];
    const labels = labelsFor(searchProduct, rules);
    expect(labels.map((l) => l.text)).toEqual(["-25%", "Second"]);
    expect(labels[0]).toEqual({
      background: "#1f1f1f",
      code: "a",
      color: "#ffffff",
      position: "top-left",
      shape: "pill",
      text: "-25%",
    });
  });

  it("supports any-of conditions", () => {
    const anyRule = rule({
      conditions: [
        { field: "sku", operator: "eq", value: "nope" },
        { field: "low_stock", operator: "is", value: true },
      ],
      match: "any",
    });
    expect(labelsFor(searchProduct, [anyRule])).toHaveLength(1);
    expect(
      labelsFor(searchProduct, [{ ...anyRule, match: "all" }]),
    ).toHaveLength(0);
  });

  it("skips disabled, out-of-scope and inactive rules", () => {
    const now = new Date("2026-11-17T12:00:00");
    const rules = [
      rule({ code: "off", enabled: false }),
      rule({ code: "pdp-only", placements: ["product"] }),
      rule({ code: "fr-only", storeViews: ["fr"] }),
      rule({ activeTo: "2026-01-01", code: "expired" }),
      rule({ code: "ok" }),
      null,
    ];
    const labels = labelsFor(searchProduct, rules, {
      now,
      placement: "listing",
      storeView: "default",
    });
    expect(labels.map((l) => l.code)).toEqual(["ok"]);
  });

  it("stops at a stopFurther rule", () => {
    const rules = [
      rule({ code: "first", priority: 1, stopFurther: true }),
      rule({ code: "second", priority: 2 }),
    ];
    expect(labelsFor(searchProduct, rules).map((l) => l.code)).toEqual([
      "first",
    ]);
  });

  it("caps labels per corner and drops empty text", () => {
    const rules = [
      rule({ code: "a", priority: 1 }),
      rule({ code: "b", priority: 2 }),
      rule({ code: "c", priority: 3 }),
      rule({ code: "d", position: "bottom-right", priority: 4 }),
      rule({ code: "e", priority: 0, text: "{attribute:none}" }),
    ];
    const labels = labelsFor(searchProduct, rules, { maxPerPosition: 2 });
    expect(labels.map((l) => l.code)).toEqual(["a", "b", "d"]);
  });

  it("falls back to safe styles", () => {
    const [label] = labelsFor(searchProduct, [
      rule({
        background: "red;x",
        color: "url(x)",
        position: "middle",
        shape: "star",
      }),
    ]);
    expect(label).toMatchObject({
      background: "#1f1f1f",
      color: "#ffffff",
      position: "top-left",
      shape: "rectangle",
    });
  });
});

describe("validateRule", () => {
  it("accepts a complete rule", () => {
    expect(
      validateRule(
        rule({
          activeFrom: "2026-01-01",
          activeTo: "2026-12-31",
          background: "#fff",
          color: "#000000",
          conditions: [
            { field: "discount_percent", operator: "gte", value: "10" },
            { field: "attribute:brand", operator: "exists" },
            { field: "in_stock", operator: "is", value: true },
          ],
          match: "any",
          placements: ["listing"],
          priority: 5,
          shape: "circle",
          storeViews: ["default"],
        }),
      ),
    ).toEqual([]);
  });

  it("lists every problem", () => {
    const errors = validateRule({
      activeFrom: "2026-12-31",
      activeTo: "2026-01-01",
      background: "red",
      code: "Bad Code",
      conditions: [
        { field: "price", operator: "gt", value: 1 },
        { field: "final_price", operator: "contains", value: "x" },
        { field: "sku", operator: "eq", value: "" },
      ],
      match: "some",
      name: "",
      placements: ["home"],
      position: "center",
      priority: "high",
      shape: "star",
      storeViews: "default",
      text: "<b>x</b>",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("code must"),
        "name is required",
        "text can't contain < or >",
        expect.stringContaining("position must"),
        expect.stringContaining("shape must"),
        expect.stringContaining("background must"),
        "match must be all or any",
        expect.stringContaining("placements must"),
        expect.stringContaining("storeViews must"),
        "priority must be a number",
        "activeFrom must be on or before activeTo",
        'condition 1: unknown field "price"',
        expect.stringContaining('condition 2: operator "contains"'),
        "condition 2: value must be a number",
        "condition 3: value is required",
      ]),
    );
  });

  it("rejects missing text, long text, bad dates and non-list conditions", () => {
    expect(validateRule(null)).toEqual(["rule must be an object"]);
    expect(validateRule(rule({ text: "" }))).toContain("text is required");
    expect(validateRule(rule({ text: "x".repeat(41) }))).toContain(
      "text must be 40 characters or fewer",
    );
    expect(validateRule(rule({ activeTo: "tomorrow" }))).toContain(
      "activeTo must be a date (YYYY-MM-DD)",
    );
    expect(validateRule(rule({ conditions: {} }))).toContain(
      "conditions must be a list",
    );
  });
});

describe("publicRules", () => {
  it("keeps enabled, valid, unexpired rules with public fields only", () => {
    const now = new Date("2026-11-17T12:00:00");
    const rules = [
      rule({ code: "z", name: "Admin only", priority: 2, updatedAt: "x" }),
      rule({ code: "a", priority: 1 }),
      rule({ code: "off", enabled: false }),
      rule({ code: "BAD" }),
      rule({ activeTo: "2026-11-01", code: "old" }),
      rule({ activeFrom: "2027-01-01", code: "future" }),
      rule({ code: "fr", storeViews: ["fr"] }),
    ];
    const result = publicRules(rules, { now, storeView: "default" });
    expect(result.map((r) => r.code)).toEqual(["future", "a", "z"]);
    expect(result[2]).not.toHaveProperty("name");
    expect(result[2]).not.toHaveProperty("updatedAt");
    expect(result[2]).not.toHaveProperty("enabled");
  });
});
