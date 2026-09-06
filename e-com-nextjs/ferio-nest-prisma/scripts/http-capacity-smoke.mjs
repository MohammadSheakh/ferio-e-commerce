#!/usr/bin/env node

const target = process.env.CAPACITY_BASE_URL;
if (!target) {
  console.error('CAPACITY_BASE_URL is required');
  process.exit(64);
}

const integerEnv = (name, fallback, min, max) => {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
};

const requests = integerEnv('CAPACITY_REQUESTS', 1000, 1, 100_000);
const concurrency = integerEnv('CAPACITY_CONCURRENCY', 50, 1, 1_000);
const timeoutMs = integerEnv('CAPACITY_TIMEOUT_MS', 5_000, 100, 60_000);
const latencies = [];
let startedRequests = 0;
let completed = 0;
let failures = 0;

const startedAt = performance.now();

async function requestOnce() {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(target, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    latencies.push(performance.now() - started);
    if (!response.ok) failures += 1;
  } catch {
    latencies.push(performance.now() - started);
    failures += 1;
  } finally {
    clearTimeout(timeout);
    completed += 1;
  }
}

async function worker() {
  while (true) {
    if (startedRequests >= requests) return;
    startedRequests += 1;
    await requestOnce();
  }
}

await Promise.all(
  Array.from({ length: Math.min(concurrency, requests) }, () => worker()),
);

latencies.sort((a, b) => a - b);
const percentile = (ratio) =>
  Math.round(latencies[Math.min(Math.floor(latencies.length * ratio), latencies.length - 1)] ?? 0);
const elapsedMs = Math.max(performance.now() - startedAt, 1);

console.log(
  JSON.stringify({
    event: 'capacity_http_smoke',
    target,
    requests,
    concurrency: Math.min(concurrency, requests),
    completed,
    failures,
    elapsedMs: Math.round(elapsedMs),
    requestsPerSecond: Math.round((requests / elapsedMs) * 1000),
    latencyMs: {
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
      max: Math.round(latencies.at(-1) ?? 0),
    },
  }),
);

process.exitCode = failures === 0 ? 0 : 1;
