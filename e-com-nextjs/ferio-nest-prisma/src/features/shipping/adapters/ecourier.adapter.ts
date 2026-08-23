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
} from '../shipping.util';

@Injectable()
export class EcourierAdapter implements CourierAdapter {
  readonly code = 'ECOURIER' as const;

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return this.config.get<string>(
      'ECOURIER_BASE_URL',
      'https://backoffice.ecourier.com.bd/api',
    );
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get('ECOURIER_API_KEY') &&
      this.config.get('ECOURIER_API_SECRET') &&
      this.config.get('ECOURIER_USER_ID'),
    );
  }

  isPollingConfigured(): boolean {
    return this.isConfigured();
  }

  async createShipment(
    input: CreateCourierShipmentInput,
  ): Promise<CreateCourierShipmentResult> {
    if (!this.isConfigured()) {
      throw new BadRequestException('eCourier credentials are missing');
    }

    const payloadBody = {
      recipient_name: input.recipientName,
      recipient_mobile: input.recipientPhone,
      recipient_address: input.recipientAddress,
      recipient_city: input.providerData?.city || 'Dhaka',
      recipient_thana: input.providerData?.thana || 'Dhaka',
      package_code: input.orderReference,
      payment_method: 'COD',
      ep_id: input.orderReference,
      product_price: input.codAmount / 100,
      weight: Math.max(0.5, input.weightGrams / 1000),
      number_of_item: input.itemQuantity,
      actual_product_price: input.codAmount / 100,
    };

    const response = await fetch(`${this.baseUrl}/order-place`, {
      method: 'POST',
      headers: correlationHeaders({
        'Content-Type': 'application/json',
        'API-KEY': this.config.getOrThrow<string>('ECOURIER_API_KEY'),
        'API-SECRET': this.config.getOrThrow<string>('ECOURIER_API_SECRET'),
        'USER-ID': this.config.getOrThrow<string>('ECOURIER_USER_ID'),
      }),
      body: JSON.stringify(payloadBody),
      signal: AbortSignal.timeout(15000),
    });

    const payload = (await response.json()) as Record<string, unknown> & {
      ecourier_tracking_id?: string;
      ID?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new BadGatewayException(
        payload.message || 'eCourier rejected shipment creation',
      );
    }

    const externalShipmentId = String(
      payload.ecourier_tracking_id || payload.ID || '',
    );
    if (!externalShipmentId) {
      throw new BadGatewayException('eCourier returned no tracking ID');
    }

    const rawStatus = String(payload.status || 'pending');
    const trackingUrl = `https://ecourier.com.bd/track-parcel?tracking_id=${externalShipmentId}`;

    return {
      externalShipmentId,
      trackingNumber: externalShipmentId,
      trackingUrl,
      labelUrl: null,
      rawStatus,
      normalizedStatus: normalizeCourierStatus('ECOURIER', rawStatus),
      shippingCharge: null,
      response: payload,
    };
  }

  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const secret = this.config.get<string>('ECOURIER_WEBHOOK_SECRET');
    const provided = headers['x-ecourier-signature'] ?? headers['api-secret'];
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
      externalShipmentId: payload.tracking_id
        ? String(payload.tracking_id)
        : undefined,
      orderReference:
        payload.product_id || payload.package_code
          ? String(payload.product_id || payload.package_code)
          : undefined,
      rawStatus,
      normalizedStatus: normalizeCourierStatus('ECOURIER', rawStatus),
      occurredAt: payload.updated_at
        ? new Date(String(payload.updated_at))
        : new Date(),
    };
  }

  async pollShipment(
    input: PollCourierShipmentInput,
  ): Promise<Record<string, unknown>> {
    const id = input.externalShipmentId || input.trackingNumber;
    if (!this.isConfigured() || !id) {
      throw new BadRequestException('eCourier polling requires tracking ID');
    }

    const response = await fetch(`${this.baseUrl}/track-status`, {
      method: 'POST',
      headers: correlationHeaders({
        'Content-Type': 'application/json',
        'API-KEY': this.config.getOrThrow<string>('ECOURIER_API_KEY'),
        'API-SECRET': this.config.getOrThrow<string>('ECOURIER_API_SECRET'),
        'USER-ID': this.config.getOrThrow<string>('ECOURIER_USER_ID'),
      }),
      body: JSON.stringify({ tracking_id: id }),
      signal: AbortSignal.timeout(15000),
    });

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BadGatewayException('Failed to fetch eCourier parcel status');
    }

    return payload;
  }
}
