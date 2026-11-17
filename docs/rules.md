# Label rules

A rule decides whether a product gets a label, and how that label looks. The Admin page edits the same JSON you can put in `LABEL_RULES`.

```json
{
  "code": "sale-percent",
  "name": "Sale: percent off",
  "enabled": true,
  "priority": 10,
  "text": "-{discount_percent}%",
  "position": "top-left",
  "shape": "rectangle",
  "background": "#d0021b",
  "color": "#ffffff",
  "placements": ["listing", "product"],
  "storeViews": [],
  "activeFrom": "2026-11-27",
  "activeTo": "2026-12-01",
  "match": "all",
  "conditions": [
    { "field": "discount_percent", "operator": "gte", "value": 10 }
  ],
  "stopFurther": false
}
```

## Fields

| Field | Required | Meaning |
|---|---|---|
| `code` | Yes | Unique id: lowercase letters, digits, `-` and `_`, up to 64. Also a CSS class on the label: `product-label--<code>`. |
| `name` | Yes | Admin name. Shoppers never see it, and the feed doesn't send it. |
| `enabled` | No | `false` switches the rule off. Default `true` (the Admin page creates rules switched off). |
| `priority` | No | Lower numbers run first and stack first in a corner. Default `0`; ties go by `code`. |
| `text` | Yes | What shoppers see, up to 40 characters, with [tokens](#tokens). Plain text only: `<` and `>` are rejected, and the kit renders it with `textContent`. |
| `position` | No | `top-left` (default), `top-right`, `bottom-left` or `bottom-right`. |
| `shape` | No | `rectangle` (default), `pill`, `circle` or `ribbon`. |
| `background`, `color` | No | Hex colors (`#rgb` or `#rrggbb`). Defaults `#1f1f1f` and `#ffffff`. |
| `placements` | No | Where the label shows: `listing` (product lists, search, carousels) and/or `product` (product page). Empty or missing means both. |
| `storeViews` | No | Store view codes. Empty means every store view. |
| `activeFrom`, `activeTo` | No | Dates (`YYYY-MM-DD`) or full ISO timestamps. A bare date covers the whole day in the shopper's time zone. Empty means open-ended. |
| `match` | No | `all` (default): every condition must hold. `any`: one is enough. |
| `conditions` | No | See below. No conditions means every product gets the label. |
| `stopFurther` | No | When `true` and this label shows, rules with a higher priority number add nothing to this product. Use it for "Sold out". |

The storefront also caps labels per corner with the **Most labels in one corner** setting (default 2). Rules that run first win the space.

## Conditions

```json
{ "field": "attribute:brand", "operator": "in", "value": "acme, globex" }
```

| Field | Type | Meaning |
|---|---|---|
| `discount_percent` | number | Whole percent off the regular price, rounded down (so a label never overstates the discount). `0` without a discount. |
| `discount_amount` | number | Regular price minus final price. |
| `final_price` | number | The price the shopper pays. For products with options, the lowest price. |
| `regular_price` | number | The price before discounts. For products with options, the lowest. |
| `in_stock` | boolean | Catalog Service `inStock`. |
| `low_stock` | boolean | Catalog Service `lowStock` (the "Only X left" threshold in Commerce). |
| `sku`, `name` | text | The product's SKU and name. |
| `type` | text | The product type from the drop-in, for example `simpleproductview`, `complexproductview` or `simple`. Use `contains`. |
| `attribute:<code>` | text | Any product attribute the storefront loads, by attribute code. In Catalog Service, the attribute must be visible on the storefront. |

| Type | Operators |
|---|---|
| number | `eq`, `neq`, `gt`, `gte`, `lt`, `lte` |
| boolean | `is` (value `true` or `false`) |
| text | `eq`, `neq`, `contains`, `not_contains`, `starts_with`, `in`, `not_in` (comma-separated list), `exists`, `not_exists` |

Text comparisons ignore case and surrounding spaces. For multi-value attributes, `eq` and `in` match when any value matches.

## Tokens

| Token | Becomes |
|---|---|
| `{discount_percent}` | `25` |
| `{discount_amount}` | `$25` (in the product's currency and the page's locale) |
| `{final_price}`, `{regular_price}` | `$75`, `$100` |
| `{sku}`, `{name}` | The product's SKU and name |
| `{attribute:<code>}` | The attribute's value, or nothing |

Unknown tokens stay as typed. A label whose text ends up empty (for example only `{attribute:x}` on a product without `x`) isn't shown.

## Examples

**Sold out, nothing else**

```json
{ "code": "sold-out", "name": "Sold out", "text": "Sold out", "position": "top-right", "shape": "pill",
  "priority": 0, "stopFurther": true,
  "conditions": [{ "field": "in_stock", "operator": "is", "value": false }] }
```

**Black Friday, on discounted products in two brands, product lists only**

```json
{ "code": "black-friday", "name": "Black Friday", "text": "Black Friday -{discount_percent}%",
  "background": "#000000", "color": "#ffd400", "placements": ["listing"],
  "activeFrom": "2026-11-27", "activeTo": "2026-11-30",
  "conditions": [
    { "field": "discount_percent", "operator": "gte", "value": 1 },
    { "field": "attribute:brand", "operator": "in", "value": "acme, globex" }
  ] }
```

**New arrivals** (with a yes/no `is_new` attribute visible on the storefront)

```json
{ "code": "new", "name": "New", "text": "New", "shape": "ribbon", "position": "top-right",
  "conditions": [{ "field": "attribute:is_new", "operator": "in", "value": "1, yes, true" }] }
```
