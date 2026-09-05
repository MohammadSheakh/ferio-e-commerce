/**
 * Multi-client two-tenant socket E2E (§10.11 / MT-8 gate) — over the WIRE.
 *
 * Boots a REAL socket.io Server wired to the REAL SocketGateway,
 * SocketAuthService (real JWT verification) and SocketRoomService, then
 * connects four raw WebSocket clients speaking the Socket.IO v4 protocol:
 *
 *   adminA / adminB — identical userId 'admin-shared', role admin,
 *                     organizationId org-a vs org-b
 *   guestA / guestB — guest chat tickets bound to org-a / org-b
 *
 * Proves over actual connections:
 *   1. connection-time rooms are org-scoped and never cross tenants;
 *   2. a tenant-scoped server emission reaches ONLY that org's sockets even
 *      when both tenants share the exact same userId;
 *   3. a guest chat relay reaches the sender's org conversation + that
 *      org's admins only;
 *   4. a foreign-tenant guest cannot join the conversation room.
 */
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import { Server as IoServer } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

import { SocketGateway } from '../src/features/socket.gateway/gateway/socket.gateway';
import {
  SocketAuthService,
} from '../src/features/socket.gateway/services/socket-auth.service';
import {
  SocketRoomService,
} from '../src/features/socket.gateway/services/socket-room.service';
import { runWithTenantContext, type TenantContext } from '../src/tenancy/tenant-context';

const SECRET = 'e2e-jwt-access-secret-for-socket-isolation-spec';
process.env.JWT_ACCESS_SECRET = SECRET;

/** Minimal in-memory ioredis double covering the commands the services use. */
class RedisStub {
  private store = new Map<string, Set<string>>();
  private hashes = new Map<string, Record<string, string>>();

  private setOf(key: string) {
    if (!this.store.has(key)) this.store.set(key, new Set());
    return this.store.get(key)!;
  }
  sadd(key: string, member: string) {
    this.setOf(key).add(member);
    return 1;
  }
  srem(key: string, member: string) {
    return this.setOf(key).delete(member) ? 1 : 0;
  }
  smembers(key: string) {
    return [...this.setOf(key)];
  }
  sismember(key: string, member: string) {
    return this.setOf(key).has(member) ? 1 : 0;
  }
  scard(key: string) {
    return this.setOf(key).size;
  }
  hset(key: string, value: Record<string, string>) {
    this.hashes.set(key, { ...(this.hashes.get(key) ?? {}), ...value });
    return 1;
  }
  hgetall(key: string) {
    return this.hashes.get(key) ?? {};
  }
  del(key: string) {
    let n = this.store.delete(key) ? 1 : 0;
    n += this.hashes.delete(key) ? 1 : 0;
    return n;
  }
  lpush() { return 1; }
  ltrim() { return true; }
  lrange(_key: string, _start: number, _stop: number) { return []; }
  expire() { return 1; }
  multi() {
    const chain: Record<string, unknown> = {};
    for (const command of [
      'sadd', 'srem', 'smembers', 'sismember', 'scard',
      'hset', 'hgetall', 'del', 'lpush', 'ltrim', 'lrange', 'expire',
    ]) {
      chain[command] = (..._args: unknown[]) => chain;
    }
    (chain as { exec: () => Promise<[]> }).exec = () => Promise.resolve([]);
    return chain as typeof this & { exec: () => Promise<[]> };
  }
}

function prismaDouble() {
  return {
    user: {
      findUnique: jest.fn().mockImplementation(({ where }: any) =>
        Promise.resolve(
          where?.id === 'admin-shared'
            ? { id: 'admin-shared', role: 'admin', name: 'Shared Admin' }
            : null,
        ),
      ),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    deliveryPersonnel: { findUnique: jest.fn().mockResolvedValue(null) },
    customer: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue(null) },
    conversationParticipents: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

interface WireClient {
  id: string;
  rooms: () => Promise<string[]>;
  emitEvent: (event: string, data: unknown) => void;
  received: Array<{ event: string; data: any }>;
  waitFor: (event: string, timeoutMs?: number) => Promise<any>;
  expectSilence: (event: string, timeoutMs?: number) => Promise<void>;
  close: () => void;
}

function connectClient(
  port: number,
  auth: Record<string, unknown>,
): Promise<WireClient> {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`);
  const received: Array<{ event: string; data: any }> = [];
  const waiters: Array<{
    event: string;
    resolve: (data: any) => void;
  }> = [];
  let id = '';

  const dispatch = (frame: string) => {
    if (!frame.startsWith('42')) return;
    const parsed = JSON.parse(frame.slice(2)) as [string, any];
    received.push({ event: parsed[0], data: parsed[1] });
    const waiterIndex = waiters.findIndex((w) => w.event === parsed[0]);
    if (waiterIndex >= 0) {
      const [waiter] = waiters.splice(waiterIndex, 1);
      waiter.resolve(parsed[1]);
    }
  };

  ws.on('message', (raw: WebSocket.RawData) => {
    const frame = raw.toString();
    if (frame.startsWith('0')) {
      // engine.io OPEN → connect to the default namespace with auth payload
      ws.send(`40${JSON.stringify(auth)}`);
    } else if (frame.startsWith('40')) {
      // namespace CONNECTED — server assigns the sid inside this frame
      try {
        const payload = JSON.parse(frame.slice(2) || '{}');
        id = payload.sid ?? '';
      } catch {
        id = '';
      }
    } else if (frame.startsWith('2')) {
      ws.send('3');
    } else if (frame.startsWith('44')) {
      // namespace connect_error — surface it as a received marker
      dispatch(`42["io-connect-error",${frame.slice(2)}]`);
    } else {
      if (process.env.DEBUG_SOCKET_FRAMES) console.log(`<< [${auth.organizationId ?? 'anon'}]`, frame.slice(0, 140));
      dispatch(frame);
    }
  });

  const opened = new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });

  return opened.then(() => ({
    get id() { return id; },
    rooms: async () => {
      throw new Error('server-side rooms are asserted separately');
    },
    emitEvent: (event: string, data: unknown) => {
      ws.send(`42${JSON.stringify([event, data])}`);
    },
    received,
    waitFor: (event: string, timeoutMs = 700) =>
      new Promise<any>((resolve, reject) => {
        const existing = received.find((r) => r.event === event);
        if (existing) return resolve(existing.data);
        const timer = setTimeout(
          () => reject(new Error(`timed out waiting for ${event}`)),
          timeoutMs,
        );
        waiters.push({
          event,
          resolve: (data) => {
            clearTimeout(timer);
            resolve(data);
          },
        });
      }),
    expectSilence: (event: string, timeoutMs = 500) =>
      new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (received.some((r) => r.event === event)) {
            reject(new Error(`${event} should NOT have been delivered here`));
          } else {
            resolve();
          }
        }, timeoutMs);
      }),
    close: () => ws.close(),
  }));
}

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
    domainId: `dom-${organizationId}`,
    hostname: `${organizationId}.ferio.test`,
    subscriptionStatus: 'ACTIVE' as const,
  }) as TenantContext;
}

describe('Two-tenant live socket isolation (§10.11 multi-client E2E)', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: IoServer;
  let port: number;
  let clients: WireClient[] = [];
  let gateway: SocketGateway;

  const jwt = new JwtService({ secret: SECRET });

  function serverRoomsFor(socketId: string): Set<string> | undefined {
    return io.of('/').sockets.get(socketId)?.rooms;
  }

  beforeAll(async () => {
    httpServer = createServer();
    io = new IoServer(httpServer, { transports: ['websocket'] });

    const redis = new RedisStub();
    const prisma = prismaDouble();
    const socketAuth = new SocketAuthService(
      jwt,
      redis as never,
      prisma as never,
    );
    const socketRoom = new SocketRoomService(redis as never, prisma as never);
    gateway = new SocketGateway(
      jwt,
      socketAuth,
      socketRoom,
      {} as never, // firebase — never reached in these flows
      prisma as never,
      redis as never,
      redis as never,
    );
    // @WebSocketServer() is populated by the Nest lifecycle; wire it to our
    // hand-rolled server so emissions route through the real adapter-less
    // in-memory namespace.
    (gateway as unknown as { server: IoServer }).server = io;
    // Handlers are bound explicitly instead of booting the Nest websocket
    // container — the isolation behavior under test lives inside these
    // methods, not in the decorator registry.
    io.on('connection', (socket) => {
      const s = socket as never;
      socket.on('join', (data: unknown, ack?: unknown) =>
        void Promise.resolve(gateway.handleJoinRoom(s as never, data as never, ack as never)),
      );
      socket.on('new-message-received', (data: unknown, ack?: unknown) =>
        void Promise.resolve(gateway.handleNewMessage(s as never, data as never, ack as never)),
      );
      void gateway.handleConnection(s).catch((error) => {
        console.log('HANDLE_CONNECTION_FAILED:', error?.message);
      });
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });
    port = (httpServer.address() as AddressInfo).port;
  });

  afterAll(async () => {
    for (const client of clients) client.close();
    await new Promise<void>((resolve) => io.close(() => resolve()));
  });

  function track(client: WireClient): WireClient {
    clients.push(client);
    return client;
  }

  async function connectAdmin(org: string) {
    const token = await jwt.signAsync({
      userId: 'admin-shared',
      role: 'admin',
      organizationId: org,
    });
    const client = track(await connectClient(port, { token }));
    await client.waitFor('connected');
    return client;
  }

  async function connectGuest(org: string) {
    const guestId = `gst_${randomUUID()}`;
    const token = await jwt.signAsync({
      userId: guestId,
      role: 'guest',
      organizationId: org,
      purpose: 'chat_socket',
    });
    const client = track(await connectClient(port, { token }));
    await client.waitFor('connected');
    return { client, guestId };
  }

  it('scopes connection rooms per organization', async () => {
    const adminA = await connectAdmin('org-a');
    const adminB = await connectAdmin('org-b');

    const roomsA = serverRoomsFor(adminA.id)!;
    const roomsB = serverRoomsFor(adminB.id)!;

    expect(roomsA.has('org:org-a:role::admin')).toBe(true);
    expect(roomsA.has('org:org-a:admin-room')).toBe(true);
    expect(roomsA.has('role::admin')).toBe(false);

    expect(roomsB.has('org:org-b:role::admin')).toBe(true);
    expect([...roomsB].some((room) => room.startsWith('org:org-a:'))).toBe(false);
    expect([...roomsA].some((room) => room.startsWith('org:org-b:'))).toBe(false);
  });

  it('identical userIds across tenants receive only their own notifications', async () => {
    const adminA = clients[0];
    const adminB = clients[1];

    await runWithTenantContext(tenantContext('org-a'), () =>
      gateway.emitNotificationToUser('admin-shared', { from: 'org-a' }),
    );
    const delivered = await adminA.waitFor('notification::admin-shared');
    expect(delivered.from).toBe('org-a');
    await adminB.expectSilence('notification::admin-shared');

    await runWithTenantContext(tenantContext('org-b'), () =>
      gateway.emitNotificationToUser('admin-shared', { from: 'org-b' }),
    );
    const deliveredB = await adminB.waitFor('notification::admin-shared');
    expect(deliveredB.from).toBe('org-b');
  });

  it('guest chat relay reaches own-org listeners only; foreign join fails', async () => {
    const adminA = clients[0];
    const adminB = clients[1];
    const guestA = await connectGuest('org-a');
    const guestB = await connectGuest('org-b');

    const conversationId = `conv-${guestA.guestId}`;

    // Foreign guest attempts to join A's conversation — denied.
    guestB.client.emitEvent('join', { conversationId });
    await new Promise((r) => setTimeout(r, 150));
    const guestBRooms = serverRoomsFor(guestB.client.id)!;
    const scopedForA = [...guestBRooms].filter((room) =>
      room.includes(conversationId),
    );
    expect(
      scopedForA.every((room) => room.startsWith('org:org-b:')),
    ).toBe(true);

    // The correct same-org audience for a guest chat is that org's ADMIN
    // console (guests can only ever see their own conversation).
        guestA.client.emitEvent('new-message-received', {
      conversationId,
      text: 'hello from org-a',
    });

    const heardByOwnOrgAdmin = await adminA.waitFor('new-message-received');
    expect(heardByOwnOrgAdmin.conversationId).toBe(conversationId);
    await adminB.expectSilence('new-message-received');
    await guestB.client.expectSilence('new-message-received');
  });
});
