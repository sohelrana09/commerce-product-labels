import { ATTRIBUTE_PREFIX, FIELDS, OPERATORS } from "#engine";

import type { Condition, LabelRule, SampleProduct } from "./types.ts";

export const POSITION_LABELS = {
  "bottom-left": "Bottom left",
  "bottom-right": "Bottom right",
  "top-left": "Top left",
  "top-right": "Top right",
} as const;

export const SHAPE_LABELS = {
  circle: "Circle",
  pill: "Pill",
  rectangle: "Rectangle",
  ribbon: "Ribbon",
} as const;

export const PLACEMENT_LABELS = {
  listing: "Product lists and search",
  product: "Product page",
} as const;

export const FIELD_LABELS: Record<string, string> = {
  attribute: "Product attribute",
  discount_amount: "Discount amount",
  discount_percent: "Discount percent",
  final_price: "Final price",
  in_stock: "In stock",
  low_stock: "Low stock",
  name: "Product name",
  regular_price: "Regular price",
  sku: "SKU",
  type: "Product type",
};

export const OPERATOR_LABELS: Record<string, string> = {
  contains: "contains",
  eq: "is",
  exists: "has any value",
  gt: "is more than",
  gte: "is at least",
  in: "is one of",
  is: "is",
  lt: "is less than",
  lte: "is at most",
  neq: "is not",
  not_contains: "doesn't contain",
  not_exists: "has no value",
  not_in: "is not one of",
  starts_with: "starts with",
};

export const TOKEN_HELP =
  "Tokens: {discount_percent}, {discount_amount}, {final_price}, {regular_price}, {sku}, {name}, {attribute:<code>}.";

/** The field picker's key for a condition: attribute conditions share one entry. */
export function fieldKey(field: string): string {
  return field.startsWith(ATTRIBUTE_PREFIX) ? "attribute" : field;
}

export function attributeCode(field: string): string {
  return field.startsWith(ATTRIBUTE_PREFIX)
    ? field.slice(ATTRIBUTE_PREFIX.length)
    : "";
}

export function fieldTypeOf(key: string): "number" | "boolean" | "text" {
  return key === "attribute"
    ? "text"
    : ((FIELDS as Record<string, "number" | "boolean" | "text">)[key] ??
        "text");
}

export function operatorsFor(key: string): string[] {
  return (OPERATORS as Record<string, string[]>)[fieldTypeOf(key)];
}

export function needsValue(operator: string): boolean {
  return operator !== "exists" && operator !== "not_exists";
}

export function newCondition(): Condition {
  return { field: "discount_percent", operator: "gte", value: 10 };
}

export function toCode(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 64);
}

export function emptyRule(): LabelRule {
  return {
    background: "#d0021b",
    code: "",
    color: "#ffffff",
    conditions: [],
    enabled: false,
    match: "all",
    name: "",
    placements: ["listing", "product"],
    position: "top-left",
    priority: 10,
    shape: "rectangle",
    stopFurther: false,
    storeViews: [],
    text: "",
  };
}

/** A deep copy the editor can change without touching the list's copy. */
export function editableCopy(rule: LabelRule): LabelRule {
  const { updatedAt: _updatedAt, ...rest } = structuredClone(rule);
  return { ...emptyRule(), ...rest };
}

/** Drops empty optional fields before saving, so stored rules stay tidy. */
export function cleanRule(rule: LabelRule): LabelRule {
  const { activeFrom, activeTo, ...rest } = rule;
  return {
    ...rest,
    ...(activeFrom ? { activeFrom } : {}),
    ...(activeTo ? { activeTo } : {}),
    conditions: (rule.conditions ?? []).map((condition) =>
      needsValue(condition.operator)
        ? condition
        : { field: condition.field, operator: condition.operator },
    ),
    name: rule.name.trim(),
    text: rule.text.trim(),
  };
}

export function describeConditions(rule: LabelRule): string {
  const conditions = rule.conditions ?? [];
  if (!conditions.length) {
    return "Every product";
  }
  const parts = conditions.map((condition) => {
    const key = fieldKey(condition.field);
    const field =
      key === "attribute"
        ? attributeCode(condition.field)
        : (FIELD_LABELS[key] ?? key);
    const operator = OPERATOR_LABELS[condition.operator] ?? condition.operator;
    if (!needsValue(condition.operator)) {
      return `${field} ${operator}`;
    }
    if (typeof condition.value === "boolean") {
      return `${field} ${operator} ${condition.value ? "yes" : "no"}`;
    }
    return `${field} ${operator} ${String(condition.value ?? "")}`;
  });
  return parts.join(rule.match === "any" ? " or " : " and ");
}

export function describeWhen(rule: LabelRule): string {
  if (rule.activeFrom && rule.activeTo) {
    return `${rule.activeFrom} to ${rule.activeTo}`;
  }
  if (rule.activeFrom) {
    return `From ${rule.activeFrom}`;
  }
  if (rule.activeTo) {
    return `Until ${rule.activeTo}`;
  }
  return "Always";
}

export const DEFAULT_SAMPLE: SampleProduct = {
  attributes: "is_new=1\nbrand=Acme",
  currency: "USD",
  finalPrice: 79,
  inStock: true,
  lowStock: false,
  name: "Sample product",
  regularPrice: 99,
  sku: "SAMPLE-1",
};

/** The sample product in the plain shape the engine reads. */
export function sampleToProduct(sample: SampleProduct) {
  const attributes: Record<string, string> = {};
  for (const line of sample.attributes.split("\n")) {
    const index = line.indexOf("=");
    if (index > 0) {
      attributes[line.slice(0, index).trim()] = line.slice(index + 1).trim();
    }
  }
  return {
    attributes,
    currency: sample.currency,
    finalPrice: sample.finalPrice,
    inStock: sample.inStock,
    lowStock: sample.lowStock,
    name: sample.name,
    regularPrice: sample.regularPrice,
    sku: sample.sku,
  };
}
