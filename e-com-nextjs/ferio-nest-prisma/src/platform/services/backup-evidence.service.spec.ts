import {
  BackupEvidenceScope,
  BackupEvidenceStatus,
} from '../generated/platform-client';
import { BackupEvidenceService } from './backup-evidence.service';

describe('BackupEvidenceService', () => {
  const record = {
    id: 'evidence-1',
    scope: BackupEvidenceScope.TENANT,
    organizationId: 'org-1',
    databaseName: 'tenant_one',
    artifactName: 'tenant_one.dump',
    checksum: 'a'.repeat(64),
    schemaVersion: '20260908193000_tenant_messaging_provider_configs',
    status: BackupEvidenceStatus.VERIFIED,
    completedAt: new Date('2026-09-10T00:00:00.000Z'),
    restoreVerifiedAt: null,
    protectedAt: new Date('2026-09-10T00:01:00.000Z'),
    createdAt: new Date('2026-09-10T00:01:00.000Z'),
  };

  it('records bounded secret-free evidence for a tenant', async () => {
    const create = jest.fn().mockResolvedValue(record);
    const service = new BackupEvidenceService({
      client: { backupEvidence: { create } },
    } as never);

    await expect(
      service.record({
        scope: BackupEvidenceScope.TENANT,
        organizationId: 'org-1',
        databaseName: 'tenant_one',
        artifactName: 'tenant_one.dump',
        checksum: 'A'.repeat(64),
        completedAt: new Date('2026-09-10T00:00:00.000Z'),
        detail: { source: 'operator', password: 'must-not-persist' },
      }),
    ).resolves.toEqual(record);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          checksum: 'a'.repeat(64),
          organizationId: 'org-1',
        }),
      }),
    );
    expect(JSON.stringify(create.mock.calls[0])).not.toContain('password');
    expect(JSON.stringify(create.mock.calls[0])).not.toContain('DATABASE_URL');
    expect(create.mock.calls[0][0].data.detail).toEqual({ source: 'operator' });
  });

  it.each([
    ['tenant organization is missing', { scope: BackupEvidenceScope.TENANT }],
    [
      'control-plane organization is present',
      { scope: BackupEvidenceScope.CONTROL_PLANE, organizationId: 'org-1' },
    ],
    [
      'database name is unsafe',
      {
        scope: BackupEvidenceScope.TENANT,
        organizationId: 'org-1',
        databaseName: 'tenant;drop',
      },
    ],
    [
      'checksum is not sha256',
      {
        scope: BackupEvidenceScope.TENANT,
        organizationId: 'org-1',
        checksum: 'bad',
      },
    ],
  ])('rejects when %s', async (_label, input) => {
    const create = jest.fn();
    const service = new BackupEvidenceService({
      client: { backupEvidence: { create } },
    } as never);

    await expect(
      service.record({
        databaseName: 'tenant_one',
        artifactName: 'tenant_one.dump',
        checksum: 'a'.repeat(64),
        completedAt: new Date(),
        ...input,
      } as never),
    ).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
