import { BadRequestException } from '@nestjs/common';
import { MigrationOrchestratorService } from './migration-orchestrator.service';

describe('MigrationOrchestratorService (MT-11 / ADR-0005)', () => {
  type Registry = { id: string; organizationId: string; status: string };
  type MigrationResult = {
    tenantDatabaseId: string;
    success: boolean;
    id?: string;
  };
  type MigrationRun = {
    id: string;
    status: string;
    concurrencyLimit: number;
    failureThreshold: number;
    results: MigrationResult[];
  };
  type MigrationRunInput = {
    where: { id: string };
    data?: { status?: string };
  };
  type MigrationPlatform = {
    client: {
      tenantMigrationRun: {
        create: jest.Mock;
        findUnique: jest.Mock;
        update: jest.Mock;
      };
      tenantMigrationResult: { upsert: jest.Mock };
      platformAuditLog: { create: jest.Mock };
      tenantDatabase: { findUnique: jest.Mock; findMany: jest.Mock };
      $transaction: jest.Mock;
    };
  };

  function build(
    registries: Registry[],
    existingResults: Array<{ tenantDatabaseId: string; success: boolean }> = [],
  ) {
    const platform: MigrationPlatform = {
      client: {
        tenantMigrationRun: {
          create: jest.fn().mockImplementation(
            ({
              data,
            }: {
              data: {
                status: string;
                targetSchemaVersion: string;
                concurrencyLimit: number;
                failureThreshold: number;
              };
            }) =>
              Promise.resolve({
                id: 'run-1',
                status: data.status,
                targetSchemaVersion: data.targetSchemaVersion,
                concurrencyLimit: data.concurrencyLimit,
                failureThreshold: data.failureThreshold,
              }),
          ),
          findUnique: jest.fn(),
          update: jest.fn().mockResolvedValue({}),
        },
        tenantMigrationResult: { upsert: jest.fn().mockResolvedValue({}) },
        platformAuditLog: { create: jest.fn().mockResolvedValue({}) },
        tenantDatabase: {
          findUnique: jest.fn(),
          findMany: jest.fn().mockResolvedValue(
            registries.map((r) => ({
              ...r,
              organization: { status: 'ACTIVE' },
            })),
          ),
        },
        $transaction: jest.fn(),
      },
    };
    const databases = {
      getDecryptedConnection: jest.fn().mockImplementation((id: string) =>
        Promise.resolve({
          host: id,
          port: 5432,
          database: id,
          user: 'u',
          password: 'p',
        }),
      ),
      publicView: jest.fn().mockImplementation((id: string) => {
        void id;
        return Promise.resolve({ schemaVersion: '0001' });
      }),
      setSchemaVersion: jest.fn().mockResolvedValue(undefined),
      recordHealth: jest.fn().mockResolvedValue(undefined),
    };
    const bootstrapper = {
      bootstrap: jest
        .fn()
        .mockImplementation(({ database }: { database: string }) => {
          void database;
          return Promise.resolve({ applied: [], schemaVersion: '9999_latest' });
        }),
    };
    const migrationQueue = { add: jest.fn().mockResolvedValue({}) };

    const runState: Record<string, string | undefined> = {};
    platform.client.tenantMigrationRun.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }): Promise<MigrationRun> => {
        const base: MigrationRun = {
          id: where.id,
          status: runState[where.id] ?? 'PENDING',
          concurrencyLimit: 2,
          failureThreshold: 2,
          results: existingResults
            .filter(() => true)
            .map((r, i) => ({ ...r, id: `res-${i}` })),
        };
        return Promise.resolve(base);
      },
    );
    // Track status updates so the loop sees pauses.
    platform.client.tenantMigrationRun.update.mockImplementation(
      ({ where, data }: MigrationRunInput) => {
        if (where.id === 'run-1' && data?.status)
          runState['run-1'] = data.status;
        return Promise.resolve({});
      },
    );

    const service = new MigrationOrchestratorService(
      platform as never,
      databases as never,
      bootstrapper as never,
      migrationQueue,
    );
    return {
      service,
      platform,
      databases,
      bootstrapper,
      migrationQueue,
      runState,
    };
  }

  it('rejects a canary organization with no registered database', async () => {
    const { service } = build([]);
    await expect(
      service.start({ canaryOrganizationId: 'org-ghost' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enqueues exactly one run job on start', async () => {
    const { service, migrationQueue } = build([]);
    const { runId } = await service.start({});
    expect(runId).toBe('run-1');
    expect(migrationQueue.add).toHaveBeenCalledWith(
      'run-tenant-migration',
      { migrationRunId: 'run-1' },
      expect.objectContaining({ jobId: `t:${runId}:migration-run` }),
    );
  });

  it('canary failure fails the whole run without migrating the fleet', async () => {
    const registries = [
      { id: 'tdb-1', organizationId: 'org-1', status: 'READY' },
      { id: 'tdb-2', organizationId: 'org-2', status: 'READY' },
    ];
    const built = build(registries);
    built.bootstrapper.bootstrap.mockRejectedValueOnce(
      new Error('SQLSTATE syntax error'),
    );
    built.platform.client.tenantMigrationRun.findUnique
      .mockClear()
      .mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve<MigrationRun>({
          id: where.id,
          status: built.runState[where.id] ?? 'PENDING',
          concurrencyLimit: 2,
          failureThreshold: 2,
          results: [],
        }),
      );

    const outcome = await built.service.processRun('run-1');

    expect(outcome.status).toBe('FAILED');
    expect(outcome.failures[0].organizationId).toBe('org-1');
    // org-2 never attempted
    expect(outcome.migrated).toEqual([]);
    expect(built.databases.setSchemaVersion).not.toHaveBeenCalledWith(
      'tdb-2',
      expect.anything(),
    );
  });

  it('pauses at the failure threshold after two consecutive batch failures', async () => {
    const registries = [
      { id: 'tdb-1', organizationId: 'org-1', status: 'READY' },
      { id: 'tdb-2', organizationId: 'org-2', status: 'READY' },
      { id: 'tdb-3', organizationId: 'org-3', status: 'READY' },
      { id: 'tdb-4', organizationId: 'org-4', status: 'READY' },
    ];
    const built = build(registries);
    // Canary (org-1) succeeds; the next two fail consecutively -> threshold 2.
    built.bootstrapper.bootstrap
      .mockImplementationOnce(() =>
        Promise.resolve({ applied: [], schemaVersion: 'v' }),
      )
      .mockRejectedValueOnce(new Error('lock timeout'))
      .mockRejectedValueOnce(new Error('lock timeout'));
    built.platform.client.tenantMigrationRun.findUnique
      .mockClear()
      .mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve<MigrationRun>({
          id: where.id,
          status: built.runState[where.id] ?? 'PENDING',
          concurrencyLimit: 2,
          failureThreshold: 2,
          results: [],
        }),
      );

    const outcome = await built.service.processRun('run-1');

    expect(outcome.status).toBe('PAUSED');
    expect(outcome.migrated).toEqual(['org-1']); // canary done, fleet paused
    expect(outcome.failures.map((f) => f.organizationId)).toEqual([
      'org-2',
      'org-3',
    ]);
    // org-4 was never attempted once the rollout paused.
    expect(
      (
        built.bootstrapper.bootstrap.mock.calls as unknown as Array<
          [{ database: string }]
        >
      ).filter(([call]) => call.database === 'tdb-4'),
    ).toHaveLength(0);
  });
});
