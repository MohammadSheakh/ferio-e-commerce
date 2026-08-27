export type PaymentAttempt = {
  id: string;
  merchantTransactionId: string;
  provider: "SSLCOMMERZ" | "AAMARPAY";
  status:
    | "CREATED"
    | "INITIATING"
    | "PENDING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
    | "UNKNOWN";
  amount: number;
  currency: string;
  providerTransactionId: string | null;
  failureMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  order: {
    id: string;
    reference: string;
    paymentStatus: string;
    refundStatus: string;
    total: number;
  };
  callbacks: Array<{
    id: string;
    status: string;
    eventType: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
};

export type PaymentAttemptPage = {
  items: PaymentAttempt[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaymentAttemptDetail = Omit<
  PaymentAttempt,
  "order" | "callbacks"
> & {
  providerSessionId: string | null;
  providerValidationId: string | null;
  failureCode: string | null;
  expiresAt: string | null;
  initiatedAt: string | null;
  updatedAt: string;
  order: PaymentAttempt["order"] & {
    status: string;
    currency: string;
    refunds: Array<{
      id: string;
      reference: string;
      status: string;
      method: string;
      amount: number;
      currency: string;
      provider: string | null;
      providerRefundId: string | null;
      failureReason: string | null;
      processedAt: string | null;
      completedAt: string | null;
      createdAt: string;
    }>;
  };
  callbacks: Array<{
    id: string;
    status: string;
    eventType: string;
    errorMessage: string | null;
    processedAt: string | null;
    createdAt: string;
  }>;
};

export type PaymentRecoveryHealth = {
  available: boolean;
  enabled: boolean;
  everyMinutes: number;
  batchSize: number;
  eligibleCount: number;
  counts?: Record<string, number>;
  scheduler?: {
    id: string;
    name: string;
    next: number;
  } | null;
  error?: string;
};

export type PaymentProviderReadiness = {
  code: "SSLCOMMERZ" | "AAMARPAY";
  name: string;
  configured: boolean;
};

export type PaymentRecoverySweepResult = {
  jobId: string;
  status: "QUEUED";
};
