#!/usr/bin/env node
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const run = (command, args) =>
  spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

const database = run(process.execPath, ['scripts/ensure-test-database.mjs']);
if (database.status !== 0) process.exit(database.status ?? 1);

const tests = spawnSync('pnpm', ['run', 'test:integration'], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: 'test', TENANCY_ENABLED: 'false' },
  stdio: 'inherit',
});
process.exit(tests.status ?? 1);
