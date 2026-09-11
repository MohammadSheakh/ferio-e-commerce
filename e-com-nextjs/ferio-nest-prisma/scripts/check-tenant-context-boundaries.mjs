#!/usr/bin/env node

/**
 * Validate the checked-in tenant context entry-point inventory.
 *
 * This is a structural guard, not a substitute for runtime isolation tests.
 * It ensures that high-risk HTTP, worker, socket, and fan-out entry points
 * remain present and retain their required boundary markers.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifestPath = resolve(root, 'scripts/tenant-context-boundaries.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const violations = [];

for (const [boundary, entries] of Object.entries(manifest)) {
  if (!Array.isArray(entries) || entries.length === 0) {
    violations.push(`${boundary} must contain at least one inventory entry`);
    continue;
  }
  for (const entry of entries) {
    if (!entry || typeof entry.file !== 'string' || !Array.isArray(entry.markers)) {
      violations.push(`${boundary} contains a malformed inventory entry`);
      continue;
    }
    let source;
    try {
      source = await readFile(resolve(root, entry.file), 'utf8');
    } catch {
      violations.push(`${boundary} entry is missing: ${entry.file}`);
      continue;
    }
    for (const marker of entry.markers) {
      if (typeof marker !== 'string' || !marker || !source.includes(marker)) {
        violations.push(`${entry.file} is missing context marker: ${marker}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Tenant context boundary check failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(
    `Tenant context boundary check passed: ${Object.values(manifest).reduce((count, entries) => count + entries.length, 0)} entry points inventoried.`,
  );
}
