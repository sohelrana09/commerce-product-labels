# Changelog

## Unreleased

- **Storefront kit fixes, found on a real EDS storefront:** the scripts now pass the commerce boilerplate's ESLint (Airbnb) rules as the docs promised, with loops rewritten as array methods and no behaviour change. Inline hosts such as the product list's image link are made `display: block`, so labels sit over the image instead of on its bottom edge. The storefront guide shows how to keep product page labels off the thumbnail column.
- **Admin preview:** `npm run admin:preview` serves the real Admin page at http://localhost:4320/preview.html without Commerce, App Builder or an Adobe account. Rules are kept in the browser's local storage, seeded with the examples, and checked with the same validation as the server. The page now reaches its backend through a `LabelsApi` context, so the preview swaps in an in-browser store.

## v0.1.0 (2026-11-17)

The first release: rule-based product labels for Adobe Commerce as a Cloud Service and PaaS, built as an App Builder app.

- **Rules engine:** one dependency-free module (`storefront/scripts/product-labels-engine.js`) shared by the storefront, the Admin preview and the actions. Conditions on discount percent and amount, final and regular price, stock, low stock, SKU, name, product type and any product attribute, combined with "all" or "any"; priorities, stop-further and a cap per corner; store views, placements (product lists or the product page) and start and end dates; text tokens such as `{discount_percent}` and `{discount_amount}` ([docs/rules.md](docs/rules.md)).
- **Rules feed:** the public `product-labels/rules` action serves the enabled, valid, unexpired rules for a store view, without Admin-only fields, with a `Cache-Control` the merchant sets.
- **Admin page:** list, start from examples, edit and delete labels in the Commerce Admin (Admin UI SDK, React Spectrum 2), with a live preview drawn with the storefront's CSS and a **Test a product** view.
- **Settings:** a master switch, the most labels in one corner and the feed's cache time, in App Management.
- **Rules in code:** `LABEL_RULES` serves rules from `.env` instead of the database.
- **Storefront kit:** `initProductLabels`, `appendLabels`, `getProductLabels` and `renderLabels`, and the label stylesheet, with guides for the Product Discovery and Product Details drop-ins ([storefront/README.md](storefront/README.md)).
- **Demo:** `npm run demo` labels real Catalog Service products locally.
