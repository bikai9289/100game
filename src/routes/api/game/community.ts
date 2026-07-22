import { gameBlocks, gameComments, gameScores } from '@/db/app.schema';
import { getDb } from '@/db';
import {
  commentSubmissionSchema,
  moderateComment,
  recomputeSubmittedScore,
  scoreSubmissionSchema,
} from '@/lib/game-community';
import { getGameDefinition } from '@/lib/game-definition';
import { normalizeInput } from '@/lib/gameEngine';
import { createFileRoute } from '@tanstack/react-router';
import { and, asc, count, desc, eq, gte } from 'drizzle-orm';

const SCORE_LIMIT_PER_HOUR = 8;
const COMMENT_LIMIT_PER_TEN_MINUTES = 3;

type ApiErrorCode =
  | 'BLOCKED'
  | 'COMMENT_LINK_NOT_ALLOWED'
  | 'COMMENT_UNSAFE'
  | 'DUPLICATE_SUBMISSION'
  | 'EMPTY_SCORE'
  | 'INVALID_GAME'
  | 'INVALID_REQUEST'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

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
        } catch (error) {
          console.error('[game-community:get]', error);
          return errorResponse(
            'SERVER_ERROR',
            'Community data is unavailable.',
            503
          );
        }
      },
      POST: async ({ request }) => {
        const contentLength = Number(
          request.headers.get('content-length') ?? 0
        );
        if (contentLength > 20_000) {
          return errorResponse(
            'INVALID_REQUEST',
            'Request body is too large.',
            413
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse(
            'INVALID_REQUEST',
            'Expected a JSON request body.',
            400
          );
        }

        if (
          !isRecord(body) ||
          (body.action !== 'score' && body.action !== 'comment')
        ) {
          return errorResponse(
            'INVALID_REQUEST',
            'Unknown community action.',
            400
          );
        }

        try {
          const ipHash = await hashValue(
            `${process.env.GAME_IP_HASH_SALT ?? 'name100challenge'}:${getClientIp(
              request
            )}`
          );
          const db = getDb();

          if (body.action === 'score') {
            const parsed = scoreSubmissionSchema.safeParse(body);
            if (!parsed.success) {
              return errorResponse(
                'INVALID_REQUEST',
                'The score submission is incomplete or invalid.',
                400,
                parsed.error.flatten().fieldErrors
              );
            }

            const definition = getGameDefinition(parsed.data.gameId);
            if (!definition) {
              return errorResponse('INVALID_GAME', 'Unknown game mode.', 400);
            }
            if (parsed.data.durationSeconds !== definition.durationSeconds) {
              return errorResponse(
                'INVALID_REQUEST',
                'Game duration does not match.',
                400
              );
            }
            if (parsed.data.startedAt > Date.now() + 30_000) {
              return errorResponse(
                'INVALID_REQUEST',
                'Start time is in the future.',
                400
              );
            }

            const blocked = await findBlock(
              ipHash,
              parsed.data.playerName,
              undefined
            );
            if (blocked) return blocked;

            const recentCount = await countRecentScores(ipHash);
            if (recentCount >= SCORE_LIMIT_PER_HOUR) {
              return errorResponse(
                'RATE_LIMITED',
                'Too many score submissions. Try again later.',
                429
              );
            }

            const recomputed = recomputeSubmittedScore(
              parsed.data.guessedNames,
              definition.answers
            );
            if (recomputed.score === 0) {
              return errorResponse(
                'EMPTY_SCORE',
                'No valid answers were submitted.',
                400
              );
            }

            const fingerprint = await hashValue(
              JSON.stringify({
                gameId: parsed.data.gameId,
                ipHash,
                startedAt: parsed.data.startedAt,
                answers: [...recomputed.acceptedNames].sort(),
              })
            );
            const [duplicate] = await db
              .select({ id: gameScores.id })
              .from(gameScores)
              .where(eq(gameScores.fingerprint, fingerprint))
              .limit(1);
            if (duplicate) {
              return errorResponse(
                'DUPLICATE_SUBMISSION',
                'This score was already submitted.',
                409
              );
            }

            const createdAt = new Date();
            const id = crypto.randomUUID();
            await db.insert(gameScores).values({
              id,
              gameId: parsed.data.gameId,
              playerName: parsed.data.playerName,
              score: Math.min(recomputed.score, definition.targetScore),
              acceptedNames: JSON.stringify(recomputed.acceptedNames),
              durationMs: parsed.data.finishedAt - parsed.data.startedAt,
              fingerprint,
              ipHash,
              createdAt,
            });

            return Response.json(
              {
                ok: true,
                data: {
                  id,
                  score: Math.min(recomputed.score, definition.targetScore),
                  acceptedNames: recomputed.acceptedNames,
                  createdAt: createdAt.toISOString(),
                },
              },
              { status: 201 }
            );
          }

          const parsed = commentSubmissionSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(
              'INVALID_REQUEST',
              'The comment is incomplete or invalid.',
              400,
              parsed.error.flatten().fieldErrors
            );
          }
          if (!getGameDefinition(parsed.data.gameId)) {
            return errorResponse('INVALID_GAME', 'Unknown game mode.', 400);
          }

          const moderated = moderateComment(parsed.data.message);
          if (!moderated.ok) {
            const message =
              moderated.code === 'COMMENT_LINK_NOT_ALLOWED'
                ? 'Links are not allowed in comments.'
                : 'That comment cannot be posted.';
            return errorResponse(moderated.code, message, 400);
          }

          const blocked = await findBlock(
            ipHash,
            parsed.data.displayName,
            moderated.text
          );
          if (blocked) return blocked;

          const recentCount = await countRecentComments(ipHash);
          if (recentCount >= COMMENT_LIMIT_PER_TEN_MINUTES) {
            return errorResponse(
              'RATE_LIMITED',
              'Too many comments. Try again in a few minutes.',
              429
            );
          }

          const [latestScore] = await db
            .select({ score: gameScores.score })
            .from(gameScores)
            .where(
              and(
                eq(gameScores.gameId, parsed.data.gameId),
                eq(gameScores.ipHash, ipHash)
              )
            )
            .orderBy(desc(gameScores.createdAt))
            .limit(1);
          const id = crypto.randomUUID();
          const createdAt = new Date();
          await db.insert(gameComments).values({
            id,
            gameId: parsed.data.gameId,
            displayName: parsed.data.displayName,
            message: moderated.text,
            score: latestScore?.score,
            ipHash,
            status: 'approved',
            createdAt,
          });

          return Response.json(
            {
              ok: true,
              data: {
                id,
                displayName: parsed.data.displayName,
                message: moderated.text,
                score: latestScore?.score ?? null,
                createdAt: createdAt.toISOString(),
              },
            },
            { status: 201 }
          );
        } catch (error) {
          console.error('[game-community:post]', error);
          return errorResponse(
            'SERVER_ERROR',
            'The submission could not be saved.',
            503
          );
        }
      },
    },
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

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
  const db = getDb();
  const [result] = await db
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

async function countRecentComments(ipHash: string) {
  const db = getDb();
  const [result] = await db
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

async function findBlock(
  ipHash: string,
  displayName: string,
  message?: string
) {
  const db = getDb();
  const blocks = await db
    .select({ kind: gameBlocks.kind, value: gameBlocks.value })
    .from(gameBlocks)
    .where(eq(gameBlocks.active, true))
    .limit(200);
  const normalizedName = normalizeInput(displayName);
  const normalizedMessage = message?.toLowerCase();
  const isBlocked = blocks.some((block) => {
    if (block.kind === 'ip') return block.value === ipHash;
    if (block.kind === 'name')
      return normalizeInput(block.value) === normalizedName;
    if (block.kind === 'keyword' && normalizedMessage) {
      return normalizedMessage.includes(block.value.toLowerCase());
    }
    return false;
  });

  return isBlocked
    ? errorResponse('BLOCKED', 'This submission is not allowed.', 403)
    : null;
}

function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  fields?: unknown
) {
  return Response.json(
    { ok: false, error: { code, message, ...(fields ? { fields } : {}) } },
    { status }
  );
}
