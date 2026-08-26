import { TenantDatabaseManager } from './tenant-database.manager';
import { PrismaClient } from '@prisma/client';
import { decryptSecret, encryptSecret } from '../platform/utils/secret-box';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  })),
}));

const material = (id: string) => ({
  id,
  host: 'localhost',
  port: 5432,
  databaseName: `tenant_${id}`,
  username: 'tenant_user',
  credentialCipher: encryptSecret('secret-password', process.env.PLATFORM_DB_CREDENTIAL_KEY),
});

describe('TenantDatabaseManager (ADR-0003)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.PLATFORM_DB_CREDENTIAL_KEY = 'test-credential-key-at-least-32-chars!!';
    process.env.TENANT_DB_MAX_CLIENTS = '3';
    process.env.TENANT_DB_IDLE_TTL_SECONDS = '300';
    process.env.TENANT_DB_EVICTION_GRACE_MS = '0';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function newManager() {
    return new TenantDatabaseManager();
  }

  it('decrypts credentials and reuses one client per tenant database id', async () => {
    const manager = newManager();
    const clientA = await manager.getClient(material('tdb-1'));
    const clientB = await manager.getClient(material('tdb-1'));

    expect(clientB).toBe(clientA);
    expect(manager.metrics()).toMatchObject({ activeClients: 1 });

    await manager.onModuleDestroy();
  });

  it('single-flights concurrent cold requests for the same tenant', async () => {
    const manager = newManager();

    const [clientA, clientB, clientC] = await Promise.all([
      manager.getClient(material('tdb-cold')),
      manager.getClient(material('tdb-cold')),
      manager.getClient(material('tdb-cold')),
    ]);

    expect(clientB).toBe(clientA);
    expect(clientC).toBe(clientA);
    expect(PrismaClient).toHaveBeenCalledTimes(1);
    expect(manager.metrics()).toMatchObject({
      activeClients: 1,
      pendingClients: 0,
    });
    await manager.onModuleDestroy();
  });

  it('drains in-flight client creation during shutdown', async () => {
    let releaseConnect!: () => void;
    const connectGate = new Promise<void>((resolve) => {
      releaseConnect = resolve;
    });
    const disconnect = jest.fn().mockResolvedValue(undefined);
    jest.mocked(PrismaClient).mockImplementationOnce(
      () =>
        ({
          $connect: jest.fn().mockReturnValue(connectGate),
          $disconnect: disconnect,
        }) as unknown as PrismaClient,
    );
    const manager = newManager();
    const acquisition = manager.getClient(material('tdb-shutdown'));
    await Promise.resolve();
    await Promise.resolve();

    const shutdown = manager.onModuleDestroy();
    await expect(manager.getClient(material('tdb-late'))).rejects.toThrow(
      'TENANT_DATABASE_MANAGER_SHUTTING_DOWN',
    );
    releaseConnect();
    await acquisition;
    await shutdown;

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(manager.metrics()).toMatchObject({ activeClients: 0, pendingClients: 0 });
  });

  it('releases a cold transient fleet client after its operation', async () => {
    const manager = newManager();

    await manager.runTransient(material('tdb-fleet'), async () => {
      const leased = await manager.getClient(material('tdb-fleet'));
      expect(leased).toBeDefined();
      expect(manager.metrics().activeClients).toBe(1);
    });

    expect(manager.metrics().activeClients).toBe(0);
    await manager.onModuleDestroy();
  });

  it('retains a transient client acquired by an external request', async () => {
    const manager = newManager();
    let releaseOperation!: () => void;
    const operationGate = new Promise<void>((resolve) => {
      releaseOperation = resolve;
    });
    const transient = manager.runTransient(material('tdb-shared'), () => operationGate);
    await Promise.resolve();
    await Promise.resolve();

    await manager.getClient(material('tdb-shared'));
    releaseOperation();
    await transient;

    expect(manager.metrics().activeClients).toBe(1);
    await manager.onModuleDestroy();
  });

  it('releases a cold client after overlapping transient leases finish', async () => {
    const manager = newManager();
    let releaseFirst!: () => void;
    let releaseSecond!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const secondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });

    const first = manager.runTransient(material('tdb-overlap'), () => firstGate);
    await Promise.resolve();
    await Promise.resolve();
    const second = manager.runTransient(material('tdb-overlap'), () => secondGate);
    await Promise.resolve();
    await Promise.resolve();

    releaseFirst();
    await first;
    expect(manager.metrics().activeClients).toBe(1);
    releaseSecond();
    await second;
    expect(manager.metrics().activeClients).toBe(0);

    await manager.onModuleDestroy();
  });

  it('evicts the least-recently-used client when capacity is reached', async () => {
    const manager = newManager();

    await manager.getClient(material('tdb-1'));
    await manager.getClient(material('tdb-2'));
    // Touch tdb-1 so tdb-2 becomes LRU.
    await manager.getClient(material('tdb-1'));
    await manager.getClient(material('tdb-3')); // cache now at max=3
    await manager.getClient(material('tdb-4')); // must evict tdb-2

    expect(manager.metrics().activeClients).toBe(3);
    await manager.onModuleDestroy();
  });

  it('opens a circuit breaker after repeated failures and fails fast', async () => {
    const manager = newManager();
    const broken = {
      ...material('tdb-dead'),
      credentialCipher: 'not-a-valid-envelope',
    };

    for (let i = 0; i < 3; i += 1) {
      await expect(manager.getClient(broken)).rejects.toBeTruthy();
    }

    await expect(manager.getClient(broken)).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('TENANT_DATABASE_UNHEALTHY'),
      }),
    );
    expect(manager.metrics().openBreakers).toBe(1);
    await manager.onModuleDestroy();
  });

  it('keeps credentials out of plaintext anywhere but the decrypted moment', async () => {
    const secret = 'PLATFORM_SECRET_AT_LEAST_32_CHARACTERS';
    const envelope = encryptSecret('super-secret-password', secret);
    expect(envelope).not.toContain('super-secret-password');
    expect(decryptSecret(envelope, secret)).toBe('super-secret-password');
    expect(() => decryptSecret(envelope, 'wrong-key-at-least-thirty-two-characters!!')).toThrow();
  });
});
