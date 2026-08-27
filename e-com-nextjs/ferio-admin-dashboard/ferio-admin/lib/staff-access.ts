export type StaffAccessStatus = "active" | "inactive";

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  staffAccessStatus: StaffAccessStatus | null;
  staffPermissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type PendingStaffInvitation = {
  id: string;
  name: string | null;
  email: string;
  permissions: string[];
  expiresAt: string;
  createdAt: string;
};

export type StaffAccessOverview = {
  staff: StaffMember[];
  pendingInvitations: PendingStaffInvitation[];
};

export const STAFF_PERMISSION_GROUPS = [
  {
    label: "Orders and customers",
    permissions: [
      ["orders.read", "View orders"],
      ["orders.manage", "Manage orders"],
      ["orders.policy.manage", "Manage order policies"],
      ["customers.read", "View customers"],
    ],
  },
  {
    label: "Catalog and inventory",
    permissions: [
      ["catalog.read", "View catalog"],
      ["catalog.manage", "Manage catalog"],
      ["inventory.adjust", "Adjust inventory"],
      ["product-content.read", "View product content"],
      ["product-content.manage", "Moderate product content"],
    ],
  },
  {
    label: "Payments and finance",
    permissions: [
      ["payments.read", "View payments"],
      ["payments.manage", "Manage payments"],
      ["refunds.read", "View refunds"],
      ["refunds.manage", "Manage refunds"],
      ["settlements.read", "View settlements"],
      ["settlements.manage", "Manage settlements"],
      ["reconciliation.read", "View reconciliation"],
      ["reconciliation.manage", "Manage reconciliation"],
      ["reports.read", "View reports"],
    ],
  },
  {
    label: "Delivery and after-sales",
    permissions: [
      ["shipping.read", "View shipping"],
      ["shipping.manage", "Manage shipments"],
      ["shipping.providers.manage", "Manage courier providers"],
      ["delivery-zones.read", "View delivery zones"],
      ["delivery-zones.manage", "Manage delivery zones"],
      ["delivery-personnel.read", "View delivery personnel"],
      ["delivery-personnel.manage", "Manage delivery personnel"],
      ["returns.read", "View returns"],
      ["returns.manage", "Manage returns"],
      ["rto.read", "View RTO cases"],
      ["rto.manage", "Manage RTO cases"],
      ["warranty.read", "View warranty claims"],
      ["warranty.manage", "Manage warranty claims"],
    ],
  },
  {
    label: "Operations and settings",
    permissions: [
      ["services.read", "View services"],
      ["services.manage", "Manage services"],
      ["store-locations.read", "View stores"],
      ["store-locations.manage", "Manage stores"],
      ["messaging.read", "View messages"],
      ["messaging.manage", "Manage messages"],
      ["chat.read", "Use live chat"],
      ["purchase-activity.read", "View purchase activity"],
      ["settings.read", "View settings"],
      ["settings.manage", "Manage settings"],
      ["audit.read", "View audit history"],
    ],
  },
] as const;
