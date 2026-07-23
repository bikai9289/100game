import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { createClient, type Client, type InValue } from '@libsql/client';

import {
  insertCommentWithinIpLimit,
  insertScoreWithinIpLimit,
  type AtomicD1Database,
} from './game-community-d1';
import type { CommentInsert, ScoreInsert } from './game-community-handler';

const clients: Client[] = [];

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

async function createDatabase() {
  const client = createClient({ url: ':memory:' });
  clients.push(client);
  await client.batch(
    [
      `CREATE TABLE game_scores (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        accepted_names TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        session_id TEXT UNIQUE,
        fingerprint TEXT NOT NULL UNIQUE,
        ip_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE game_comments (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        message TEXT NOT NULL,
        score INTEGER,
        ip_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
    ],
    'write'
  );

  const database: AtomicD1Database = {
    prepare: (query) => ({
      bind: (...values) => ({
        run: async () => {
          const result = await client.execute({
            sql: query,
            args: values as InValue[],
          });
          return { meta: { changes: result.rowsAffected } };
        },
      }),
    }),
  };
  return database;
}

function score(index: number): ScoreInsert {
  return {
    id: `score-${index}`,
    gameId: 'women',
    playerName: 'Player One',
    score: 1,
    acceptedNames: '["Taylor Swift"]',
    durationMs: 60_000,
    sessionId: `session-${index}`,
    fingerprint: `fingerprint-${index}`,
    ipHash: 'same-ip',
    createdAt: new Date(1_800_000_000_000),
  };
}

function comment(index: number): CommentInsert {
  return {
    id: `comment-${index}`,
    gameId: 'women',
    displayName: 'Player One',
    message: `Comment ${index}`,
    score: null,
    ipHash: 'same-ip',
    status: 'approved',
    createdAt: new Date(1_800_000_000_000),
  };
}

describe('atomic D1 community rate limits', () => {
  it('allows only eight concurrent score inserts for one IP and hour', async () => {
    const database = await createDatabase();
    const results = await Promise.all(
      Array.from({ length: 9 }, (_, index) =>
        insertScoreWithinIpLimit(
          database,
          score(index),
          new Date(1_800_000_000_000 - 60 * 60 * 1000),
          8
        )
      )
    );

    assert.equal(results.filter(Boolean).length, 8);
    assert.equal(results.filter((inserted) => !inserted).length, 1);
  });

  it('allows only three concurrent comment inserts for one IP and window', async () => {
    const database = await createDatabase();
    const results = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        insertCommentWithinIpLimit(
          database,
          comment(index),
          new Date(1_800_000_000_000 - 10 * 60 * 1000),
          3
        )
      )
    );

    assert.equal(results.filter(Boolean).length, 3);
    assert.equal(results.filter((inserted) => !inserted).length, 1);
  });

  it('does not report a duplicate session as a rate limit', async () => {
    const database = await createDatabase();
    assert.equal(
      await insertScoreWithinIpLimit(
        database,
        score(1),
        new Date(1_800_000_000_000 - 60 * 60 * 1000),
        8
      ),
      true
    );

    await assert.rejects(() =>
      insertScoreWithinIpLimit(
        database,
        { ...score(2), sessionId: score(1).sessionId },
        new Date(1_800_000_000_000 - 60 * 60 * 1000),
        8
      )
    );
  });
});
