import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..');
const readJson = (file: string) =>
  JSON.parse(readFileSync(join(ROOT, file), 'utf8'));

// Only Node lines with the October 2026 security fixes (22.23.4 and 24.22.1)
const PATCHED_ENGINES = '^22.23.4 || >=24.22.1';

const satisfiesPatched = (version: string) => {
  const [major, minor, patch] = version.split('.').map(Number);
  const atLeast = (m: number, p: number) =>
    minor > m || (minor === m && patch >= p);
  return (
    (major === 22 && atLeast(23, 4)) ||
    major > 24 ||
    (major === 24 && atLeast(22, 1))
  );
};

describe('Node.js runtime', () => {
  it('declares only patched Node lines in the published packages', () => {
    for (const pkg of [
      'package.json',
      'packages/sdk/package.json',
      'packages/react-native/package.json',
    ]) {
      expect(readJson(pkg).engines.node, pkg).toBe(PATCHED_ENGINES);
    }
  });

  it('pins local dev and the release job to the patched Node 24', () => {
    expect(readFileSync(join(ROOT, '.nvmrc'), 'utf8').trim()).toBe('24.22.1');
  });

  it('runs on a Node version the engines range accepts', () => {
    expect(satisfiesPatched(process.versions.node)).toBe(true);
  });
});
