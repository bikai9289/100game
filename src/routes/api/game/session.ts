import { createFileRoute } from '@tanstack/react-router';

import { getGameDefinition } from '@/lib/game-definition';
import { readGameSessionSecret } from '@/lib/game-security';
import {
  gameSessionRequestSchema,
  issueGameSession,
  validateGameSessionStart,
} from '@/lib/game-session';

const MAX_REQUEST_BODY_BYTES = 4_096;

type ApiErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'INVALID_GAME'
  | 'INVALID_REQUEST'
  | 'SERVER_ERROR';

export type GameSessionPostDependencies = {
  clock: () => number;
  getSessionSecret: () => string | undefined;
  issueSession: typeof issueGameSession;
  logger: { error: (prefix: string, error: unknown) => void };
};

export async function handleGameSessionPost(
  request: Request,
  dependencies: Partial<GameSessionPostDependencies> = {}
) {
  const clock = dependencies.clock ?? Date.now;
  const getSessionSecret =
    dependencies.getSessionSecret ?? (() => process.env.GAME_SESSION_SECRET);
  const issueSession = dependencies.issueSession ?? issueGameSession;
  const logger = dependencies.logger ?? console;

  try {
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

    const bodyResult = await readRequestBody(request);
    if (!bodyResult.ok) return requestBodyTooLargeResponse();

    let body: unknown;
    try {
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

    const parsed = gameSessionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'INVALID_REQUEST',
        'The game session request is incomplete or invalid.',
        400,
        parsed.error.flatten().fieldErrors
      );
    }

    const secret = readGameSessionSecret(getSessionSecret());
    if (!secret.ok) {
      return errorResponse(
        'CONFIGURATION_ERROR',
        'Game sessions are not configured.',
        503
      );
    }

    const definition = getGameDefinition(parsed.data.gameId);
    if (!definition) {
      return errorResponse('INVALID_GAME', 'Unknown game mode.', 400);
    }
    if (parsed.data.durationSeconds !== definition.durationSeconds) {
      return errorResponse(
        'INVALID_GAME',
        'Game duration does not match.',
        400
      );
    }

    const now = clock();
    if (!validateGameSessionStart(parsed.data.startedAt, now)) {
      return errorResponse(
        'INVALID_REQUEST',
        'Game start time is invalid.',
        400
      );
    }

    const issued = await issueSession(parsed.data, secret.secret, { now });

    return Response.json(
      {
        ok: true,
        data: {
          sessionId: issued.sessionId,
          sessionToken: issued.sessionToken,
          startedAt: issued.startedAt,
          expiresAt: issued.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('[game-session:post]', error);
    return errorResponse(
      'SERVER_ERROR',
      'The game session could not be created.',
      503
    );
  }
}

export const Route = createFileRoute('/api/game/session')({
  server: {
    handlers: {
      POST: ({ request }) => handleGameSessionPost(request),
    },
  },
});

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
