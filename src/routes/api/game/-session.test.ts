import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  type GameSessionPostDependencies,
  handleGameSessionPost,
  Route,
} from './session';

const NOW = 1_800_000_000_000;
const SECRET = 'session-secret-that-is-at-least-32-bytes';
const ISSUED_SESSION = {
  sessionId: '00000000-0000-4000-8000-000000000001',
  sessionToken: 'payload.signature',
  startedAt: NOW,
  expiresAt: NOW + 1_020_000,
};

type PostHandler = (context: { request: Request }) => Promise<Response>;

const post = (Route.options.server as { handlers: { POST: PostHandler } })
  .handlers.POST;

function makeDependencies(
  overrides: Partial<GameSessionPostDependencies> = {}
): GameSessionPostDependencies {
  return {
    clock: () => NOW,
    getSessionSecret: () => SECRET,
    issueSession: async () => ISSUED_SESSION,
    logger: { error: () => undefined },
    ...overrides,
  };
}

function validBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    gameId: 'women',
    durationSeconds: 720,
    startedAt: NOW,
    ...overrides,
  });
}

function createRequest(
  body: BodyInit | null,
  headers: Record<string, string> = {}
) {
  return new Request('https://example.test/api/game/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
}

function createStreamingRequest(
  chunks: string[],
  headers: Record<string, string> = {}
) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });

  return new Request('https://example.test/api/game/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}

function exactSizeBody(byteLength: number) {
  const empty = validBody({ padding: '' });
  const paddingLength = byteLength - new TextEncoder().encode(empty).byteLength;
  assert(paddingLength >= 0);
  const body = validBody({ padding: 'x'.repeat(paddingLength) });
  assert.equal(new TextEncoder().encode(body).byteLength, byteLength);
  return body;
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

test('rejects declared content-length over 4096 bytes', async () => {
  const response = await handleGameSessionPost(
    createRequest('{}', { 'content-length': '5000' }),
    makeDependencies()
  );

  assert.equal(response.status, 413);
  assert.deepEqual(await readJson(response), {
    ok: false,
    error: {
      code: 'INVALID_REQUEST',
      message: 'Request body is too large.',
    },
  });
});

test('rejects an actual body over 4096 bytes without content-length', async () => {
  const body = validBody({ padding: 'x'.repeat(5_000) });
  assert(new TextEncoder().encode(body).byteLength > 4_096);

  const response = await post({ request: createRequest(body) });

  assert.equal(response.status, 413);
});

test('rejects malformed and negative content-length values', async (t) => {
  for (const contentLength of ['not-a-number', '-1']) {
    await t.test(contentLength, async () => {
      const response = await handleGameSessionPost(
        createRequest('{}', { 'content-length': contentLength }),
        makeDependencies()
      );

      assert.equal(response.status, 400);
      assert.deepEqual(await readJson(response), {
        ok: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid Content-Length header.',
        },
      });
    });
  }
});

test('rejects an understated content-length when actual bytes exceed the limit', async () => {
  const response = await handleGameSessionPost(
    createRequest(validBody({ padding: 'x'.repeat(5_000) }), {
      'content-length': '100',
    }),
    makeDependencies()
  );

  assert.equal(response.status, 413);
});

test('allows an exact 4096-byte valid JSON body', async () => {
  const response = await handleGameSessionPost(
    createRequest(exactSizeBody(4_096), { 'content-length': '4096' }),
    makeDependencies()
  );

  assert.equal(response.status, 201);
});

test('enforces the byte limit across a chunked request stream', async () => {
  const body = validBody({ padding: 'x'.repeat(5_000) });
  const splitAt = 3_000;
  const response = await handleGameSessionPost(
    createStreamingRequest([body.slice(0, splitAt), body.slice(splitAt)]),
    makeDependencies()
  );

  assert.equal(response.status, 413);
});

test('counts multibyte UTF-8 bytes instead of JavaScript string length', async () => {
  const body = validBody({ padding: '界'.repeat(1_500) });
  assert(body.length < 4_096);
  assert(new TextEncoder().encode(body).byteLength > 4_096);

  const response = await handleGameSessionPost(
    createRequest(body),
    makeDependencies()
  );

  assert.equal(response.status, 413);
});

test('accepts application/json with MIME parameters case-insensitively', async () => {
  const response = await handleGameSessionPost(
    createRequest(validBody(), {
      'content-type': 'Application/JSON; Charset=UTF-8',
    }),
    makeDependencies()
  );

  assert.equal(response.status, 201);
  assert.deepEqual(await readJson(response), {
    ok: true,
    data: ISSUED_SESSION,
  });
});

test('rejects missing and non-JSON content types', async (t) => {
  const cases = [
    { name: 'missing', contentType: undefined },
    { name: 'text/plain', contentType: 'text/plain' },
    { name: 'application/xml', contentType: 'application/xml' },
  ];

  for (const fixture of cases) {
    await t.test(fixture.name, async () => {
      const request = new Request('https://example.test/api/game/session', {
        method: 'POST',
        headers: fixture.contentType
          ? { 'content-type': fixture.contentType }
          : undefined,
        body: validBody(),
      });
      const response = await handleGameSessionPost(request, makeDependencies());

      assert.equal(response.status, 400);
      assert.deepEqual(await readJson(response), {
        ok: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Expected an application/json request body.',
        },
      });
    });
  }
});

test('rejects malformed JSON', async () => {
  const response = await handleGameSessionPost(
    createRequest('{'),
    makeDependencies()
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await readJson(response), {
    ok: false,
    error: {
      code: 'INVALID_REQUEST',
      message: 'Expected a JSON request body.',
    },
  });
});

test('rejects invalid UTF-8 as an invalid JSON body', async () => {
  const response = await handleGameSessionPost(
    createRequest(new Uint8Array([0xc3, 0x28])),
    makeDependencies()
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await readJson(response), {
    ok: false,
    error: {
      code: 'INVALID_REQUEST',
      message: 'Expected a JSON request body.',
    },
  });
});

test('returns flattened fields for schema failures', async () => {
  const response = await handleGameSessionPost(
    createRequest(JSON.stringify({ gameId: 42 })),
    makeDependencies()
  );
  const json = await readJson(response);

  assert.equal(response.status, 400);
  assert.equal(json.ok, false);
  const error = json.error as Record<string, unknown>;
  assert.equal(error.code, 'INVALID_REQUEST');
  assert.deepEqual(Object.keys(error.fields as object).sort(), [
    'durationSeconds',
    'gameId',
    'startedAt',
  ]);
});

test('rejects missing and short session secrets', async (t) => {
  for (const sessionSecret of [undefined, 'too-short']) {
    await t.test(sessionSecret ?? 'missing', async () => {
      const response = await handleGameSessionPost(
        createRequest(validBody()),
        makeDependencies({ getSessionSecret: () => sessionSecret })
      );

      assert.equal(response.status, 503);
      assert.deepEqual(await readJson(response), {
        ok: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'Game sessions are not configured.',
        },
      });
    });
  }
});

test('rejects an unknown game', async () => {
  const response = await handleGameSessionPost(
    createRequest(validBody({ gameId: 'unknown' })),
    makeDependencies()
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await readJson(response), {
    ok: false,
    error: { code: 'INVALID_GAME', message: 'Unknown game mode.' },
  });
});

test('rejects a duration that does not match the game definition', async () => {
  const response = await handleGameSessionPost(
    createRequest(validBody({ durationSeconds: 300 })),
    makeDependencies()
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await readJson(response), {
    ok: false,
    error: {
      code: 'INVALID_GAME',
      message: 'Game duration does not match.',
    },
  });
});

test('uses server time when the client clock is skewed', async () => {
  let issuerStartedAt: number | undefined;
  const response = await handleGameSessionPost(
    createRequest(validBody({ startedAt: NOW - 60_000 })),
    makeDependencies({
      issueSession: async (input) => {
        issuerStartedAt = input.startedAt;
        return ISSUED_SESSION;
      },
    })
  );

  assert.equal(response.status, 201);
  assert.equal(issuerStartedAt, NOW);
});

test('issues an exact public response using one clock reading', async () => {
  let clockCalls = 0;
  let issuerNow: number | undefined;
  const response = await handleGameSessionPost(
    createRequest(validBody()),
    makeDependencies({
      clock: () => {
        clockCalls += 1;
        return NOW;
      },
      issueSession: async (_input, secret, options) => {
        assert.equal(secret, SECRET);
        issuerNow = options?.now;
        return { ...ISSUED_SESSION, privateValue: 'must-not-leak' };
      },
    })
  );

  assert.equal(response.status, 201);
  assert.equal(clockCalls, 1);
  assert.equal(issuerNow, NOW);
  assert.deepEqual(await readJson(response), {
    ok: true,
    data: ISSUED_SESSION,
  });
});

test('logs only a fixed safe message when the issuer throws', async () => {
  const bodyMarker = 'private-request-body-marker';
  const secretMarker = `${SECRET}-private`;
  const tokenMarker = ISSUED_SESSION.sessionToken;
  const failure = new Error(
    `issuer failed ${bodyMarker} ${secretMarker} ${tokenMarker}`
  );
  const logs: string[] = [];
  const response = await handleGameSessionPost(
    createRequest(validBody({ padding: bodyMarker })),
    makeDependencies({
      getSessionSecret: () => secretMarker,
      issueSession: async () => {
        throw failure;
      },
      logger: {
        error: (message) => logs.push(message),
      },
    })
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await readJson(response), {
    ok: false,
    error: {
      code: 'SERVER_ERROR',
      message: 'The game session could not be created.',
    },
  });
  assert.deepEqual(logs, ['[game-session:post] unexpected error']);
  const renderedLogs = logs.join(' ');
  assert.equal(renderedLogs.includes(bodyMarker), false);
  assert.equal(renderedLogs.includes(secretMarker), false);
  assert.equal(renderedLogs.includes(tokenMarker), false);
});
