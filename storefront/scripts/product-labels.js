/**
 * Product Labels storefront kit for Edge Delivery Services.
 *
 * Copy this file, product-labels-engine.js and ../styles/product-labels.css into your storefront
 * (scripts/ and styles/), then:
 *
 *   import { initProductLabels, appendLabels } from '../../scripts/product-labels.js';
 *
 *   initProductLabels({ endpoint: '<your product-labels/rules action URL>', storeView: 'default' });
 *
 *   // Product list (Product Discovery drop-in), inside the ProductImage slot:
 *   appendLabels(anchorWrapper, ctx.product, 'listing');
 *
 *   // Product page (PDP drop-in): see storefront/README.md for the gallery hook.
 *
 * Labels are positioned over the element you pass. The rules are fetched once per page and kept
 * in sessionStorage for a few minutes, so listing pages make one request at most.
 * Every label is plain text (textContent) with validated colors, so a rule can't inject markup.
 */

import { labelsFor } from './product-labels-engine.js';

const STORAGE_KEY = 'product-labels:rules';
const DEFAULT_CACHE_SECONDS = 300;

let settings = {
  cacheSeconds: DEFAULT_CACHE_SECONDS,
  endpoint: '',
  locale: undefined,
  storeView: '',
};
let rulesPromise = null;

function readCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (
      cached
      && cached.endpoint === settings.endpoint
      && cached.storeView === settings.storeView
      && cached.expiresAt > Date.now()
    ) {
      return cached.payload;
    }
  } catch {
    // Storage can be unavailable (private mode, blocked cookies): fetch instead.
  }
  return null;
}

function writeCache(payload) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      endpoint: settings.endpoint,
      expiresAt: Date.now() + settings.cacheSeconds * 1000,
      payload,
      storeView: settings.storeView,
    }));
  } catch {
    // Ignore: the next page fetches again.
  }
}

async function fetchRules() {
  const cached = readCache();
  if (cached) {
    return cached;
  }
  const url = new URL(settings.endpoint, window.location.href);
  if (settings.storeView) {
    url.searchParams.set('store', settings.storeView);
  }
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Product labels unavailable (${response.status})`);
  }
  const body = await response.json();
  const payload = {
    enabled: body.enabled !== false,
    maxPerPosition: body.maxPerPosition,
    rules: Array.isArray(body.rules) ? body.rules : [],
  };
  writeCache(payload);
  return payload;
}

/**
 * Sets where the rules come from. Call it once, before the first appendLabels.
 * @param {object} options
 * @param {string} options.endpoint URL of the app's public `product-labels/rules` action
 * @param {string} [options.storeView] store view code, to load only that view's rules
 * @param {string} [options.locale] locale for money tokens; defaults to the page language
 * @param {number} [options.cacheSeconds] how long to keep rules in sessionStorage
 * @param {object[]} [options.rules] rules to use instead of fetching (tests, demos)
 */
export function initProductLabels(options = {}) {
  settings = {
    ...settings,
    ...options,
    locale: options.locale || document.documentElement.lang || undefined,
  };
  rulesPromise = Array.isArray(options.rules)
    ? Promise.resolve({ enabled: true, maxPerPosition: options.maxPerPosition, rules: options.rules })
    : null;
}

/** The label rules for this page: fetched once, then shared. Resolves to no rules on error. */
export function loadLabelRules() {
  if (!rulesPromise) {
    if (!settings.endpoint) {
      rulesPromise = Promise.resolve({ enabled: false, rules: [] });
    } else {
      rulesPromise = fetchRules().catch((error) => {
        // Labels are decoration: never break the product list over them.
        // eslint-disable-next-line no-console
        console.warn(error.message);
        return { enabled: false, rules: [] };
      });
    }
  }
  return rulesPromise;
}

/** Builds the label elements for a product. Returns null when the product has no labels. */
export function renderLabels(labels) {
  if (!labels.length) {
    return null;
  }
  const root = document.createElement('div');
  root.className = 'product-labels';
  const corners = {};
  labels.forEach((label) => {
    if (!corners[label.position]) {
      const corner = document.createElement('div');
      corner.className = `product-labels__corner product-labels__corner--${label.position}`;
      corners[label.position] = corner;
      root.append(corner);
    }
    const badge = document.createElement('span');
    badge.className = `product-label product-label--${label.shape} product-label--${label.code}`;
    badge.textContent = label.text;
    badge.style.setProperty('--product-label-background', label.background);
    badge.style.setProperty('--product-label-color', label.color);
    corners[label.position].append(badge);
  });
  return root;
}

/** The labels a product gets on this page, once the rules have loaded. */
export async function getProductLabels(product, placement = 'listing') {
  const { enabled, maxPerPosition, rules } = await loadLabelRules();
  if (!enabled || !product) {
    return [];
  }
  return labelsFor(product, rules, {
    locale: settings.locale,
    maxPerPosition,
    placement,
    storeView: settings.storeView,
  });
}

/**
 * Draws a product's labels over `host` (an image wrapper). Safe to call more than once: it
 * replaces the labels it drew before, so it also works when the PDP swaps variants.
 * @param {HTMLElement} host element to position the labels over
 * @param {object} product product from a drop-in (PDP or Product Discovery) or Catalog Service
 * @param {"listing"|"product"} [placement]
 */
export async function appendLabels(host, product, placement = 'listing') {
  if (!host) {
    return;
  }
  host.classList.add('product-labels-host');
  const labels = await getProductLabels(product, placement);
  host.querySelectorAll(':scope > .product-labels').forEach((old) => old.remove());
  const element = renderLabels(labels);
  if (element) {
    host.append(element);
  }
}
