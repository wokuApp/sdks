import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), 'woku-openapi-'));
const output = join(temporary, 'openapi.ts');
try {
  execFileSync(
    'pnpm',
    ['exec', 'openapi-typescript', 'openapi/openapi-v1.json', '-o', output],
    { cwd, stdio: 'inherit' },
  );
  const generated = readFileSync(output, 'utf8');
  const target = join(cwd, 'src/_generated/openapi.ts');
  if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8') !== generated)
      throw new Error('Generated SDK types are stale. Run pnpm generate.');
  } else writeFileSync(target, generated);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
