# Contributing to Product Labels

Bug fixes, new label conditions, storefront improvements and better documentation are all welcome. For larger changes, open an issue first so we can agree on the approach.

## Getting set up

Follow the [Quick start](README.md#quick-start): you need Node.js 24. The unit tests need no Adobe account, because the database, Commerce and I/O Runtime are faked:

```bash
git clone https://github.com/sohelrana09/commerce-product-labels.git
cd commerce-product-labels
npm install
npm test
```

`npm run demo` runs the storefront kit against a Catalog Service endpoint of your choice. To deploy your copy, follow [docs/installation.md](docs/installation.md): you need an App Builder project, and a Commerce instance in the same Adobe organization to install it on.

## Making a change

1. Fork the repository and create a branch: `git checkout -b feature/your-change`.
2. Follow the [project structure](README.md#project-structure):
   - the rules engine is `storefront/scripts/product-labels-engine.js`: one dependency-free module, with unit tests, that the storefront, the Admin preview and the actions all import (the actions and Admin as `#engine`). Keep it free of DOM and Node APIs;
   - server-only logic goes in `src/common/labels`; actions stay thin: read the request, call `src/common`, answer;
   - labels are decoration: a failed rules feed must show no labels, never break the product list, and label text is always rendered as text, never HTML;
   - storefront code in `storefront/` and `demo/` follows the Edge Delivery Services boilerplate's ESLint (Airbnb) and Stylelint rules, not Biome.
3. Keep secrets on the server: never log credentials or tokens, and never commit `.env`, `.aio` or `demo/config.json`.
4. Run the checks:

   ```bash
   npm run code:check
   npm run typecheck
   npm test
   ```

   Plus `npm run demo` for anything a shopper sees.

5. Update the README, the guides in `docs/` and the [CHANGELOG](CHANGELOG.md) when behaviour, rule fields or setup change.
6. Commit, push the branch and open a pull request that says what changed and how you tested it. If you tried it on a Commerce instance, say which (SaaS or PaaS, and the version).

## Adding a condition field or token

1. Add it to `FIELDS` (or the token switch in `renderText`) in `storefront/scripts/product-labels-engine.js`, and read it in `normaliseProduct` for every product shape: the PDP drop-in, the Product Discovery drop-in and Catalog Service.
2. Add it to the type declarations in `product-labels-engine.d.ts`, and to `FIELD_LABELS` in the Admin (`src/commerce-backend-ui-2/web-src/src/lib/rules.ts`).
3. Document it in [docs/rules.md](docs/rules.md).

## Reporting bugs and security issues

- Bugs and ideas: [open an issue](https://github.com/sohelrana09/commerce-product-labels/issues/new/choose).
- Security problems: report them privately, see [SECURITY.md](SECURITY.md).

By contributing you agree to follow the [code of conduct](CODE_OF_CONDUCT.md), and that your contribution is licensed under the [MIT License](LICENSE).
