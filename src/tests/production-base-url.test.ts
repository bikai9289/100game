import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const PRODUCTION_ORIGIN = 'https://name100challenge.com';

test('uses the public site origin when build-time env is unavailable', () => {
  const clientEnv = readFileSync('src/env/client.ts', 'utf8');
  const serverEnv = readFileSync('src/env/server.ts', 'utf8');

  for (const source of [clientEnv, serverEnv]) {
    assert.match(
      source,
      new RegExp(
        `VITE_BASE_URL: z\\.url\\(\\)\\.default\\('${PRODUCTION_ORIGIN}'\\)`
      )
    );
    assert.doesNotMatch(
      source,
      /VITE_BASE_URL: z\.url\(\)\.default\('http:\/\/localhost:3000'\)/
    );
  }
});
