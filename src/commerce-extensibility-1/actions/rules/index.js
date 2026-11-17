/**
 * Public web action for the storefront (no Adobe IMS login: shoppers call it from the browser).
 * It only reads label rules, which every shopper sees anyway. Errors return a generic message;
 * details go to the logs.
 */

import AioLogger from "@adobe/aio-lib-core-logging";

import { json } from "../../../common/http.js";
import { createRulesFeed } from "./handler.js";

const rulesFeed = createRulesFeed();

export async function main(params = {}) {
  const logger = AioLogger("product-labels-rules", {
    level: params.LOG_LEVEL || "info",
  });
  try {
    return await rulesFeed(params, logger);
  } catch (error) {
    logger.error(`rules feed failed: ${error.message}`);
    return json(500, { error: "Product labels are unavailable right now." });
  }
}
