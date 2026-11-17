# Storefront kit (Edge Delivery Services)

Draws Product Labels over product images in an Edge Delivery Services storefront that uses the Commerce drop-ins.

| File | Copy to | What it does |
|---|---|---|
| `scripts/product-labels-engine.js` | `scripts/` | The rules engine (no dependencies). |
| `scripts/product-labels.js` | `scripts/` | Loads the rules feed and draws labels. |
| `styles/product-labels.css` | `styles/` | Label layout and shapes. |

`product-labels-engine.d.ts` is only for the Admin page's TypeScript; don't copy it. Everything you commit to an EDS repository is served, so leave out what you don't use.

## 1. Point the kit at your rules feed

Add the `product-labels/rules` action URL (printed by `aio app deploy`) to your storefront config, for example in `config.json` under `public.default`:

```json
"product-labels-endpoint": "https://<namespace>.adobeioruntime.net/api/v1/web/product-labels/rules"
```

Then initialize the kit once per page, for example in `scripts/initializers/index.js` or at the top of the blocks below:

```js
import { getConfigValue, getHeaders } from '@dropins/tools/lib/aem/configs.js';
import { initProductLabels } from '../../scripts/product-labels.js';

initProductLabels({
  endpoint: getConfigValue('product-labels-endpoint'),
  storeView: getHeaders('cs')['Magento-Store-View-Code'],
});
```

Options:

| Option | Default | Meaning |
|---|---|---|
| `endpoint` | — | The rules feed URL. Without it the kit shows no labels. |
| `storeView` | — | Sends `?store=<code>` so the feed returns only that store view's rules. |
| `locale` | `<html lang>` | Locale for money tokens such as `{discount_amount}`. |
| `cacheSeconds` | `300` | How long a browser tab keeps the rules in `sessionStorage`. |
| `rules` | — | Use these rules instead of fetching (tests and demos). |

Load the stylesheet where the labels appear, for example with `loadCSS` in the blocks below, or import it from `styles/styles.css`:

```js
import { loadCSS } from '../../scripts/aem.js';
await loadCSS(`${window.hlx.codeBasePath}/styles/product-labels.css`);
```

## 2. Product lists and search (Product Discovery drop-in)

In `blocks/product-list-page/product-list-page.js`, in the `SearchResults` `ProductImage` slot, call `appendLabels` with the element that wraps the image:

```js
import { appendLabels } from '../../scripts/product-labels.js';

// ...
provider.render(SearchResults, {
  slots: {
    ProductImage: (ctx) => {
      const { product, defaultImageProps } = ctx;
      const anchorWrapper = document.createElement('a');
      anchorWrapper.href = getProductLink(product.urlKey, product.sku);

      tryRenderAemAssetsImage(ctx, { alias: product.sku, imageProps: defaultImageProps, wrapper: anchorWrapper });

      appendLabels(anchorWrapper, product, 'listing');
    },
  },
});
```

The same call works in product carousels and recommendations: pass the image wrapper and the product.

## 3. Product page (PDP drop-in)

In `blocks/product-details/product-details.js`, draw the labels over the gallery whenever the product data changes (including variant selection):

```js
import { events } from '@dropins/tools/event-bus.js';
import { appendLabels } from '../../scripts/product-labels.js';

// After the gallery containers ($gallery, $galleryMobile) exist:
const drawLabels = (product) => {
  appendLabels($gallery, product, 'product');
  appendLabels($galleryMobile, product, 'product');
};
events.on('pdp/data', drawLabels, { eager: true });
```

`appendLabels` replaces the labels it drew before, so calling it again on each `pdp/data` is safe.

The desktop gallery shows a thumbnail column to the left of the main image, so the labels would sit over the thumbnails. The image carousel scrolls, so don't draw inside it; shift the label layer instead (86px fits the boilerplate's gallery):

```css
.product-details__gallery:has(.pdp-carousel__controls__container--thumbnailsColumn) > .product-labels {
  left: 86px;
}
```

## Styling

Labels use these classes, so a theme can restyle them without touching the kit:

| Class | On |
|---|---|
| `.product-labels-host` | The element you passed (gets `position: relative`). |
| `.product-labels__corner--top-left` (and the other corners) | Each corner's stack. |
| `.product-label`, `.product-label--pill` (shape), `.product-label--<code>` (rule) | Each label. |

```css
.product-labels { --product-labels-inset: 12px; --product-labels-gap: 6px; }
.product-label { font-size: 11px; text-transform: uppercase; }
.product-label--black-friday { font-weight: 800; }
```

Each label's colors come from the rule as `--product-label-background` and `--product-label-color`.

## How it behaves

- **One request per tab:** the first `appendLabels` fetches the feed; later calls and pages reuse it from `sessionStorage` for `cacheSeconds`.
- **Never breaks the page:** if the feed fails, the kit logs a warning and shows no labels.
- **No layout shift:** labels are absolutely positioned over the image.
- **Inline hosts work:** an inline element such as the product list's image link is made `display: block`, so the labels cover the whole image.
- **Safe text:** labels are plain text (`textContent`) with validated hex colors.

## Try it on a storefront

A working integration lives in a test copy of the commerce boilerplate: the kit files, `scripts/initializers/product-labels.js` (which falls back to a static `product-labels-rules.json` until the rules feed is deployed), one `appendLabels` call in each of `blocks/product-list-page/product-list-page.js` and `blocks/product-details/product-details.js`, and the gallery rule above.

## Try it locally

`npm run demo` in the app repository serves `demo/` at <http://localhost:4310>: it loads products from your Catalog Service endpoint (copy `demo/config.example.json` to `demo/config.json`) and labels them with `demo/rules.json`.
