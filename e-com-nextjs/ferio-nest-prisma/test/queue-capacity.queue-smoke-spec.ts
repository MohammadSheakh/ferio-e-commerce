import { Queue, QueueEvents, Worker } from 'bullmq';

interface CapacityJobData {
  organizationId: string;
  sequence: number;
}

const redisPort = Number(process.env.TEST_REDIS_PORT);
const queuePrefix = process.env.TEST_QUEUE_PREFIX;
if (!Number.isInteger(redisPort) || redisPort < 1 || redisPort === 6379) {
  throw new Error(
    'TEST_REDIS_PORT must use an isolated non-default Redis port',
  );
}
if (!queuePrefix?.startsWith('ferio:test:')) {
  throw new Error('TEST_QUEUE_PREFIX must start with ferio:test:');
}

const connection = { host: '127.0.0.1', port: redisPort };
const queueName = `capacity-smoke-${process.pid}`;
const queue = new Queue<CapacityJobData>(queueName, {
  connection,
  prefix: queuePrefix,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
});
const queueEvents = new QueueEvents(queueName, {
  connection,
  prefix: queuePrefix,
});

function boundedEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

describe('BullMQ queue capacity smoke', () => {
  afterAll(async () => {
    await queueEvents.close();
    await queue.obliterate({ force: true });
    await queue.close();
  });

  it('drains a bounded tenant-labelled batch at controlled concurrency', async () => {
    const jobCount = boundedEnv('QUEUE_CAPACITY_JOBS', 500, 10, 10_000);
    const concurrency = boundedEnv('QUEUE_CAPACITY_CONCURRENCY', 10, 1, 100);
    const processedOrganizations: string[] = [];
    const worker = new Worker<CapacityJobData>(
      queueName,
      async (job) => {
        processedOrganizations.push(job.data.organizationId);
        return { organizationId: job.data.organizationId };
      },
      { connection, prefix: queuePrefix, concurrency },
    );

    try {
      await Promise.all([
        queue.waitUntilReady(),
        queueEvents.waitUntilReady(),
        worker.waitUntilReady(),
      ]);
      await queue.obliterate({ force: true });

      const jobs = Array.from({ length: jobCount }, (_, sequence) => ({
        name: 'capacity-probe',
        data: {
          organizationId: sequence % 2 === 0 ? 'org-a' : 'org-b',
          sequence,
        },
      }));
      const enqueueStarted = performance.now();
      const created = await queue.addBulk(jobs);
      const enqueueMs = Math.round(performance.now() - enqueueStarted);

      const drainStarted = performance.now();
      await Promise.all(
        created.map((job) => job.waitUntilFinished(queueEvents, 30_000)),
      );
      const drainMs = Math.round(performance.now() - drainStarted);

      expect(processedOrganizations).toHaveLength(jobCount);
      expect(
        processedOrganizations.filter((id) => id === 'org-a'),
      ).toHaveLength(Math.ceil(jobCount / 2));
      expect(
        processedOrganizations.filter((id) => id === 'org-b'),
      ).toHaveLength(Math.floor(jobCount / 2));

      console.log(
        JSON.stringify({
          event: 'perf_queue_capacity',
          jobCount,
          concurrency,
          enqueueMs,
          drainMs,
          jobsPerSecond: Math.round((jobCount / Math.max(drainMs, 1)) * 1000),
          failed: 0,
        }),
      );
    } finally {
      await worker.close();
    }
  }, 45_000);
});
