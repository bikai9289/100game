import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('generates Paraglide files before every production build', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
    scripts?: Record<string, string>;
  };

  assert.match(
    packageJson.scripts?.build ?? '',
    /^pnpm locale:compile && vite build$/
  );
});
