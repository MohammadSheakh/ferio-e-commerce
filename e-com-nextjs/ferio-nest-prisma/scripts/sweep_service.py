#!/usr/bin/env python3
"""Sweep a NestJS service file: this.prisma -> db() with tenant resolution."""
import re, sys, os

def sweep(path):
    s = open(path).read()
    if 'private async db()' in s:
        print(f'SKIP (already swept): {path}'); return True
    
    # 1) Ensure Optional in @nestjs/common import
    m = re.search(r"import \{([^}]*)\} from '@nestjs/common';", s)
    assert m, f'{path}: no nestjs/common import'
    names_raw = m.group(1)
    if 'Optional' not in names_raw:
        # Check if single-line or multi-line
        if '\n' not in names_raw:
            old = m.group(0)
            inner = names_raw.strip().rstrip(',')
            new_import = f"import {{ {inner}, Optional }} from '@nestjs/common';"
            s = s.replace(old, new_import, 1)
        else:
            s = s.replace(m.group(0), m.group(0).replace('}', ', Optional }'), 1)
    
    # 2) Ensure PrismaClient type import
    if "PrismaClient" not in s or "import type { PrismaClient }" not in s:
        # Add after the last import from @prisma/client
        if "from '@prisma/client'" in s:
            for line in s.split('\n'):
                if '@prisma/client' in line and 'import' in line and 'type' not in line:
                    s = s.replace(line, f"import type {{ PrismaClient }} from '@prisma/client';\n{line}", 1)
                    break
        else:
            # Add standalone
            first_import = re.search(r'^import ', s, re.M)
            s = s[:first_import.start()] + "import type { PrismaClient } from '@prisma/client';\n" + s[first_import.start():]
    
    # 3) Ensure TenantDbService import
    if 'tenancy/tenant-db.service' not in s:
        # Find the PrismaService import and add after it
        for pat in [
            r"(import \{ PrismaService \} from '@app/database';)",
            r"(import \{[^}]*PrismaService[^}]*\} from '@app/database';)",
        ]:
            m2 = re.search(pat, s)
            if m2:
                s = s.replace(m2.group(0), m2.group(0) + "\nimport { TenantDbService } from '../../tenancy/tenant-db.service';", 1)
                break
        else:
            raise Exception(f'{path}: cannot find @app/database import to anchor TenantDbService')
    
    # 4) Add tenantDb param at end of constructor params
    ci = s.index('constructor(')
    p_start = s.index('(', ci)
    depth = 0; j = p_start
    while True:
        c = s[j]
        if c == '(': depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0: break
        j += 1
    param = ",\n    @Optional() private readonly tenantDb?: TenantDbService,"
    s = s[:j] + param + s[j:]
    
    # 5) Add db() helper after constructor body close
    body_open = s.index('{', j)
    depth = 0; k = body_open
    while True:
        if s[k] == '{': depth += 1
        elif s[k] == '}':
            depth -= 1
            if depth == 0: break
        k += 1
    ins = s.index('\n', k) + 1
    helper = (
        "\n"
        "  /**\n"
        "   * MT-7: tenant client inside resolved contexts; explicit legacy\n"
        "   * fallback outside resolved requests. Never guesses.\n"
        "   */\n"
        "  private async db(): Promise<PrismaClient> {\n"
        "    const tenant = await this.tenantDb?.tryGet();\n"
        "    return tenant ?? (this.prisma as PrismaClient);\n"
        "  }\n"
    )
    s = s[:ins] + helper + s[ins:]
    
    # 6) Replace this.prisma -> db in method bodies only (not ctor/helper)
    lines = s.split('\n')
    starts = []
    for i2, line in enumerate(lines):
        m3 = re.match(r'^  (?:private )?(?:async )?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', line)
        if m3 and 'constructor' not in m3.group(1) and 'db' != m3.group(1):
            starts.append((i2, m3.group(1)))
    
    out = []; converted = 0; i3 = 0; sync_needing = []
    while i3 < len(lines):
        name = next((n for s2, n in starts if s2 == i3), None)
        if name is None or name == 'db':
            out.append(lines[i3]); i3 += 1; continue
        end = next((s2 for s2, n2 in starts if s2 > i3), len(lines))
        body = lines[i3:end]
        if 'this.prisma' not in '\n'.join(body):
            out.extend(body); i3 = end; continue
        depth_p = 0; close_rel = None
        for k2, line in enumerate(body):
            depth_p += line.count('(') - line.count(')')
            if k2 == 0:
                if depth_p <= 0 and re.search(r'\{\s*$', line):
                    close_rel = k2; break
                continue
            if depth_p <= 0 and re.search(r'\)\s*(?::\s*[A-Za-z0-9_<>\[\]| .]+)?\s*\{\s*$', line):
                close_rel = k2; break
        if close_rel is None:
            out.extend(body); i3 = end; continue
        nb = [l.replace('this.prisma', 'db') for l in body]
        nb.insert(close_rel + 1, '    const db = await this.db();')
        out.extend(nb)
        converted += 1
        i3 = end
    
    open(path, 'w').write('\n'.join(out))
    
    # 7) Verify with tsc
    import subprocess
    r = subprocess.run(
        ['pnpm', 'exec', 'tsc', '--noEmit', '-p', 'tsconfig.json'],
        capture_output=True, text=True, timeout=300,
        cwd=os.path.dirname(os.path.abspath(path))
    )
    errors = [l for l in (r.stdout + r.stderr).split('\n') if 'error TS' in l and path.split('/')[-1] in l]
    if errors:
        print(f'FAIL {path.split("/")[-1]}: {len(converted)} swept but {len(errors)} tsc errors:')
        for e in errors[:5]: print(f'  {e}')
        return False
    print(f'OK {path.split("/")[-1]}: {converted} methods swept, typecheck clean on this file')
    return True

if __name__ == '__main__':
    base = os.getcwd()
    ok = True
    for f in sys.argv[1:]:
        full = os.path.join(base, f)
        if not sweep(full):
            ok = False
    sys.exit(0 if ok else 1)
