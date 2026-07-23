import {
  commentSubmissionSchema,
  isDuplicateScoreInsertError,
  moderateComment,
  recomputeSubmittedScore,
  scoreSubmissionSchema,
} from './game-community';
import type { GameSessionPayload } from './game-session';
import type { Answer } from './gameEngine';

export const SCORE_LIMIT_PER_HOUR = 8;
export const COMMENT_LIMIT_PER_TEN_MINUTES = 3;
export const SCORE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const COMMENT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const SUBMISSION_GRACE_MS = 5 * 60 * 1000;
const MAX_REQUEST_BODY_BYTES = 20_000;
const MIN_COMPLETED_GAME_MS = 5_000;
const MIN_MS_PER_TARGET_NAME = 500;

export type ApiErrorCode =
  | 'BLOCKED'
  | 'COMMENT_LINK_NOT_ALLOWED'
  | 'COMMENT_UNSAFE'
  | 'COMMENT_EMPTY'
  | 'CONFIGURATION_ERROR'
  | 'DUPLICATE_SUBMISSION'
  | 'EMPTY_SCORE'
  | 'INVALID_GAME'
  | 'INVALID_REQUEST'
  | 'RATE_LIMITED'
  | 'SCORE_TOO_FAST'
  | 'SERVER_ERROR'
  | 'SESSION_EXPIRED'
  | 'SESSION_INVALID'
  | 'SESSION_REQUIRED'
  | 'TURNSTILE_FAILED'
  | 'TURNSTILE_REQUIRED'
  | 'TURNSTILE_UNAVAILABLE';

type SecurityConfig = {
  turnstileSecretKey: string;
  gameSessionSecret: string;
  ipHashSalt: string;
};

type TurnstileResult =
  | { ok: true }
  | {
      ok: false;
      code: 'TURNSTILE_FAILED' | 'TURNSTILE_UNAVAILABLE';
    };

export type ScoreInsert = {
  id: string;
  gameId: string;
  playerName: string;
  score: number;
  acceptedNames: string;
  durationMs: number;
  sessionId: string;
  fingerprint: string;
  ipHash: string;
  createdAt: Date;
};

export type CommentInsert = {
  id: string;
  gameId: string;
  displayName: string;
  message: string;
  score: number | null;
  ipHash: string;
  status: 'approved';
  createdAt: Date;
};

export type CommunityPostDependencies = {
  readSecurityConfig: (
    env: Record<string, string | undefined>
  ) => { ok: false } | { ok: true; data: SecurityConfig };
  verifySession: (
    token: string,
    secret: string,
    now?: number
  ) => Promise<
    | { ok: true; payload: GameSessionPayload }
    | { ok: false; code: 'SESSION_INVALID' | 'SESSION_EXPIRED' }
  >;
  verifyHuman: (input: {
    token: string;
    secret: string;
    remoteIp: string;
    expectedAction: 'score' | 'comment';
  }) => Promise<TurnstileResult>;
  getDefinition: (gameId: string) => {
    durationSeconds: number;
    targetScore: number;
    answers: Answer[];
  } | null;
  getClientIp: (request: Request) => string;
  hashValue: (value: string) => Promise<string>;
  findBlock: (
    ipHash: string,
    displayName: string,
    message?: string
  ) => Promise<boolean>;
  countRecentScores: (ipHash: string) => Promise<number>;
  findDuplicateScore: (fingerprint: string) => Promise<boolean>;
  insertScore: (value: ScoreInsert) => Promise<void>;
  countRecentComments: (ipHash: string) => Promise<number>;
  findLatestScore: (gameId: string, ipHash: string) => Promise<number | null>;
  insertComment: (value: CommentInsert) => Promise<void>;
  now: () => number;
  randomUUID: () => string;
  logger: { error: (message: string) => void };
};

export async function handleCommunityPost(
  request: Request,
  dependencies: CommunityPostDependencies,
  env: Record<string, string | undefined> = process.env
) {
  const contentType = request.headers.get('content-type');
  const mediaType = contentType?.split(';', 1)[0]?.trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return errorResponse(
      'INVALID_REQUEST',
      'Expected an application/json request body.',
      400
    );
  }

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader !== null && !/^\d+$/.test(contentLengthHeader)) {
    return errorResponse(
      'INVALID_REQUEST',
      'Invalid Content-Length header.',
      400
    );
  }
  if (
    contentLengthHeader !== null &&
    Number(contentLengthHeader) > MAX_REQUEST_BODY_BYTES
  ) {
    return requestBodyTooLargeResponse();
  }

  let body: unknown;
  try {
    const bodyResult = await readRequestBody(request);
    if (!bodyResult.ok) return requestBodyTooLargeResponse();

    const text = new TextDecoder('utf-8', { fatal: true }).decode(
      bodyResult.bytes
    );
    body = JSON.parse(text);
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
    return errorResponse('INVALID_REQUEST', 'Unknown community action.', 400);
  }

  const security = dependencies.readSecurityConfig(env);
  if (!security.ok) {
    return errorResponse(
      'CONFIGURATION_ERROR',
      'Community submissions are not configured.',
      503
    );
  }

  if (body.action === 'score') {
    if (typeof body.sessionToken !== 'string' || !body.sessionToken) {
      return errorResponse(
        'SESSION_REQUIRED',
        'A signed game session is required.',
        400
      );
    }
    if (typeof body.turnstileToken !== 'string' || !body.turnstileToken) {
      return errorResponse(
        'TURNSTILE_REQUIRED',
        'Human verification is required.',
        400
      );
    }
  }

  if (
    body.action === 'comment' &&
    (typeof body.turnstileToken !== 'string' || !body.turnstileToken)
  ) {
    return errorResponse(
      'TURNSTILE_REQUIRED',
      'Human verification is required.',
      400
    );
  }

  try {
    return body.action === 'score'
      ? await handleScore(body, security.data, dependencies, request)
      : await handleComment(body, security.data, dependencies, request);
  } catch {
    dependencies.logger.error('[game-community:post] unexpected error');
    return errorResponse(
      'SERVER_ERROR',
      'The submission could not be saved.',
      503
    );
  }
}

async function handleScore(
  body: Record<string, unknown>,
  security: SecurityConfig,
  dependencies: CommunityPostDependencies,
  request: Request
) {
  const parsed = scoreSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'INVALID_REQUEST',
      'The score submission is incomplete or invalid.',
      400,
      parsed.error.flatten().fieldErrors
    );
  }

  const definition = dependencies.getDefinition(parsed.data.gameId);
  if (!definition) {
    return errorResponse('INVALID_GAME', 'Unknown game mode.', 400);
  }
  if (parsed.data.durationSeconds !== definition.durationSeconds) {
    return errorResponse('INVALID_GAME', 'Game duration does not match.', 400);
  }

  const now = dependencies.now();
  const session = await dependencies.verifySession(
    parsed.data.sessionToken,
    security.gameSessionSecret,
    now
  );
  if (!session.ok) {
    return errorResponse(
      session.code,
      session.code === 'SESSION_EXPIRED'
        ? 'This game session has expired. Start a new game.'
        : 'This game session is invalid.',
      session.code === 'SESSION_EXPIRED' ? 410 : 403
    );
  }
  if (
    session.payload.gameId !== parsed.data.gameId ||
    session.payload.durationSeconds !== parsed.data.durationSeconds
  ) {
    return errorResponse(
      'SESSION_INVALID',
      'This game session is invalid.',
      403
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
  const elapsedMs = now - session.payload.startedAt;
  const minimumCompletedGameMs = Math.max(
    MIN_COMPLETED_GAME_MS,
    definition.targetScore * MIN_MS_PER_TARGET_NAME
  );
  if (
    recomputed.score >= definition.targetScore &&
    elapsedMs < minimumCompletedGameMs
  ) {
    return errorResponse(
      'SCORE_TOO_FAST',
      'This completed game was submitted too quickly.',
      422
    );
  }

  const clientIp = dependencies.getClientIp(request);
  const turnstile = await dependencies.verifyHuman({
    token: parsed.data.turnstileToken,
    secret: security.turnstileSecretKey,
    remoteIp: clientIp,
    expectedAction: 'score',
  });
  if (!turnstile.ok) {
    return turnstileErrorResponse(turnstile.code);
  }

  const ipHash = await dependencies.hashValue(
    `${security.ipHashSalt}:${clientIp}`
  );
  if (await dependencies.findBlock(ipHash, parsed.data.playerName)) {
    return errorResponse('BLOCKED', 'This submission is not allowed.', 403);
  }

  const recentCount = await dependencies.countRecentScores(ipHash);
  if (recentCount >= SCORE_LIMIT_PER_HOUR) {
    return errorResponse(
      'RATE_LIMITED',
      'Too many score submissions. Try again later.',
      429
    );
  }

  const fingerprint = await dependencies.hashValue(
    JSON.stringify({
      gameId: parsed.data.gameId,
      ipHash,
      sessionId: session.payload.sessionId,
      answers: [...recomputed.acceptedNames].sort(),
    })
  );
  if (await dependencies.findDuplicateScore(fingerprint)) {
    return duplicateResponse();
  }

  const createdAt = new Date(now);
  const score = Math.min(recomputed.score, definition.targetScore);
  const durationMs = Math.min(
    elapsedMs,
    parsed.data.durationSeconds * 1000 + SUBMISSION_GRACE_MS
  );
  const id = dependencies.randomUUID();

  try {
    await dependencies.insertScore({
      id,
      gameId: parsed.data.gameId,
      playerName: parsed.data.playerName,
      score,
      acceptedNames: JSON.stringify(recomputed.acceptedNames),
      durationMs,
      sessionId: session.payload.sessionId,
      fingerprint,
      ipHash,
      createdAt,
    });
  } catch (error) {
    if (isDuplicateScoreInsertError(error)) return duplicateResponse();
    if (isRateLimitedInsertError(error)) return scoreRateLimitResponse();
    throw error;
  }

  return Response.json(
    {
      ok: true,
      data: {
        id,
        score,
        acceptedNames: recomputed.acceptedNames,
        createdAt: createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}

async function handleComment(
  body: Record<string, unknown>,
  security: SecurityConfig,
  dependencies: CommunityPostDependencies,
  request: Request
) {
  const parsed = commentSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'INVALID_REQUEST',
      'The comment is incomplete or invalid.',
      400,
      parsed.error.flatten().fieldErrors
    );
  }
  if (!dependencies.getDefinition(parsed.data.gameId)) {
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

  const clientIp = dependencies.getClientIp(request);
  const ipHash = await dependencies.hashValue(
    `${security.ipHashSalt}:${clientIp}`
  );
  const turnstile = await dependencies.verifyHuman({
    token: parsed.data.turnstileToken,
    secret: security.turnstileSecretKey,
    remoteIp: clientIp,
    expectedAction: 'comment',
  });
  if (!turnstile.ok) {
    return turnstileErrorResponse(turnstile.code);
  }

  if (
    await dependencies.findBlock(
      ipHash,
      parsed.data.displayName,
      moderated.text
    )
  ) {
    return errorResponse('BLOCKED', 'This submission is not allowed.', 403);
  }

  const recentCount = await dependencies.countRecentComments(ipHash);
  if (recentCount >= COMMENT_LIMIT_PER_TEN_MINUTES) {
    return errorResponse(
      'RATE_LIMITED',
      'Too many comments. Try again in a few minutes.',
      429
    );
  }

  const latestScore = await dependencies.findLatestScore(
    parsed.data.gameId,
    ipHash
  );
  const id = dependencies.randomUUID();
  const createdAt = new Date(dependencies.now());
  try {
    await dependencies.insertComment({
      id,
      gameId: parsed.data.gameId,
      displayName: parsed.data.displayName,
      message: moderated.text,
      score: latestScore,
      ipHash,
      status: 'approved',
      createdAt,
    });
  } catch (error) {
    if (isRateLimitedInsertError(error)) return commentRateLimitResponse();
    throw error;
  }

  return Response.json(
    {
      ok: true,
      data: {
        id,
        displayName: parsed.data.displayName,
        message: moderated.text,
        score: latestScore,
        createdAt: createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}

function duplicateResponse() {
  return errorResponse(
    'DUPLICATE_SUBMISSION',
    'This score was already submitted.',
    409
  );
}

function scoreRateLimitResponse() {
  return errorResponse(
    'RATE_LIMITED',
    'Too many score submissions. Try again later.',
    429
  );
}

function commentRateLimitResponse() {
  return errorResponse(
    'RATE_LIMITED',
    'Too many comments. Try again in a few minutes.',
    429
  );
}

function isRateLimitedInsertError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'GAME_RATE_LIMITED'
  );
}

function turnstileErrorResponse(
  code: 'TURNSTILE_FAILED' | 'TURNSTILE_UNAVAILABLE'
) {
  return code === 'TURNSTILE_UNAVAILABLE'
    ? errorResponse(code, 'Human verification is temporarily unavailable.', 503)
    : errorResponse(code, 'Human verification failed. Try again.', 403);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function readRequestBody(
  request: Request
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false }> {
  if (!request.body) return { ok: true, bytes: new Uint8Array() };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_REQUEST_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return { ok: false };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, bytes };
}

function requestBodyTooLargeResponse() {
  return errorResponse('INVALID_REQUEST', 'Request body is too large.', 413);
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
