import { z } from 'zod';

const gameSecretSchema = z.string().min(32);

const communitySecurityConfigSchema = z.object({
  TURNSTILE_SECRET_KEY: gameSecretSchema,
  GAME_SESSION_SECRET: gameSecretSchema,
  GAME_IP_HASH_SALT: gameSecretSchema,
});

export function readGameSessionSecret(value: string | undefined) {
  const result = gameSecretSchema.safeParse(value);

  if (!result.success) return { ok: false } as const;

  return { ok: true, secret: result.data } as const;
}

export function readCommunitySecurityConfig(
  env: Record<string, string | undefined>
) {
  const result = communitySecurityConfigSchema.safeParse(env);

  if (!result.success) return { ok: false } as const;

  return {
    ok: true,
    data: {
      turnstileSecretKey: result.data.TURNSTILE_SECRET_KEY,
      gameSessionSecret: result.data.GAME_SESSION_SECRET,
      ipHashSalt: result.data.GAME_IP_HASH_SALT,
    },
  } as const;
}
