import { buildOrderOperationalTimeline } from '../utils/order-timeline.util';

describe('order operational timeline', () => {
  it('sorts cross-domain evidence without requiring raw provider payloads', () => {
    const timeline = buildOrderOperationalTimeline({
      order: {
        id: 'order-1',
        reference: 'FER-1',
        status: 'CONFIRMED',
        createdAt: '2026-08-21T10:00:00.000Z',
        statusHistory: [],
        fulfillmentHistory: [],
      },
      shipment: null,
      payments: [
        {
          id: 'payment-1',
          provider: 'SSLCOMMERZ',
          status: 'SUCCEEDED',
          amount: 1500,
          currency: 'BDT',
          createdAt: '2026-08-21T10:01:00.000Z',
          completedAt: '2026-08-21T10:02:00.000Z',
          callbacks: [],
        },
      ],
      returns: [],
      refunds: [],
      messages: [
        {
          id: 'message-1',
          eventType: 'ORDER_CONFIRMED',
          status: 'SENT',
          templateVersion: 3,
          renderedBody: 'Order FER-1 is confirmed.',
          createdAt: '2026-08-21T10:03:00.000Z',
        },
      ],
    });

    expect(timeline.map((item) => item.type)).toEqual([
      'MESSAGE',
      'PAYMENT',
      'ORDER',
    ]);
    expect(timeline[0].detail).toContain('template v3');
    expect(JSON.stringify(timeline)).not.toContain('payload');
  });

  it('preserves ignored courier evidence and return/refund outcomes', () => {
    const timeline = buildOrderOperationalTimeline({
      order: {
        id: 'order-1',
        reference: 'FER-1',
        status: 'DELIVERED',
        createdAt: '2026-08-21T10:00:00.000Z',
        statusHistory: [],
        fulfillmentHistory: [],
      },
      shipment: {
        id: 'shipment-1',
        status: 'DELIVERED',
        trackingNumber: 'TRK-1',
        provider: { name: 'Steadfast' },
        createdAt: '2026-08-21T10:01:00.000Z',
        events: [
          {
            id: 'event-1',
            normalizedStatus: 'IN_TRANSIT',
            rawStatus: 'moving',
            ignoredReason: 'Older than current status',
            occurredAt: '2026-08-21T10:02:00.000Z',
          },
        ],
      },
      payments: [],
      returns: [
        {
          id: 'return-1',
          rmaReference: 'RMA-1',
          status: 'APPROVED',
          createdAt: '2026-08-21T10:03:00.000Z',
          history: [],
        },
      ],
      refunds: [
        {
          id: 'refund-1',
          reference: 'REF-1',
          status: 'SUCCEEDED',
          amount: 500,
          currency: 'BDT',
          method: 'BKASH',
          createdAt: '2026-08-21T10:04:00.000Z',
          completedAt: null,
          attempts: [],
        },
      ],
      messages: [],
    });

    expect(timeline.some((item) => item.type === 'RETURN')).toBe(true);
    expect(timeline.some((item) => item.type === 'REFUND')).toBe(true);
    expect(
      timeline.find((item) => item.id === 'shipment-event:event-1')?.detail,
    ).toContain('ignored');
  });
});
