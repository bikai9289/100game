import { z } from 'zod';

const SUBMISSION_GRACE_MS = 5 * 60 * 1000;

const gameSessionPayloadSchema = z.object({
  v: z.literal(1),
  sessionId: z.uuid(),
  gameId: z.string().min(1).max(80),
  durationSeconds: z.number().int().min(60).max(900),
  startedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});

export const gameSessionRequestSchema = z.object({
  gameId: z.string().min(1).max(80),
  durationSeconds: z.number().int().min(60).max(900),
  startedAt: z.number().int().positive(),
});

export type GameSessionPayload = z.infer<typeof gameSessionPayloadSchema>;

type GameSessionRequest = z.infer<typeof gameSessionRequestSchema>;

function encodeBase64Url(bytes: Uint8Array) {
  let binary = '';

  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function decodeBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error('Invalid base64url');
  }

  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '='
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  if (encodeBase64Url(bytes) !== value) {
    throw new Error('Non-canonical base64url');
  }

  return bytes;
}

function importHmacKey(secret: string, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );
}

export async function issueGameSession(
  input: GameSessionRequest,
  secret: string,
  options: { now?: number; sessionId?: string } = {}
) {
  const request = gameSessionRequestSchema.parse(input);
  const now = options.now ?? Date.now();
  const startedAt = Math.min(request.startedAt, now);
  const expiresAt =
    startedAt + request.durationSeconds * 1000 + SUBMISSION_GRACE_MS;
  const payload = gameSessionPayloadSchema.parse({
    v: 1,
    sessionId: options.sessionId ?? crypto.randomUUID(),
    gameId: request.gameId,
    durationSeconds: request.durationSeconds,
    startedAt,
    expiresAt,
  });
  const payloadPart = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const key = await importHmacKey(secret, 'sign');
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadPart)
  );
  const sessionToken = `${payloadPart}.${encodeBase64Url(
    new Uint8Array(signature)
  )}`;

  return { sessionId: payload.sessionId, sessionToken, startedAt, expiresAt };
}

export async function verifyGameSession(
  token: string,
  secret: string,
  now = Date.now()
): Promise<
  | { ok: true; payload: GameSessionPayload }
  | { ok: false; code: 'SESSION_INVALID' | 'SESSION_EXPIRED' }
> {
  try {
    const parts = token.split('.');

    if (parts.length !== 2) {
      return { ok: false, code: 'SESSION_INVALID' };
    }

    const [payloadPart, signaturePart] = parts;

    if (!payloadPart || !signaturePart) {
      return { ok: false, code: 'SESSION_INVALID' };
    }

    const key = await importHmacKey(secret, 'verify');
    const signatureIsValid = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(signaturePart),
      new TextEncoder().encode(payloadPart)
    );

    if (!signatureIsValid) {
      return { ok: false, code: 'SESSION_INVALID' };
    }

    const payloadJson = new TextDecoder('utf-8', { fatal: true }).decode(
      decodeBase64Url(payloadPart)
    );
    const payload = gameSessionPayloadSchema.parse(JSON.parse(payloadJson));

    if (now > payload.expiresAt) {
      return { ok: false, code: 'SESSION_EXPIRED' };
    }

    return { ok: true, payload };
  } catch {
    return { ok: false, code: 'SESSION_INVALID' };
  }
}
