import { defineConfig } from "@adobe/aio-commerce-lib-app/config";

export default defineConfig({
  adminUi: {
    menu: {
      aclProtected: true,
      description:
        "Create and manage the labels and badges shown on product images.",
      id: "product_labels",
      label: "Product Labels",
    },
  },

  businessConfig: {
    schema: [
      {
        default: true,
        label: "Show product labels on the storefront",
        name: "labelsEnabled",
        type: "boolean",
      },
      {
        default: "2",
        label: "Most labels in one corner of a product image (1 to 10)",
        name: "maxPerPosition",
        type: "text",
      },
      {
        default: "300",
        label:
          "Seconds browsers and the CDN may cache the label rules (0 to 86400)",
        name: "cacheSeconds",
        type: "text",
      },
    ],
  },

  installation: {
    customInstallationSteps: [
      {
        description:
          "Provision App Builder Database Storage and create the collection for label rules.",
        name: "Set up database",
        script: "./scripts/setup-database.js",
      },
    ],
    messages: {
      postInstallation:
        "Product Labels is installed. Open Product Labels in the Commerce Admin to add your first label, then add the storefront kit to your Edge Delivery Services storefront. Labels are off until you switch them on.",
      preInstallation:
        "Product Labels stores label rules in App Builder Database Storage. Make sure App Builder Data Services is added to your workspace.",
    },
  },

  metadata: {
    description:
      "Show rule-based labels and badges on product images: sale percent, sold out, low stock, new and custom text, by price, stock, SKU, attribute, store view and date.",
    displayName: "Product Labels",
    id: "product-labels",
    version: "0.1.0",
  },
});
