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
const productionCompose = await readFile(
  resolve(root, '../docker-compose.production.yml'),
  'utf8',
);
const tenantContextManifest = await readFile(
  resolve(root, 'scripts/tenant-context-boundaries.json'),
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

async function checkTenantTransactionEntryPoints() {
  const featureRoot = resolve(root, 'src/features');
  const files = [];

  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.service.ts') &&
        !entry.name.endsWith('.spec.ts')
      ) {
        files.push(path);
      }
    }
  }

  await walk(featureRoot);
  for (const file of files) {
    const source = withoutComments(await readFile(file, 'utf8'));
    if (/\$transaction\s*\(/.test(source) && !/\bdb\s*=\s*await\s+this\.db\(\)/.test(source)) {
      violations.push(
        `${file.replace(`${root}/`, '')} uses a transaction without resolving the tenant db client first`,
      );
    }
    for (const line of source.split('\n')) {
      if (line.includes('$transaction(') && !line.includes('db.$transaction(')) {
        violations.push(
          `${file.replace(`${root}/`, '')} must enter tenant transactions through db.$transaction`,
        );
        break;
      }
    }
  }
}

async function checkTenantServiceDatabaseBoundaries() {
  const featureRoot = resolve(root, 'src/features');
  const files = [];

  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.service.ts') &&
        !entry.name.endsWith('.spec.ts')
      ) {
        files.push(path);
      }
    }
  }

  await walk(featureRoot);
  for (const file of files) {
    const source = withoutComments(await readFile(file, 'utf8'));
    if (!source.includes('PrismaService')) continue;

    const relative = file.replace(`${root}/`, '');
    if (!source.includes('resolveTenantDatabase')) {
      violations.push(
        `${relative} injects PrismaService without the shared tenant database resolver`,
      );
    }

    if (/this\.prisma\.(?!poolMetrics\b)[A-Za-z_$][\w$]*/.test(source)) {
      violations.push(
        `${relative} performs a direct PrismaService query instead of using its resolved db client`,
      );
    }

    if (
      /resolveTenantDatabase\s*\(\s*this\.tenantDb\s*,\s*this\.prisma\s*\)/s.test(
        source,
      )
    ) {
      violations.push(
        `${relative} uses a legacy database fallback without an explicit reason`,
      );
    }
  }
}

async function checkWorkerDatabaseBoundaries() {
  const featureRoot = resolve(root, 'src/features');
  const files = [];

  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith('.queue.ts') || entry.name.endsWith('.processor.ts')) &&
        !entry.name.endsWith('.spec.ts')
      ) {
        files.push(path);
      }
    }
  }

  await walk(featureRoot);
  for (const file of files) {
    const source = withoutComments(await readFile(file, 'utf8'));
    if (/this\.prisma\.(?!poolMetrics\b)[A-Za-z_$][\w$]*/.test(source)) {
      violations.push(
        `${file.replace(`${root}/`, '')} performs a direct PrismaService query from a queue/processor`,
      );
    }
  }
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

function checkProductionTenantEdgeContract() {
  const requiredEntries = [
    'PLATFORM_PUBLIC_DOMAIN: ${PLATFORM_PUBLIC_DOMAIN:?',
    'TENANT_TRUSTED_PROXY_CIDRS: ${TENANT_TRUSTED_PROXY_CIDRS:?',
    'CUSTOMER_WEB_TRUSTED_PROXY: ${CUSTOMER_WEB_TRUSTED_PROXY:?',
  ];
  for (const entry of requiredEntries) {
    if (!productionCompose.includes(entry)) {
      violations.push(
        `docker-compose.production.yml must require ${entry.split(':', 1)[0]} explicitly`,
      );
    }
  }
}

function checkTenantContextManifest() {
  try {
    const manifest = JSON.parse(tenantContextManifest);
    const entryCount = Object.values(manifest).reduce(
      (count, entries) => count + (Array.isArray(entries) ? entries.length : 0),
      0,
    );
    if (entryCount < 10) {
      violations.push('tenant context manifest must inventory at least 10 entry points');
    }
  } catch {
    violations.push('tenant context boundary manifest must be valid JSON');
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
await checkTenantTransactionEntryPoints();
await checkTenantServiceDatabaseBoundaries();
await checkWorkerDatabaseBoundaries();
await checkTenantAdminControllerGuards();
checkProductionTenantEdgeContract();
checkTenantContextManifest();

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
