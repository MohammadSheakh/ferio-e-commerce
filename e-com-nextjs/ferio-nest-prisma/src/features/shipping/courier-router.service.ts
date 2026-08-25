import { Injectable, Optional } from '@nestjs/common';
import { ShipmentProviderCode } from '@prisma/client';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import type { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '@app/common';

export type CourierRouteInput = {
  district: string;
  upazila?: string;
  weightGrams: number;
  codAmount: number;
  urgent?: boolean;
};

export type CourierRouteRecommendation = {
  selectedProvider: ShipmentProviderCode;
  reason: string;
  score: number;
  availableProviders: Array<{
    code: ShipmentProviderCode;
    name: string;
    isConfigured: boolean;
    isActive: boolean;
    score: number;
  }>;
};

@Injectable()
export class CourierRouterService {
  private readonly logger = new StructuredLogger(CourierRouterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7: tenant client inside resolved contexts; explicit legacy fallback
   * outside resolved requests. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    const tenant = await this.tenantDb?.tryGet();
    return tenant ?? (this.prisma as unknown as PrismaClient);
  }

  /**
   * Selects the optimal courier provider based on destination, weight, COD amount, SLA, and active configuration.
   */
  async recommendProvider(
    input: CourierRouteInput,
  ): Promise<CourierRouteRecommendation> {
    const db = await this.db();
    const isDhaka =
      input.district.trim().toLowerCase() === 'dhaka' ||
      input.district.trim().toLowerCase().includes('dhaka');

    const dbProviders = await db.shipmentProvider.findMany();
    const configuredStatus: Record<ShipmentProviderCode, boolean> = {
      PATHAO: Boolean(
        this.config.get('PATHAO_CLIENT_ID') &&
        this.config.get('PATHAO_STORE_ID'),
      ),
      STEADFAST: Boolean(this.config.get('STEADFAST_API_KEY')),
      REDX: Boolean(this.config.get('REDX_API_TOKEN')),
      ECOURIER: Boolean(this.config.get('ECOURIER_API_KEY')),
      PAPERFLY: Boolean(this.config.get('PAPERFLY_KEY')),
      CARRYBEE: Boolean(
        this.config.get('CARRYBEE_CLIENT_ID') &&
        this.config.get('CARRYBEE_CLIENT_SECRET') &&
        this.config.get('CARRYBEE_CLIENT_CONTEXT'),
      ),
    };

    const allCodes: ShipmentProviderCode[] = [
      'PATHAO',
      'REDX',
      'CARRYBEE',
      'STEADFAST',
      'ECOURIER',
      'PAPERFLY',
    ];

    const scoredProviders = allCodes.map((code) => {
      const dbRecord = dbProviders.find((p) => p.code === code);
      const isActive = dbRecord ? dbRecord.isActive : true;
      const isConfigured = configuredStatus[code] ?? false;

      let score = 50;

      if (!isConfigured) score -= 40;
      if (!isActive) score -= 50;

      // Location based scoring rules
      if (isDhaka) {
        if (code === 'CARRYBEE') score += 35;
        if (code === 'PATHAO') score += 30;
        if (code === 'REDX') score += 25;
        if (code === 'STEADFAST') score += 15;
      } else {
        // Outside Dhaka
        if (code === 'REDX') score += 30;
        if (code === 'CARRYBEE') score += 28;
        if (code === 'ECOURIER') score += 25;
        if (code === 'STEADFAST') score += 20;
        if (code === 'PAPERFLY') score += 15;
        if (code === 'PATHAO') score += 10;
      }

      // Urgent priority
      if (input.urgent) {
        if (code === 'CARRYBEE' || code === 'PATHAO' || code === 'REDX') {
          score += 20;
        }
      }

      // Weight based preference (>2kg)
      if (input.weightGrams > 2000) {
        if (code === 'ECOURIER' || code === 'PAPERFLY') score += 15;
      }

      return {
        code,
        name: dbRecord?.name || code,
        isConfigured,
        isActive,
        score: Math.max(0, score),
      };
    });

    // Sort by highest score
    scoredProviders.sort((a, b) => b.score - a.score);

    const winner = scoredProviders[0];

    const reason = isDhaka
      ? `Selected ${winner.code} as top choice for Dhaka delivery (Score: ${winner.score}).`
      : `Selected ${winner.code} as top choice for nationwide delivery in ${input.district} (Score: ${winner.score}).`;

    this.logger.log('courier_provider_selected', {
      district: input.district,
      upazila: input.upazila,
      selectedProvider: winner.code,
      score: winner.score,
      weightGrams: input.weightGrams,
      urgent: input.urgent ?? false,
    });

    return {
      selectedProvider: winner.code,
      reason,
      score: winner.score,
      availableProviders: scoredProviders,
    };
  }
}
