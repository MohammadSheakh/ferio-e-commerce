#!/usr/bin/env node
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  console.error('TEST_DATABASE_URL is required for local integration tests');
  process.exit(64);
}

const target = new URL(databaseUrl);
const databaseName = decodeURIComponent(target.pathname.slice(1));
if (!/^\w+_test(?:_\w+)*$/.test(databaseName)) {
  console.error(
    'TEST_DATABASE_URL database must match the safe *_test_* naming policy',
  );
  process.exit(64);
}

const admin = new URL(databaseUrl);
admin.pathname = '/postgres';
const identifier = `"${databaseName.replaceAll('"', '""')}"`;
const client = new Client({ connectionString: admin.toString() });

try {
  await client.connect();
  const result = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [databaseName],
  );
  if (result.rowCount === 0) {
    try {
      await client.query(`CREATE DATABASE ${identifier}`);
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== '42P04') {
        throw error;
      }
    }
  }
  console.log(`integration test database ready: ${databaseName}`);
} finally {
  await client.end().catch(() => undefined);
}
