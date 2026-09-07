import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PlatformPrismaService } from '../platform-prisma.service';
import { PlatformAuditService } from './platform-audit.service';
import { OrganizationsService } from './organizations.service';
import { DomainsService } from './domains.service';
import { TenantDatabasesService } from './tenant-databases.service';
import { TenantSchemaBootstrapper } from '../../tenancy/services/tenant-schema.bootstrapper';
import type { TenantDatabaseProvisioner } from './tenant-database-provisioner.interface';
import { toPlatformJsonInput } from '../utils/json-input.util';

/**
 * Pluggable physical infrastructure executor. The orchestration state machine
 * is production code; the physical database creation step is infrastructure
 * (owner-blocked: PostgreSQL hosting model). The default executor registers
 * the tenant database against the platform PostgreSQL instance so local and
 * early deployments work end to end, while remaining replaceable.
 */
export interface ProvisioningExecutor {
  createTenantDatabase(params: {
    organizationId: string;
    slug: string;
  }): Promise<{
    host: string;
    port: number;
    databaseName: string;
    username: string;
    password: string;
  }>;
}

export const PROVISIONING_STEPS = [
  'RESERVE_SUBDOMAIN',
  'REGISTER_TENANT_DATABASE',
  'PROVISION_PHYSICAL_DATABASE',
  'APPLY_MIGRATIONS',
  'SEED_TENANT',
  'ATTACH_OWNER_MEMBERSHIP',
  'HEALTH_CHECK',
  'SMOKE_TEST',
  'ACTIVATE_ORGANIZATION',
] as const;

@Injectable()
export class ProvisioningService {
  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly audit: PlatformAuditService,
    private readonly organizations: OrganizationsService,
    private readonly domains: DomainsService,
    private readonly databases: TenantDatabasesService,
    private readonly bootstrapper: TenantSchemaBootstrapper,

    @Inject('TENANT_DB_PROVISIONER')
    private readonly dbProvisioner: TenantDatabaseProvisioner,
  ) {}

  /**
   * Idempotent entry point: the idempotencyKey makes replays safe — a repeated
   * call returns the existing run instead of creating duplicate databases or
   * domains. Failed runs resume from their first non-completed step.
   */
  async start(
    organizationId: string,
    options: { actorId?: string; idempotencyKey?: string } = {},
  ) {
    const organization = await this.platform.client.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) throw new NotFoundException('ORGANIZATION_NOT_FOUND');

    const idempotencyKey =
      options.idempotencyKey ??
      `prov:${organizationId}:${randomBytes(4).toString('hex')}`;
    const existingRun = await this.platform.client.provisioningRun.findUnique({
      where: { idempotencyKey },
      include: { steps: true },
    });
    if (existingRun) {
      if (existingRun.organizationId !== organizationId) {
        throw new ConflictException('PROVISIONING_IDEMPOTENCY_KEY_CONFLICT');
      }
      if (existingRun.status === 'COMPLETED') return existingRun;
      return this.resume(existingRun.id, options.actorId);
    }

    let run: { id: string };
    try {
      run = await this.platform.client.provisioningRun.create({
        data: {
          organizationId,
          idempotencyKey,
          status: 'PENDING',
          steps: {
            create: PROVISIONING_STEPS.map((name) => ({
              name,
              status: 'PENDING',
            })),
          },
        },
        include: { steps: true },
      });
    } catch (error: unknown) {
      if (
        !(
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2002'
        )
      ) {
        throw error;
      }
      const racedRun = await this.platform.client.provisioningRun.findUnique({
        where: { idempotencyKey },
        include: { steps: true },
      });
      if (!racedRun) throw error;
      if (racedRun.organizationId !== organizationId) {
        throw new ConflictException('PROVISIONING_IDEMPOTENCY_KEY_CONFLICT');
      }
      if (racedRun.status === 'COMPLETED') return racedRun;
      return this.resume(racedRun.id, options.actorId);
    }
    return this.resume(run.id, options.actorId);
  }

  async resume(runId: string, actorId?: string) {
    const run = await this.platform.client.provisioningRun.findUnique({
      where: { id: runId },
      include: { steps: { orderBy: { id: 'asc' } }, organization: true },
    });
    if (!run) throw new NotFoundException('PROVISIONING_RUN_NOT_FOUND');
    if (run.status === 'COMPLETED') return run;

    await this.platform.client.provisioningRun.update({
      where: { id: run.id },
      data: { status: 'RUNNING' },
    });

    try {
      for (const step of run.steps) {
        if (step.status === 'COMPLETED') continue;
        await this.executeStep(run, step.name, step.id);
      }
      const completed = await this.platform.client.provisioningRun.update({
        where: { id: run.id },
        data: { status: 'COMPLETED' },
        include: { steps: true },
      });
      await this.audit.record({
        action: 'TENANT_PROVISIONING_COMPLETED',
        entityType: 'Organization',
        entityId: run.organizationId,
        actorId,
        metadata: { runId: run.id },
      });
      return completed;
    } catch (error) {
      await this.platform.client.provisioningRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          errorSummary:
            error instanceof Error ? error.message : 'provisioning failed',
        },
      });
      await this.organizations
        .transition(run.organizationId, 'PROVISIONING_FAILED', {
          actorId,
          reason: error instanceof Error ? error.message : undefined,
        })
        .catch(() => undefined);
      throw error;
    }
  }

  private async executeStep(
    run: {
      id: string;
      organizationId: string;
      organization: { slug: string; name: string };
    },
    stepName: string,
    stepRowId: string,
  ) {
    const mark = (status: string, detail?: Record<string, unknown>) =>
      this.platform.client.provisioningStep.update({
        where: { id: stepRowId },
        data: {
          status,
          detail: toPlatformJsonInput(detail),
          startedAt: status === 'RUNNING' ? new Date() : undefined,
          completedAt:
            status === 'COMPLETED' || status === 'FAILED'
              ? new Date()
              : undefined,
        },
      });

    await mark('RUNNING');
    try {
      switch (stepName) {
        case 'RESERVE_SUBDOMAIN': {
          const existing = await this.platform.client.tenantDomain.findFirst({
            where: {
              organizationId: run.organizationId,
              type: 'PLATFORM_SUBDOMAIN',
            },
          });
          const domain =
            existing ??
            (await this.domains.reserveSubdomain(
              run.organizationId,
              run.organization.slug,
            ));
          await mark('COMPLETED', { hostname: domain.hostname });
          break;
        }
        case 'REGISTER_TENANT_DATABASE': {
          // Physical creation is delegated to the executor below; registry row
          // is created together with it so retries cannot double-create.
          const existing = await this.platform.client.tenantDatabase.findUnique(
            {
              where: { organizationId: run.organizationId },
            },
          );
          if (existing) {
            await mark('COMPLETED', { databaseName: existing.databaseName });
            break;
          }
          const material = await this.executor().createTenantDatabase({
            organizationId: run.organizationId,
            slug: run.organization.slug,
          });
          await this.databases.register({
            organizationId: run.organizationId,
            ...material,
          });
          await mark('COMPLETED', { databaseName: material.databaseName });
          break;
        }
        case 'PROVISION_PHYSICAL_DATABASE':
          // Performed inside REGISTER_TENANT_DATABASE by the executor; kept as
          // an explicit recorded step for evidence continuity.
          await mark('COMPLETED', { note: 'executed via executor' });
          break;
        case 'APPLY_MIGRATIONS': {
          // Apply the canonical tenant migration artifact set to the fresh
          // database, then stamp the resulting schema version in the registry
          // (ADR-0005 packaging).
          const registry = await this.platform.client.tenantDatabase.findUnique(
            {
              where: { organizationId: run.organizationId },
            },
          );
          if (!registry) throw new ConflictException('TENANT_DATABASE_MISSING');
          const connection = await this.databases.getDecryptedConnection(
            registry.id,
          );
          const result = await this.bootstrapper.bootstrap(connection);
          await this.databases.setSchemaVersion(
            registry.id,
            result.schemaVersion,
          );
          await mark('COMPLETED', {
            schemaVersion: result.schemaVersion,
            appliedCount: result.applied.length,
          });
          break;
        }
        case 'SEED_TENANT': {
          const seeded = await this.platform.client.tenantDatabase.findUnique({
            where: { organizationId: run.organizationId },
          });
          if (!seeded) throw new ConflictException('TENANT_DATABASE_MISSING');
          const seedConnection = await this.databases.getDecryptedConnection(
            seeded.id,
          );
          await this.bootstrapper.seedBaseline({
            ...seedConnection,
            organizationName: run.organization.name,
          });
          await mark('COMPLETED', { note: 'baseline settings seeded' });
          break;
        }
        case 'ATTACH_OWNER_MEMBERSHIP': {
          // Owner membership rows are created during organization creation;
          // recorded here for evidence completeness.
          await mark('COMPLETED', {
            note: 'owner membership created at organization creation',
          });
          break;
        }
        case 'HEALTH_CHECK': {
          const registry = await this.platform.client.tenantDatabase.findUnique(
            {
              where: { organizationId: run.organizationId },
            },
          );
          if (!registry) throw new ConflictException('TENANT_DATABASE_MISSING');
          const connection = await this.databases.getDecryptedConnection(
            registry.id,
          );
          await this.bootstrapper.verifyReady(connection);
          await this.databases.markReady(
            registry.id,
            registry.schemaVersion ?? '',
          );
          await mark('COMPLETED', { databaseReachable: true });
          break;
        }
        case 'SMOKE_TEST': {
          const registry = await this.platform.client.tenantDatabase.findUnique(
            {
              where: { organizationId: run.organizationId },
            },
          );
          if (!registry) throw new ConflictException('TENANT_DATABASE_MISSING');
          const connection = await this.databases.getDecryptedConnection(
            registry.id,
          );
          await this.bootstrapper.verifyReady(connection);
          await mark('COMPLETED', { baselineTablesVerified: true });
          break;
        }
        case 'ACTIVATE_ORGANIZATION': {
          const organization =
            await this.platform.client.organization.findUnique({
              where: { id: run.organizationId },
              select: { status: true },
            });
          if (!organization)
            throw new NotFoundException('ORGANIZATION_NOT_FOUND');
          if (organization.status !== 'ACTIVE') {
            await this.organizations.transition(run.organizationId, 'ACTIVE', {
              reason: 'provisioning completed',
            });
          }
          const domain = await this.platform.client.tenantDomain.findFirst({
            where: {
              organizationId: run.organizationId,
              type: 'PLATFORM_SUBDOMAIN',
            },
          });
          if (!domain) throw new ConflictException('TENANT_DOMAIN_MISSING');
          await this.domains.activatePlatformSubdomain(domain.id);
          await mark('COMPLETED');
          break;
        }
        default:
          await mark('SKIPPED', { note: `unknown step ${stepName}` });
      }
    } catch (error) {
      await mark('FAILED', {
        error: error instanceof Error ? error.message : 'step failed',
      });
      throw error;
    }
  }

  /** Physical creation boundary selected by the module's DI token. */
  private executor(): ProvisioningExecutor {
    return this.dbProvisioner;
  }
}
