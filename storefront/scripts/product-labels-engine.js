/**
 * Product Labels rule engine.
 *
 * One dependency-free module shared by the storefront kit (it runs in the buyer's browser), the
 * Admin page preview and the App Builder actions (validation and the public rules feed). Keep it
 * free of DOM and Node APIs so it runs in all three.
 *
 * A rule decides whether a product gets a label, and how the label looks:
 *
 *   {
 *     code: "sale",                  unique id, lowercase letters, digits, - and _
 *     name: "Sale badge",            Admin name
 *     enabled: true,
 *     priority: 10,                  lower runs first
 *     text: "-{discount_percent}%",  plain text with {tokens}; never HTML
 *     position: "top-left",          top-left | top-right | bottom-left | bottom-right
 *     shape: "rectangle",            rectangle | pill | circle | ribbon
 *     background: "#d0021b",         #rgb or #rrggbb
 *     color: "#ffffff",
 *     placements: ["listing", "product"],
 *     storeViews: [],                store view codes; empty means all
 *     activeFrom: "", activeTo: "",  ISO dates (YYYY-MM-DD or full timestamps); empty means open
 *     match: "all",                  all | any
 *     conditions: [{ field: "discount_percent", operator: "gte", value: 10 }],
 *     stopFurther: false             true: no lower-priority rule adds a label to this product
 *   }
 */

export const POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
export const SHAPES = ['rectangle', 'pill', 'circle', 'ribbon'];
export const PLACEMENTS = ['listing', 'product'];
export const MATCH_MODES = ['all', 'any'];

/** Product fields a condition can test. `attribute:<code>` tests any product attribute. */
export const FIELDS = {
  discount_amount: 'number',
  discount_percent: 'number',
  final_price: 'number',
  in_stock: 'boolean',
  low_stock: 'boolean',
  name: 'text',
  regular_price: 'number',
  sku: 'text',
  type: 'text',
};

export const ATTRIBUTE_PREFIX = 'attribute:';

export const OPERATORS = {
  boolean: ['is'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
  text: [
    'eq',
    'neq',
    'contains',
    'not_contains',
    'starts_with',
    'in',
    'not_in',
    'exists',
    'not_exists',
  ],
};

export const TOKENS = [
  'discount_percent',
  'discount_amount',
  'final_price',
  'regular_price',
  'sku',
  'name',
];

export const MAX_TEXT_LENGTH = 40;
export const DEFAULT_MAX_PER_POSITION = 2;

const CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/u;
const COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu;
const TOKEN_PATTERN = /\{([a-z_]+(?::[a-z0-9_]+)?)\}/giu;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/u;

function isAttributeField(field) {
  return (
    typeof field === 'string'
    && field.startsWith(ATTRIBUTE_PREFIX)
    && field.length > ATTRIBUTE_PREFIX.length
  );
}

/** The value type of a condition field: number, boolean or text. */
export function fieldType(field) {
  if (isAttributeField(field)) {
    return 'text';
  }
  return FIELDS[field];
}

function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** A price from either drop-in shape: { amount: { value } } (search) or { amount } (PDP). */
function priceValue(price, which = 'amount') {
  if (!price) {
    return null;
  }
  const { amount } = price;
  if (amount && typeof amount === 'object') {
    return toNumber(amount.value);
  }
  if (which === 'minimum' && price.minimumAmount !== undefined) {
    return toNumber(price.minimumAmount);
  }
  return toNumber(amount);
}

function priceCurrency(price) {
  if (!price) {
    return null;
  }
  if (price.amount && typeof price.amount === 'object') {
    return price.amount.currency ?? null;
  }
  return price.currency ?? null;
}

function readPrices(product) {
  // Product Discovery (search and listing): price for simple products, priceRange for complex.
  const simple = product.price;
  const range = product.priceRange?.minimum;
  // Product Details (PDP drop-in): prices.final / prices.regular.
  const pdp = product.prices;
  const final = priceValue(simple?.final)
    ?? priceValue(range?.final)
    ?? priceValue(pdp?.final, 'minimum')
    ?? toNumber(product.finalPrice);
  const regular = priceValue(simple?.regular)
    ?? priceValue(range?.regular)
    ?? priceValue(pdp?.regular, 'minimum')
    ?? toNumber(product.regularPrice);
  const currency = priceCurrency(simple?.final)
    ?? priceCurrency(range?.final)
    ?? priceCurrency(pdp?.final)
    ?? product.currency
    ?? null;
  return { currency, final, regular };
}

function readAttributes(attributes) {
  const map = {};
  if (Array.isArray(attributes)) {
    attributes.forEach((attribute) => {
      const code = attribute?.name ?? attribute?.code ?? attribute?.id;
      if (typeof code === 'string' && code) {
        map[code.toLowerCase()] = attribute.value;
      }
    });
  } else if (attributes && typeof attributes === 'object') {
    Object.entries(attributes).forEach(([code, value]) => {
      map[code.toLowerCase()] = value;
    });
  }
  return map;
}

/**
 * Turns a product from the PDP drop-in, the Product Discovery drop-in, Catalog Service GraphQL or
 * a plain object into the flat shape the conditions read.
 */
export function normaliseProduct(product = {}) {
  const { currency, final, regular } = readPrices(product);
  const hasDiscount = final !== null && regular !== null && regular > 0 && final < regular;
  const discountAmount = hasDiscount ? round(regular - final) : 0;
  const discountPercent = hasDiscount
    ? Math.floor(((regular - final) / regular) * 100)
    : 0;
  return {
    attributes: readAttributes(product.attributes),
    currency,
    discount_amount: discountAmount,
    discount_percent: discountPercent,
    final_price: final,
    in_stock: product.inStock !== false && product.in_stock !== false,
    low_stock: product.lowStock === true || product.low_stock === true,
    name: product.name ?? '',
    regular_price: regular,
    sku: product.sku ?? '',
    type: String(
      product.productType ?? product.typename ?? product.type ?? '',
    ).toLowerCase(),
  };
}

function readField(product, field) {
  if (isAttributeField(field)) {
    return product.attributes[field.slice(ATTRIBUTE_PREFIX.length).toLowerCase()];
  }
  return product[field];
}

function textOf(value) {
  if (value === undefined || value === null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map(textOf).join(',');
  }
  return String(value).trim().toLowerCase();
}

function listOf(value) {
  const items = Array.isArray(value) ? value : String(value ?? '').split(',');
  return items.map(textOf).filter(Boolean);
}

function valuesOf(actual) {
  return Array.isArray(actual) ? actual.map(textOf) : listOf(actual);
}

function isEmpty(value) {
  return (
    value === undefined
    || value === null
    || value === ''
    || (Array.isArray(value) && value.length === 0)
  );
}

function testNumber(actual, operator, expected) {
  const left = toNumber(actual);
  const right = toNumber(expected);
  if (left === null || right === null) {
    return false;
  }
  switch (operator) {
    case 'eq':
      return left === right;
    case 'neq':
      return left !== right;
    case 'gt':
      return left > right;
    case 'gte':
      return left >= right;
    case 'lt':
      return left < right;
    case 'lte':
      return left <= right;
    default:
      return false;
  }
}

function testBoolean(actual, expected) {
  const want = expected === true || ['1', 'true', 'yes'].includes(textOf(expected));
  return Boolean(actual) === want;
}

function testText(actual, operator, expected) {
  switch (operator) {
    case 'exists':
      return !isEmpty(actual);
    case 'not_exists':
      return isEmpty(actual);
    case 'eq':
      return valuesOf(actual).includes(textOf(expected)) || textOf(actual) === textOf(expected);
    case 'neq':
      return !(valuesOf(actual).includes(textOf(expected)) || textOf(actual) === textOf(expected));
    case 'contains':
      return textOf(actual).includes(textOf(expected));
    case 'not_contains':
      return !textOf(actual).includes(textOf(expected));
    case 'starts_with':
      return textOf(actual).startsWith(textOf(expected));
    case 'in': {
      const wanted = listOf(expected);
      return valuesOf(actual).some((value) => wanted.includes(value));
    }
    case 'not_in': {
      const wanted = listOf(expected);
      return !valuesOf(actual).some((value) => wanted.includes(value));
    }
    default:
      return false;
  }
}

/** True when one condition holds for a normalised product. Unknown fields never match. */
export function testCondition(product, condition = {}) {
  const type = fieldType(condition.field);
  if (!type) {
    return false;
  }
  const actual = readField(product, condition.field);
  if (type === 'number') {
    return testNumber(actual, condition.operator, condition.value);
  }
  if (type === 'boolean') {
    return testBoolean(actual, condition.value);
  }
  return testText(actual, condition.operator, condition.value);
}

function toTime(value, endOfDay) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const text = value.trim();
  // A bare date covers the whole day in the shopper's time zone.
  const time = DATE_ONLY.test(text)
    ? new Date(`${text}T${endOfDay ? '23:59:59.999' : '00:00:00'}`).getTime()
    : new Date(text).getTime();
  return Number.isNaN(time) ? null : time;
}

/** True when the rule's date window includes `now` (a Date or a timestamp). */
export function isActive(rule, now = Date.now()) {
  const time = now instanceof Date ? now.getTime() : now;
  const from = toTime(rule.activeFrom, false);
  const to = toTime(rule.activeTo, true);
  return (from === null || time >= from) && (to === null || time <= to);
}

function inScope(rule, { placement, storeView }) {
  const placements = Array.isArray(rule.placements) && rule.placements.length
    ? rule.placements
    : PLACEMENTS;
  if (placement && !placements.includes(placement)) {
    return false;
  }
  const stores = Array.isArray(rule.storeViews) ? rule.storeViews : [];
  return !(storeView && stores.length && !stores.includes(storeView));
}

/** True when the rule's conditions hold for the product. No conditions means every product. */
export function matchesRule(rule, product) {
  const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
  if (!conditions.length) {
    return true;
  }
  const test = (condition) => testCondition(product, condition);
  return rule.match === 'any' ? conditions.some(test) : conditions.every(test);
}

function formatMoney(value, currency, locale) {
  if (value === null || value === undefined) {
    return '';
  }
  if (!currency) {
    return String(round(value));
  }
  try {
    return new Intl.NumberFormat(locale, {
      currency,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
      style: 'currency',
    }).format(value);
  } catch {
    return `${round(value)} ${currency}`;
  }
}

/** Fills {tokens} in a label's text. The result is plain text; render it with textContent. */
export function renderText(template, product, { locale } = {}) {
  return String(template ?? '')
    .replace(TOKEN_PATTERN, (whole, rawToken) => {
      const token = rawToken.toLowerCase();
      if (token.startsWith(ATTRIBUTE_PREFIX)) {
        const value = product.attributes[token.slice(ATTRIBUTE_PREFIX.length)];
        return isEmpty(value) ? '' : String(value);
      }
      switch (token) {
        case 'discount_percent':
          return String(product.discount_percent);
        case 'discount_amount':
          return formatMoney(product.discount_amount, product.currency, locale);
        case 'final_price':
          return formatMoney(product.final_price, product.currency, locale);
        case 'regular_price':
          return formatMoney(product.regular_price, product.currency, locale);
        case 'sku':
          return product.sku;
        case 'name':
          return product.name;
        default:
          return whole;
      }
    })
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

function byPriority(a, b) {
  return (
    (toNumber(a.priority) ?? 0) - (toNumber(b.priority) ?? 0)
    || String(a.code).localeCompare(String(b.code))
  );
}

function safeColor(value, fallback) {
  return typeof value === 'string' && COLOR_PATTERN.test(value) ? value : fallback;
}

/**
 * The labels a product shows.
 *
 * @param {any} rawProduct a product in any supported shape
 * @param {any[]} [rules] label rules
 * @param {{placement?: string, storeView?: string, now?: Date|number,
 *   maxPerPosition?: number, locale?: string}} [context]
 *   placement is "listing" or "product"; maxPerPosition caps labels in one corner; locale formats
 *   money tokens
 * @returns {{code: string, text: string, position: string, shape: string,
 *   background: string, color: string}[]}
 */
export function labelsFor(rawProduct, rules = [], context = {}) {
  const product = normaliseProduct(rawProduct);
  const limit = toNumber(context.maxPerPosition) ?? DEFAULT_MAX_PER_POSITION;
  const perPosition = {};
  const labels = [];
  const ordered = rules
    .filter((rule) => rule && rule.enabled !== false)
    .filter((rule) => inScope(rule, context))
    .filter((rule) => isActive(rule, context.now ?? Date.now()))
    .sort(byPriority);

  // `some` stops at the first matching rule that has stopFurther set.
  ordered.some((rule) => {
    if (!matchesRule(rule, product)) {
      return false;
    }
    const position = POSITIONS.includes(rule.position) ? rule.position : 'top-left';
    const text = renderText(rule.text, product, context);
    if (text && (perPosition[position] ?? 0) < limit) {
      perPosition[position] = (perPosition[position] ?? 0) + 1;
      labels.push({
        background: safeColor(rule.background, '#1f1f1f'),
        code: rule.code,
        color: safeColor(rule.color, '#ffffff'),
        position,
        shape: SHAPES.includes(rule.shape) ? rule.shape : 'rectangle',
        text,
      });
    }
    return Boolean(rule.stopFurther);
  });
  return labels;
}

function validateCondition(condition, index) {
  const errors = [];
  const where = `condition ${index + 1}`;
  const type = fieldType(condition?.field);
  if (!type) {
    errors.push(`${where}: unknown field "${condition?.field}"`);
    return errors;
  }
  if (!OPERATORS[type].includes(condition.operator)) {
    errors.push(`${where}: operator "${condition.operator}" doesn't work with ${condition.field}`);
  }
  const needsValue = !['exists', 'not_exists'].includes(condition.operator);
  if (type === 'number' && needsValue && toNumber(condition.value) === null) {
    errors.push(`${where}: value must be a number`);
  }
  if (type === 'text' && needsValue && textOf(condition.value) === '') {
    errors.push(`${where}: value is required`);
  }
  return errors;
}

/** Problems with a rule, as messages for the Admin page. An empty list means the rule is valid. */
export function validateRule(rule) {
  if (!rule || typeof rule !== 'object') {
    return ['rule must be an object'];
  }
  const errors = [];
  if (typeof rule.code !== 'string' || !CODE_PATTERN.test(rule.code)) {
    errors.push(
      'code must start with a lowercase letter or digit and use only a-z, 0-9, - and _ (up to 64)',
    );
  }
  if (typeof rule.name !== 'string' || !rule.name.trim()) {
    errors.push('name is required');
  }
  if (typeof rule.text !== 'string' || !rule.text.trim()) {
    errors.push('text is required');
  } else if (rule.text.length > MAX_TEXT_LENGTH) {
    errors.push(`text must be ${MAX_TEXT_LENGTH} characters or fewer`);
  } else if (/[<>]/u.test(rule.text)) {
    errors.push("text can't contain < or >");
  }
  if (rule.position !== undefined && !POSITIONS.includes(rule.position)) {
    errors.push(`position must be one of ${POSITIONS.join(', ')}`);
  }
  if (rule.shape !== undefined && !SHAPES.includes(rule.shape)) {
    errors.push(`shape must be one of ${SHAPES.join(', ')}`);
  }
  ['background', 'color'].forEach((key) => {
    if (rule[key] !== undefined && rule[key] !== '' && !COLOR_PATTERN.test(rule[key])) {
      errors.push(`${key} must be a hex color such as #d0021b`);
    }
  });
  if (rule.match !== undefined && !MATCH_MODES.includes(rule.match)) {
    errors.push('match must be all or any');
  }
  if (rule.placements !== undefined) {
    if (!Array.isArray(rule.placements) || rule.placements.some((p) => !PLACEMENTS.includes(p))) {
      errors.push(`placements must be a list of ${PLACEMENTS.join(', ')}`);
    }
  }
  if (rule.storeViews !== undefined && !Array.isArray(rule.storeViews)) {
    errors.push('storeViews must be a list of store view codes');
  }
  if (rule.priority !== undefined && toNumber(rule.priority) === null) {
    errors.push('priority must be a number');
  }
  ['activeFrom', 'activeTo'].forEach((key) => {
    if (rule[key] && toTime(rule[key], false) === null) {
      errors.push(`${key} must be a date (YYYY-MM-DD)`);
    }
  });
  const from = toTime(rule.activeFrom, false);
  const to = toTime(rule.activeTo, true);
  if (from !== null && to !== null && from > to) {
    errors.push('activeFrom must be on or before activeTo');
  }
  if (rule.conditions !== undefined) {
    if (Array.isArray(rule.conditions)) {
      rule.conditions.forEach((condition, index) => {
        errors.push(...validateCondition(condition, index));
      });
    } else {
      errors.push('conditions must be a list');
    }
  }
  return errors;
}

const PUBLIC_FIELDS = [
  'code',
  'text',
  'position',
  'shape',
  'background',
  'color',
  'placements',
  'storeViews',
  'activeFrom',
  'activeTo',
  'match',
  'conditions',
  'priority',
  'stopFurther',
];

/**
 * The rules the storefront needs: enabled, valid, not yet expired, and only the fields the
 * engine reads (no Admin names or timestamps).
 */
export function publicRules(rules = [], { now = Date.now(), storeView } = {}) {
  const time = now instanceof Date ? now.getTime() : now;
  return rules
    .filter((rule) => rule && rule.enabled !== false)
    .filter((rule) => validateRule(rule).length === 0)
    .filter((rule) => {
      const to = toTime(rule.activeTo, true);
      return to === null || to >= time;
    })
    .filter((rule) => inScope(rule, { storeView }))
    .sort(byPriority)
    .map((rule) => Object.fromEntries(
      PUBLIC_FIELDS.filter((key) => rule[key] !== undefined).map((key) => [key, rule[key]]),
    ));
}
