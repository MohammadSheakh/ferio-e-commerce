export type AdminWalletTopUp = {
  id: string;
  provider: "BKASH" | "NAGAD" | "ROCKET" | "BANK_TRANSFER";
  amount: number;
  currency: "bdt";
  status: "PENDING_REVIEW" | "COMPLETED" | "REJECTED" | "CANCELLED";
  customerReference: string;
  customerNote: string | null;
  reviewNote: string | null;
  reviewedById: string | null;
  createdAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
  user: { id: string; name: string; email: string };
};

export type AdminWalletTopUpPage = {
  items: AdminWalletTopUp[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
