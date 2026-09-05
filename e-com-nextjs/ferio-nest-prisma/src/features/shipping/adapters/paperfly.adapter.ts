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
export class PaperflyAdapter implements CourierAdapter {
  readonly code = 'PAPERFLY' as const;

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return this.config.get<string>(
      'PAPERFLY_BASE_URL',
      'https://api.paperfly.com.bd',
    );
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get('PAPERFLY_USERNAME') &&
      this.config.get('PAPERFLY_PASSWORD') &&
      this.config.get('PAPERFLY_KEY'),
    );
  }

  isPollingConfigured(): boolean {
    return this.isConfigured();
  }

  async createShipment(
    input: CreateCourierShipmentInput,
  ): Promise<CreateCourierShipmentResult> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Paperfly credentials missing');
    }

    const payloadBody = {
      merchantOrderReference: input.orderReference,
      storeName: this.config.get<string>(
        'PAPERFLY_STORE_NAME',
        'Ferio E-Commerce',
      ),
      productBrief: input.itemDescription || 'General Goods',
      // Paperfly expects amounts in major units (BDT taka); internal money is
      // minor units (poisha) — divide to avoid demanding 100x COD at the door.
      packagePrice: String(input.codAmount / 100),
      max_weight: String(Math.max(0.1, input.weightGrams / 1000)),
      customerName: input.recipientName,
      customerAddress: input.recipientAddress,
      customerPhone: input.recipientPhone,
    };

    const username = this.config.getOrThrow<string>('PAPERFLY_USERNAME');
    const password = this.config.getOrThrow<string>('PAPERFLY_PASSWORD');
    const paperflyKey = this.config.getOrThrow<string>('PAPERFLY_KEY');
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, '')}/merchant/api/service/new_order_v2.php`,
      {
        method: 'POST',
        headers: correlationHeaders({
          'Content-Type': 'application/json',
          Authorization: authHeader,
          paperflykey: paperflyKey,
        }),
        body: JSON.stringify(payloadBody),
        signal: AbortSignal.timeout(15000),
      },
    );

    const payload = (await response.json()) as Record<string, unknown> & {
      trackingNumber?: string;
      tracking_id?: string;
      order_id?: string;
      message?: string;
      status?: string;
    };

    if (!response.ok) {
      throw new BadGatewayException(
        payload.message || 'Paperfly rejected shipment creation',
      );
    }

    const externalShipmentId = String(
      payload.trackingNumber ||
        payload.tracking_id ||
        payload.order_id ||
        input.orderReference,
    );

    const rawStatus = String(payload.status || 'order_created');
    const trackingUrl = `https://go.paperfly.com.bd/tracking/${externalShipmentId}`;

    return {
      externalShipmentId,
      trackingNumber: externalShipmentId,
      trackingUrl,
      labelUrl: null,
      rawStatus,
      normalizedStatus: normalizeCourierStatus('PAPERFLY', rawStatus),
      shippingCharge: null,
      response: payload,
    };
  }

  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const secret = this.config.get<string>('PAPERFLY_WEBHOOK_SECRET');
    const provided = headers['x-paperfly-signature'] ?? headers['paperflykey'];
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
      externalShipmentId:
        payload.tracking_id || payload.trackingNumber || payload.order_id
          ? String(
              payload.tracking_id || payload.trackingNumber || payload.order_id,
            )
          : undefined,
      orderReference:
        payload.merchantOrderReference || payload.merOrderRef
          ? String(payload.merchantOrderReference || payload.merOrderRef)
          : undefined,
      rawStatus,
      normalizedStatus: normalizeCourierStatus('PAPERFLY', rawStatus),
      occurredAt: payload.updated_at
        ? new Date(String(payload.updated_at))
        : new Date(),
    };
  }

  async pollShipment(
    input: PollCourierShipmentInput,
  ): Promise<Record<string, unknown>> {
    const id =
      input.orderReference || input.externalShipmentId || input.trackingNumber;
    if (!this.isConfigured() || !id) {
      throw new BadRequestException(
        'Paperfly polling requires order reference',
      );
    }

    const username = this.config.getOrThrow<string>('PAPERFLY_USERNAME');
    const password = this.config.getOrThrow<string>('PAPERFLY_PASSWORD');
    const paperflyKey = this.config.getOrThrow<string>('PAPERFLY_KEY');
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, '')}/API-Order-Tracking`,
      {
        method: 'POST',
        headers: correlationHeaders({
          'Content-Type': 'application/json',
          Authorization: authHeader,
          paperflykey: paperflyKey,
        }),
        body: JSON.stringify({ ReferenceNumber: id }),
        signal: AbortSignal.timeout(15000),
      },
    );

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BadGatewayException('Failed to fetch Paperfly parcel status');
    }

    return payload;
  }
}
