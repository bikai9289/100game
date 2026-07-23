import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { and, asc, count, desc, eq, gte } from 'drizzle-orm';

import { getDb } from '@/db';
import { gameBlocks, gameComments, gameScores } from '@/db/app.schema';
import {
  GameRateLimitError,
  insertCommentWithinIpLimit,
  insertScoreWithinIpLimit,
} from '@/lib/game-community-d1';
import {
  COMMENT_LIMIT_PER_TEN_MINUTES,
  COMMENT_RATE_LIMIT_WINDOW_MS,
  handleCommunityPost,
  SCORE_LIMIT_PER_HOUR,
  SCORE_RATE_LIMIT_WINDOW_MS,
  type CommunityPostDependencies,
} from '@/lib/game-community-handler';
import { getGameDefinition } from '@/lib/game-definition';
import { readCommunitySecurityConfig } from '@/lib/game-security';
import { verifyGameSession } from '@/lib/game-session';
import { normalizeInput } from '@/lib/gameEngine';
import { verifyTurnstile } from '@/lib/turnstile';

type ApiErrorCode = 'INVALID_GAME' | 'SERVER_ERROR';

const communityPostDependencies: CommunityPostDependencies = {
  readSecurityConfig: readCommunitySecurityConfig,
  verifySession: verifyGameSession,
  verifyHuman: verifyTurnstile,
  getDefinition: getGameDefinition,
  getClientIp,
  hashValue,
  findBlock,
  countRecentScores,
  findDuplicateScore,
  insertScore: async (value) => {
    const inserted = await insertScoreWithinIpLimit(
      env.DB,
      value,
      new Date(value.createdAt.getTime() - SCORE_RATE_LIMIT_WINDOW_MS),
      SCORE_LIMIT_PER_HOUR
    );
    if (!inserted) throw new GameRateLimitError();
  },
  countRecentComments,
  findLatestScore,
  insertComment: async (value) => {
    const inserted = await insertCommentWithinIpLimit(
      env.DB,
      value,
      new Date(value.createdAt.getTime() - COMMENT_RATE_LIMIT_WINDOW_MS),
      COMMENT_LIMIT_PER_TEN_MINUTES
    );
    if (!inserted) throw new GameRateLimitError();
  },
  now: Date.now,
  randomUUID: crypto.randomUUID.bind(crypto),
  logger: {
    error: (message) => console.error(message),
  },
};

export const Route = createFileRoute('/api/game/community')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const gameId = url.searchParams.get('gameId') ?? 'women';
        const period =
          url.searchParams.get('period') === 'all' ? 'all' : 'daily';

        if (!getGameDefinition(gameId)) {
          return errorResponse('INVALID_GAME', 'Unknown game mode.', 400);
        }

        try {
          const db = getDb();
          const scoreConditions = [eq(gameScores.gameId, gameId)];
          if (period === 'daily') {
            scoreConditions.push(gte(gameScores.createdAt, startOfUtcDay()));
          }

          const [leaderboard, comments] = await Promise.all([
            db
              .select({
                id: gameScores.id,
                playerName: gameScores.playerName,
                score: gameScores.score,
                durationMs: gameScores.durationMs,
                createdAt: gameScores.createdAt,
              })
              .from(gameScores)
              .where(and(...scoreConditions))
              .orderBy(
                desc(gameScores.score),
                asc(gameScores.durationMs),
                asc(gameScores.createdAt)
              )
              .limit(10),
            db
              .select({
                id: gameComments.id,
                displayName: gameComments.displayName,
                message: gameComments.message,
                score: gameComments.score,
                createdAt: gameComments.createdAt,
              })
              .from(gameComments)
              .where(
                and(
                  eq(gameComments.gameId, gameId),
                  eq(gameComments.status, 'approved')
                )
              )
              .orderBy(desc(gameComments.createdAt))
              .limit(20),
          ]);

          return Response.json({
            ok: true,
            data: {
              leaderboard: leaderboard.map((entry) => ({
                ...entry,
                createdAt: entry.createdAt.toISOString(),
              })),
              comments: comments.map((comment) => ({
                ...comment,
                createdAt: comment.createdAt.toISOString(),
              })),
              period,
            },
          });
        } catch {
          console.error('[game-community:get] unexpected error');
          return errorResponse(
            'SERVER_ERROR',
            'Community data is unavailable.',
            503
          );
        }
      },
      POST: ({ request }) =>
        handleCommunityPost(request, communityPostDependencies),
    },
  },
});

function getClientIp(request: Request) {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'local'
  );
}

function startOfUtcDay() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

async function hashValue(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

async function countRecentScores(ipHash: string) {
  const [result] = await getDb()
    .select({ value: count() })
    .from(gameScores)
    .where(
      and(
        eq(gameScores.ipHash, ipHash),
        gte(gameScores.createdAt, new Date(Date.now() - 60 * 60 * 1000))
      )
    );
  return result?.value ?? 0;
}

async function findDuplicateScore(fingerprint: string) {
  const [duplicate] = await getDb()
    .select({ id: gameScores.id })
    .from(gameScores)
    .where(eq(gameScores.fingerprint, fingerprint))
    .limit(1);
  return Boolean(duplicate);
}

async function countRecentComments(ipHash: string) {
  const [result] = await getDb()
    .select({ value: count() })
    .from(gameComments)
    .where(
      and(
        eq(gameComments.ipHash, ipHash),
        gte(gameComments.createdAt, new Date(Date.now() - 10 * 60 * 1000))
      )
    );
  return result?.value ?? 0;
}

async function findLatestScore(gameId: string, ipHash: string) {
  const [latestScore] = await getDb()
    .select({ score: gameScores.score })
    .from(gameScores)
    .where(and(eq(gameScores.gameId, gameId), eq(gameScores.ipHash, ipHash)))
    .orderBy(desc(gameScores.createdAt))
    .limit(1);
  return latestScore?.score ?? null;
}

async function findBlock(
  ipHash: string,
  displayName: string,
  message?: string
) {
  const blocks = await getDb()
    .select({ kind: gameBlocks.kind, value: gameBlocks.value })
    .from(gameBlocks)
    .where(eq(gameBlocks.active, true))
    .limit(200);
  const normalizedName = normalizeInput(displayName);
  const normalizedMessage = message?.toLowerCase();

  return blocks.some((block) => {
    if (block.kind === 'ip') return block.value === ipHash;
    if (block.kind === 'name') {
      return normalizeInput(block.value) === normalizedName;
    }
    if (block.kind === 'keyword' && normalizedMessage) {
      return normalizedMessage.includes(block.value.toLowerCase());
    }
    return false;
  });
}

function errorResponse(code: ApiErrorCode, message: string, status: number) {
  return Response.json({ ok: false, error: { code, message } }, { status });
}
