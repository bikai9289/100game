import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  gameSessionRequestSchema,
  issueGameSession,
  verifyGameSession,
} from './game-session';

const secret = 'session-secret-that-is-at-least-32-bytes';
const now = 1_800_000_000_000;
const input = {
  gameId: 'women',
  durationSeconds: 720,
  startedAt: now,
};
const sessionId = '00000000-0000-4000-8000-000000000001';

test('validates game session requests', () => {
  assert.equal(gameSessionRequestSchema.safeParse(input).success, true);
  assert.equal(
    gameSessionRequestSchema.safeParse({ ...input, startedAt: 'now' }).success,
    false
  );
});

test('issues a signed game session token with the expected payload', async () => {
  const issued = await issueGameSession(input, secret, { now, sessionId });

  assert.equal(issued.sessionId, sessionId);
  assert.equal(issued.startedAt, now);
  assert.equal(issued.expiresAt, now + 720_000 + 300_000);

  const verified = await verifyGameSession(issued.sessionToken, secret, now);
  assert.equal(verified.ok, true);
  assert(verified.ok);
  assert.deepEqual(verified.payload, {
    v: 1,
    sessionId,
    gameId: 'women',
    durationSeconds: 720,
    startedAt: now,
    expiresAt: now + 720_000 + 300_000,
  });
});

test('rejects a tampered game session token', async () => {
  const issued = await issueGameSession(input, secret, { now, sessionId });
  const [payload, signature] = issued.sessionToken.split('.');
  assert(payload);
  assert(signature);

  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const finalCharacterIndex = alphabet.indexOf(signature.at(-1) ?? '');
  assert.notEqual(finalCharacterIndex, -1);

  const tamperedToken = `${payload}.${signature.slice(0, -1)}${
    alphabet[finalCharacterIndex + 1]
  }`;

  assert.deepEqual(await verifyGameSession(tamperedToken, secret, now), {
    ok: false,
    code: 'SESSION_INVALID',
  });
});

test('rejects a malformed game session token', async () => {
  assert.deepEqual(await verifyGameSession('bad-token', secret, now), {
    ok: false,
    code: 'SESSION_INVALID',
  });
});

test('rejects a game session token after its expiration', async () => {
  const issued = await issueGameSession(input, secret, { now, sessionId });

  assert.deepEqual(
    await verifyGameSession(issued.sessionToken, secret, issued.expiresAt + 1),
    {
      ok: false,
      code: 'SESSION_EXPIRED',
    }
  );
});
