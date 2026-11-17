# Installation

Product Labels is an App Builder app. You deploy it to an App Builder workspace, install it on a Commerce instance through App Management (which sets up the Admin menu, the settings and the database), then add the storefront kit to your Edge Delivery Services storefront.

## Requirements

- **Commerce:** Adobe Commerce as a Cloud Service, or Adobe Commerce 2.4.5+ on cloud infrastructure or on-premises, with Catalog Service (the storefront drop-ins read products from it).
- **Storefront:** Edge Delivery Services with the Commerce drop-ins (Product Details and Product Discovery). Any other storefront can use the engine directly, see [Other storefronts](#other-storefronts).
- **App Builder:** a project in the **same Adobe organization** as the Commerce instance. App Management only lists apps from the instance's own organization.
- **Tools:** Node.js 24 (`.nvmrc`) and the Adobe I/O CLI: `npm install -g @adobe/aio-cli`.

Unlike checkout extensions, Product Labels needs **no webhooks and no Commerce events**: labels are worked out in the shopper's browser from the product data the storefront already loads.

## App Builder project

In the [Adobe Developer Console](https://developer.adobe.com/console), create a project from the **App Builder** template. In each workspace you deploy to (for example Stage and Production), add:

| Service | Why |
|---|---|
| I/O Management API | App Management. |
| App Builder Data Services | App Builder Database Storage for the label rules. |
| OAuth Server-to-Server credential | The Admin page's store view list (Commerce REST), and database access. |

`install.yaml` lists the same APIs for the Adobe Commerce Marketplace.

## Deploy

```bash
git clone https://github.com/sohelrana09/commerce-product-labels.git
cd commerce-product-labels
npm install

aio login
aio console org select
aio console project select
aio console workspace select
aio app use --merge
cp env.dist .env

aio app deploy
```

`aio app use --merge` writes the workspace's credentials into `.env` and `.aio`. Both are git-ignored: never commit them.

`aio app deploy` prints the action URLs. Note the one for **`product-labels/rules`**: it is the storefront's rules feed, for example
`https://<namespace>.adobeioruntime.net/api/v1/web/product-labels/rules`.

To deploy from GitHub instead, set the workspace secrets the template workflows expect (`CLIENTID_STAGE`, `CLIENTSECRET_STAGE`, `TECHNICALACCID_STAGE`, `TECHNICALACCEMAIL_STAGE`, `IMSORGID_STAGE`, `SCOPES_STAGE`, `AIO_RUNTIME_NAMESPACE_STAGE`, `AIO_RUNTIME_AUTH_STAGE`, and the same with `_PROD`). Then run **Deploy to Stage** or **Deploy to Production** from the Actions tab; for Production, pick the release tag under "Use workflow from".

## Install in Commerce

1. In the Commerce Admin, open **Apps → App Management**.
2. Find **Product Labels** and choose **Install**.
3. App Management:
   - adds **Product Labels** to the Admin menu, protected by an ACL resource;
   - runs the **Set up database** step (`scripts/setup-database.js`), which provisions the workspace's App Builder database if needed and creates the `label_rules` indexes.
4. Grant the Product Labels ACL resource to the admin roles that should manage labels.
5. Open **Product Labels** and add your first label. The bundled examples are templates, and every one is switched off.
6. Add the [storefront kit](../storefront/README.md) to your storefront, pointing it at the `product-labels/rules` URL.

## Settings

In **App Management → Product Labels → Configure**:

| Setting | Default | Meaning |
|---|---|---|
| Show product labels on the storefront | On | The master switch. When it's off, the feed returns no rules and the storefront shows no labels. |
| Most labels in one corner | 2 | Caps how many labels stack in one corner of an image (1 to 10). |
| Cache seconds | 300 | How long browsers and the CDN may cache the rules feed (0 to 86400). A saved change reaches shoppers within this time plus up to 30 seconds. |

## Data

| Collection | Holds | Kept for |
|---|---|---|
| `label_rules` | Label rules from the Admin page | Until deleted, or until the app is uninstalled |

No shopper data is read or stored: the feed is the same for every shopper, and labels are worked out in the browser.

## Rules in code

To keep rules in version control instead of the Admin page, set `LABEL_RULES` in `.env` to a JSON array of rules (see [rules.md](rules.md)) and redeploy. While it is set, the feed serves those rules and ignores the database.

## Other storefronts

The engine, `storefront/scripts/product-labels-engine.js`, has no dependencies. Any storefront can fetch the rules feed and call `labelsFor(product, rules, { placement, storeView })` to get the labels for a product, then draw them however it likes. See [architecture.md](architecture.md).

## Uninstalling

Uninstall in **Apps → App Management**. It removes the menu and **drops the `label_rules` collection**. Copy the rules you want to keep first (each rule's JSON is what the [rules reference](rules.md) describes). Remove the storefront kit calls, or leave them: with no feed they show no labels.

## Troubleshooting

| Symptom | Check |
|---|---|
| No labels on the storefront | The label is switched on, the master switch is on, today is inside its dates, and **Test a product** with the same prices and stock shows it. Then open the rules feed URL in a browser: it should list the rule. |
| Feed lists the rule, still no label | The browser console for "Product labels unavailable", the `endpoint` passed to `initProductLabels`, and that the condition's field is in the product data the drop-in loads (attributes must be visible on the storefront in Catalog Service). |
| A change takes a while to show | Expected: the feed is cached for the **Cache seconds** setting, and each browser tab keeps it in `sessionStorage` for the kit's `cacheSeconds`. |
| Price or discount labels never show | Catalog Service returns no price for the shopper's customer group (some B2B catalogs hide prices from guests). Discount labels need both a regular and a lower final price. |
| "Not associated with a Commerce instance" in logs | The app is deployed but not installed in App Management yet. |
