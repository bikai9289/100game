import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GameSessionPayload } from '@/lib/game-session';
import {
  handleCommunityPost,
  type CommunityPostDependencies,
  type ScoreInsert,
} from '@/lib/game-community-handler';

const NOW = 1_800_000_100_000;
const SESSION_TOKEN = 'signed-session-token-that-is-long-enough';
const TURNSTILE_TOKEN = 'turnstile-token';
const SESSION_ID = '00000000-0000-4000-8000-000000000001';
const IP = '203.0.113.10';
const SECURITY = {
  turnstileSecretKey: 'turnstile-secret-that-is-at-least-32-bytes',
  gameSessionSecret: 'session-secret-that-is-at-least-32-bytes',
  ipHashSalt: 'ip-hash-salt-that-is-at-least-32-bytes',
};

const SESSION: GameSessionPayload = {
  v: 1,
  sessionId: SESSION_ID,
  gameId: 'women',
  durationSeconds: 720,
  startedAt: NOW - 100_000,
  expiresAt: NOW - 100_000 + 720_000 + 300_000,
};

function answers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    name: `Person ${index + 1}`,
    aliases: [],
    category: 'musicians',
  }));
}

function scoreBody(overrides: Record<string, unknown> = {}) {
  return {
    action: 'score',
    gameId: 'women',
    playerName: 'Player One',
    guessedNames: ['Taylor Swift'],
    durationSeconds: 720,
    sessionToken: SESSION_TOKEN,
    turnstileToken: TURNSTILE_TOKEN,
    ...overrides,
  };
}

function commentBody(overrides: Record<string, unknown> = {}) {
  return {
    action: 'comment',
    gameId: 'women',
    displayName: 'Player One',
    message: 'Great challenge!',
    turnstileToken: TURNSTILE_TOKEN,
    ...overrides,
  };
}

function request(body: unknown) {
  return new Request('https://example.test/api/game/community', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'CF-Connecting-IP': IP,
    },
    body: JSON.stringify(body),
  });
}

function makeDependencies(
  overrides: Partial<CommunityPostDependencies> = {}
): CommunityPostDependencies {
  return {
    readSecurityConfig: () => ({ ok: true, data: SECURITY }),
    verifySession: async () => ({ ok: true, payload: SESSION }),
    verifyHuman: async () => ({ ok: true }),
    getDefinition: (gameId) => {
      if (gameId !== 'women') return null;
      return {
        id: 'women',
        targetScore: 100,
        durationSeconds: 720,
        answers: [
          {
            name: 'Taylor Swift',
            aliases: ['taylor', 'swift'],
            category: 'musicians',
          },
        ],
      };
    },
    getClientIp: () => IP,
    hashValue: async (value) => `hash:${value}`,
    findBlock: async () => false,
    countRecentScores: async () => 0,
    findDuplicateScore: async () => false,
    insertScore: async () => undefined,
    countRecentComments: async () => 0,
    findLatestScore: async () => null,
    insertComment: async () => undefined,
    now: () => NOW,
    randomUUID: () => '00000000-0000-4000-8000-000000000002',
    logger: { error: () => undefined },
    ...overrides,
  };
}

async function json(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

describe('protected game community writes', () => {
  it('requires application/json before reading security configuration', async (t) => {
    for (const contentType of [undefined, 'text/plain', 'application/xml']) {
      await t.test(contentType ?? 'missing', async () => {
        let configReads = 0;
        const response = await handleCommunityPost(
          new Request('https://example.test/api/game/community', {
            method: 'POST',
            headers: contentType ? { 'content-type': contentType } : undefined,
            body: JSON.stringify(scoreBody()),
          }),
          makeDependencies({
            readSecurityConfig: () => {
              configReads += 1;
              return { ok: true, data: SECURITY };
            },
          })
        );
        const body = (await json(response)) as { error: { code: string } };

        assert.equal(response.status, 400);
        assert.equal(body.error.code, 'INVALID_REQUEST');
        assert.equal(configReads, 0);
      });
    }
  });

  it('rejects an actual request body over 20 KB', async () => {
    const response = await handleCommunityPost(
      request({ ...scoreBody(), padding: 'x'.repeat(20_001) }),
      makeDependencies()
    );
    const body = (await json(response)) as { error: { code: string } };

    assert.equal(response.status, 413);
    assert.equal(body.error.code, 'INVALID_REQUEST');
  });

  it('fails closed before parsing submission tokens when config is missing', async () => {
    let databaseReads = 0;
    const response = await handleCommunityPost(
      request(
        scoreBody({ sessionToken: undefined, turnstileToken: undefined })
      ),
      makeDependencies({
        readSecurityConfig: () => ({ ok: false }),
        countRecentScores: async () => {
          databaseReads += 1;
          return 0;
        },
        findBlock: async () => {
          databaseReads += 1;
          return false;
        },
      })
    );
    const body = (await json(response)) as { error: { code: string } };

    assert.equal(response.status, 503);
    assert.equal(body.error.code, 'CONFIGURATION_ERROR');
    assert.equal(databaseReads, 0);
  });

  it('returns dedicated missing-token errors before D1 access', async (t) => {
    const cases = [
      {
        name: 'score session',
        body: scoreBody({ sessionToken: undefined }),
        status: 400,
        code: 'SESSION_REQUIRED',
      },
      {
        name: 'score Turnstile',
        body: scoreBody({ turnstileToken: undefined }),
        status: 400,
        code: 'TURNSTILE_REQUIRED',
      },
      {
        name: 'comment Turnstile',
        body: commentBody({ turnstileToken: undefined }),
        status: 400,
        code: 'TURNSTILE_REQUIRED',
      },
    ];

    for (const fixture of cases) {
      await t.test(fixture.name, async () => {
        let databaseReads = 0;
        const response = await handleCommunityPost(
          request(fixture.body),
          makeDependencies({
            findBlock: async () => {
              databaseReads += 1;
              return false;
            },
          })
        );
        const body = (await json(response)) as {
          error: { code: string };
        };

        assert.equal(response.status, fixture.status);
        assert.equal(body.error.code, fixture.code);
        assert.equal(databaseReads, 0);
      });
    }
  });

  it('maps invalid, expired and mismatched sessions before D1 access', async (t) => {
    const cases = [
      {
        name: 'invalid',
        result: { ok: false, code: 'SESSION_INVALID' } as const,
        status: 403,
        code: 'SESSION_INVALID',
      },
      {
        name: 'expired',
        result: { ok: false, code: 'SESSION_EXPIRED' } as const,
        status: 410,
        code: 'SESSION_EXPIRED',
      },
      {
        name: 'game mismatch',
        result: {
          ok: true,
          payload: { ...SESSION, gameId: 'men' },
        } as const,
        status: 403,
        code: 'SESSION_INVALID',
      },
      {
        name: 'duration mismatch',
        result: {
          ok: true,
          payload: { ...SESSION, durationSeconds: 600 },
        } as const,
        status: 403,
        code: 'SESSION_INVALID',
      },
    ];

    for (const fixture of cases) {
      await t.test(fixture.name, async () => {
        let turnstileCalls = 0;
        let databaseReads = 0;
        const response = await handleCommunityPost(
          request(scoreBody()),
          makeDependencies({
            verifySession: async () => fixture.result,
            verifyHuman: async () => {
              turnstileCalls += 1;
              return { ok: true };
            },
            findBlock: async () => {
              databaseReads += 1;
              return false;
            },
          })
        );
        const body = (await json(response)) as {
          error: { code: string };
        };

        assert.equal(response.status, fixture.status);
        assert.equal(body.error.code, fixture.code);
        assert.equal(turnstileCalls, 0);
        assert.equal(databaseReads, 0);
      });
    }
  });

  it('maps Turnstile error codes and verifies before D1 access', async (t) => {
    const cases = [
      { code: 'TURNSTILE_FAILED' as const, status: 403 },
      { code: 'TURNSTILE_UNAVAILABLE' as const, status: 503 },
    ];

    for (const fixture of cases) {
      await t.test(fixture.code, async () => {
        let databaseReads = 0;
        const response = await handleCommunityPost(
          request(scoreBody()),
          makeDependencies({
            verifyHuman: async () => ({
              ok: false,
              code: fixture.code,
            }),
            findBlock: async () => {
              databaseReads += 1;
              return false;
            },
          })
        );
        const body = (await json(response)) as {
          error: { code: string };
        };

        assert.equal(response.status, fixture.status);
        assert.equal(body.error.code, fixture.code);
        assert.equal(databaseReads, 0);
      });
    }
  });

  it('rejects an implausibly fast low score before D1 access', async () => {
    let databaseReads = 0;
    const response = await handleCommunityPost(
      request(scoreBody()),
      makeDependencies({
        verifySession: async () => ({
          ok: true,
          payload: { ...SESSION, startedAt: NOW - 4_999 },
        }),
        getDefinition: () => ({
          durationSeconds: 720,
          targetScore: 1,
          answers: [
            {
              name: 'Taylor Swift',
              aliases: ['taylor', 'swift'],
              category: 'musicians',
            },
          ],
        }),
        countRecentScores: async () => {
          databaseReads += 1;
          return 0;
        },
        findBlock: async () => {
          databaseReads += 1;
          return false;
        },
      })
    );
    const body = (await json(response)) as { error: { code: string } };

    assert.equal(response.status, 422);
    assert.equal(body.error.code, 'SCORE_TOO_FAST');
    assert.equal(databaseReads, 0);
  });

  it('accepts a low score at the minimum server elapsed time', async () => {
    const response = await handleCommunityPost(
      request(scoreBody()),
      makeDependencies({
        verifySession: async () => ({
          ok: true,
          payload: { ...SESSION, startedAt: NOW - 5_000 },
        }),
        getDefinition: () => ({
          durationSeconds: 720,
          targetScore: 1,
          answers: [
            {
              name: 'Taylor Swift',
              aliases: ['taylor', 'swift'],
              category: 'musicians',
            },
          ],
        }),
      })
    );

    assert.equal(response.status, 201);
  });

  it('rejects near-target scores below their scaled minimum time', async (t) => {
    const cases = [
      { name: '99 of 100', score: 99, targetScore: 100, elapsedMs: 49_499 },
      { name: '29 of 30', score: 29, targetScore: 30, elapsedMs: 14_499 },
    ];

    for (const fixture of cases) {
      await t.test(fixture.name, async () => {
        const gameAnswers = answers(fixture.score);
        let databaseReads = 0;
        const response = await handleCommunityPost(
          request(
            scoreBody({
              guessedNames: gameAnswers.map((answer) => answer.name),
            })
          ),
          makeDependencies({
            verifySession: async () => ({
              ok: true,
              payload: {
                ...SESSION,
                startedAt: NOW - fixture.elapsedMs,
              },
            }),
            getDefinition: () => ({
              durationSeconds: 720,
              targetScore: fixture.targetScore,
              answers: gameAnswers,
            }),
            findBlock: async () => {
              databaseReads += 1;
              return false;
            },
          })
        );
        const body = (await json(response)) as { error: { code: string } };

        assert.equal(response.status, 422);
        assert.equal(body.error.code, 'SCORE_TOO_FAST');
        assert.equal(databaseReads, 0);
      });
    }
  });

  it('accepts near-target scores at their scaled minimum time', async (t) => {
    const cases = [
      { name: '99 of 100', score: 99, targetScore: 100, elapsedMs: 49_500 },
      { name: '29 of 30', score: 29, targetScore: 30, elapsedMs: 14_500 },
    ];

    for (const fixture of cases) {
      await t.test(fixture.name, async () => {
        const gameAnswers = answers(fixture.score);
        const response = await handleCommunityPost(
          request(
            scoreBody({
              guessedNames: gameAnswers.map((answer) => answer.name),
            })
          ),
          makeDependencies({
            verifySession: async () => ({
              ok: true,
              payload: {
                ...SESSION,
                startedAt: NOW - fixture.elapsedMs,
              },
            }),
            getDefinition: () => ({
              durationSeconds: 720,
              targetScore: fixture.targetScore,
              answers: gameAnswers,
            }),
          })
        );

        assert.equal(response.status, 201);
      });
    }
  });

  it('stores server-derived duration, session ID and salted IP hash', async () => {
    let inserted: ScoreInsert | undefined;
    const response = await handleCommunityPost(
      request(scoreBody()),
      makeDependencies({
        insertScore: async (value) => {
          inserted = value;
        },
      })
    );

    assert.equal(response.status, 201);
    assert.equal(inserted?.durationMs, 100_000);
    assert.equal(inserted?.sessionId, SESSION_ID);
    assert.equal(inserted?.ipHash, `hash:${SECURITY.ipHashSalt}:${IP}`);
    assert.match(inserted?.fingerprint ?? '', new RegExp(SESSION_ID));
  });

  it('maps insert-only unique conflicts to duplicate submission', async () => {
    const response = await handleCommunityPost(
      request(scoreBody()),
      makeDependencies({
        insertScore: async () => {
          throw new Error('UNIQUE constraint failed: game_scores.session_id');
        },
      })
    );
    const body = (await json(response)) as { error: { code: string } };

    assert.equal(response.status, 409);
    assert.equal(body.error.code, 'DUPLICATE_SUBMISSION');
  });

  it('maps a score insert rate-limit race to a stable response', async () => {
    const response = await handleCommunityPost(
      request(scoreBody()),
      makeDependencies({
        countRecentScores: async () => 7,
        insertScore: async () => {
          throw { code: 'GAME_RATE_LIMITED' };
        },
      })
    );
    const body = (await json(response)) as { error: { code: string } };

    assert.equal(response.status, 429);
    assert.equal(body.error.code, 'RATE_LIMITED');
  });

  it('maps a comment insert rate-limit race to a stable response', async () => {
    const response = await handleCommunityPost(
      request(commentBody()),
      makeDependencies({
        countRecentComments: async () => 2,
        insertComment: async () => {
          throw { code: 'GAME_RATE_LIMITED' };
        },
      })
    );
    const body = (await json(response)) as { error: { code: string } };

    assert.equal(response.status, 429);
    assert.equal(body.error.code, 'RATE_LIMITED');
  });

  it('verifies comment Turnstile and salts the IP before every D1 read', async () => {
    const events: string[] = [];
    const response = await handleCommunityPost(
      request(commentBody()),
      makeDependencies({
        verifyHuman: async (input) => {
          events.push(`turnstile:${input.expectedAction}:${input.remoteIp}`);
          return { ok: true };
        },
        hashValue: async (value) => {
          events.push(`hash:${value}`);
          return 'salted-ip-hash';
        },
        findBlock: async () => {
          events.push('d1:block');
          return false;
        },
        countRecentComments: async () => {
          events.push('d1:rate');
          return 0;
        },
        findLatestScore: async () => {
          events.push('d1:score');
          return null;
        },
      })
    );

    assert.equal(response.status, 201);
    assert.deepEqual(events.slice(0, 3), [
      `hash:${SECURITY.ipHashSalt}:${IP}`,
      `turnstile:comment:${IP}`,
      'd1:block',
    ]);
  });

  it('does not leak request credentials or raw IP in errors or logs', async () => {
    const logs: string[] = [];
    const secretMarker = SECURITY.gameSessionSecret;
    const response = await handleCommunityPost(
      request(scoreBody()),
      makeDependencies({
        insertScore: async () => {
          throw new Error(
            `${SESSION_TOKEN} ${TURNSTILE_TOKEN} ${secretMarker} ${IP}`
          );
        },
        logger: { error: (message) => logs.push(message) },
      })
    );
    const rendered = `${JSON.stringify(await json(response))} ${logs.join(' ')}`;

    assert.equal(response.status, 503);
    for (const marker of [SESSION_TOKEN, TURNSTILE_TOKEN, secretMarker, IP]) {
      assert.equal(rendered.includes(marker), false);
    }
  });
});
