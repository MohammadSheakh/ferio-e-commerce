import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const script = (name: string): string =>
  readFileSync(resolve(__dirname, '../../../scripts', name), 'utf8');

describe('Release 1 backup and restore runbook contracts', () => {
  it('backs up the control plane through the protected platform URL', () => {
    const source = script('backup-platform.sh');

    expect(source).toContain('PLATFORM_DATABASE_URL is required');
    expect(source).toContain('pg_dump --format=custom');
    expect(source).toContain('--dbname="$PLATFORM_DATABASE_URL"');
    expect(source).toContain('pg_restore --list "$FILE"');
    expect(source).toContain('sha256sum -- "$FILE"');
    expect(source).toContain('$FILE.metadata.json');
    expect(source).toContain('"platform-control-plane"');
    expect(source).toContain('^[0-9]{14}_[A-Za-z0-9_-]+$');
    expect(source).not.toContain('PGPASSWORD=');
  });

  it('defines a credential-free tenant portability package', () => {
    const source = script('export-tenant.sh');

    expect(source).toContain('ferio-tenant-export-v1');
    expect(source).toContain('tenant-business-data');
    expect(source).toContain('tenant-audit-data');
    expect(source).toContain('tenant-financial-data');
    expect(source).toContain('"media": "not-included"');
    expect(source).toContain('pg_restore --list');
    expect(source).toContain('sha256sum -- "$FILE"');
    expect(source).toContain('manifest.json');
    expect(source).not.toContain('DATABASE_URL');
  });

  it('writes verifiable backup metadata and a checksum sidecar', () => {
    const source = script('backup-tenant.sh');

    expect(source).toContain('pg_dump --format=custom');
    expect(source).toContain('pg_restore --list "$FILE"');
    expect(source).toContain('sha256sum -- "$FILE"');
    expect(source).toContain('$FILE.metadata.json');
    expect(source).toContain('"schemaVersion"');
    expect(source).toContain('^[0-9]{14}_[A-Za-z0-9_-]+$');
  });

  it('backs up every active ready tenant through the registry fleet helper', () => {
    const source = script('backup-tenant-fleet.sh');

    expect(source).toContain('PLATFORM_DATABASE_URL is required');
    expect(source).toContain('PGSERVICE is required');
    expect(source).toContain('FROM "TenantDatabase"');
    expect(source).toContain("t.status = '\\''READY'\\''");
    expect(source).toContain("o.status = '\\''ACTIVE'\\''");
    expect(source).toContain('backup-tenant.sh');
    expect(source).toContain('tenant_backups_written');
    expect(source).toContain('no active READY tenant databases found');
    expect(source).not.toContain('PGPASSWORD=');
  });

  it('exports only a trusted tenant media prefix with checksums', () => {
    const source = script('export-tenant-media.sh');

    expect(source).toContain('R2_BUCKET');
    expect(source).toContain('R2_ENDPOINT_URL');
    expect(source).toContain('PREFIX="tenants/${ORGANIZATION_ID}/"');
    expect(source).toContain('s3api list-objects-v2');
    expect(source).toContain('s3://${R2_BUCKET}/${PREFIX}');
    expect(source).toContain('object-keys.json');
    expect(source).toContain('media.sha256');
    expect(source).toContain('refusing to overwrite');
    expect(source).not.toContain('DATABASE_URL');
  });

  it('verifies restored media references against the tenant object namespace', () => {
    const source = script('verify-tenant-media.sh');

    expect(source).toContain('restore_drill_');
    expect(source).toContain('ProductMedia');
    expect(source).toContain('Attachment');
    expect(source).toContain('tenants/${ORGANIZATION_ID}/');
    expect(source).toContain('s3api head-object');
    expect(source).toContain(
      'media reference is outside the tenant object namespace',
    );
    expect(source).toContain('media_references_verified');
    expect(source).not.toContain('s3api delete');
  });

  it('requires an isolated, new restore database and verifies migration history', () => {
    const source = script('restore-tenant.sh');

    expect(source).toContain('checksum sidecar is required');
    expect(source).toContain('restore_drill_');
    expect(source).toContain('refusing to restore into an existing database');
    expect(source).toContain('createdb "$TARGET"');
    expect(source).toContain(
      'pg_restore --no-owner --no-privileges --file="$RESTORE_SQL"',
    );
    expect(source).toContain('sed -i');
    expect(source).toContain('transaction_timeout');
    expect(source).toContain('--set ON_ERROR_STOP=1');
    expect(source).not.toContain('pg_restore --clean');
    expect(source).toContain('"_prisma_migrations"');
    expect(source).toContain('no completed Prisma migration found');
    expect(source).toContain('^[0-9]{14}_[A-Za-z0-9_-]+$');
  });

  it('verifies restored media, relational, financial, and reconciliation structure read-only', () => {
    const source = script('verify-tenant-restore.sh');

    expect(source).toContain('restore_drill_');
    expect(source).toContain('--set ON_ERROR_STOP=1');
    expect(source).toContain('ProductMedia');
    expect(source).toContain('Attachment');
    expect(source).toContain('orphan_order_items');
    expect(source).toContain('orphan_payment_users');
    expect(source).toContain('negative_payment_amounts');
    expect(source).toContain('orphan_refund_attempts');
    expect(source).toContain('negative_refund_amounts');
    expect(source).toContain('orphan_wallet_transactions');
    expect(source).toContain('invalid_completed_wallet_balances');
    expect(source).toContain('invalid_reconciliation_counters');
    expect(source).toContain('ReconciliationRun');
    expect(source).toContain('provider_check_required');
    expect(source).toContain('^[0-9]{14}_[A-Za-z0-9_-]+$');
    expect(source).not.toContain('CREATE ');
    expect(source).not.toContain('DROP ');
    expect(source).not.toContain('UPDATE ');
    expect(source).not.toContain('DELETE ');
  });

  it('defines bounded tenant object retention without accepting credentials', () => {
    const source = script('configure-r2-lifecycle.sh');

    expect(source).toContain('R2_BUCKET');
    expect(source).toContain('R2_ENDPOINT_URL');
    expect(source).toContain('put-bucket-lifecycle-configuration');
    expect(source).toContain('"Prefix": "tenants/"');
    expect(source).toContain('RETENTION_DAYS="${1:-30}"');
    expect(source).toContain('3650');
    expect(source).not.toContain('R2_SECRET_ACCESS_KEY="$1"');
    expect(source).not.toContain('R2_ACCESS_KEY_ID="$1"');
  });

  it('keeps all backup and export helpers credential-safe at the shell boundary', () => {
    const scripts = [
      'backup-platform.sh',
      'backup-tenant.sh',
      'backup-tenant-fleet.sh',
      'export-tenant.sh',
      'export-tenant-media.sh',
      'verify-tenant-media.sh',
      'restore-tenant.sh',
      'verify-tenant-restore.sh',
      'configure-r2-lifecycle.sh',
    ];

    for (const name of scripts) {
      const source = script(name);

      expect(source).toContain('umask 077');
      expect(source).not.toMatch(
        /(PASSWORD|SECRET_ACCESS_KEY|DATABASE_URL)=\$[12]/,
      );
      expect(source).not.toMatch(
        /(password|secret|credential)[^\n]*(argv|\$[12])/i,
      );
      expect(source).not.toContain('set -x');
    }
  });
});
