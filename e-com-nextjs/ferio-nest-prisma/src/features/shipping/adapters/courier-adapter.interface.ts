import { OrderShipmentStatus, ShipmentProviderCode } from '@prisma/client';

export type CreateCourierShipmentInput = {
  orderReference: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientEmail?: string;
  codAmount: number;
  weightGrams: number;
  itemQuantity: number;
  itemDescription: string;
  note?: string;
  providerData?: Record<string, number | string>;
};

export type CreateCourierShipmentResult = {
  externalShipmentId: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  rawStatus: string;
  normalizedStatus: OrderShipmentStatus;
  shippingCharge: number | null;
  response: Record<string, unknown>;
};

export type CourierWebhookEvent = {
  providerEventId?: string;
  externalShipmentId?: string;
  trackingNumber?: string;
  orderReference?: string;
  rawStatus: string;
  normalizedStatus: OrderShipmentStatus;
  occurredAt: Date;
};

export type PollCourierShipmentInput = {
  externalShipmentId?: string;
  trackingNumber?: string;
  orderReference: string;
};

export interface CourierAdapter {
  readonly code: ShipmentProviderCode;
  isConfigured(): boolean;
  createShipment(
    input: CreateCourierShipmentInput,
  ): Promise<CreateCourierShipmentResult>;
  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
  ): boolean;
  parseWebhook(payload: Record<string, unknown>): CourierWebhookEvent;
  isPollingConfigured(): boolean;
  pollShipment?(
    input: PollCourierShipmentInput,
  ): Promise<Record<string, unknown>>;
}
