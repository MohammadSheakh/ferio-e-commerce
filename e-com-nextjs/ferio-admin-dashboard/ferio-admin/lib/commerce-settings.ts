export type CommerceSettings = {
  id: string;
  storeName: string;
  legalName: string | null;
  supportPhone: string | null;
  supportEmail: string | null;
  currency: "BDT";
  timezone: string;
  orderPrefix: string;
  defaultReturnWindowDays: number | null;
  codEnabled: boolean;
  prepaidEnabled: boolean;
  termsUrl: string | null;
  privacyUrl: string | null;
  returnPolicyUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
