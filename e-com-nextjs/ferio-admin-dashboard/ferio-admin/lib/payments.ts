export type PaymentAttempt = {
  id: string;
  merchantTransactionId: string;
  provider: "SSLCOMMERZ" | "AAMARPAY";
  status: "CREATED" | "INITIATING" | "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED" | "UNKNOWN";
  amount: number;
  currency: string;
  providerTransactionId: string | null;
  failureMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  order: { reference: string; paymentStatus: string; total: number };
  callbacks: Array<{ id: string; status: string; eventType: string; errorMessage: string | null; createdAt: string }>;
};

export type PaymentRecoveryHealth = {
  available: boolean;
  enabled: boolean;
  everyMinutes: number;
  batchSize: number;
  eligibleCount: number;
  counts?: Record<string, number>;
  error?: string;
};
