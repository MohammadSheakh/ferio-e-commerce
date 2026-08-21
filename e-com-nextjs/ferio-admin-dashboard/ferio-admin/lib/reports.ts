export type ReportCount = { value: string; count: number };

export type ReportOrdersExport = {
  exportId: string;
  fileName: string;
  contentType: string;
  content: string;
  rowCount: number;
  customerFields: "permitted" | "masked";
};

export type ReportsOverview = {
  basis: {
    dateFrom: string;
    dateTo: string;
    timezone: "UTC";
    dateField: "Order.createdAt";
    description: string;
    filters: { source: string | null; provider: string | null };
  };
  outcomes: {
    placed: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    returned: number;
    returnCases: number;
    rto: number;
  };
  revenue: {
    currency: string;
    grossPlaced: number;
    grossConfirmed: number;
    grossDelivered: number;
    knownCollected: number;
    netOfRefund: number;
    definitions: Record<string, string>;
  };
  finance: {
    paymentStatus: ReportCount[];
    refundStatus: ReportCount[];
    refundAffectedOrders: number;
    refundAmount: number;
    rtoCost: number;
    codExpectedAmount: number;
    codSettlementAmount: number;
    codCollectionVariance: number;
    unresolvedCodCollections: number;
    codCollectionVariances: number;
    settlementModelAvailable: true;
  };
  operations: {
    pendingConfirmation: number;
    readyForFulfillment: number;
    openFulfillmentExceptions: number;
    deliveryExceptions: number;
    rto: number;
  };
  contribution: {
    status: "INCOMPLETE";
    value: null;
    label: string;
    missingInputs: string[];
  };
  dimensions: {
    sources: ReportCount[];
    providers: ReportCount[];
  };
};
