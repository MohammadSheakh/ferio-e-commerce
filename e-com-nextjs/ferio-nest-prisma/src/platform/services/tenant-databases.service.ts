import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PlatformAuditService } from './platform-audit.service';
import { decryptSecret, encryptSecret } from '../utils/secret-box';
import { PlatformPrismaService } from '../platform-prisma.service';
import { TenantDatabaseManager } from '../../tenancy/services/tenant-database.manager';
import { SIGNATURE_INITIAL_SECTIONS } from '../../features/storefront/services/storefront.service';

export interface RegisterTenantDatabaseInput {
  organizationId: string;
  host: string;
  port?: number;
  databaseName: string;
  username: string;
  /** Plaintext at the API boundary only; stored AES-256-GCM encrypted. */
  password: string;
}

/**
 * Registry of physical tenant databases. This is the ONLY trusted source the
 * connection manager (ADR-0003) may use to reach a tenant database; request
 * input can never supply connection parameters.
 */
@Injectable()
export class TenantDatabasesService {
  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly audit: PlatformAuditService,
    @Optional()
    private readonly manager?: TenantDatabaseManager,
  ) {}

  async register(input: RegisterTenantDatabaseInput) {
    const secret = process.env.PLATFORM_DB_CREDENTIAL_KEY;
    const existing = await this.platform.client.tenantDatabase.findUnique({
      where: { organizationId: input.organizationId },
    });
    if (existing) {
      throw new ConflictException('TENANT_DATABASE_ALREADY_REGISTERED');
    }
    const record = await this.platform.client.tenantDatabase.create({
      data: {
        organizationId: input.organizationId,
        status: 'REGISTERED',
        host: input.host,
        port: input.port ?? 5432,
        databaseName: input.databaseName,
        username: input.username,
        credentialCipher: encryptSecret(input.password, secret),
      },
    });
    await this.audit.record({
      action: 'TENANT_DATABASE_REGISTERED',
      entityType: 'TenantDatabase',
      entityId: record.id,
      newValue: {
        organizationId: input.organizationId,
        host: input.host,
        port: record.port,
        databaseName: input.databaseName,
        // Never audit secrets — not even their length or hint.
      },
    });
    return this.publicView(record.id);
  }

  async markReady(id: string, schemaVersion: string) {
    await this.platform.client.tenantDatabase.update({
      where: { id },
      data: {
        status: 'READY',
        schemaVersion,
        lastHealthAt: new Date(),
        lastHealthy: true,
      },
    });
    return this.publicView(id);
  }

  async setSchemaVersion(id: string, schemaVersion: string) {
    await this.platform.client.tenantDatabase.update({
      where: { id },
      data: { schemaVersion },
    });
    return this.publicView(id);
  }

  async recordHealth(id: string, healthy: boolean) {
    await this.platform.client.tenantDatabase.update({
      where: { id },
      data: {
        lastHealthAt: new Date(),
        lastHealthy: healthy,
        status: healthy ? undefined : 'UNHEALTHY',
      },
    });
  }

  /**
   * Internal-only: decrypted connection parameters for infrastructure flows
   * (schema bootstrap, health checks). Never exposed through any API surface.
   */
  async getDecryptedConnection(id: string) {
    const record = await this.platform.client.tenantDatabase.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('TENANT_DATABASE_NOT_FOUND');
    const password = decryptSecret(
      record.credentialCipher,
      process.env.PLATFORM_DB_CREDENTIAL_KEY,
    );
    return {
      host: record.host,
      port: record.port,
      database: record.databaseName,
      user: record.username,
      password,
    };
  }

  /** Resolve full connection material for the connection manager. */
  async getConnectionMaterial(id: string) {
    const record = await this.platform.client.tenantDatabase.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('TENANT_DATABASE_NOT_FOUND');
    if (record.status !== 'READY') {
      throw new ConflictException(`TENANT_DATABASE_NOT_READY:${record.status}`);
    }
    return record;
  }

  /**
   * On-demand physical storage measurement for a specific tenant database.
   * Runs explicitly upon operator confirmation to prevent automated SSD/IO wear.
   */
  async measureStorage(organizationId: string) {
    const record = await this.platform.client.tenantDatabase.findUnique({
      where: { organizationId },
    });
    if (!record) {
      throw new NotFoundException('TENANT_DATABASE_NOT_FOUND');
    }

    try {
      const rows = await this.platform.client.$queryRawUnsafe<
        Array<{ sizeBytes: string; formattedSize: string }>
      >(
        `SELECT pg_database_size($1)::text AS "sizeBytes", pg_size_pretty(pg_database_size($1)) AS "formattedSize"`,
        record.databaseName,
      );

      const sizeBytes = rows[0]?.sizeBytes ?? '0';
      const formattedSize = rows[0]?.formattedSize ?? '0 bytes';
      const now = new Date();

      await this.platform.client.tenantDatabase.update({
        where: { id: record.id },
        data: {
          diskSizeBytes: BigInt(sizeBytes),
          diskSizeRecordedAt: now,
        },
      });

      await this.audit.record({
        action: 'TENANT_DATABASE_STORAGE_MEASURED',
        entityType: 'TenantDatabase',
        entityId: record.id,
        newValue: {
          organizationId,
          databaseName: record.databaseName,
          sizeBytes,
          formattedSize,
        },
      });

      return {
        tenantDatabaseId: record.id,
        databaseName: record.databaseName,
        sizeBytes,
        formattedSize,
        recordedAt: now.toISOString(),
      };
    } catch (error) {
      throw new ConflictException(
        `STORAGE_MEASUREMENT_FAILED: ${(error as Error).message}`,
      );
    }
  }

  /** Credential-free view safe for APIs and logs. */
  async publicView(id: string) {
    const record = await this.platform.client.tenantDatabase.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('TENANT_DATABASE_NOT_FOUND');
    return {
      id: record.id,
      organizationId: record.organizationId,
      status: record.status,
      host: record.host,
      port: record.port,
      databaseName: record.databaseName,
      schemaVersion: record.schemaVersion,
      lastHealthAt: record.lastHealthAt,
      lastHealthy: record.lastHealthy,
      diskSizeBytes:
        record.diskSizeBytes != null ? record.diskSizeBytes.toString() : null,
      diskSizeRecordedAt: record.diskSizeRecordedAt,
    };
  }

  /**
   * Provision the Signature Initial Storefront Template (interactive showcase,
   * category grid, product collections, and banners) into a specific tenant database.
   */
  async provisionSignatureStorefront(organizationId: string) {
    const record = await this.platform.client.tenantDatabase.findUnique({
      where: { organizationId },
      include: { organization: true },
    });
    if (!record) {
      throw new NotFoundException('TENANT_DATABASE_NOT_FOUND');
    }
    if (record.status !== 'READY') {
      throw new ConflictException('TENANT_DATABASE_NOT_READY');
    }
    if (!this.manager) {
      throw new ConflictException('TENANT_DATABASE_MANAGER_UNAVAILABLE');
    }

    const result = await this.manager.runTransient(record, async () => {
      const db = await this.manager!.getClient(record);
      return db.$transaction(async (tx: any) => {
        let page = await tx.storefrontPage.findUnique({
          where: { slug: 'home' },
        });
        if (!page) {
          page = await tx.storefrontPage.create({
            data: {
              type: 'HOME',
              slug: 'home',
              title: 'Storefront Homepage',
            },
          });
        }

        const latestVersion = await tx.storefrontPageVersion.findFirst({
          where: { pageId: page.id },
          orderBy: { versionNumber: 'desc' },
        });
        const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

        const newVersion = await tx.storefrontPageVersion.create({
          data: {
            pageId: page.id,
            versionNumber: nextVersionNumber,
            isPublished: true,
            publishedAt: new Date(),
            changeSummary: 'Provisioned Signature Initial Showroom Template by Platform Admin',
            sections: {
              create: SIGNATURE_INITIAL_SECTIONS.map((s) => ({
                type: s.type,
                sortOrder: s.sortOrder,
                enabled: s.enabled,
                settings: s.settings,
                dataSource: s.dataSource || undefined,
              })),
            },
          },
          include: {
            sections: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        });

        await tx.storefrontPage.update({
          where: { id: page.id },
          data: {
            publishedVersionId: newVersion.id,
          },
        });

        return {
          versionNumber: newVersion.versionNumber,
          sectionsCount: newVersion.sections.length,
        };
      });
    });

    // Grant or enable entitlement override for signature_storefront_template
    const subscription = await this.platform.client.subscription.findUnique({
      where: { organizationId },
    });
    if (subscription) {
      const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await this.platform.client.subscriptionEntitlementOverride.upsert({
        where: {
          subscriptionId_featureKey: {
            subscriptionId: subscription.id,
            featureKey: 'signature_storefront_template',
          },
        },
        update: {
          enabled: true,
          reason: 'Platform Admin Template Provisioning',
          expiresAt: expiryDate,
          revokedAt: null,
        },
        create: {
          subscriptionId: subscription.id,
          featureKey: 'signature_storefront_template',
          enabled: true,
          reason: 'Platform Admin Template Provisioning',
          expiresAt: expiryDate,
        },
      });
    }

    await this.audit.record({
      action: 'SIGNATURE_STOREFRONT_TEMPLATE_PROVISIONED',
      entityType: 'Organization',
      entityId: organizationId,
      newValue: {
        organizationId,
        databaseName: record.databaseName,
        sectionsCount: result.sectionsCount,
        versionNumber: result.versionNumber,
      },
    });

    return {
      organizationId,
      status: 'PROVISIONED',
      sectionsCount: result.sectionsCount,
      versionNumber: result.versionNumber,
      message: 'Signature initial storefront template provisioned successfully.',
    };
  }

  /**
   * Diagnostic inspection of tenant storefront status for Platform Admin UI.
   */
  async getStorefrontStatus(organizationId: string) {
    const record = await this.platform.client.tenantDatabase.findUnique({
      where: { organizationId },
    });
    if (!record || record.status !== 'READY' || !this.manager) {
      return { status: 'UNAVAILABLE', hasSignatureTemplate: false, sectionsCount: 0, versionNumber: 0 };
    }

    try {
      return await this.manager.runTransient(record, async () => {
        const db = await this.manager!.getClient(record);
        const page = await db.storefrontPage.findUnique({
          where: { slug: 'home' },
          include: {
            publishedVersion: {
              include: {
                sections: true,
              },
            },
          },
        });

        const sections = page?.publishedVersion?.sections ?? [];
        const hasInteractiveHero = sections.some(
          (s: any) =>
            s.type === 'HERO_SHOWCASE' &&
            (s.settings?.layout === 'interactive' || s.settings?.variant === 'interactive'),
        );

        return {
          status: 'READY',
          sectionsCount: sections.length,
          hasSignatureTemplate: hasInteractiveHero,
          versionNumber: page?.publishedVersion?.versionNumber ?? 0,
        };
      });
    } catch {
      return { status: 'ERROR', hasSignatureTemplate: false, sectionsCount: 0, versionNumber: 0 };
    }
  }
}
