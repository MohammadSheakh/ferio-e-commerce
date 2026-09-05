import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { correlationHeaders } from '@app/common';
import {
  CourierAdapter,
  CourierWebhookEvent,
  CreateCourierShipmentInput,
  CreateCourierShipmentResult,
  PollCourierShipmentInput,
} from './courier-adapter.interface';
import {
  normalizeCourierStatus,
  secureWebhookCredentialEquals,
} from '../utils/shipping.util';

@Injectable()
export class CarrybeeAdapter implements CourierAdapter {
  readonly code = 'CARRYBEE' as const;

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return this.config.get<string>(
      'CARRYBEE_BASE_URL',
      'https://developers.carrybee.com',
    );
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get('CARRYBEE_CLIENT_ID') &&
      this.config.get('CARRYBEE_CLIENT_SECRET') &&
      this.config.get('CARRYBEE_CLIENT_CONTEXT'),
    );
  }

  isPollingConfigured(): boolean {
    return this.isConfigured();
  }

  private get requestHeaders(): Record<string, string> {
    return correlationHeaders({
      'Content-Type': 'application/json',
      'Client-ID': this.config.getOrThrow<string>('CARRYBEE_CLIENT_ID'),
      'Client-Secret': this.config.getOrThrow<string>('CARRYBEE_CLIENT_SECRET'),
      'Client-Context': this.config.getOrThrow<string>(
        'CARRYBEE_CLIENT_CONTEXT',
      ),
    });
  }

  async createShipment(
    input: CreateCourierShipmentInput,
  ): Promise<CreateCourierShipmentResult> {
    if (!this.isConfigured()) {
      throw new BadRequestException('CarryBee API credentials missing');
    }

    const payloadBody = {
      merchant_order_id: input.orderReference,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      recipient_city_id: input.providerData?.cityId
        ? Number(input.providerData.cityId)
        : undefined,
      recipient_zone_id: input.providerData?.zoneId
        ? Number(input.providerData.zoneId)
        : undefined,
      recipient_area_id: input.providerData?.areaId
        ? Number(input.providerData.areaId)
        : undefined,
      amount_to_collect: input.codAmount / 100,
      item_weight: Math.max(0.5, input.weightGrams / 1000),
      item_quantity: input.itemQuantity,
      item_description: input.itemDescription,
      special_instruction: input.note,
    };

    const response = await fetch(`${this.baseUrl}/api/v2/orders`, {
      method: 'POST',
      headers: this.requestHeaders,
      body: JSON.stringify(payloadBody),
      signal: AbortSignal.timeout(15000),
    });

    const payload = (await response.json()) as Record<string, unknown> & {
      consignment_id?: string;
      tracking_code?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new BadGatewayException(
        payload.message || 'CarryBee rejected shipment creation',
      );
    }

    const externalShipmentId = String(
      payload.consignment_id || payload.tracking_code || '',
    );
    if (!externalShipmentId) {
      throw new BadGatewayException('CarryBee returned no consignment ID');
    }

    const rawStatus = String(payload.status || 'order_created');
    const trackingUrl = `https://carrybee.com/track?consignment_id=${externalShipmentId}`;

    return {
      externalShipmentId,
      trackingNumber: externalShipmentId,
      trackingUrl,
      labelUrl: null,
      rawStatus,
      normalizedStatus: normalizeCourierStatus('CARRYBEE', rawStatus),
      shippingCharge: null,
      response: payload,
    };
  }

  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const secret = this.config.get<string>('CARRYBEE_WEBHOOK_SECRET');
    const provided =
      headers['x-cb-webhook-integration-header'] ??
      headers['x-carrybee-webhook-signature'];
    return Boolean(
      secret &&
      typeof provided === 'string' &&
      secureWebhookCredentialEquals(provided, secret),
    );
  }

  parseWebhook(payload: Record<string, unknown>): CourierWebhookEvent {
    const rawStatus = String(payload.status || payload.event || 'unknown');
    return {
      providerEventId: payload.event_id ? String(payload.event_id) : undefined,
      externalShipmentId: payload.consignment_id
        ? String(payload.consignment_id)
        : undefined,
      orderReference: payload.merchant_order_id
        ? String(payload.merchant_order_id)
        : undefined,
      rawStatus,
      normalizedStatus: normalizeCourierStatus('CARRYBEE', rawStatus),
      occurredAt:
        payload.timestamp || payload.updated_at
          ? new Date(String(payload.timestamp || payload.updated_at))
          : new Date(),
    };
  }

  async pollShipment(
    input: PollCourierShipmentInput,
  ): Promise<Record<string, unknown>> {
    const id = input.externalShipmentId || input.trackingNumber;
    if (!this.isConfigured() || !id) {
      throw new BadRequestException('CarryBee polling requires consignment ID');
    }

    const response = await fetch(
      `${this.baseUrl}/api/v2/orders/${id}/details`,
      {
        method: 'GET',
        headers: this.requestHeaders,
        signal: AbortSignal.timeout(15000),
      },
    );

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BadGatewayException('Failed to fetch CarryBee order details');
    }

    return payload;
  }
}
