import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = resolve(root, 'src');

function collectTypeScriptFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'generated')
        files.push(...collectTypeScriptFiles(path));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) files.push(path);
  }
  return files;
}

const files = collectTypeScriptFiles(sourceRoot).sort();
execFileSync(
  process.execPath,
  [resolve(root, 'node_modules/eslint/bin/eslint.js'), ...files, '--quiet'],
  { cwd: root, stdio: 'inherit' },
);
