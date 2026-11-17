# Architecture

```text
 Commerce Admin                         App Builder (I/O Runtime)                 Storefront (EDS)
 ┌─────────────────────────┐            ┌──────────────────────────────┐          ┌──────────────────────────┐
 │ Product Labels page     │  IMS auth  │ ProductLabelsAdmin/*         │          │ product-labels.js        │
 │ (Admin UI SDK, React    ├───────────►│ rules-list, rule-save,       │          │  initProductLabels()     │
 │  Spectrum 2)            │            │ rule-delete, lookups         │          │  appendLabels(host, p)   │
 │  └ live preview ────────┼──┐         └──────────────┬───────────────┘          └───────┬──────────────────┘
 └─────────────────────────┘  │                        │ App Builder Database             │ GET ?store=<view>
                              │                        ▼ (label_rules)                    │ (public, cached)
                              │         ┌──────────────────────────────┐                  │
                              │         │ product-labels/rules         │◄─────────────────┘
                              │         │ publicRules(): enabled,      │
                              │         │ valid, unexpired, no Admin   │
                              │         │ fields; Cache-Control        │
                              │         └──────────────────────────────┘
                              │
                              └── product-labels-engine.js  (one module, imported by all three)
```

## Why labels are worked out in the browser

The storefront drop-ins already load each product's prices, stock and attributes from Catalog Service. Evaluating the rules there means:

- **no per-product server calls**: one small, cacheable rules request per page (and per browser tab, thanks to `sessionStorage`);
- **no Commerce writes**: labels don't need product attributes, indexers or reindexing, which ACCS doesn't let you customise;
- **prices match what the shopper sees**: discounts follow the shopper's customer group and store view, because they come from the same Catalog Service response as the price on the card;
- **scheduled labels switch on time**: the feed sends rules that haven't started yet, and the browser checks the dates.

The trade-off is that the rules are public. They contain only what shoppers see anyway (text, colors and the conditions behind them); the Admin `name` and timestamps are stripped.

## One engine

`storefront/scripts/product-labels-engine.js` is plain ES2022 with no imports. The actions and the Admin page import it as `#engine` (a `package.json` subpath import), so validation, the Admin preview and the storefront always agree. It reads products from:

- the **PDP drop-in** (`prices.final.amount`, `inStock`, `attributes[].id/name`),
- the **Product Discovery drop-in** and Catalog Service (`price.final.amount.value`, `priceRange.minimum`, `lowStock`, `attributes[].name`),
- plain objects (`finalPrice`, `regularPrice`, `attributes: { code: value }`).

## Safety

- Label text is rendered with `textContent`; rules containing `<` or `>` are rejected on save.
- Colors must be hex; anything else falls back to the default, so a rule can't inject CSS.
- The public feed validates the `store` parameter, returns only valid rules, and logs details server-side while answering errors with a generic message.
- The kit never throws into the page: a failed feed shows no labels.
