import { SocketRoomService } from '../services/socket-room.service';

describe('SocketRoomService tenant isolation', () => {
  const originalEnv = { ...process.env };
  const pipeline = {
    sadd: jest.fn(),
    srem: jest.fn(),
    del: jest.fn(),
    exec: jest.fn().mockResolvedValue([]),
  };
  const redis = {
    multi: jest.fn(() => pipeline),
    smembers: jest.fn().mockResolvedValue([]),
    sismember: jest.fn().mockResolvedValue(0),
    lpush: jest.fn(),
    ltrim: jest.fn(),
    expire: jest.fn(),
    lrange: jest.fn().mockResolvedValue([]),
    del: jest.fn(),
  };
  const prisma = { user: { findUnique: jest.fn() } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function service(tenantDb?: unknown, fanout?: unknown) {
    return new SocketRoomService(
      redis as never,
      prisma as never,
      tenantDb as never,
      fanout as never,
    );
  }

  it('separates identical conversation and task IDs across organizations', async () => {
    const rooms = service();

    await rooms.joinRoom('user-1', 'conversation-1', 'org-a');
    await rooms.joinRoom('user-1', 'conversation-1', 'org-b');
    await rooms.joinTaskRoom('user-1', 'task-1', 'org-a');
    await rooms.joinTaskRoom('user-1', 'task-1', 'org-b');

    const keys = pipeline.sadd.mock.calls.map(([key]) => key);
    expect(keys).toContain('org:org-a:chat:room_users:conversation-1');
    expect(keys).toContain('org:org-b:chat:room_users:conversation-1');
    expect(keys).toContain('org:org-a:task:rooms:task-1');
    expect(keys).toContain('org:org-b:task:rooms:task-1');
  });

  it('separates group membership and activity feeds by organization', async () => {
    const rooms = service();

    await rooms.joinGroupRoom('user-1', 'family-1', 'org-a');
    await rooms.joinGroupRoom('user-1', 'family-1', 'org-b');
    await rooms.addActivityToFeed('family-1', { action: 'test' }, 50, 'org-a');
    await rooms.addActivityToFeed('family-1', { action: 'test' }, 50, 'org-b');

    expect(pipeline.sadd).toHaveBeenCalledWith(
      'org:org-a:group:rooms:family-1',
      'user-1',
    );
    expect(pipeline.sadd).toHaveBeenCalledWith(
      'org:org-b:group:rooms:family-1',
      'user-1',
    );
    expect(redis.lpush).toHaveBeenCalledWith(
      'org:org-a:activity:feed:family-1',
      expect.any(String),
    );
    expect(redis.lpush).toHaveBeenCalledWith(
      'org:org-b:activity:feed:family-1',
      expect.any(String),
    );
  });

  it('rejects unscoped room state in strict tenancy mode', async () => {
    process.env.TENANCY_ENABLED = 'true';

    await expect(service().getRoomUsers('conversation-1')).rejects.toThrow(
      'SOCKET_ORGANIZATION_REQUIRED',
    );
  });

  it('resolves family membership inside the signed organization', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const tenantUser = {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-1',
        role: 'business',
        accountCreatorId: null,
      }),
    };
    const tenantDb = {
      getOrLegacy: jest.fn().mockResolvedValue({ user: tenantUser }),
    };
    const fanout = {
      forOrganization: jest.fn((_organizationId, operation) => operation()),
    };
    const socket = { join: jest.fn() };

    await service(tenantDb, fanout).autoJoinFamilyRoom(
      socket,
      'user-1',
      'org-a',
    );

    expect(fanout.forOrganization).toHaveBeenCalledWith(
      'org-a',
      expect.any(Function),
    );
    expect(socket.join).toHaveBeenCalledWith('org:org-a:user-1');
    expect(pipeline.sadd).toHaveBeenCalledWith(
      'org:org-a:group:rooms:user-1',
      'user-1',
    );
  });
});
