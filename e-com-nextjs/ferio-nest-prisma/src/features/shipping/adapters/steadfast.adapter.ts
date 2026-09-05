import { BadGatewayException, Injectable } from '@nestjs/common';
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
export class SteadfastAdapter implements CourierAdapter {
  readonly code = 'STEADFAST' as const;

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return this.config.get<string>(
      'STEADFAST_BASE_URL',
      'https://portal.steadfast.com.bd/api/v1',
    );
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get('STEADFAST_API_KEY') &&
      this.config.get('STEADFAST_SECRET_KEY'),
    );
  }

  isPollingConfigured(): boolean {
    return false;
  }

  async createShipment(
    input: CreateCourierShipmentInput,
  ): Promise<CreateCourierShipmentResult> {
    const request = {
      invoice: input.orderReference,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      recipient_email: input.recipientEmail,
      cod_amount: input.codAmount / 100,
      note: input.note,
      item_description: input.itemDescription,
      total_lot: 1,
      delivery_type: 0,
    };
    const response = await fetch(`${this.baseUrl}/create_order`, {
      method: 'POST',
      headers: correlationHeaders({
        'Content-Type': 'application/json',
        'Api-Key': this.config.getOrThrow<string>('STEADFAST_API_KEY'),
        'Secret-Key': this.config.getOrThrow<string>('STEADFAST_SECRET_KEY'),
      }),
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(15000),
    });
    const payload = (await response.json()) as Record<string, unknown> & {
      message?: string;
      consignment?: Record<string, unknown>;
    };
    if (!response.ok || !payload.consignment) {
      throw new BadGatewayException(
        payload.message || 'Steadfast rejected shipment creation',
      );
    }
    const consignment = payload.consignment;
    const externalShipmentId = shippingText(consignment.consignment_id);
    if (!externalShipmentId) {
      throw new BadGatewayException('Steadfast returned no consignment ID');
    }
    const rawStatus = shippingText(consignment.status, 'in_review');
    const trackingNumber = consignment.tracking_code
      ? shippingText(consignment.tracking_code)
      : null;
    return {
      externalShipmentId,
      trackingNumber,
      trackingUrl: trackingNumber
        ? `https://steadfast.com.bd/t/${encodeURIComponent(trackingNumber)}`
        : null,
      labelUrl: null,
      rawStatus,
      normalizedStatus: normalizeCourierStatus('STEADFAST', rawStatus),
      shippingCharge: null,
      response: payload,
    };
  }

  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const token = this.config.get<string>('STEADFAST_WEBHOOK_TOKEN');
    const authorization = headers.authorization;
    return Boolean(
      token &&
      typeof authorization === 'string' &&
      secureWebhookCredentialEquals(authorization, `Bearer ${token}`),
    );
  }

  parseWebhook(payload: Record<string, unknown>): CourierWebhookEvent {
    const rawStatus = shippingText(payload.status, 'unknown');
    return {
      providerEventId: payload.updated_at
        ? `${shippingText(payload.consignment_id)}:${shippingText(payload.updated_at)}`
        : undefined,
      externalShipmentId: payload.consignment_id
        ? shippingText(payload.consignment_id)
        : undefined,
      trackingNumber: payload.tracking_code
        ? shippingText(payload.tracking_code)
        : undefined,
      orderReference: payload.invoice ? shippingText(payload.invoice) : undefined,
      rawStatus,
      normalizedStatus: normalizeCourierStatus('STEADFAST', rawStatus),
      occurredAt: payload.updated_at
        ? new Date(shippingText(payload.updated_at))
        : new Date(),
    };
  }
}
