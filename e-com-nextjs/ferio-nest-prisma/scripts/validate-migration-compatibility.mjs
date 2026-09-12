import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const prismaRoot = resolve(process.cwd(), 'prisma');
const baseline = process.env.MIGRATION_COMPATIBILITY_BASELINE ?? '20260910100000';
const destructivePattern =
  /(?:DROP\s+(?:TABLE|COLUMN|INDEX|CONSTRAINT)|ALTER\s+TYPE[^;]+RENAME|RENAME\s+COLUMN)/i;
const pilotFreeze = process.env.PILOT_SCHEMA_FREEZE === 'true';
const pilotOverride = process.env.PILOT_SCHEMA_OVERRIDE === 'true';

if (pilotOverride && !pilotFreeze) {
  throw new Error('PILOT_SCHEMA_OVERRIDE requires PILOT_SCHEMA_FREEZE=true');
}
if (
  pilotOverride &&
  (process.env.PILOT_SCHEMA_OVERRIDE_REASON ?? '').trim().length < 20
) {
  throw new Error(
    'PILOT_SCHEMA_OVERRIDE_REASON must contain at least 20 characters when overriding the pilot schema freeze',
  );
}

if (!/^\d{14}(?:_[a-z0-9][a-z0-9_-]*)?$/.test(baseline)) {
  throw new Error(`Invalid migration compatibility baseline: ${baseline}`);
}

let checked = 0;
for (const rootName of ['migrations', 'platform-migrations']) {
  const root = resolve(prismaRoot, rootName);
  for (const directory of readdirSync(root, { withFileTypes: true })) {
    if (!directory.isDirectory() || directory.name <= baseline) continue;
    const sqlPath = resolve(root, directory.name, 'migration.sql');
    if (!existsSync(sqlPath)) continue;
    checked += 1;
    const sql = readFileSync(sqlPath, 'utf8');
    if (!/^-- FERIO: (EXPAND|COMPATIBLE|CONTRACT)\b/m.test(sql)) {
      throw new Error(
        `${rootName}/${directory.name}/migration.sql must declare -- FERIO: EXPAND, -- FERIO: COMPATIBLE, or -- FERIO: CONTRACT`,
      );
    }
    const destructive = destructivePattern.test(sql);
    if (destructive && pilotFreeze && !pilotOverride) {
      throw new Error(
        `${rootName}/${directory.name}/migration.sql is destructive while PILOT_SCHEMA_FREEZE=true; provide an approved override reason only when required`,
      );
    }
    if (destructive && !/^-- FERIO: CONTRACT\b/m.test(sql)) {
      throw new Error(
        `${rootName}/${directory.name}/migration.sql contains a destructive operation without -- FERIO: CONTRACT`,
      );
    }
  }
}

console.log(
  `Migration compatibility validation passed: ${checked} post-baseline artifact(s) declare an expand/compatible/contract strategy.`,
);
