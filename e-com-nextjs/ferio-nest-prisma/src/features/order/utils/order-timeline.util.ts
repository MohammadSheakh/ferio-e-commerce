export type OrderOperationalTimelineItem = {
  id: string;
  type:
    | 'ORDER'
    | 'FULFILLMENT'
    | 'PAYMENT'
    | 'SHIPMENT'
    | 'RETURN'
    | 'REFUND'
    | 'MESSAGE';
  title: string;
  status: string;
  detail: string | null;
  occurredAt: Date | string;
};

type TimelineInput = {
  order: {
    id: string;
    reference: string;
    status: string;
    createdAt: Date | string;
    statusHistory: Array<{
      id: string;
      newStatus: string;
      source: string;
      note: string | null;
      createdAt: Date | string;
    }>;
    fulfillmentHistory: Array<{
      id: string;
      newStatus: string;
      source: string;
      note: string | null;
      createdAt: Date | string;
    }>;
  };
  shipment: {
    id: string;
    status: string;
    trackingNumber: string | null;
    provider: { name: string };
    createdAt: Date | string;
    events: Array<{
      id: string;
      normalizedStatus: string;
      rawStatus: string;
      ignoredReason: string | null;
      occurredAt: Date | string;
    }>;
  } | null;
  payments: Array<{
    id: string;
    provider: string;
    status: string;
    amount: number;
    currency: string;
    createdAt: Date | string;
    completedAt: Date | string | null;
    callbacks: Array<{
      id: string;
      eventType: string;
      status: string;
      createdAt: Date | string;
    }>;
  }>;
  returns: Array<{
    id: string;
    rmaReference: string;
    status: string;
    createdAt: Date | string;
    history: Array<{
      id: string;
      newStatus: string;
      note: string | null;
      createdAt: Date | string;
    }>;
  }>;
  refunds: Array<{
    id: string;
    reference: string;
    status: string;
    amount: number;
    currency: string;
    method: string;
    createdAt: Date | string;
    completedAt: Date | string | null;
    attempts: Array<{
      id: string;
      attemptNumber: number;
      outcome: string;
      executionMode: string;
      provider: string | null;
      createdAt: Date | string;
    }>;
  }>;
  messages: Array<{
    id: string;
    eventType: string;
    status: string;
    templateVersion: number;
    renderedBody: string;
    createdAt: Date | string;
  }>;
};

export function buildOrderOperationalTimeline(
  input: TimelineInput,
): OrderOperationalTimelineItem[] {
  const items: OrderOperationalTimelineItem[] = [
    {
      id: `order-created:${input.order.id}`,
      type: 'ORDER',
      title: `Order ${input.order.reference} placed`,
      status: input.order.status,
      detail: null,
      occurredAt: input.order.createdAt,
    },
  ];

  for (const entry of input.order.statusHistory) {
    items.push({
      id: `order-status:${entry.id}`,
      type: 'ORDER',
      title: 'Order status updated',
      status: entry.newStatus,
      detail: [entry.note, entry.source.toLowerCase()]
        .filter(Boolean)
        .join(' · '),
      occurredAt: entry.createdAt,
    });
  }
  for (const entry of input.order.fulfillmentHistory) {
    items.push({
      id: `fulfillment:${entry.id}`,
      type: 'FULFILLMENT',
      title: 'Fulfillment status updated',
      status: entry.newStatus,
      detail: [entry.note, entry.source.toLowerCase()]
        .filter(Boolean)
        .join(' · '),
      occurredAt: entry.createdAt,
    });
  }
  if (input.shipment) {
    items.push({
      id: `shipment-created:${input.shipment.id}`,
      type: 'SHIPMENT',
      title: `Shipment created with ${input.shipment.provider.name}`,
      status: input.shipment.status,
      detail: input.shipment.trackingNumber
        ? `Tracking ${input.shipment.trackingNumber}`
        : null,
      occurredAt: input.shipment.createdAt,
    });
    for (const event of input.shipment.events) {
      items.push({
        id: `shipment-event:${event.id}`,
        type: 'SHIPMENT',
        title: 'Courier status received',
        status: event.normalizedStatus,
        detail: event.ignoredReason
          ? `${event.rawStatus} · ignored: ${event.ignoredReason}`
          : event.rawStatus,
        occurredAt: event.occurredAt,
      });
    }
  }
  for (const payment of input.payments) {
    items.push({
      id: `payment:${payment.id}`,
      type: 'PAYMENT',
      title: `${payment.provider} payment attempt`,
      status: payment.status,
      detail: `${payment.currency} ${payment.amount}`,
      occurredAt: payment.completedAt ?? payment.createdAt,
    });
    for (const callback of payment.callbacks) {
      items.push({
        id: `payment-callback:${callback.id}`,
        type: 'PAYMENT',
        title: `Payment callback · ${callback.eventType}`,
        status: callback.status,
        detail: payment.provider,
        occurredAt: callback.createdAt,
      });
    }
  }
  for (const returnCase of input.returns) {
    items.push({
      id: `return:${returnCase.id}`,
      type: 'RETURN',
      title: `Return ${returnCase.rmaReference} opened`,
      status: returnCase.status,
      detail: null,
      occurredAt: returnCase.createdAt,
    });
    for (const history of returnCase.history) {
      items.push({
        id: `return-history:${history.id}`,
        type: 'RETURN',
        title: `Return ${returnCase.rmaReference} updated`,
        status: history.newStatus,
        detail: history.note,
        occurredAt: history.createdAt,
      });
    }
  }
  for (const refund of input.refunds) {
    items.push({
      id: `refund:${refund.id}`,
      type: 'REFUND',
      title: `Refund ${refund.reference}`,
      status: refund.status,
      detail: `${refund.currency} ${refund.amount} · ${refund.method.toLowerCase()}`,
      occurredAt: refund.completedAt ?? refund.createdAt,
    });
    for (const attempt of refund.attempts) {
      items.push({
        id: `refund-attempt:${attempt.id}`,
        type: 'REFUND',
        title: `Refund attempt ${attempt.attemptNumber}`,
        status: attempt.outcome,
        detail: [attempt.executionMode.toLowerCase(), attempt.provider]
          .filter(Boolean)
          .join(' · '),
        occurredAt: attempt.createdAt,
      });
    }
  }
  for (const message of input.messages) {
    items.push({
      id: `message:${message.id}`,
      type: 'MESSAGE',
      title: message.eventType.replaceAll('_', ' ').toLowerCase(),
      status: message.status,
      detail: `${message.renderedBody} · template v${message.templateVersion}`,
      occurredAt: message.createdAt,
    });
  }

  return items.sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() -
      new Date(left.occurredAt).getTime(),
  );
}
