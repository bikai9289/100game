import { createFileRoute } from '@tanstack/react-router';

import { getGameDefinition } from '@/lib/game-definition';
import { readGameSessionSecret } from '@/lib/game-security';
import {
  gameSessionRequestSchema,
  issueGameSession,
  validateGameSessionStart,
} from '@/lib/game-session';

type ApiErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'INVALID_GAME'
  | 'INVALID_REQUEST'
  | 'SERVER_ERROR';

export const Route = createFileRoute('/api/game/session')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentLength = Number(
          request.headers.get('content-length') ?? 0
        );
        if (contentLength > 4_096) {
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

        const parsed = gameSessionRequestSchema.safeParse(body);
        if (!parsed.success) {
          return errorResponse(
            'INVALID_REQUEST',
            'The game session request is incomplete or invalid.',
            400,
            parsed.error.flatten().fieldErrors
          );
        }

        try {
          const secret = readGameSessionSecret(process.env.GAME_SESSION_SECRET);
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

          const now = Date.now();
          if (!validateGameSessionStart(parsed.data.startedAt, now)) {
            return errorResponse(
              'INVALID_REQUEST',
              'Game start time is invalid.',
              400
            );
          }

          const issued = await issueGameSession(parsed.data, secret.secret, {
            now,
          });

          return Response.json({ ok: true, data: issued }, { status: 201 });
        } catch (error) {
          console.error('[game-session:post]', error);
          return errorResponse(
            'SERVER_ERROR',
            'The game session could not be created.',
            503
          );
        }
      },
    },
  },
});

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
