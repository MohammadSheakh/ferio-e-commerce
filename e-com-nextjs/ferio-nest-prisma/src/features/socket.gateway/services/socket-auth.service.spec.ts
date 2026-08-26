import type { Socket } from 'socket.io';

import { SocketAuthService, socketPresenceKeys } from './socket-auth.service';

const guestId = 'gst_123e4567-e89b-42d3-a456-426614174000';

function socket(auth: Record<string, unknown>): Socket {
  return {
    id: 'socket-12345678',
    handshake: { auth, headers: {}, query: {} },
  } as unknown as Socket;
}

describe('SocketAuthService', () => {
  const originalEnv = { ...process.env };
  const jwtService = {
    verifyAsync: jest.fn(),
    signAsync: jest.fn(),
  };
  const pipeline = {
    sadd: jest.fn(),
    hset: jest.fn(),
    exec: jest.fn().mockResolvedValue([]),
  };
  const redis = {
    multi: jest.fn(() => pipeline),
    eval: jest.fn(),
    sismember: jest.fn(),
    smembers: jest.fn(),
    scard: jest.fn(),
  };
  const prisma = {
    user: { findUnique: jest.fn() },
  };
  let service: SocketAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SocketAuthService(jwtService as never, redis as never, prisma as never);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses different presence namespaces for identical IDs in two tenants', () => {
    const tenantA = socketPresenceKeys('org-a');
    const tenantB = socketPresenceKeys('org-b');

    expect(tenantA.onlineUsers).not.toBe(tenantB.onlineUsers);
    expect(tenantA.userSockets('user-1')).not.toBe(
      tenantB.userSockets('user-1'),
    );
  });

  it('tracks multiple sockets without replacing an existing connection', async () => {
    const user = {
      userId: 'user-1',
      role: 'user',
      name: 'Customer',
      organizationId: 'org-a',
    };
    const secondSocket = { ...socket({}), id: 'socket-2' } as Socket;

    await service.handleUserConnection(socket({}), user);
    await service.handleUserConnection(secondSocket, user);

    const keys = socketPresenceKeys('org-a');
    expect(pipeline.sadd).toHaveBeenCalledWith(
      keys.userSockets('user-1'),
      'socket-12345678',
    );
    expect(pipeline.sadd).toHaveBeenCalledWith(
      keys.userSockets('user-1'),
      'socket-2',
    );
  });

  it('marks a user offline only after the last socket disconnects', async () => {
    const user = {
      userId: 'user-1',
      role: 'user',
      name: 'Customer',
      organizationId: 'org-a',
    };
    redis.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(service.handleUserDisconnection(socket({}), user)).resolves.toBe(false);
    await expect(service.handleUserDisconnection(socket({}), user)).resolves.toBe(true);
  });

  it('rejects organization-free presence reads in strict mode', async () => {
    process.env.TENANCY_ENABLED = 'true';
    await expect(service.getAllOnlineUsers()).rejects.toThrow(
      'SOCKET_ORGANIZATION_REQUIRED',
    );
  });

  it('re-enters the signed organization for conversation authorization', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const tenantDb = {
      tryGet: jest.fn().mockResolvedValue({
        user: { findUnique: jest.fn().mockResolvedValue({ customerId: 'customer-1' }) },
      }),
    };
    const fanout = {
      forOrganization: jest.fn((_organizationId, operation) => operation()),
    };
    const tenantService = new SocketAuthService(
      jwtService as never,
      redis as never,
      prisma as never,
      tenantDb as never,
      fanout as never,
    );

    await expect(
      tenantService.canAccessConversation(
        {
          userId: 'user-1',
          role: 'user',
          name: 'Customer',
          organizationId: 'org-a',
        },
        'conv-customer-1',
      ),
    ).resolves.toBe(true);
    expect(fanout.forOrganization).toHaveBeenCalledWith(
      'org-a',
      expect.any(Function),
    );
  });

  it('resolves the gateway database from the signed socket organization', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const tenantClient = { user: { findUnique: jest.fn() } };
    const tenantDb = { tryGet: jest.fn().mockResolvedValue(tenantClient) };
    const fanout = {
      forOrganization: jest.fn((_organizationId, operation) => operation()),
    };
    const tenantService = new SocketAuthService(
      jwtService as never,
      redis as never,
      prisma as never,
      tenantDb as never,
      fanout as never,
    );

    await expect(
      tenantService.databaseForSocket({
        userId: 'user-1',
        role: 'user',
        name: 'Customer',
        organizationId: 'org-a',
      }),
    ).resolves.toBe(tenantClient);
    expect(fanout.forOrganization).toHaveBeenCalledWith(
      'org-a',
      expect.any(Function),
    );
  });

  it('never grants admin access from handshake role fields', async () => {
    const result = await service.authenticateSocket(
      socket({ role: 'admin', guestId }),
    );

    expect(result).toEqual({
      userId: guestId,
      role: 'guest',
      name: 'Guest Visitor',
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens instead of falling back to a claimed role', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

    await expect(
      service.authenticateSocket(socket({ token: 'invalid', role: 'admin', guestId })),
    ).resolves.toBeNull();
  });

  it('uses the database role for authenticated accounts', async () => {
    jwtService.verifyAsync.mockResolvedValue({ userId: 'user-1', role: 'admin' });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'user',
      name: 'Customer',
    });

    await expect(
      service.authenticateSocket(socket({ token: 'signed-token' })),
    ).resolves.toEqual({ userId: 'user-1', role: 'user', name: 'Customer' });
  });

  it('limits guests to their own raw and prefixed conversation rooms', async () => {
    const user = { userId: guestId, role: 'guest', name: 'Guest Visitor' };

    await expect(service.canAccessConversation(user, guestId)).resolves.toBe(true);
    await expect(service.canAccessConversation(user, `conv-${guestId}`)).resolves.toBe(true);
    await expect(
      service.canAccessConversation(user, 'conv-gst_123e4567-e89b-42d3-a456-426614174999'),
    ).resolves.toBe(false);
  });

  it('allows authenticated customers to use their linked customer room', async () => {
    prisma.user.findUnique.mockResolvedValue({ customerId: 'customer-1' });
    const user = { userId: 'user-1', role: 'user', name: 'Customer' };

    await expect(
      service.canAccessConversation(user, 'conv-customer-1'),
    ).resolves.toBe(true);
    await expect(
      service.canAccessConversation(user, 'conv-customer-2'),
    ).resolves.toBe(false);
  });

  it('allows verified administrators to access support conversations', async () => {
    const user = { userId: 'admin-1', role: 'admin', name: 'Admin' };

    await expect(
      service.canAccessConversation(user, `conv-${guestId}`),
    ).resolves.toBe(true);
  });

  it('rejects organization-free tickets in strict mode', async () => {
    const previous = process.env.TENANCY_ENABLED;
    process.env.TENANCY_ENABLED = 'true';
    jwtService.verifyAsync.mockResolvedValue({
      purpose: 'chat_socket',
      userId: 'user-1',
      role: 'user',
    });
    try {
      await expect(
        service.authenticateSocket(socket({ token: 'signed-token' })),
      ).resolves.toBeNull();
    } finally {
      if (previous === undefined) delete process.env.TENANCY_ENABLED;
      else process.env.TENANCY_ENABLED = previous;
    }
  });
});
