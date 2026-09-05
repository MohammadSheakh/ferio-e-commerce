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
} from './courier-adapter.interface';
import {
  normalizeCourierStatus,
  secureWebhookCredentialEquals,
  shippingText,
} from '../utils/shipping.util';

@Injectable()
export class PathaoAdapter implements CourierAdapter {
  readonly code = 'PATHAO' as const;

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return this.config.get<string>(
      'PATHAO_BASE_URL',
      'https://api-hermes.pathao.com',
    );
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get('PATHAO_CLIENT_ID') &&
      this.config.get('PATHAO_CLIENT_SECRET') &&
      this.config.get('PATHAO_USERNAME') &&
      this.config.get('PATHAO_PASSWORD') &&
      this.config.get('PATHAO_STORE_ID'),
    );
  }

  isPollingConfigured(): boolean {
    return false;
  }

  private async accessToken(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/aladdin/api/v1/issue-token`, {
      method: 'POST',
      headers: correlationHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        client_id: this.config.getOrThrow<string>('PATHAO_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('PATHAO_CLIENT_SECRET'),
        username: this.config.getOrThrow<string>('PATHAO_USERNAME'),
        password: this.config.getOrThrow<string>('PATHAO_PASSWORD'),
        grant_type: 'password',
      }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = (await response.json()) as {
      access_token?: string;
      message?: string;
    };
    if (!response.ok || !payload.access_token) {
      throw new BadGatewayException(
        payload.message || 'Pathao authentication failed',
      );
    }
    return payload.access_token;
  }

  async createShipment(
    input: CreateCourierShipmentInput,
  ): Promise<CreateCourierShipmentResult> {
    const city = Number(input.providerData?.recipientCity);
    const zone = Number(input.providerData?.recipientZone);
    const area = Number(input.providerData?.recipientArea);
    if (
      ![city, zone, area].every((value) => Number.isInteger(value) && value > 0)
    ) {
      throw new BadRequestException(
        'Pathao requires valid recipient city, zone, and area IDs',
      );
    }
    const request = {
      store_id: Number(this.config.getOrThrow('PATHAO_STORE_ID')),
      merchant_order_id: input.orderReference,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      recipient_city: city,
      recipient_zone: zone,
      recipient_area: area,
      delivery_type: 48,
      item_type: 2,
      special_instruction: input.note,
      item_quantity: input.itemQuantity,
      item_weight: Math.max(0.5, input.weightGrams / 1000),
      item_description: input.itemDescription,
      amount_to_collect: input.codAmount / 100,
    };
    const response = await fetch(`${this.baseUrl}/aladdin/api/v1/orders`, {
      method: 'POST',
      headers: correlationHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await this.accessToken()}`,
      }),
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(15000),
    });
    const payload = (await response.json()) as Record<string, unknown> & {
      message?: string;
      data?: Record<string, unknown>;
    };
    if (!response.ok || !payload.data) {
      throw new BadGatewayException(
        payload.message || 'Pathao rejected shipment creation',
      );
    }
    const externalShipmentId = shippingText(payload.data.consignment_id);
    if (!externalShipmentId) {
      throw new BadGatewayException('Pathao returned no consignment ID');
    }
    const rawStatus = shippingText(payload.data.status, 'order.created');
    return {
      externalShipmentId,
      trackingNumber: externalShipmentId,
      trackingUrl: null,
      labelUrl: null,
      rawStatus,
      normalizedStatus: normalizeCourierStatus('PATHAO', rawStatus),
      shippingCharge: null,
      response: payload,
    };
  }

  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const secret = this.config.get<string>('PATHAO_WEBHOOK_SECRET');
    const provided =
      headers['x-pathao-signature'] ??
      headers['x-pathao-merchant-webhook-integration-secret'];
    return Boolean(
      secret &&
      typeof provided === 'string' &&
      secureWebhookCredentialEquals(provided, secret),
    );
  }

  parseWebhook(payload: Record<string, unknown>): CourierWebhookEvent {
    const rawStatus = shippingText(payload.event ?? payload.status, 'unknown');
    return {
      providerEventId: payload.event_id ? shippingText(payload.event_id) : undefined,
      externalShipmentId: payload.consignment_id
        ? shippingText(payload.consignment_id)
        : undefined,
      orderReference: payload.merchant_order_id
        ? shippingText(payload.merchant_order_id)
        : undefined,
      rawStatus,
      normalizedStatus: normalizeCourierStatus('PATHAO', rawStatus),
      occurredAt: payload.updated_at
        ? new Date(shippingText(payload.updated_at))
        : new Date(),
    };
  }
}
