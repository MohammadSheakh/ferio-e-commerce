import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const prismaRoot = resolve(process.cwd(), 'prisma');
const migrationRoots = ['migrations', 'platform-migrations'];
const migrationNamePattern = /^\d{14}(?:_[a-z0-9][a-z0-9_-]*)?$/;
const names = new Set();
let checked = 0;

for (const rootName of migrationRoots) {
  const root = resolve(prismaRoot, rootName);
  const lockFile = resolve(root, 'migration_lock.toml');
  const lock = readFileSync(lockFile, 'utf8');
  if (!/^provider\s*=\s*"postgresql"\s*$/m.test(lock)) {
    throw new Error(`${rootName}/migration_lock.toml must select PostgreSQL`);
  }

  const entries = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const name of entries) {
    if (!migrationNamePattern.test(name)) {
      throw new Error(`${rootName}/${name} has an invalid migration name`);
    }
    if (names.has(name)) {
      throw new Error(`duplicate migration directory: ${name}`);
    }
    names.add(name);

    const sqlFile = resolve(root, name, 'migration.sql');
    const sql = readFileSync(sqlFile, 'utf8').trim();
    if (!sql) {
      throw new Error(`${rootName}/${name}/migration.sql is empty`);
    }
    checked += 1;
  }
}

if (checked === 0) {
  throw new Error('no Prisma migrations found');
}

console.log(
  `Migration validation passed: ${checked} PostgreSQL migration directories checked across ${migrationRoots.length} roots.`,
);
