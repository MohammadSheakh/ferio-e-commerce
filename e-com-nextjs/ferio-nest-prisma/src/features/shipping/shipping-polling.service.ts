import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/database';
import { ShippingService } from './shipping.service';

const TERMINAL_SHIPMENT_STATUSES = [
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
  'RTO',
] as const;

@Injectable()
export class ShippingPollingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shipping: ShippingService,
  ) {}

  getAttempts() {
    return this.prisma.shipmentPollAttempt.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        shipment: {
          select: {
            id: true,
            trackingNumber: true,
            status: true,
            provider: { select: { code: true, name: true } },
            order: { select: { id: true, reference: true } },
          },
        },
      },
    });
  }

  async eligibleShipments(limit: number) {
    const shipments = await this.prisma.shipment.findMany({
      where: {
        status: { notIn: [...TERMINAL_SHIPMENT_STATUSES] },
        provider: { isActive: true },
        OR: [{ nextPollAt: null }, { nextPollAt: { lte: new Date() } }],
        pollAttempts: {
          none: { status: { in: ['QUEUED', 'PROCESSING'] } },
        },
      },
      orderBy: [{ nextPollAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
      include: { provider: true },
    });
    return shipments.filter((shipment) =>
      this.shipping.getPollingSupport(shipment.provider.code),
    );
  }

  async prepareAttempt(shipmentId: string, requestedByActorId?: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { provider: true },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (TERMINAL_SHIPMENT_STATUSES.includes(shipment.status as never)) {
      throw new ConflictException('Terminal shipments do not need polling');
    }
    if (!shipment.externalShipmentId && !shipment.trackingNumber) {
      throw new ConflictException('Shipment has no provider tracking identity');
    }
    if (!this.shipping.getPollingSupport(shipment.provider.code)) {
      throw new ConflictException(
        `${shipment.provider.code} polling is not configured`,
      );
    }
    const active = await this.prisma.shipmentPollAttempt.findFirst({
      where: { shipmentId, status: { in: ['QUEUED', 'PROCESSING'] } },
    });
    if (active) return active;
    return this.prisma.shipmentPollAttempt.create({
      data: {
        correlationId: randomUUID(),
        shipmentId,
        requestedByActorId,
      },
    });
  }

  attachQueueJob(attemptId: string, queueJobId: string) {
    return this.prisma.shipmentPollAttempt.update({
      where: { id: attemptId },
      data: { queueJobId },
    });
  }

  async execute(attemptId: string) {
    const attempt = await this.prisma.shipmentPollAttempt.findUnique({
      where: { id: attemptId },
      include: {
        shipment: {
          include: { provider: true, order: { select: { reference: true } } },
        },
      },
    });
    if (!attempt)
      throw new NotFoundException('Shipment poll attempt not found');
    if (attempt.status === 'SUCCEEDED' || attempt.status === 'SKIPPED') {
      return attempt;
    }
    await this.prisma.shipmentPollAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
        errorCode: null,
        errorMessage: null,
      },
    });
    try {
      const response = await this.shipping.pollProviderShipment(
        attempt.shipment.provider.code,
        {
          externalShipmentId: attempt.shipment.externalShipmentId ?? undefined,
          trackingNumber: attempt.shipment.trackingNumber ?? undefined,
          orderReference: attempt.shipment.order.reference,
        },
      );
      const result = await this.shipping.processPolledPayload(
        attempt.shipment.provider.code,
        response,
      );
      if (!('normalizedStatus' in result) || !result.normalizedStatus) {
        throw new ConflictException('Courier poll produced no status evidence');
      }
      const completedAt = new Date();
      const terminal = TERMINAL_SHIPMENT_STATUSES.includes(
        result.normalizedStatus as never,
      );
      await this.prisma.$transaction([
        this.prisma.shipmentPollAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'SUCCEEDED',
            rawResponse: response as Prisma.InputJsonValue,
            normalizedStatus: result.normalizedStatus,
            evidenceLogId: result.evidenceLogId,
            finishedAt: completedAt,
          },
        }),
        this.prisma.shipment.update({
          where: { id: attempt.shipmentId },
          data: {
            lastPolledAt: completedAt,
            nextPollAt: terminal
              ? null
              : new Date(completedAt.getTime() + 15 * 60_000),
            pollingFailureCount: 0,
            pollingError: null,
          },
        }),
      ]);
      return this.prisma.shipmentPollAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      });
    } catch (error) {
      const failureCount = attempt.shipment.pollingFailureCount + 1;
      const delayMinutes = Math.min(15 * 2 ** (failureCount - 1), 360);
      const errorMessage =
        error instanceof Error ? error.message : 'Courier polling failed';
      await this.prisma.$transaction([
        this.prisma.shipmentPollAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'FAILED',
            errorCode: 'PROVIDER_POLL_FAILED',
            errorMessage,
            finishedAt: new Date(),
          },
        }),
        this.prisma.shipment.update({
          where: { id: attempt.shipmentId },
          data: {
            pollingFailureCount: failureCount,
            pollingError: errorMessage,
            nextPollAt: new Date(Date.now() + delayMinutes * 60_000),
          },
        }),
      ]);
      throw error;
    }
  }
}
