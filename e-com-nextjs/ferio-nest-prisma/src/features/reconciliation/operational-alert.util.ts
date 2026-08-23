export type OperationalAlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export type OperationalAlertSignal = {
  code: string;
  severity: OperationalAlertSeverity;
  title: string;
  detail: string;
  count: number;
  oldestAt: Date | string | null;
  latestAt: Date | string | null;
  actionHref: string;
  actionLabel: string;
};

const severityRank: Record<OperationalAlertSeverity, number> = {
  CRITICAL: 3,
  HIGH: 2,
  MEDIUM: 1,
};

export function buildOperationalAlerts(signals: OperationalAlertSignal[]) {
  return signals
    .filter((signal) => signal.count > 0)
    .sort((left, right) => {
      const severityDifference =
        severityRank[right.severity] - severityRank[left.severity];
      if (severityDifference !== 0) return severityDifference;
      return (
        new Date(left.oldestAt ?? 0).getTime() -
        new Date(right.oldestAt ?? 0).getTime()
      );
    });
}
