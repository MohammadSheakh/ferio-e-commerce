import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server as IoServer } from 'socket.io';
import WebSocket from 'ws';

const redisPort = Number(process.env.TEST_REDIS_PORT);
const redisAvailable = Number.isInteger(redisPort) && redisPort > 0;
const conditionalDescribe = redisAvailable ? describe : describe.skip;
const adapterKey = `ferio:test:socket-multi-instance:${process.pid}`;

interface WireClient {
  waitFor: <T = unknown>(event: string, timeoutMs?: number) => Promise<T>;
  expectSilence: (event: string, timeoutMs?: number) => Promise<void>;
  close: () => void;
}

function connectClient(
  port: number,
  organizationId: string,
): Promise<WireClient> {
  const ws = new WebSocket(
    `ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`,
  );
  const received: Array<{ event: string; data: unknown }> = [];
  const waiters: Array<{
    event: string;
    resolve: (data: unknown) => void;
  }> = [];

  const dispatch = (frame: string) => {
    if (!frame.startsWith('42')) return;
    const [event, data] = JSON.parse(frame.slice(2)) as [string, unknown];
    received.push({ event, data });
    const waiterIndex = waiters.findIndex((waiter) => waiter.event === event);
    if (waiterIndex < 0) return;
    const [waiter] = waiters.splice(waiterIndex, 1);
    waiter.resolve(data);
  };

  ws.on('message', (raw: WebSocket.RawData) => {
    const frame = raw.toString();
    if (frame.startsWith('0'))
      ws.send(`40${JSON.stringify({ organizationId })}`);
    else if (frame.startsWith('2')) ws.send('3');
    else dispatch(frame);
  });

  const opened = new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });

  return opened.then(
    () =>
      new Promise<WireClient>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('timed out waiting for socket connection')),
          2_000,
        );
        const onMessage = (raw: WebSocket.RawData) => {
          if (!raw.toString().startsWith('40')) return;
          clearTimeout(timer);
          ws.off('message', onMessage);
          resolve({
            waitFor: <T = unknown>(event: string, timeoutMs = 2_000) =>
              new Promise<T>((waitResolve, waitReject) => {
                const existing = received.find((item) => item.event === event);
                if (existing) {
                  waitResolve(existing.data as T);
                  return;
                }
                const waitTimer = setTimeout(
                  () => waitReject(new Error(`timed out waiting for ${event}`)),
                  timeoutMs,
                );
                waiters.push({
                  event,
                  resolve: (data) => {
                    clearTimeout(waitTimer);
                    waitResolve(data as T);
                  },
                });
              }),
            expectSilence: (event: string, timeoutMs = 500) =>
              new Promise<void>((silenceResolve, silenceReject) => {
                setTimeout(() => {
                  if (received.some((item) => item.event === event)) {
                    silenceReject(
                      new Error(`${event} should not have been delivered`),
                    );
                  } else silenceResolve();
                }, timeoutMs);
              }),
            close: () => ws.close(),
          });
        };
        ws.on('message', onMessage);
      }),
  );
}

function listen(server: ReturnType<typeof createServer>): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, () => resolve((server.address() as AddressInfo).port));
  });
}

function closeIo(io: IoServer): Promise<void> {
  return new Promise((resolve) => io.close(() => resolve()));
}

conditionalDescribe('Socket.IO multi-instance Redis fanout', () => {
  const clients: WireClient[] = [];
  const redisClients: Redis[] = [];
  let httpA: ReturnType<typeof createServer>;
  let httpB: ReturnType<typeof createServer>;
  let ioA: IoServer;
  let ioB: IoServer;
  let portA: number;
  let portB: number;

  beforeAll(async () => {
    const createRedis = () => {
      const client = new Redis({
        host: '127.0.0.1',
        port: redisPort,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
      });
      redisClients.push(client);
      return client;
    };
    const pubA = createRedis();
    const subA = createRedis();
    const pubB = createRedis();
    const subB = createRedis();
    await Promise.all(redisClients.map((client) => client.connect()));

    ioA = new IoServer({ transports: ['websocket'] });
    ioB = new IoServer({ transports: ['websocket'] });
    ioA.adapter(createAdapter(pubA, subA, { key: adapterKey }));
    ioB.adapter(createAdapter(pubB, subB, { key: adapterKey }));
    const register = (io: IoServer) => {
      io.on('connection', (socket) => {
        const auth = socket.handshake.auth as { organizationId?: unknown };
        if (typeof auth.organizationId === 'string') {
          void socket.join(`org:${auth.organizationId}:admins`);
        }
      });
    };
    register(ioA);
    register(ioB);

    httpA = createServer();
    httpB = createServer();
    ioA.attach(httpA);
    ioB.attach(httpB);
    [portA, portB] = await Promise.all([listen(httpA), listen(httpB)]);
  });

  afterAll(async () => {
    clients.forEach((client) => client.close());
    await Promise.all([closeIo(ioA), closeIo(ioB)]);
    await Promise.all(redisClients.map((client) => client.quit()));
  });

  it('delivers tenant fanout from one instance to another without cross-tenant delivery', async () => {
    const localOrgA = await connectClient(portA, 'org-a');
    const remoteOrgA = await connectClient(portB, 'org-a');
    const remoteOrgB = await connectClient(portB, 'org-b');
    clients.push(localOrgA, remoteOrgA, remoteOrgB);

    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    const started = performance.now();
    ioA.to('org:org-a:admins').emit('scale-probe', {
      organizationId: 'org-a',
    });
    const local = await localOrgA.waitFor<{ organizationId: string }>(
      'scale-probe',
    );
    const remote = await remoteOrgA.waitFor<{ organizationId: string }>(
      'scale-probe',
    );
    const fanoutMs = Math.round(performance.now() - started);

    expect(local.organizationId).toBe('org-a');
    expect(remote.organizationId).toBe('org-a');
    await remoteOrgB.expectSilence('scale-probe');
    console.log(
      JSON.stringify({
        event: 'perf_socket_multi_instance_fanout',
        instances: 2,
        tenantListeners: 2,
        foreignTenantListeners: 1,
        fanoutMs,
      }),
    );
  }, 30_000);
});
