import { appendLabels, initProductLabels } from '/storefront/scripts/product-labels.js';

const QUERY = `query Demo($phrase: String!, $size: Int) {
  productSearch(phrase: $phrase, page_size: $size) {
    items {
      productView {
        __typename sku name inStock lowStock
        images(roles: ["small_image"]) { url }
        attributes { name value }
        ... on SimpleProductView {
          price { final { amount { value currency } } regular { amount { value currency } } }
        }
        ... on ComplexProductView {
          priceRange {
            minimum { final { amount { value currency } } regular { amount { value currency } } }
          }
        }
      }
    }
  }
}`;

const SAMPLES = [
  { sku: 'S-1', name: 'Trail runner (25% off)', inStock: true, lowStock: true, price: { final: { amount: { value: 89.25, currency: 'USD' } }, regular: { amount: { value: 119, currency: 'USD' } } } },
  { sku: 'S-2', name: 'Rain jacket (sold out)', inStock: false, lowStock: false, price: { final: { amount: { value: 140, currency: 'USD' } }, regular: { amount: { value: 140, currency: 'USD' } } } },
  { sku: 'S-3', name: 'Merino hoodie (premium)', inStock: true, lowStock: false, price: { final: { amount: { value: 160, currency: 'USD' } }, regular: { amount: { value: 160, currency: 'USD' } } } },
  { sku: 'S-4', name: 'Backpack (options)', typename: 'ComplexProductView', inStock: true, lowStock: true, priceRange: { minimum: { final: { amount: { value: 45, currency: 'USD' } }, regular: { amount: { value: 60, currency: 'USD' } } } } },
];

const status = document.getElementById('status');
const grid = document.getElementById('grid');

function money(price) {
  const amount = price?.amount;
  if (!amount || amount.value == null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: amount.currency || 'USD' }).format(amount.value);
}

function card(product) {
  const prices = product.price ?? product.priceRange?.minimum;
  const final = money(prices?.final);
  const regular = money(prices?.regular);
  const element = document.createElement('article');
  element.className = 'card';
  const image = document.createElement('a');
  image.className = 'card__image';
  const url = product.images?.[0]?.url;
  if (url) {
    const img = document.createElement('img');
    img.alt = product.name;
    img.loading = 'lazy';
    img.src = url.replace(/^\/\//, 'https://');
    image.append(img);
  }
  const body = document.createElement('div');
  body.className = 'card__body';
  const name = document.createElement('p');
  name.className = 'card__name';
  name.textContent = product.name;
  const price = document.createElement('p');
  price.className = 'card__price';
  price.textContent = final;
  if (regular && regular !== final) {
    const was = document.createElement('s');
    was.textContent = regular;
    price.append(was);
  }
  body.append(name, price);
  element.append(image, body);
  return { element, image };
}

async function main() {
  const [config, rules] = await Promise.all([
    fetch('/demo/config.json').then((r) => {
      if (!r.ok) throw new Error('Copy demo/config.example.json to demo/config.json and fill in your Catalog Service endpoint.');
      return r.json();
    }),
    fetch('/demo/rules.json').then((r) => r.json()),
  ]);
  initProductLabels({ ...rules, locale: 'en-US' });
  const samples = document.getElementById('samples');
  SAMPLES.forEach((product) => {
    const { element, image } = card(product);
    samples.append(element);
    appendLabels(image, product, 'listing');
  });

  const response = await fetch(config.endpoint, {
    body: JSON.stringify({ query: QUERY, variables: { phrase: config.phrase ?? '', size: config.pageSize ?? 24 } }),
    headers: { 'Content-Type': 'application/json', ...config.headers },
    method: 'POST',
  });
  const body = await response.json();
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join('; '));
  const products = body.data.productSearch.items.map((item) => item.productView);
  status.textContent = `${products.length} products.`;
  products.forEach((product) => {
    const { element, image } = card(product);
    grid.append(element);
    // The same call a storefront makes in the Product Discovery drop-in's ProductImage slot.
    appendLabels(image, { ...product, typename: product.__typename }, 'listing');
  });
}

main().catch((error) => {
  status.textContent = error.message;
});
