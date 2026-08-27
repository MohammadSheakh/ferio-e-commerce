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
export class RedxAdapter implements CourierAdapter {
  readonly code = 'REDX' as const;

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return this.config.get<string>(
      'REDX_BASE_URL',
      'https://openapi.redx.com.bd/v1.0.0-beta',
    );
  }

  isConfigured(): boolean {
    return Boolean(this.config.get('REDX_API_TOKEN'));
  }

  isPollingConfigured(): boolean {
    return this.isConfigured();
  }

  async createShipment(
    input: CreateCourierShipmentInput,
  ): Promise<CreateCourierShipmentResult> {
    const token = this.config.get<string>('REDX_API_TOKEN');
    if (!token) {
      throw new BadRequestException('REDX_API_TOKEN is not configured');
    }

    const payloadBody = {
      customer_name: input.recipientName,
      customer_phone: input.recipientPhone,
      delivery_area: input.providerData?.areaName || input.recipientAddress,
      delivery_area_id: input.providerData?.areaId
        ? Number(input.providerData.areaId)
        : 1,
      customer_address: input.recipientAddress,
      merchant_invoice_id: input.orderReference,
      // RedX expects amounts in major units (BDT taka); internal money is
      // minor units (poisha) — divide to avoid demanding 100x COD at the door.
      cash_collection_amount: String(input.codAmount / 100),
      parcel_weight: Math.max(100, input.weightGrams),
      instruction: input.note || input.itemDescription,
      value: input.codAmount / 100,
    };

    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/parcel`, {
      method: 'POST',
      headers: correlationHeaders({
        'Content-Type': 'application/json',
        'API-ACCESS-TOKEN': `Bearer ${token}`,
      }),
      body: JSON.stringify(payloadBody),
      signal: AbortSignal.timeout(15000),
    });

    const payload = (await response.json()) as Record<string, unknown> & {
      tracking_id?: string;
      parcel_id?: string;
      message?: string;
      status?: string;
    };

    if (!response.ok) {
      throw new BadGatewayException(
        payload.message || 'REDX rejected shipment creation',
      );
    }

    const externalShipmentId = String(
      payload.tracking_id || payload.parcel_id || '',
    );
    if (!externalShipmentId) {
      throw new BadGatewayException('REDX returned no tracking/parcel ID');
    }

    const rawStatus = String(payload.status || 'parcel_created');
    const trackingUrl = `https://redx.com.bd/track-parcel?trackingId=${externalShipmentId}`;

    return {
      externalShipmentId,
      trackingNumber: externalShipmentId,
      trackingUrl,
      labelUrl: null,
      rawStatus,
      normalizedStatus: normalizeCourierStatus('REDX', rawStatus),
      shippingCharge: null,
      response: payload,
    };
  }

  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const secret = this.config.get<string>('REDX_WEBHOOK_SECRET');
    const provided =
      headers['x-redx-signature'] ??
      headers['x-api-key'] ??
      (headers['authorization'] as string)?.replace('Bearer ', '');
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
        payload.tracking_number || payload.tracking_id
          ? String(payload.tracking_number || payload.tracking_id)
          : undefined,
      orderReference:
        payload.invoice_number || payload.merchant_invoice_id
          ? String(payload.invoice_number || payload.merchant_invoice_id)
          : undefined,
      rawStatus,
      normalizedStatus: normalizeCourierStatus('REDX', rawStatus),
      occurredAt: payload.timestamp
        ? new Date(String(payload.timestamp))
        : new Date(),
    };
  }

  async pollShipment(
    input: PollCourierShipmentInput,
  ): Promise<Record<string, unknown>> {
    const token = this.config.get<string>('REDX_API_TOKEN');
    const id = input.externalShipmentId || input.trackingNumber;
    if (!token || !id) {
      throw new BadRequestException('REDX polling requires tracking ID');
    }

    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, '')}/parcel/track/${id}`,
      {
        method: 'GET',
        headers: correlationHeaders({
          'API-ACCESS-TOKEN': `Bearer ${token}`,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );

    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BadGatewayException('Failed to fetch REDX parcel status');
    }

    return payload;
  }
}
