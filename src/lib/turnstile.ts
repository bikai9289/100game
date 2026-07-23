import { z } from 'zod';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const turnstileResponseSchema = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  'error-codes': z.array(z.string()).optional(),
});

type TurnstileAction = 'score' | 'comment';

type TurnstileResult =
  | { ok: true }
  | {
      ok: false;
      code: 'TURNSTILE_FAILED' | 'TURNSTILE_UNAVAILABLE';
    };

const TURNSTILE_FAILED = {
  ok: false,
  code: 'TURNSTILE_FAILED',
} as const;

const TURNSTILE_UNAVAILABLE = {
  ok: false,
  code: 'TURNSTILE_UNAVAILABLE',
} as const;

export async function verifyTurnstile({
  token,
  secret,
  remoteIp,
  expectedAction,
  fetchImpl = fetch,
  idempotencyKey = crypto.randomUUID(),
}: {
  token: string;
  secret: string;
  remoteIp: string;
  expectedAction: TurnstileAction;
  fetchImpl?: typeof fetch;
  idempotencyKey?: string;
}): Promise<TurnstileResult> {
  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: remoteIp,
        idempotency_key: idempotencyKey,
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) return TURNSTILE_UNAVAILABLE;

    const parsed = turnstileResponseSchema.safeParse(await response.json());
    if (!parsed.success) return TURNSTILE_UNAVAILABLE;

    if (!parsed.data.success || parsed.data.action !== expectedAction) {
      return TURNSTILE_FAILED;
    }

    return { ok: true };
  } catch {
    return TURNSTILE_UNAVAILABLE;
  }
}
