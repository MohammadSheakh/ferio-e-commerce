import { TenantDatabaseManager } from './tenant-database.manager';
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
