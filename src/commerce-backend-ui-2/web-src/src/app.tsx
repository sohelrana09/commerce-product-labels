import { createExtensionApp } from "@adobe/aio-commerce-lib-admin-ui/web";
import "@react-spectrum/s2/page.css";

import config from "#app.commerce.config";

import { ProductLabelsPage } from "./pages/product-labels-page.tsx";

createExtensionApp({
  menu: <ProductLabelsPage />,
  metadata: {
    extensionId: config.metadata.id,
  },
});
