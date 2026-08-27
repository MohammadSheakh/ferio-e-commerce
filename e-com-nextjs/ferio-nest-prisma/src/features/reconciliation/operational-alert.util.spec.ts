import { buildOperationalAlerts } from './operational-alert.util';

describe('operational alerts', () => {
  it('removes empty signals and prioritizes critical oldest evidence', () => {
    const alerts = buildOperationalAlerts([
      {
        code: 'MESSAGES_FAILED',
        severity: 'MEDIUM',
        title: 'Messages failed',
        detail: 'Recent failures',
        count: 2,
        oldestAt: '2026-08-21T12:00:00.000Z',
        latestAt: '2026-08-21T13:00:00.000Z',
        actionHref: '/dashboard/messages',
        actionLabel: 'Review messages',
      },
      {
        code: 'PAYMENT_UNKNOWN',
        severity: 'CRITICAL',
        title: 'Payment outcomes unknown',
        detail: 'Do not retry blindly',
        count: 1,
        oldestAt: '2026-08-21T11:00:00.000Z',
        latestAt: '2026-08-21T11:00:00.000Z',
        actionHref: '/dashboard/payments',
        actionLabel: 'Review payments',
      },
      {
        code: 'EMPTY',
        severity: 'CRITICAL',
        title: 'Empty',
        detail: 'Not actionable',
        count: 0,
        oldestAt: null,
        latestAt: null,
        actionHref: '/dashboard',
        actionLabel: 'Review',
      },
    ]);

    expect(alerts.map((alert) => alert.code)).toEqual([
      'PAYMENT_UNKNOWN',
      'MESSAGES_FAILED',
    ]);
  });
});
