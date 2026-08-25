import { SocketGateway } from './socket.gateway';
import { runWithTenantContext, type TenantContext } from '../../tenancy/tenant-context';

function tenantContext(organizationId: string): TenantContext {
  return Object.freeze({
    organizationId,
    tenantDatabaseId: `tdb-${organizationId}`,
    database: Object.freeze({
      id: `tdb-${organizationId}`,
      host: 'localhost',
      port: 5432,
      databaseName: `db_${organizationId}`,
      username: 'tester',
      credentialCipher: 'cipher',
    }),
    domainId: 'dom-test',
    hostname: `${organizationId}.ferio.test`,
    subscriptionStatus: 'ACTIVE' as const,
  }) as TenantContext;
}

function gatewayWithServer() {
  const emitted: Array<{ room: string; event: string; data: unknown }> = [];
  let targets: string[] = [];

  const tail = {
    to: (...more: string[]) => {
      targets.push(...more);
      return tail;
    },
    emit: (event: string, data: unknown) => {
      for (const room of targets) {
        emitted.push({ room, event, data });
      }
      targets = [];
    },
  };

  const server = {
    to: (room: string) => {
      targets.push(room);
      return tail;
    },
  };

  const gateway = Object.create(SocketGateway.prototype) as SocketGateway;
  (gateway as unknown as { server: unknown }).server = server;
  (gateway as unknown as { logger: { log: () => void; debug: () => void; error: () => void; warn: () => void } }).logger = {
    log: () => undefined,
    debug: () => undefined,
    error: () => undefined,
    warn: () => undefined,
  };
  return { gateway, emitted };
}

describe('SocketGateway tenant-scoped emissions (MT-8 §11.3)', () => {
  it('broadcastToRole targets ONLY the org-prefixed room inside a resolved tenant', async () => {
    const { gateway, emitted } = gatewayWithServer();

    await runWithTenantContext(tenantContext('org-a'), () =>
      gateway.broadcastToRole('admin', 'notification::admin', { id: 1 }),
    );

    expect(emitted).toHaveLength(1);
    expect(emitted[0].room).toBe('org:org-a:role::admin');
  });

  it('broadcastToRole keeps the legacy raw room outside any tenant context', async () => {
    const { gateway, emitted } = gatewayWithServer();

    await gateway.broadcastToRole('admin', 'notification::admin', { id: 1 });

    expect(emitted).toHaveLength(1);
    expect(emitted[0].room).toBe('role::admin');
  });

  it('emitNotificationToUser cannot reach another tenant room', async () => {
    const { gateway, emitted } = gatewayWithServer();

    await runWithTenantContext(tenantContext('org-a'), () =>
      gateway.emitNotificationToUser('user-1', { title: 'hi' }),
    );
    await runWithTenantContext(tenantContext('org-b'), () =>
      gateway.emitNotificationToUser('user-1', { title: 'hi' }),
    );

    expect(emitted.map((e) => e.room)).toEqual([
      'org:org-a:user-1',
      'org:org-b:user-1',
    ]);
  });

  it('emitToRoom scopes REST-initiated chat events by the ambient tenant', async () => {
    const { gateway, emitted } = gatewayWithServer();

    await runWithTenantContext(tenantContext('org-a'), () =>
      gateway.emitToRoom('conv-customer-1', 'message-updated', {}),
    );

    expect(emitted).toHaveLength(1);
    expect(emitted[0].room).toBe('org:org-a:conv-customer-1');
  });
});
