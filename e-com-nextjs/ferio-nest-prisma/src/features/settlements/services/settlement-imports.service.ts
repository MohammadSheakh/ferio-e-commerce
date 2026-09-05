import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { UserPayload } from '@app/common';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../../tenancy/tenant-db.service';
import { AuditService } from '../../audit/audit.service';
import { ImportSettlementReportDto } from '../dto/settlement.dto';
import {
  SETTLEMENT_CSV_PARSER_VERSION,
  SettlementReportParserService,
} from './settlement-report-parser.service';
import { SettlementsService } from './settlements.service';

const importInclude = {
  provider: true,
  settlement: true,
  supersedesImport: {
    select: { id: true, reference: true, providerReportReference: true },
  },
  supersededBy: {
    select: { id: true, reference: true, providerReportReference: true },
  },
  rows: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.CourierSettlementImportInclude;

type ClassifiedRow = {
  input: ImportSettlementReportDto['rows'][number];
  providerRowReference: string;
  trackingNumber: string;
  deduplicationKey: string;
  rowHash: string;
  status:
    | 'APPLIED'
    | 'UNMATCHED'
    | 'INELIGIBLE'
    | 'ALREADY_SETTLED'
    | 'DUPLICATE';
  reason: string | null;
  matchedShipmentId: string | null;
  matchedCollectionId: string | null;
  duplicateOfRowId: string | null;
  replacesRowId: string | null;
};

type ParserEvidence = {
  sourceFileName: string;
  sourceFileChecksum: string;
  parserVersion: string;
  normalizedRowsChecksum: string;
};

@Injectable()
export class SettlementImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlements: SettlementsService,
    private readonly audit: AuditService,
    private readonly reportParser: SettlementReportParserService,
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

  async list() {
    const db = await this.db();
    return db.courierSettlementImport.findMany({
      take: 100,
      include: importInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async importReport(
    rawIdempotencyKey: string | undefined,
    dto: ImportSettlementReportDto,
    actor: UserPayload,
  ) {
    const db = await this.db();
    const idempotencyKeyHash = this.idempotencyHash(rawIdempotencyKey);
    const duplicate = await this.loadByIdempotency(idempotencyKeyHash);
    if (duplicate) return duplicate;
    const parserEvidence = this.verifyParserEvidence(dto);
    this.validateDistinctRows(dto);
    const provider = await db.shipmentProvider.findUnique({
      where: { code: dto.provider },
    });
    if (!provider) throw new NotFoundException('Courier provider not found');
    const providerReportReference = this.clean(dto.providerReportReference);
    const sourceHash = this.sourceHash(dto, providerReportReference);
    const existingReport = await db.courierSettlementImport.findFirst({
      where: {
        providerId: provider.id,
        OR: [{ providerReportReference }, { sourceHash }],
      },
      include: importInclude,
    });
    if (existingReport) {
      throw new ConflictException(
        'Provider settlement report already imported',
      );
    }
    const correctionTarget = dto.supersedesImportId
      ? await this.loadCorrectionTarget(dto.supersedesImportId, provider.id)
      : null;
    const correctionClaimHash = correctionTarget
      ? await this.acquireCorrectionClaim(
          correctionTarget.id,
          idempotencyKeyHash,
        )
      : null;
    let correctionApplied = false;
    try {
      let rows = await this.classifyRows(dto, correctionTarget?.id);
      if (rows.some((row) => row.status !== 'APPLIED')) {
        return await this.persistImport({
          idempotencyKeyHash,
          providerId: provider.id,
          providerReportReference,
          sourceHash,
          dto,
          rows,
          actor,
          settlementId: null,
          supersedesImportId: null,
          correctionClaimHash: null,
          parserEvidence,
        });
      }
      const settlement = await this.settlements.create(
        `settlement-report:${idempotencyKeyHash}`,
        {
          provider: dto.provider,
          providerSettlementReference: providerReportReference,
          bankReference: dto.bankReference,
          remittedAmount: dto.remittedAmount,
          settledAt: dto.settledAt,
          note: dto.note,
          items: rows.map((row) => ({
            shipmentId: row.matchedShipmentId!,
            collectedAmount: row.input.collectedAmount,
            courierFee: row.input.courierFee,
            otherDeduction: row.input.otherDeduction,
            note: row.input.note,
          })),
        },
        actor,
      );
      const imported = await this.persistImport({
        idempotencyKeyHash,
        providerId: provider.id,
        providerReportReference,
        sourceHash,
        dto,
        rows,
        actor,
        settlementId: settlement.id,
        supersedesImportId: correctionTarget?.id ?? null,
        correctionClaimHash,
        parserEvidence,
      });
      correctionApplied = imported.supersedesImportId === correctionTarget?.id;
      return imported;
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
      const rows = await this.classifyRows(dto, correctionTarget?.id);
      if (rows.every((row) => row.status === 'APPLIED')) throw error;
      return await this.persistImport({
        idempotencyKeyHash,
        providerId: provider.id,
        providerReportReference,
        sourceHash,
        dto,
        rows,
        actor,
        settlementId: null,
        supersedesImportId: null,
        correctionClaimHash: null,
        parserEvidence,
      });
    } finally {
      if (correctionTarget && correctionClaimHash && !correctionApplied) {
        await this.releaseCorrectionClaim(
          correctionTarget.id,
          correctionClaimHash,
        );
      }
    }
  }

  private async classifyRows(
    dto: ImportSettlementReportDto,
    correctionTargetId?: string,
  ): Promise<ClassifiedRow[]> {
    const db = await this.db();
    const normalizedRows = dto.rows.map((input) => ({
      input,
      providerRowReference: this.clean(input.providerRowReference),
      trackingNumber: this.clean(input.trackingNumber),
    }));
    const deduplicationKeys = normalizedRows.map((row) =>
      this.hash(`${dto.provider}:${row.providerRowReference}`),
    );
    const [shipments, existingRows] = await Promise.all([
      db.shipment.findMany({
        where: {
          provider: { code: dto.provider },
          trackingNumber: {
            in: normalizedRows.map((row) => row.trackingNumber),
          },
        },
        include: {
          order: true,
          codCollection: true,
          settlementItem: true,
        },
      }),
      db.courierSettlementImportRow.findMany({
        where: { deduplicationKey: { in: deduplicationKeys } },
        select: { id: true, importId: true, deduplicationKey: true },
      }),
    ]);
    const shipmentsByTracking = new Map<string, typeof shipments>();
    for (const shipment of shipments) {
      const matches = shipmentsByTracking.get(shipment.trackingNumber!) ?? [];
      matches.push(shipment);
      shipmentsByTracking.set(shipment.trackingNumber!, matches);
    }
    const existingByKey = new Map(
      existingRows.map((row) => [row.deduplicationKey, row]),
    );
    return normalizedRows.map((row, index) => {
      const deduplicationKey = deduplicationKeys[index];
      const existing = existingByKey.get(deduplicationKey);
      const matches = shipmentsByTracking.get(row.trackingNumber) ?? [];
      const shipment = matches.length === 1 ? matches[0] : null;
      const base = {
        ...row,
        deduplicationKey,
        rowHash: this.rowHash(
          row.input,
          row.providerRowReference,
          row.trackingNumber,
        ),
        matchedShipmentId: shipment?.id ?? null,
        matchedCollectionId: shipment?.codCollection?.id ?? null,
        duplicateOfRowId: existing?.id ?? null,
        replacesRowId:
          existing && existing.importId === correctionTargetId
            ? existing.id
            : null,
      };
      if (existing && existing.importId !== correctionTargetId) {
        return {
          ...base,
          status: 'DUPLICATE' as const,
          reason: 'Provider report row was imported previously',
        };
      }
      if (matches.length > 1) {
        return {
          ...base,
          status: 'INELIGIBLE' as const,
          reason: 'Tracking number matches multiple provider shipments',
        };
      }
      if (!shipment) {
        return {
          ...base,
          status: 'UNMATCHED' as const,
          reason: 'No shipment matches this provider tracking number',
        };
      }
      if (
        shipment.status !== 'DELIVERED' ||
        shipment.order.paymentMethod !== 'COD' ||
        !shipment.codCollection
      ) {
        return {
          ...base,
          status: 'INELIGIBLE' as const,
          reason: 'Shipment is not an eligible delivered COD collection',
        };
      }
      if (shipment.settlementItem) {
        return {
          ...base,
          status: 'ALREADY_SETTLED' as const,
          reason: 'Shipment already belongs to a courier settlement',
        };
      }
      if (
        row.input.courierFee + row.input.otherDeduction >
        row.input.collectedAmount
      ) {
        return {
          ...base,
          status: 'INELIGIBLE' as const,
          reason: 'Fees and deductions exceed collected amount',
        };
      }
      return { ...base, status: 'APPLIED' as const, reason: null };
    });
  }

  private async persistImport(input: {
    idempotencyKeyHash: string;
    providerId: string;
    providerReportReference: string;
    sourceHash: string;
    dto: ImportSettlementReportDto;
    rows: ClassifiedRow[];
    actor: UserPayload;
    settlementId: string | null;
    supersedesImportId: string | null;
    correctionClaimHash: string | null;
    parserEvidence: ParserEvidence | null;
  }) {
    const db = await this.db();
    const exceptionCount = input.rows.filter(
      (row) => row.status !== 'APPLIED',
    ).length;
    try {
      return await db.$transaction(async (transaction) => {
        if (input.supersedesImportId) {
          const claimed = await transaction.courierSettlementImport.updateMany({
            where: {
              id: input.supersedesImportId,
              status: 'NEEDS_REVIEW',
              supersededBy: null,
              correctionClaimHash: input.correctionClaimHash,
            },
            data: {
              status: 'SUPERSEDED',
              resolvedAt: new Date(),
              correctionClaimHash: null,
              correctionClaimedAt: null,
            },
          });
          if (claimed.count !== 1) {
            throw new ConflictException(
              'Settlement report correction is no longer available',
            );
          }
          await transaction.courierSettlementImportRow.updateMany({
            where: { importId: input.supersedesImportId },
            data: { deduplicationKey: null },
          });
        }
        const created = await transaction.courierSettlementImport.create({
          data: {
            reference: this.importReference(),
            idempotencyKeyHash: input.idempotencyKeyHash,
            providerReportReference: input.providerReportReference,
            sourceHash: input.sourceHash,
            source: input.dto.source,
            status: exceptionCount === 0 ? 'APPLIED' : 'NEEDS_REVIEW',
            rowCount: input.rows.length,
            appliedCount: input.rows.length - exceptionCount,
            exceptionCount,
            rawPayload: this.immutableImportPayload(
              input.dto,
            ) as unknown as Prisma.InputJsonValue,
            recordedByActorId: input.actor.userId,
            sourceFileName: input.parserEvidence?.sourceFileName,
            sourceFileChecksum: input.parserEvidence?.sourceFileChecksum,
            parserVersion: input.parserEvidence?.parserVersion,
            normalizedRowsChecksum:
              input.parserEvidence?.normalizedRowsChecksum,
            providerId: input.providerId,
            settlementId: input.settlementId,
            supersedesImportId: input.supersedesImportId,
            rows: {
              create: input.rows.map((row) => ({
                providerRowReference: row.providerRowReference,
                deduplicationKey:
                  row.status === 'DUPLICATE' ||
                  (row.replacesRowId && !input.supersedesImportId)
                    ? null
                    : row.deduplicationKey,
                rowHash: row.rowHash,
                trackingNumber: row.trackingNumber,
                status: row.status,
                reason: row.reason,
                collectedAmount: row.input.collectedAmount,
                courierFee: row.input.courierFee,
                otherDeduction: row.input.otherDeduction,
                matchedShipmentId: row.matchedShipmentId,
                matchedCollectionId: row.matchedCollectionId,
                duplicateOfRowId: row.duplicateOfRowId,
                rawPayload: row.input as unknown as Prisma.InputJsonValue,
              })),
            },
          },
        });
        const imported =
          await transaction.courierSettlementImport.findUniqueOrThrow({
            where: { id: created.id },
            include: importInclude,
          });
        await this.audit.record(
          {
            action: 'COURIER_SETTLEMENT_REPORT_IMPORTED',
            entityType: 'CourierSettlementImport',
            entityId: imported.id,
            actor: input.actor,
            newValue: imported,
            metadata: {
              provider: input.dto.provider,
              status: imported.status,
              rowCount: imported.rowCount,
              exceptionCount: imported.exceptionCount,
              settlementId: imported.settlementId,
            },
          },
          transaction,
        );
        if (input.supersedesImportId) {
          await this.audit.record(
            {
              action: 'COURIER_SETTLEMENT_REPORT_SUPERSEDED',
              entityType: 'CourierSettlementImport',
              entityId: input.supersedesImportId,
              actor: input.actor,
              previousValue: { status: 'NEEDS_REVIEW' },
              newValue: {
                status: 'SUPERSEDED',
                supersededByImportId: imported.id,
              },
            },
            transaction,
          );
        }
        return imported;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await this.loadByIdempotency(
          input.idempotencyKeyHash,
        );
        if (duplicate) return duplicate;
        throw new ConflictException(
          'Provider report or report row was imported concurrently',
        );
      }
      throw error;
    }
  }

  private async loadByIdempotency(idempotencyKeyHash: string) {
    const db = await this.db();
    return db.courierSettlementImport.findUnique({
      where: { idempotencyKeyHash },
      include: importInclude,
    });
  }

  private async loadCorrectionTarget(id: string, providerId: string) {
    const db = await this.db();
    const target = await db.courierSettlementImport.findUnique({
      where: { id },
      select: {
        id: true,
        providerId: true,
        status: true,
        supersededBy: { select: { id: true } },
      },
    });
    if (!target) throw new NotFoundException('Settlement import not found');
    if (
      target.providerId !== providerId ||
      target.status !== 'NEEDS_REVIEW' ||
      target.supersededBy
    ) {
      throw new ConflictException(
        'Only an unresolved review import from the same provider can be corrected',
      );
    }
    return target;
  }

  private async acquireCorrectionClaim(
    importId: string,
    idempotencyKeyHash: string,
  ) {
    const db = await this.db();
    const correctionClaimHash = this.hash(
      `settlement-correction:${idempotencyKeyHash}`,
    );
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
    const claimed = await db.courierSettlementImport.updateMany({
      where: {
        id: importId,
        status: 'NEEDS_REVIEW',
        supersededBy: null,
        OR: [
          { correctionClaimHash: null },
          { correctionClaimHash },
          { correctionClaimedAt: { lt: staleBefore } },
        ],
      },
      data: { correctionClaimHash, correctionClaimedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new ConflictException(
        'Another correction is already processing for this report',
      );
    }
    return correctionClaimHash;
  }

  private async releaseCorrectionClaim(
    importId: string,
    correctionClaimHash: string,
  ) {
    const db = await this.db();
    return db.courierSettlementImport.updateMany({
      where: { id: importId, correctionClaimHash },
      data: { correctionClaimHash: null, correctionClaimedAt: null },
    });
  }

  private validateDistinctRows(dto: ImportSettlementReportDto) {
    const rowReferences = dto.rows.map((row) =>
      this.clean(row.providerRowReference),
    );
    const trackingNumbers = dto.rows.map((row) =>
      this.clean(row.trackingNumber),
    );
    if (new Set(rowReferences).size !== rowReferences.length) {
      throw new BadRequestException(
        'A provider row reference can appear only once in a report',
      );
    }
    if (new Set(trackingNumbers).size !== trackingNumbers.length) {
      throw new BadRequestException(
        'A tracking number can appear only once in a report',
      );
    }
  }

  private sourceHash(
    dto: ImportSettlementReportDto,
    providerReportReference: string,
  ) {
    const rows = dto.rows
      .map((row) => ({
        providerRowReference: this.clean(row.providerRowReference),
        trackingNumber: this.clean(row.trackingNumber),
        collectedAmount: row.collectedAmount,
        courierFee: row.courierFee,
        otherDeduction: row.otherDeduction,
      }))
      .sort((first, second) =>
        first.providerRowReference.localeCompare(second.providerRowReference),
      );
    return this.hash(
      JSON.stringify({
        provider: dto.provider,
        providerReportReference,
        bankReference: this.clean(dto.bankReference),
        remittedAmount: dto.remittedAmount,
        settledAt: dto.settledAt,
        sourceFileChecksum: dto.csvEvidence?.sourceChecksum ?? null,
        rows,
      }),
    );
  }

  private verifyParserEvidence(
    dto: ImportSettlementReportDto,
  ): ParserEvidence | null {
    if (dto.source !== 'CSV') {
      if (dto.csvEvidence) {
        throw new BadRequestException(
          'CSV evidence is allowed only for CSV imports',
        );
      }
      return null;
    }
    if (!dto.csvEvidence) {
      throw new BadRequestException(
        'CSV imports require successful preflight evidence',
      );
    }
    const preflight = this.reportParser.preflight({
      provider: dto.provider,
      fileName: dto.csvEvidence.fileName,
      content: dto.csvEvidence.content,
    });
    if (!preflight.ready) {
      throw new BadRequestException(
        `CSV preflight failed: ${preflight.errors[0] ?? 'report is invalid'}`,
      );
    }
    if (preflight.sourceChecksum !== dto.csvEvidence.sourceChecksum) {
      throw new ConflictException(
        'CSV content changed after preflight; preview the file again',
      );
    }
    const normalizedRowsChecksum = this.normalizedRowsChecksum(dto.rows);
    if (preflight.normalizedRowsChecksum !== normalizedRowsChecksum) {
      throw new ConflictException(
        'Settlement rows changed after CSV preflight; preview the file again',
      );
    }
    return {
      sourceFileName: preflight.fileName,
      sourceFileChecksum: preflight.sourceChecksum,
      parserVersion: SETTLEMENT_CSV_PARSER_VERSION,
      normalizedRowsChecksum,
    };
  }

  private normalizedRowsChecksum(rows: ImportSettlementReportDto['rows']) {
    return this.hash(
      JSON.stringify(
        rows.map((row) => {
          const note = row.note ? this.clean(row.note) : '';
          return {
            providerRowReference: this.clean(row.providerRowReference),
            trackingNumber: this.clean(row.trackingNumber),
            collectedAmount: row.collectedAmount,
            courierFee: row.courierFee,
            otherDeduction: row.otherDeduction,
            ...(note ? { note } : {}),
          };
        }),
      ),
    );
  }

  private immutableImportPayload(dto: ImportSettlementReportDto) {
    const { csvEvidence, ...payload } = dto;
    return {
      ...payload,
      ...(csvEvidence
        ? {
            csvEvidence: {
              fileName: csvEvidence.fileName,
              sourceChecksum: csvEvidence.sourceChecksum,
            },
          }
        : {}),
    };
  }

  private rowHash(
    row: ImportSettlementReportDto['rows'][number],
    providerRowReference: string,
    trackingNumber: string,
  ) {
    return this.hash(
      JSON.stringify({
        providerRowReference,
        trackingNumber,
        collectedAmount: row.collectedAmount,
        courierFee: row.courierFee,
        otherDeduction: row.otherDeduction,
      }),
    );
  }

  private idempotencyHash(value?: string) {
    const key = value?.normalize('NFKC').trim();
    if (!key || key.length < 16 || key.length > 200) {
      throw new BadRequestException('A valid idempotency key is required');
    }
    return this.hash(key);
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private importReference() {
    const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
    return `SRI-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private clean(value: string) {
    return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  }
}
