// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const product = {
  inStock: true,
  name: "Shoe",
  price: {
    final: { amount: { currency: "USD", value: 50 } },
    regular: { amount: { currency: "USD", value: 100 } },
  },
  sku: "S1",
};

const RULES = [
  {
    background: "#d0021b",
    code: "sale",
    conditions: [{ field: "discount_percent", operator: "gte", value: 10 }],
    position: "top-left",
    shape: "pill",
    text: "-{discount_percent}%",
  },
  {
    code: "pdp",
    placements: ["product"],
    position: "bottom-right",
    text: "Free shipping",
  },
  { code: "evil", priority: 5, text: "<img src=x onerror=alert(1)>" },
];

async function freshKit() {
  vi.resetModules();
  return import("../../storefront/scripts/product-labels.js");
}

describe("storefront kit", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("draws labels as text over the host, once per call", async () => {
    const kit = await freshKit();
    kit.initProductLabels({ rules: RULES });
    const host = document.createElement("a");
    await kit.appendLabels(host, product, "listing");
    await kit.appendLabels(host, product, "listing");
    expect(host.classList.contains("product-labels-host")).toBe(true);
    expect(host.querySelectorAll(".product-labels")).toHaveLength(1);
    const badges = [...host.querySelectorAll(".product-label")];
    expect(badges.map((b) => b.textContent)).toEqual([
      "-50%",
      "<img src=x onerror=alert(1)>",
    ]);
    expect(host.querySelector("img")).toBeNull();
    expect(badges[0].className).toContain("product-label--pill");
    expect(badges[0].style.getPropertyValue("--product-label-background")).toBe(
      "#d0021b",
    );
    expect(
      host.querySelector(".product-labels__corner--top-left"),
    ).not.toBeNull();
  });

  test("uses placement to pick rules", async () => {
    const kit = await freshKit();
    kit.initProductLabels({ rules: RULES });
    const labels = await kit.getProductLabels(product, "product");
    expect(labels.map((l) => l.code)).toContain("pdp");
    expect(await kit.getProductLabels(null)).toEqual([]);
    await kit.appendLabels(null, product);
  });

  test("fetches rules once, sends the store view and caches them", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ enabled: true, maxPerPosition: 1, rules: RULES }),
      ok: true,
    }));
    vi.stubGlobal("fetch", fetchMock);
    let kit = await freshKit();
    kit.initProductLabels({
      endpoint: "https://example.test/rules",
      storeView: "default",
    });
    await kit.getProductLabels(product);
    await kit.getProductLabels(product);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://example.test/rules?store=default",
    );

    kit = await freshKit();
    kit.initProductLabels({
      endpoint: "https://example.test/rules",
      storeView: "default",
    });
    const labels = await kit.getProductLabels(product);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(labels).toHaveLength(1);
  });

  test("shows no labels when the feed fails, is off or has no endpoint", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503 })),
    );
    let kit = await freshKit();
    kit.initProductLabels({ endpoint: "/rules" });
    expect(await kit.getProductLabels(product)).toEqual([]);
    expect(warn).toHaveBeenCalled();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ enabled: false, rules: RULES }),
        ok: true,
      })),
    );
    kit = await freshKit();
    kit.initProductLabels({ endpoint: "/rules-off" });
    expect(await kit.getProductLabels(product)).toEqual([]);

    kit = await freshKit();
    expect(await kit.getProductLabels(product)).toEqual([]);
    const host = document.createElement("div");
    await kit.appendLabels(host, product);
    expect(host.children).toHaveLength(0);
  });

  test("renderLabels returns null for no labels", async () => {
    const kit = await freshKit();
    expect(kit.renderLabels([])).toBeNull();
  });
});
