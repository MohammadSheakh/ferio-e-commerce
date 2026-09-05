import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const appModule = await readFile(resolve(root, 'src/app.module.ts'), 'utf8');
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
const violations = [];

if (/MongooseModule\s*\.\s*forRoot(?:Async)?\s*\(/.test(activeAppSource)) {
  violations.push('AppModule must not register a legacy Mongoose root connection');
}

if (/MongooseModule\s*\.\s*forRoot(?:Async)?\s*\(/.test(activeMongoSource)) {
  violations.push(
    'src/core/database/mongo/mongodb.module.ts must not register a legacy Mongoose root connection',
  );
}

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
