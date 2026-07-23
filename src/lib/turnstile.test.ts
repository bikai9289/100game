import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { verifyTurnstile } from './turnstile';

const request = {
  token: 'test-turnstile-token',
  secret: 'test-turnstile-secret',
  remoteIp: '127.0.0.1',
  expectedAction: 'score' as const,
  idempotencyKey: '00000000-0000-4000-8000-000000000002',
};

const failedResult = {
  ok: false,
  error: {
    code: 'TURNSTILE_FAILED',
    message: 'Verification failed.',
  },
} as const;

const unavailableResult = {
  ok: false,
  error: {
    code: 'TURNSTILE_UNAVAILABLE',
    message: 'Verification is temporarily unavailable.',
  },
} as const;

describe('verifyTurnstile', () => {
  it('accepts a successful response with the expected action', async () => {
    const result = await verifyTurnstile({
      ...request,
      fetchImpl: async () => Response.json({ success: true, action: 'score' }),
    });

    assert.deepEqual(result, { ok: true });
  });

  it('maps a Cloudflare rejection to a stable failed result', async () => {
    const result = await verifyTurnstile({
      ...request,
      fetchImpl: async () =>
        Response.json({
          success: false,
          'error-codes': ['timeout-or-duplicate'],
        }),
    });

    assert.deepEqual(result, failedResult);
    assert.equal(
      JSON.stringify(result).includes('timeout-or-duplicate'),
      false
    );
  });

  it('rejects a successful response with the wrong action', async () => {
    const result = await verifyTurnstile({
      ...request,
      fetchImpl: async () =>
        Response.json({ success: true, action: 'comment' }),
    });

    assert.deepEqual(result, failedResult);
  });

  it('maps thrown fetch errors to unavailable without leaking inputs', async () => {
    const result = await verifyTurnstile({
      ...request,
      fetchImpl: async () => {
        throw new Error('upstream included a sensitive request');
      },
    });

    assert.deepEqual(result, unavailableResult);
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes(request.token), false);
    assert.equal(serialized.includes(request.secret), false);
  });

  it('maps non-successful HTTP responses to unavailable', async () => {
    const result = await verifyTurnstile({
      ...request,
      fetchImpl: async () => new Response('unavailable', { status: 503 }),
    });

    assert.deepEqual(result, unavailableResult);
  });

  it('maps invalid JSON and response schemas to unavailable', async (t) => {
    const fixtures = [
      {
        name: 'invalid JSON',
        response: new Response('{', {
          headers: { 'content-type': 'application/json' },
        }),
      },
      {
        name: 'invalid schema',
        response: Response.json({ success: 'yes', action: 'score' }),
      },
    ];

    for (const fixture of fixtures) {
      await t.test(fixture.name, async () => {
        const result = await verifyTurnstile({
          ...request,
          fetchImpl: async () => fixture.response,
        });

        assert.deepEqual(result, unavailableResult);
      });
    }
  });

  it('posts the documented JSON payload with a five-second timeout', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    const result = await verifyTurnstile({
      ...request,
      fetchImpl: async (input, init) => {
        capturedUrl = input.toString();
        capturedInit = init;
        return Response.json({ success: true, action: 'score' });
      },
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(
      capturedUrl,
      'https://challenges.cloudflare.com/turnstile/v0/siteverify'
    );
    assert.equal(capturedInit?.method, 'POST');
    assert.deepEqual(capturedInit?.headers, {
      'content-type': 'application/json',
    });
    assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
      secret: request.secret,
      response: request.token,
      remoteip: request.remoteIp,
      idempotency_key: request.idempotencyKey,
    });
    assert(capturedInit?.signal instanceof AbortSignal);
    assert.equal(capturedInit.signal.aborted, false);
  });

  it('creates an idempotency UUID when one is not provided', async () => {
    let body: Record<string, unknown> = {};

    const result = await verifyTurnstile({
      token: request.token,
      secret: request.secret,
      remoteIp: request.remoteIp,
      expectedAction: request.expectedAction,
      fetchImpl: async (_input, init) => {
        body = JSON.parse(String(init?.body));
        return Response.json({ success: true, action: 'score' });
      },
    });

    assert.deepEqual(result, { ok: true });
    assert.match(
      String(body.idempotency_key),
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
