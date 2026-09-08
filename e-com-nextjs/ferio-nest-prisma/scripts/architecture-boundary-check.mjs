import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const appModule = await readFile(resolve(root, 'src/app.module.ts'), 'utf8');
const platformPrisma = await readFile(
  resolve(root, 'prisma/platform.prisma'),
  'utf8',
);
const platformBilling = await readFile(
  resolve(root, 'src/platform/services/platform-billing.service.ts'),
  'utf8',
);
const dataClassification = await readFile(
  resolve(root, '../_doc/multi-tenant/data-classification.md'),
  'utf8',
);
let mongoModule = '';
try {
  mongoModule = await readFile(
    resolve(root, 'src/core/database/mongo/mongodb.module.ts'),
    'utf8',
  );
} catch {
  // The legacy Mongo root is allowed to be fully removed.
}

// Comments are documentation, not executable architecture. Remove them before
// checking whether a legacy root connection has been reintroduced.
const withoutComments = (source) =>
  source
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

const activeAppSource = withoutComments(appModule);
const activeMongoSource = withoutComments(mongoModule);
const activePlatformBillingSource = withoutComments(platformBilling);
const violations = [];

async function listControllerFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listControllerFiles(path)));
    } else if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
      files.push(path);
    }
  }
  return files;
}

async function checkTenantAdminControllerGuards() {
  const featureRoot = resolve(root, 'src/features');
  const controllerFiles = await listControllerFiles(featureRoot);

  for (const file of controllerFiles) {
    const source = withoutComments(await readFile(file, 'utf8'));
    const controllerPattern = /@Controller\(\s*(['"])(admin(?:\/|\1))/g;
    for (const match of source.matchAll(controllerPattern)) {
      const start = match.index ?? 0;
      const nextController = source.indexOf('@Controller', start + 1);
      const classDeclaration = source.indexOf('export class', start);
      const endCandidates = [nextController, classDeclaration].filter(
        (index) => index >= 0,
      );
      const end =
        endCandidates.length > 0 ? Math.min(...endCandidates) : source.length;
      const decoratorBlock = source.slice(start, end);
      if (!decoratorBlock.includes('TenantMembershipGuard')) {
        violations.push(
          `${file.replace(`${root}/`, '')} exposes an admin controller without TenantMembershipGuard`,
        );
      }
    }
  }
}

function checkPlatformModelClassification() {
  const platformModels = [...platformPrisma.matchAll(/\bmodel\s+([A-Za-z0-9_]+)/g)].map(
    (match) => match[1],
  );
  const controlPlaneSection = dataClassification.match(
    /### New CONTROL_PLANE models[\s\S]*?(?=###|$)/,
  )?.[0] ?? '';

  for (const model of platformModels) {
    if (!controlPlaneSection.includes(`\`${model}\``)) {
      violations.push(
        `platform Prisma model ${model} is missing from the CONTROL_PLANE classification`,
      );
    }
  }
}

if (/MongooseModule\s*\.\s*forRoot(?:Async)?\s*\(/.test(activeAppSource)) {
  violations.push('AppModule must not register a legacy Mongoose root connection');
}

if (/MongooseModule\s*\.\s*forRoot(?:Async)?\s*\(/.test(activeMongoSource)) {
  violations.push(
    'src/core/database/mongo/mongodb.module.ts must not register a legacy Mongoose root connection',
  );
}

if (
  /from\s+['"][^'"]*(?:^|\/)tenancy(?:\/|['"])/m.test(
    activePlatformBillingSource,
  ) ||
  /from\s+['"][^'"]*(?:^|\/)features(?:\/|['"])/m.test(
    activePlatformBillingSource,
  ) ||
  /\bTenant(?:DbService|DatabaseManager)\b/.test(activePlatformBillingSource)
) {
  violations.push(
    'platform billing must not import tenant-plane services or tenant database access',
  );
}

checkPlatformModelClassification();
await checkTenantAdminControllerGuards();

try {
  await access(resolve(root, '..', 'docker-compose.production.yml'));
} catch {
  violations.push('the hardened docker-compose.production.yml overlay is missing');
}

if (violations.length > 0) {
  console.error('Architecture boundary check failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log('Architecture boundary check passed: Prisma tenancy boundary and production overlay are present.');
}
