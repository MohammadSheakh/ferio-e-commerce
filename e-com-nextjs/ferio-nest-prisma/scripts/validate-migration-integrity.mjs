import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const prismaRoot = resolve(process.cwd(), 'prisma');
const manifestPath = resolve(prismaRoot, 'migration-checksums.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const actualPaths = new Set();

for (const [relativePath, expectedHash] of Object.entries(manifest)) {
  const filePath = resolve(prismaRoot, relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`Migration checksum entry points to missing file: ${relativePath}`);
  }
  const actualHash = createHash('sha256')
    .update(readFileSync(filePath))
    .digest('hex');
  if (actualHash !== expectedHash) {
    throw new Error(
      `Migration artifact changed after release: ${relativePath} (expected ${expectedHash}, got ${actualHash})`,
    );
  }
  actualPaths.add(relativePath);
}

for (const rootName of ['migrations', 'platform-migrations']) {
  const root = resolve(prismaRoot, rootName);
  for (const directory of readdirSync(root, { withFileTypes: true })) {
    if (!directory.isDirectory()) continue;
    const relativePath = `${rootName}/${directory.name}/migration.sql`;
    if (!actualPaths.has(relativePath)) {
      throw new Error(`Migration artifact is missing from checksum manifest: ${relativePath}`);
    }
  }
}

console.log(
  `Migration integrity passed: ${actualPaths.size} committed artifacts match their SHA-256 manifest.`,
);
