export type CustomerMetrics = {
  totalOrderCount: number;
  deliveredOrderCount: number;
  cancelledOrderCount: number;
  returnedOrderCount: number;
  rtoOrderCount: number;
  deliveredSpend: number;
  lastPurchaseAt: Date | null;
};

export function maskCustomerPhone(phone: string) {
  if (phone.length <= 4) return '*'.repeat(phone.length);
  return `${phone.slice(0, 6)}${'*'.repeat(Math.max(3, phone.length - 10))}${phone.slice(-4)}`;
}

export function maskCustomerEmail(email: string | null) {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${Array.from(local)[0] ?? '*'}***@${domain}`;
}

export function customerRiskIndicators(metrics: CustomerMetrics) {
  const indicators: Array<{
    code: 'RTO_HISTORY' | 'HIGH_CANCELLATION_RATE' | 'REPEAT_RETURN_HISTORY';
    label: string;
  }> = [];
  if (metrics.rtoOrderCount > 0) {
    indicators.push({ code: 'RTO_HISTORY', label: 'Has RTO history' });
  }
  if (
    metrics.totalOrderCount >= 3 &&
    metrics.cancelledOrderCount / metrics.totalOrderCount >= 0.5
  ) {
    indicators.push({
      code: 'HIGH_CANCELLATION_RATE',
      label: 'Cancellation rate is 50% or higher',
    });
  }
  if (metrics.returnedOrderCount >= 2) {
    indicators.push({
      code: 'REPEAT_RETURN_HISTORY',
      label: 'Has multiple return cases',
    });
  }
  return indicators;
}
