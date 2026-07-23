import type { CommentInsert, ScoreInsert } from './game-community-handler';

type AtomicD1RunResult = {
  meta: { changes: number };
};

export type AtomicD1Database = {
  prepare: (query: string) => {
    bind: (...values: unknown[]) => {
      run: () => Promise<AtomicD1RunResult>;
    };
  };
};

export class GameRateLimitError extends Error {
  readonly code = 'GAME_RATE_LIMITED';
}

const INSERT_SCORE_WITHIN_IP_LIMIT = `
  INSERT INTO game_scores (
    id, game_id, player_name, score, accepted_names, duration_ms,
    session_id, fingerprint, ip_hash, created_at
  )
  SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  WHERE (
    SELECT COUNT(*)
    FROM game_scores
    WHERE ip_hash = ? AND created_at >= ?
  ) < ?
`;

const INSERT_COMMENT_WITHIN_IP_LIMIT = `
  INSERT INTO game_comments (
    id, game_id, display_name, message, score, ip_hash, status, created_at
  )
  SELECT ?, ?, ?, ?, ?, ?, ?, ?
  WHERE (
    SELECT COUNT(*)
    FROM game_comments
    WHERE ip_hash = ? AND created_at >= ?
  ) < ?
`;

export async function insertScoreWithinIpLimit(
  database: AtomicD1Database,
  value: ScoreInsert,
  windowStart: Date,
  limit: number
) {
  const result = await database
    .prepare(INSERT_SCORE_WITHIN_IP_LIMIT)
    .bind(
      value.id,
      value.gameId,
      value.playerName,
      value.score,
      value.acceptedNames,
      value.durationMs,
      value.sessionId,
      value.fingerprint,
      value.ipHash,
      value.createdAt.getTime(),
      value.ipHash,
      windowStart.getTime(),
      limit
    )
    .run();
  return result.meta.changes === 1;
}

export async function insertCommentWithinIpLimit(
  database: AtomicD1Database,
  value: CommentInsert,
  windowStart: Date,
  limit: number
) {
  const result = await database
    .prepare(INSERT_COMMENT_WITHIN_IP_LIMIT)
    .bind(
      value.id,
      value.gameId,
      value.displayName,
      value.message,
      value.score,
      value.ipHash,
      value.status,
      value.createdAt.getTime(),
      value.ipHash,
      windowStart.getTime(),
      limit
    )
    .run();
  return result.meta.changes === 1;
}
