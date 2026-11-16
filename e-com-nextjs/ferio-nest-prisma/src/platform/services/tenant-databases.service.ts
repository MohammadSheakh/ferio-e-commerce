import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformAuditService } from './platform-audit.service';
import { decryptSecret, encryptSecret } from '../utils/secret-box';
import { PlatformPrismaService } from '../platform-prisma.service';

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
}
