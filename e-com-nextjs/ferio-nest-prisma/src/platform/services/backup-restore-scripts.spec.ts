import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const script = (name: string): string =>
  readFileSync(resolve(__dirname, '../../../scripts', name), 'utf8');

describe('Release 1 backup and restore runbook contracts', () => {
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

  it('requires an isolated, new restore database and verifies migration history', () => {
    const source = script('restore-tenant.sh');

    expect(source).toContain('checksum sidecar is required');
    expect(source).toContain('restore_drill_');
    expect(source).toContain('refusing to restore into an existing database');
    expect(source).toContain('createdb "$TARGET"');
    expect(source).not.toContain('pg_restore --clean');
    expect(source).toContain('"_prisma_migrations"');
    expect(source).toContain('no completed Prisma migration found');
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
});
