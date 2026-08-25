/**
 * Jest global setup for the integration suites.
 *
 * The commerce integration specs assume the canonical migration chain is
 * applied to TEST_DATABASE_URL (reconciliation even asserts the
 * `_prisma_migrations` ledger matches prisma/migrations). CI provisions a
 * fresh, empty PostgreSQL per run, so this hook deploys the chain once via
 * the real Prisma CLI before any suite executes.
 */
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

module.exports = async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    // Suites individually guard and skip/throw when unset.
    return;
  }

  const prismaBin = join(__dirname, '..', 'node_modules', '.bin', 'prisma');
  const result = spawnSync(
    process.execPath,
    [
      join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js'),
      'migrate',
      'deploy',
      '--schema',
      join(__dirname, '..', 'prisma', 'schema.prisma'),
    ],
    {
      cwd: join(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    },
  );

  if (result.status !== 0 || result.error) {
    throw new Error(
      `Integration global setup failed: prisma migrate deploy exited with ${result.status}`,
    );
  }
};
