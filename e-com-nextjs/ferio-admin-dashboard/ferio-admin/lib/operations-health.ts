export type OperationsHealth = {
  generatedAt: string;
  runtimeStatus: "HEALTHY" | "DEGRADED" | "UNAVAILABLE";
  launchReady: boolean;
  launchBlockers: string[];
  process: {
    uptimeSeconds: number;
    memory: { rssBytes: number; heapUsedBytes: number };
  };
  requests: {
    observedSince: string;
    total: number;
    successful: number;
    clientErrors: number;
    serverErrors: number;
    averageDurationMs: number;
    p95DurationMs: number;
    maxDurationMs: number;
    sampleSize: number;
  };
  dependencies: Record<
    "database" | "redis",
    { available: boolean; latencyMs: number | null; detail?: string }
  >;
  queues: Array<{
    name: string;
    available: boolean;
    counts: Record<string, number> | null;
  }>;
  commerce: {
    available: boolean;
    windowHours: number;
    ordersPlaced?: number;
    ordersDelivered?: number;
    paidOrders?: number;
    failedPaymentAttempts?: number;
    unknownPaymentAttempts?: number;
    shipmentsCreated?: number;
    failedRefunds?: number;
    openCriticalFindings?: number;
  };
  providers: {
    payments: Array<{ code: string; name: string; configured: boolean }>;
    couriers: Array<{
      code: string;
      name: string;
      active: boolean;
      configured: boolean;
      pollingConfigured: boolean;
    }>;
  };
  backup: {
    source: "DEPLOYMENT_ENVIRONMENT";
    status: "CURRENT" | "STALE_OR_UNPROTECTED" | "MISSING";
    enabled: boolean;
    protectedStorage: boolean;
    lastSuccessAt: string | null;
    restoreStatus: "VERIFIED" | "MISSING_OR_STALE";
    lastRestoreVerifiedAt: string | null;
  };
};
