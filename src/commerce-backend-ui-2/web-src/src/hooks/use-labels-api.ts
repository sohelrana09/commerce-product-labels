import { useIms } from "@adobe/aio-commerce-lib-admin-ui/web";
import { useCallback, useMemo } from "react";

import actionUrls from "../config.json";

import type { LabelRule, Lookups } from "../lib/types.ts";

const PACKAGE = "ProductLabelsAdmin";

export class ApiError extends Error {
  public readonly errors: string[];

  public constructor(message: string, errors: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.errors = errors;
  }
}

/**
 * Calls the app's Admin web actions with the signed-in admin's IMS token. Action URLs come from
 * `config.json`, which the App Builder CLI writes at build and dev time.
 */
export function useLabelsApi() {
  const ims = useIms();
  if (ims.error) {
    throw ims.error;
  }
  const { imsToken, imsOrgId } = ims.data;

  const invoke = useCallback(
    async <T>(action: string, payload: object = {}): Promise<T> => {
      const url = (actionUrls as Record<string, string>)[
        `${PACKAGE}/${action}`
      ];
      const response = await fetch(url, {
        body: JSON.stringify(payload),
        headers: {
          authorization: `Bearer ${imsToken}`,
          "Content-Type": "application/json",
          "x-gw-ims-org-id": imsOrgId,
        },
        method: "POST",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new ApiError(
          body?.error ?? `Request failed (${response.status})`,
          body?.errors ?? [],
        );
      }
      return body as T;
    },
    [imsOrgId, imsToken],
  );

  return useMemo(
    () => ({
      deleteRule: (code: string) =>
        invoke<{ deleted: boolean }>("rule-delete", { code }),
      listRules: () =>
        invoke<{ rules: LabelRule[]; examples: LabelRule[] }>("rules-list"),
      lookups: () => invoke<Lookups>("lookups"),
      saveRule: (rule: LabelRule, previousCode?: string) =>
        invoke<{ rule: LabelRule }>("rule-save", { previousCode, rule }),
    }),
    [invoke],
  );
}
