import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  readCommunitySecurityConfig,
  readGameSessionSecret,
} from './game-security';

describe('readCommunitySecurityConfig', () => {
  it('fails closed and maps valid secrets to camelCase', () => {
    assert.deepEqual(readCommunitySecurityConfig({}), { ok: false });

    assert.deepEqual(
      readCommunitySecurityConfig({
        TURNSTILE_SECRET_KEY: 't'.repeat(32),
        GAME_SESSION_SECRET: 's'.repeat(32),
        GAME_IP_HASH_SALT: 'too-short',
      }),
      { ok: false }
    );

    assert.deepEqual(
      readCommunitySecurityConfig({
        TURNSTILE_SECRET_KEY: 't'.repeat(32),
        GAME_SESSION_SECRET: 's'.repeat(32),
        GAME_IP_HASH_SALT: 'i'.repeat(32),
      }),
      {
        ok: true,
        data: {
          turnstileSecretKey: 't'.repeat(32),
          gameSessionSecret: 's'.repeat(32),
          ipHashSalt: 'i'.repeat(32),
        },
      }
    );
  });
});

describe('readGameSessionSecret', () => {
  it('fails closed and returns a valid secret', () => {
    assert.deepEqual(readGameSessionSecret(undefined), { ok: false });

    const secret = 's'.repeat(32);
    assert.deepEqual(readGameSessionSecret(secret), { ok: true, secret });
  });
});
