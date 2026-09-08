import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { z } from 'zod';

import { getDb } from '@/db';
import { gameComments } from '@/db/app.schema';
import { getGameDefinition } from '@/lib/game-definition';
import { readCommunitySecurityConfig } from '@/lib/game-security';
import { verifyTurnstile } from '@/lib/turnstile';

type ApiErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'INVALID_GAME'
  | 'INVALID_REQUEST'
  | 'SERVER_ERROR'
  | 'TURNSTILE_FAILED'
  | 'TURNSTILE_REQUIRED'
  | 'TURNSTILE_UNAVAILABLE';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  gameId: z.string().trim().min(1).max(80),
  note: z.string().trim().max(280).optional().default(''),
  pagePath: z.string().trim().max(160).optional().default(''),
  turnstileToken: z.string().trim().min(1).max(2048),
});

export const Route = createFileRoute('/api/game/feedback')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentType = request.headers.get('content-type');
        const mediaType = contentType?.split(';', 1)[0]?.trim().toLowerCase();
        if (mediaType !== 'application/json') {
          return errorResponse(
            'INVALID_REQUEST',
            'Expected an application/json request body.',
            400
          );
        }

        const security = readCommunitySecurityConfig(env);
        if (!security.ok) {
          return errorResponse(
            'CONFIGURATION_ERROR',
            'Feedback submission is temporarily unavailable.',
            503
          );
        }

        let data: z.infer<typeof schema>;
        try {
          data = schema.parse(await request.json());
        } catch {
          return errorResponse(
            'INVALID_REQUEST',
            'Check the missing answer details and try again.',
            400
          );
        }

        if (!getGameDefinition(data.gameId)) {
          return errorResponse('INVALID_GAME', 'Unknown game mode.', 400);
        }

        if (!data.turnstileToken) {
          return errorResponse(
            'TURNSTILE_REQUIRED',
            'Complete human verification before sending.',
            400
          );
        }

        const remoteIp = getClientIp(request);
        const verification = await verifyTurnstile({
          token: data.turnstileToken,
          secret: security.data.turnstileSecretKey,
          remoteIp,
          expectedAction: 'comment',
        });
        if (!verification.ok) {
          return errorResponse(
            verification.code,
            verification.code === 'TURNSTILE_UNAVAILABLE'
              ? 'Human verification is temporarily unavailable.'
              : 'Human verification failed. Please try again.',
            verification.code === 'TURNSTILE_UNAVAILABLE' ? 503 : 400
          );
        }

        try {
          const createdAt = new Date();
          await getDb()
            .insert(gameComments)
            .values({
              id: crypto.randomUUID(),
              gameId: data.gameId,
              displayName: 'Answer feedback',
              message: formatFeedbackMessage(data),
              score: null,
              ipHash: await hashValue(
                `${security.data.ipHashSalt}:${remoteIp}`
              ),
              status: 'pending',
              createdAt,
            });

          return Response.json({ ok: true });
        } catch {
          console.error('[game-feedback:post] unexpected error');
          return errorResponse(
            'SERVER_ERROR',
            'Feedback could not be submitted.',
            503
          );
        }
      },
    },
  },
});

function formatFeedbackMessage(data: z.infer<typeof schema>) {
  return [
    `Missing answer: ${data.name}`,
    `Mode: ${data.gameId}`,
    data.pagePath ? `Path: ${data.pagePath}` : '',
    data.note ? `Note: ${data.note}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function getClientIp(request: Request) {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'local'
  );
}

async function hashValue(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

function errorResponse(code: ApiErrorCode, message: string, status: number) {
  return Response.json({ ok: false, error: { code, message } }, { status });
}
