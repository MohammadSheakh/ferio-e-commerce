export type OperationalAlert = {
  code: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  title: string;
  detail: string;
  count: number;
  oldestAt: string | null;
  latestAt: string | null;
  actionHref: string;
  actionLabel: string;
};

export type OperationalAlertResponse = {
  generatedAt: string;
  windowHours: number;
  staleWebhookMinutes: number;
  alerts: OperationalAlert[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
  };
};
