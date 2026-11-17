import { createExtensionApp } from "@adobe/aio-commerce-lib-admin-ui/web";
import "@react-spectrum/s2/page.css";

import config from "#app.commerce.config";

import { LabelsApiContext, useActionsApi } from "./hooks/use-labels-api.ts";
import { ProductLabelsPage } from "./pages/product-labels-page.tsx";

function AdminPage() {
  const api = useActionsApi();
  return (
    <LabelsApiContext value={api}>
      <ProductLabelsPage />
    </LabelsApiContext>
  );
}

createExtensionApp({
  menu: <AdminPage />,
  metadata: {
    extensionId: config.metadata.id,
  },
});
