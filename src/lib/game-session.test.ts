import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  gameSessionRequestSchema,
  issueGameSession,
  validateGameSessionStart,
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

function encodeTestBase64Url(bytes: Uint8Array) {
  let binary = '';

  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

async function createSignedTestToken(
  payloadBytes: Uint8Array,
  signingSecret = secret
) {
  const payloadPart = encodeTestBase64Url(payloadBytes);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadPart)
  );

  return `${payloadPart}.${encodeTestBase64Url(new Uint8Array(signature))}`;
}

test('validates game session requests', () => {
  assert.equal(gameSessionRequestSchema.safeParse(input).success, true);
  assert.equal(
    gameSessionRequestSchema.safeParse({ ...input, startedAt: 'now' }).success,
    false
  );
});

test('validates game session start times within the allowed window', () => {
  assert.equal(validateGameSessionStart(now, now), true);
  assert.equal(validateGameSessionStart(now - 5_000, now), true);
  assert.equal(validateGameSessionStart(now + 1_000, now), true);
  assert.equal(validateGameSessionStart(now - 5_001, now), false);
  assert.equal(validateGameSessionStart(now + 1_001, now), false);
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

test('clamps a future game session start to the issue time', async () => {
  const issued = await issueGameSession(
    { ...input, startedAt: now + 1_000 },
    secret,
    { now, sessionId }
  );

  assert.equal(issued.startedAt, now);
  assert.equal(issued.expiresAt, now + 720_000 + 300_000);

  const verified = await verifyGameSession(issued.sessionToken, secret, now);
  assert(verified.ok);
  assert.equal(verified.payload.startedAt, now);
  assert.equal(verified.payload.expiresAt, now + 720_000 + 300_000);
});

test('rejects non-canonical base64url signature encoding', async () => {
  const issued = await issueGameSession(input, secret, { now, sessionId });
  const [payload, signature] = issued.sessionToken.split('.');
  assert(payload);
  assert(signature);

  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const finalCharacterIndex = alphabet.indexOf(signature.at(-1) ?? '');
  assert.notEqual(finalCharacterIndex, -1);
  const replacement = alphabet.at(finalCharacterIndex + 1);
  assert(replacement);

  const tamperedToken = `${payload}.${signature.slice(0, -1)}${replacement}`;

  assert.deepEqual(await verifyGameSession(tamperedToken, secret, now), {
    ok: false,
    code: 'SESSION_INVALID',
  });
});

test('rejects a cryptographically modified signature', async () => {
  const issued = await issueGameSession(input, secret, { now, sessionId });
  const [payload, signature] = issued.sessionToken.split('.');
  assert(payload);
  assert(signature);

  const replacement = signature.startsWith('A') ? 'B' : 'A';
  const tamperedToken = `${payload}.${replacement}${signature.slice(1)}`;

  assert.deepEqual(await verifyGameSession(tamperedToken, secret, now), {
    ok: false,
    code: 'SESSION_INVALID',
  });
});

test('rejects a cryptographically modified payload', async () => {
  const issued = await issueGameSession(input, secret, { now, sessionId });
  const [payload, signature] = issued.sessionToken.split('.');
  assert(payload);
  assert(signature);

  const replacement = payload.startsWith('A') ? 'B' : 'A';
  const tamperedToken = `${replacement}${payload.slice(1)}.${signature}`;

  assert.deepEqual(await verifyGameSession(tamperedToken, secret, now), {
    ok: false,
    code: 'SESSION_INVALID',
  });
});

test('rejects a valid token when verified with a different secret', async () => {
  const issued = await issueGameSession(input, secret, { now, sessionId });

  assert.deepEqual(
    await verifyGameSession(
      issued.sessionToken,
      'different-session-secret-that-is-at-least-32-bytes',
      now
    ),
    { ok: false, code: 'SESSION_INVALID' }
  );
});

test('rejects correctly signed payloads with invalid content', async (t) => {
  const validPayload = {
    v: 1,
    sessionId,
    gameId: 'women',
    durationSeconds: 720,
    startedAt: now,
    expiresAt: now + 720_000 + 300_000,
  };
  const encoder = new TextEncoder();
  const fixtures = [
    {
      name: 'unsupported version',
      bytes: encoder.encode(JSON.stringify({ ...validPayload, v: 2 })),
    },
    {
      name: 'invalid session UUID',
      bytes: encoder.encode(
        JSON.stringify({ ...validPayload, sessionId: 'not-a-uuid' })
      ),
    },
    {
      name: 'duration outside the allowed range',
      bytes: encoder.encode(
        JSON.stringify({ ...validPayload, durationSeconds: 59 })
      ),
    },
    {
      name: 'invalid JSON',
      bytes: encoder.encode('{'),
    },
    {
      name: 'invalid UTF-8',
      bytes: new Uint8Array([0xc3, 0x28]),
    },
  ];

  for (const fixture of fixtures) {
    await t.test(fixture.name, async () => {
      const token = await createSignedTestToken(fixture.bytes);

      assert.deepEqual(await verifyGameSession(token, secret, now), {
        ok: false,
        code: 'SESSION_INVALID',
      });
    });
  }
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

test('rejects a non-finite verification time', async () => {
  const issued = await issueGameSession(input, secret, { now, sessionId });

  assert.deepEqual(
    await verifyGameSession(issued.sessionToken, secret, Number.NaN),
    {
      ok: false,
      code: 'SESSION_INVALID',
    }
  );
});
