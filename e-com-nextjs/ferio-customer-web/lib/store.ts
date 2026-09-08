import { getPublicApi } from "@/lib/backend";

export type PublicStoreConfig = {
  storeName: string;
  legalName: string | null;
  logoUrl: string | null;
  address: string | null;
  supportPhone: string | null;
  supportEmail: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
  themePreset: "default" | "warm" | "cool";
  currency: string;
  timezone: string;
  defaultReturnWindowDays: number | null;
  codEnabled: boolean;
  prepaidEnabled: boolean;
  serviceBookingEnabled: boolean;
  warrantyClaimsEnabled: boolean;
  storefrontAnalyticsEnabled: boolean;
  purchaseActivityEnabled: boolean;
  purchaseHistoryEnabled: boolean;
  termsUrl: string | null;
  privacyUrl: string | null;
  returnPolicyUrl: string | null;
  categoryTopNavEnabled: boolean;
  categorySideNavEnabled: boolean;
};

export const fallbackStoreConfig: PublicStoreConfig = {
  storeName: "Ferio",
  legalName: null,
  logoUrl: null,
  address: null,
  supportPhone: null,
  supportEmail: null,
  facebookUrl: null,
  instagramUrl: null,
  whatsappUrl: null,
  themePreset: "default",
  currency: "BDT",
  timezone: "Asia/Dhaka",
  defaultReturnWindowDays: null,
  codEnabled: true,
  prepaidEnabled: false,
  serviceBookingEnabled: true,
  warrantyClaimsEnabled: true,
  storefrontAnalyticsEnabled: true,
  purchaseActivityEnabled: false,
  purchaseHistoryEnabled: false,
  termsUrl: null,
  privacyUrl: null,
  returnPolicyUrl: null,
  categoryTopNavEnabled: true,
  categorySideNavEnabled: true,
};

export function getStoreConfig() {
  return getPublicApi<PublicStoreConfig>("/store/config", {
    cache: "no-store",
  });
}
