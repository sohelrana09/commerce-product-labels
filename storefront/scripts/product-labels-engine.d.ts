// Types for product-labels-engine.js, used by the Admin page. Storefronts don't need this file.

export type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type Shape = "rectangle" | "pill" | "circle" | "ribbon";
export type Placement = "listing" | "product";
export type FieldType = "number" | "boolean" | "text";

export type Condition = {
  field: string;
  operator: string;
  value?: string | number | boolean | string[];
};

export type Rule = {
  code: string;
  name?: string;
  enabled?: boolean;
  priority?: number;
  text: string;
  position?: Position;
  shape?: Shape;
  background?: string;
  color?: string;
  placements?: Placement[];
  storeViews?: string[];
  activeFrom?: string;
  activeTo?: string;
  match?: "all" | "any";
  conditions?: Condition[];
  stopFurther?: boolean;
};

export type Label = {
  code: string;
  text: string;
  position: Position;
  shape: Shape;
  background: string;
  color: string;
};

export type NormalisedProduct = {
  attributes: Record<string, unknown>;
  currency: string | null;
  discount_amount: number;
  discount_percent: number;
  final_price: number | null;
  in_stock: boolean;
  low_stock: boolean;
  name: string;
  regular_price: number | null;
  sku: string;
  type: string;
};

export type LabelContext = {
  placement?: Placement;
  storeView?: string;
  now?: Date | number;
  maxPerPosition?: number;
  locale?: string;
};

export const POSITIONS: Position[];
export const SHAPES: Shape[];
export const PLACEMENTS: Placement[];
export const MATCH_MODES: ("all" | "any")[];
export const FIELDS: Record<string, FieldType>;
export const ATTRIBUTE_PREFIX: string;
export const OPERATORS: Record<FieldType, string[]>;
export const TOKENS: string[];
export const MAX_TEXT_LENGTH: number;
export const DEFAULT_MAX_PER_POSITION: number;

export function fieldType(field: string): FieldType | undefined;
export function normaliseProduct(product?: unknown): NormalisedProduct;
export function testCondition(product: NormalisedProduct, condition?: Condition): boolean;
export function isActive(rule: Partial<Rule>, now?: Date | number): boolean;
export function matchesRule(rule: Partial<Rule>, product: NormalisedProduct): boolean;
export function renderText(
  template: string,
  product: NormalisedProduct,
  options?: { locale?: string },
): string;
export function labelsFor(product: unknown, rules?: Partial<Rule>[], context?: LabelContext): Label[];
export function validateRule(rule: unknown): string[];
export function publicRules(
  rules?: Partial<Rule>[],
  options?: { now?: Date | number; storeView?: string },
): Rule[];
