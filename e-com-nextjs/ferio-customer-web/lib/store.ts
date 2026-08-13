import { getPublicApi } from "@/lib/backend";

export type PublicStoreConfig = {
  storeName: string;
  legalName: string | null;
  supportPhone: string | null;
  supportEmail: string | null;
  currency: string;
  timezone: string;
  defaultReturnWindowDays: number | null;
  codEnabled: boolean;
  prepaidEnabled: boolean;
  purchaseActivityEnabled: boolean;
  purchaseHistoryEnabled: boolean;
  termsUrl: string | null;
  privacyUrl: string | null;
  returnPolicyUrl: string | null;
};

export const fallbackStoreConfig: PublicStoreConfig = {
  storeName: "Ferio",
  legalName: null,
  supportPhone: null,
  supportEmail: null,
  currency: "BDT",
  timezone: "Asia/Dhaka",
  defaultReturnWindowDays: null,
  codEnabled: true,
  prepaidEnabled: false,
  purchaseActivityEnabled: false,
  purchaseHistoryEnabled: false,
  termsUrl: null,
  privacyUrl: null,
  returnPolicyUrl: null,
};

export function getStoreConfig() {
  return getPublicApi<PublicStoreConfig>("/store/config", {
    cache: "no-store",
  });
}
