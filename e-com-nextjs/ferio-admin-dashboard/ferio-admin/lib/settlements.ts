export type EligibleCodCollection = {
  id: string;
  status: "EXPECTED";
  currency: string;
  expectedAmount: number;
  expectedAt: string;
  shipment: {
    id: string;
    status: string;
    trackingNumber: string | null;
    shippingCharge: number | null;
    provider: { id: string; code: "PATHAO" | "STEADFAST"; name: string };
  };
  order: {
    id: string;
    reference: string;
    paymentMethod: "COD";
    paymentStatus: string;
    customer: { name: string; phoneNormalized: string };
  };
};

export type CourierSettlementItem = {
  id: string;
  status: "MATCHED" | "VARIANCE" | "DISPUTED";
  expectedCodAmount: number;
  collectedAmount: number;
  courierFee: number;
  otherDeduction: number;
  expectedRemittance: number;
  collectionVariance: number;
  shipment: {
    id: string;
    trackingNumber: string | null;
    order: { id: string; reference: string; paymentStatus: string };
  };
};

export type CourierSettlement = {
  id: string;
  reference: string;
  providerSettlementReference: string;
  bankReference: string;
  status: "MATCHED" | "VARIANCE" | "DISPUTED";
  currency: string;
  grossCollected: number;
  courierFees: number;
  otherDeductions: number;
  expectedRemittance: number;
  remittedAmount: number;
  variance: number;
  settledAt: string;
  note: string | null;
  provider: { code: "PATHAO" | "STEADFAST"; name: string };
  items: CourierSettlementItem[];
};

export type CourierSettlementImportRow = {
  id: string;
  providerRowReference: string;
  trackingNumber: string;
  status:
    | "APPLIED"
    | "UNMATCHED"
    | "INELIGIBLE"
    | "ALREADY_SETTLED"
    | "DUPLICATE";
  reason: string | null;
  collectedAmount: number;
  courierFee: number;
  otherDeduction: number;
  matchedShipmentId: string | null;
  matchedCollectionId: string | null;
};

export type CourierSettlementImport = {
  id: string;
  reference: string;
  providerReportReference: string;
  source: "API" | "CSV" | "MANUAL_JSON";
  sourceFileName: string | null;
  sourceFileChecksum: string | null;
  parserVersion: string | null;
  normalizedRowsChecksum: string | null;
  status: "APPLIED" | "NEEDS_REVIEW" | "SUPERSEDED";
  rowCount: number;
  appliedCount: number;
  exceptionCount: number;
  settlementId: string | null;
  supersedesImportId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  provider: { code: "PATHAO" | "STEADFAST"; name: string };
  settlement: CourierSettlement | null;
  supersedesImport: {
    id: string;
    reference: string;
    providerReportReference: string;
  } | null;
  supersededBy: {
    id: string;
    reference: string;
    providerReportReference: string;
  } | null;
  rows: CourierSettlementImportRow[];
};

export type SettlementReportPreflight = {
  provider: "PATHAO" | "STEADFAST";
  fileName: string;
  sourceChecksum: string;
  normalizedRowsChecksum: string;
  parserVersion: string;
  byteLength: number;
  headers: string[];
  rowCount: number;
  acceptedRowCount: number;
  rejectedLineCount: number;
  ready: boolean;
  errors: string[];
  warnings: string[];
  rows: Array<{
    providerRowReference: string;
    trackingNumber: string;
    collectedAmount: number;
    courierFee: number;
    otherDeduction: number;
    note?: string;
  }>;
};

export type SettlementReportTemplate = {
  fileName: string;
  parserVersion: string;
  amountUnit: "BDT_DECIMAL";
  maxBytes: number;
  maxRows: number;
  requiredHeaders: string[];
  optionalHeaders: string[];
  content: string;
};

export type ReconciliationFinding = {
  id: string;
  type: string;
  domain: "INVENTORY" | "PAYMENT" | "SHIPPING" | "REFUND" | "SETTLEMENT";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  context: Record<string, unknown>;
  occurrenceCount: number;
  firstDetectedAt: string;
  lastSeenAt: string;
  ownerActorId: string | null;
  acknowledgementNote: string | null;
  resolutionNote: string | null;
};

export type ReconciliationFindingPage = {
  items: ReconciliationFinding[];
  total: number;
  summary: { OPEN: number; ACKNOWLEDGED: number; RESOLVED: number };
};

export type ReconciliationRun = {
  id: string;
  reference: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  trigger: "MANUAL" | "SCHEDULED" | "RETRY";
  overdueHours: number;
  detectedCount: number;
  openedCount: number;
  autoResolvedCount: number;
  initiatedByActorId: string | null;
  queueJobId: string | null;
  attemptCount: number;
  startedAt: string;
  lastAttemptAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
};

export type ReconciliationQueueHealth = {
  available: boolean;
  scheduleEnabled: boolean;
  scheduleEveryMinutes: number;
  overdueHours: number;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  } | null;
  scheduler: { id: string; name: string; next: number } | null;
  operations: {
    windowHours: number;
    completedCount: number;
    failedCount: number;
    successRate: number | null;
    averageDurationMs: number | null;
    lastSuccess: ReconciliationRun | null;
    lastFailure: ReconciliationRun | null;
  };
  recentRuns: ReconciliationRun[];
  error?: string;
};
