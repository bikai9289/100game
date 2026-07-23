# Server Game Sessions and Turnstile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require a server-signed, single-use game session and Cloudflare Turnstile validation before accepting leaderboard scores or comments, while keeping the game and community reads available when security configuration is absent.

**Architecture:** A pure Web Crypto module signs stateless game-session tokens, and a separate Turnstile adapter owns Siteverify calls. The session API signs the round start; the existing community API verifies both protections and stores a unique session ID in D1. A small React wrapper explicitly renders two Turnstile widgets, while `Name100Game` persists the signed round token with game progress.

**Tech Stack:** TypeScript, TanStack Start file routes, React 19, Zod 4, Cloudflare Workers Web Crypto and Turnstile Siteverify, Drizzle ORM, Cloudflare D1, Node test runner, Biome, Vite.

---

## File Map

- Create `src/lib/game-security.ts`: validates required server secrets without defaults.
- Create `src/lib/game-security.test.ts`: proves missing or short secrets fail closed.
- Create `src/lib/game-session.ts`: signs and verifies versioned HMAC game-session tokens.
- Create `src/lib/game-session.test.ts`: covers valid, tampered, malformed, future and expired sessions.
- Create `src/lib/turnstile.ts`: calls Siteverify and maps its response to stable internal results.
- Create `src/lib/turnstile.test.ts`: covers success, rejection, action mismatch and upstream failure.
- Create `src/routes/api/game/session.ts`: validates and signs a game start without writing D1.
- Create `src/components/game/turnstile-widget.tsx`: loads the official script once and explicitly renders/reset widgets.
- Modify `src/lib/game-community.ts`: requires session and Turnstile tokens in submission schemas.
- Modify `src/lib/game-community.test.ts`: tests the new request contracts and duplicate error detection.
- Modify `src/routes/api/game/community.ts`: verifies secrets, sessions and Turnstile before database writes.
- Modify `src/db/app.schema.ts`: adds nullable, unique `game_scores.session_id`.
- Generate `src/db/migrations/0005_game_score_sessions.sql`, `src/db/migrations/meta/0005_snapshot.json`, and update `src/db/migrations/meta/_journal.json`.
- Modify `src/components/game/name100-game.tsx`: requests and persists sessions, renders widgets and sends tokens.
- Modify `src/tests/homepage-game.test.ts`: source-level regression assertions for the client integration.
- Modify `src/env/client.ts`, `src/env/server.ts`, `.env.example`: declares the four environment variables.
- Generated `src/routeTree.gen.ts`: includes the new session endpoint after build.
- Modify ignored `.env`: adds official local Turnstile test keys and generated random local secrets; never stage this file.

### Task 1: Fail-closed security configuration

**Files:**
- Create: `src/lib/game-security.test.ts`
- Create: `src/lib/game-security.ts`
- Modify: `src/env/client.ts`
- Modify: `src/env/server.ts`
- Modify: `.env.example`
- Modify but never stage: `.env`

- [ ] **Step 1: Write the failing configuration tests**

Create `src/lib/game-security.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  readCommunitySecurityConfig,
  readGameSessionSecret,
} from './game-security';

const validEnv = {
  TURNSTILE_SECRET_KEY: 't'.repeat(32),
  GAME_SESSION_SECRET: 's'.repeat(32),
  GAME_IP_HASH_SALT: 'i'.repeat(32),
};

describe('game security configuration', () => {
  it('rejects missing and short secrets without defaults', () => {
    assert.deepEqual(readCommunitySecurityConfig({}), { ok: false });
    assert.deepEqual(
      readCommunitySecurityConfig({ ...validEnv, GAME_IP_HASH_SALT: 'short' }),
      { ok: false }
    );
    assert.deepEqual(readGameSessionSecret(undefined), { ok: false });
  });

  it('returns validated secrets', () => {
    assert.deepEqual(readCommunitySecurityConfig(validEnv), {
      ok: true,
      data: {
        turnstileSecretKey: validEnv.TURNSTILE_SECRET_KEY,
        gameSessionSecret: validEnv.GAME_SESSION_SECRET,
        ipHashSalt: validEnv.GAME_IP_HASH_SALT,
      },
    });
    assert.deepEqual(readGameSessionSecret(validEnv.GAME_SESSION_SECRET), {
      ok: true,
      secret: validEnv.GAME_SESSION_SECRET,
    });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm.cmd exec tsx --test src/lib/game-security.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `game-security.ts`.

- [ ] **Step 3: Implement the configuration reader**

Create `src/lib/game-security.ts`:

```ts
import { z } from 'zod';

const secretSchema = z.string().min(32);
const communitySecuritySchema = z.object({
  TURNSTILE_SECRET_KEY: secretSchema,
  GAME_SESSION_SECRET: secretSchema,
  GAME_IP_HASH_SALT: secretSchema,
});

type SecurityEnv = Record<string, string | undefined>;

export function readGameSessionSecret(value: string | undefined) {
  const parsed = secretSchema.safeParse(value);
  return parsed.success
    ? ({ ok: true, secret: parsed.data } as const)
    : ({ ok: false } as const);
}

export function readCommunitySecurityConfig(env: SecurityEnv) {
  const parsed = communitySecuritySchema.safeParse(env);
  if (!parsed.success) return { ok: false } as const;

  return {
    ok: true,
    data: {
      turnstileSecretKey: parsed.data.TURNSTILE_SECRET_KEY,
      gameSessionSecret: parsed.data.GAME_SESSION_SECRET,
      ipHashSalt: parsed.data.GAME_IP_HASH_SALT,
    },
  } as const;
}
```

Add optional `VITE_TURNSTILE_SITE_KEY` to `src/env/client.ts`, and optional `TURNSTILE_SECRET_KEY`, `GAME_SESSION_SECRET`, and `GAME_IP_HASH_SALT` to `src/env/server.ts`. Add the same four names with empty values and comments to `.env.example`.

- [ ] **Step 4: Configure ignored local values**

Use the official always-pass visible test sitekey and secret in `.env`:

```dotenv
VITE_TURNSTILE_SITE_KEY='1x00000000000000000000AA'
TURNSTILE_SECRET_KEY='1x0000000000000000000000000000000AA'
```

Generate two independent local secrets:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex')); console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put the first generated value in `GAME_SESSION_SECRET` and the second in `GAME_IP_HASH_SALT` inside ignored `.env`. Do not print them again. Verify: `git check-ignore -v .env` must identify `.gitignore`.

- [ ] **Step 5: Verify GREEN and commit tracked files**

Run: `pnpm.cmd exec tsx --test src/lib/game-security.test.ts`

Expected: 2 tests pass.

Run: `pnpm.cmd check`

Expected: exit 0.

Commit:

```powershell
git add .env.example src/env/client.ts src/env/server.ts src/lib/game-security.ts src/lib/game-security.test.ts
git commit -m "feat: require game security configuration"
```

### Task 2: Signed game-session tokens

**Files:**
- Create: `src/lib/game-session.test.ts`
- Create: `src/lib/game-session.ts`

- [ ] **Step 1: Write failing token tests**

Create tests with a fixed secret, time and UUID:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  gameSessionRequestSchema,
  issueGameSession,
  verifyGameSession,
} from './game-session';

const secret = 'session-secret-that-is-at-least-32-bytes';
const now = 1_800_000_000_000;
const input = { gameId: 'women', durationSeconds: 720, startedAt: now };

describe('game sessions', () => {
  it('validates the start request time window', () => {
    assert.equal(gameSessionRequestSchema.safeParse(input).success, true);
    assert.equal(
      gameSessionRequestSchema.safeParse({ ...input, startedAt: 'now' })
        .success,
      false
    );
  });

  it('issues and verifies a signed session', async () => {
    const issued = await issueGameSession(input, secret, {
      now,
      sessionId: '00000000-0000-4000-8000-000000000001',
    });
    const verified = await verifyGameSession(issued.sessionToken, secret, now);
    assert.equal(verified.ok, true);
    if (verified.ok) assert.equal(verified.payload.gameId, 'women');
  });

  it('rejects tampered, malformed and expired sessions', async () => {
    const issued = await issueGameSession(input, secret, {
      now,
      sessionId: '00000000-0000-4000-8000-000000000001',
    });
    const tampered = `${issued.sessionToken.slice(0, -1)}x`;
    assert.deepEqual(await verifyGameSession(tampered, secret, now), {
      ok: false,
      code: 'SESSION_INVALID',
    });
    assert.deepEqual(await verifyGameSession('bad-token', secret, now), {
      ok: false,
      code: 'SESSION_INVALID',
    });
    assert.deepEqual(
      await verifyGameSession(issued.sessionToken, secret, issued.expiresAt + 1),
      { ok: false, code: 'SESSION_EXPIRED' }
    );
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm.cmd exec tsx --test src/lib/game-session.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement HMAC issue and verify**

Create `src/lib/game-session.ts` with these public contracts:

```ts
import { z } from 'zod';

const SUBMISSION_GRACE_MS = 5 * 60 * 1000;
const payloadSchema = z.object({
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

export type GameSessionPayload = z.infer<typeof payloadSchema>;

export async function issueGameSession(
  input: z.infer<typeof gameSessionRequestSchema>,
  secret: string,
  options: { now?: number; sessionId?: string } = {}
) {
  const now = options.now ?? Date.now();
  const payload: GameSessionPayload = {
    v: 1,
    sessionId: options.sessionId ?? crypto.randomUUID(),
    gameId: input.gameId,
    durationSeconds: input.durationSeconds,
    startedAt: Math.min(input.startedAt, now),
    expiresAt:
      Math.min(input.startedAt, now) +
      input.durationSeconds * 1000 +
      SUBMISSION_GRACE_MS,
  };
  const encodedPayload = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const signature = await sign(encodedPayload, secret);
  return {
    sessionId: payload.sessionId,
    sessionToken: `${encodedPayload}.${signature}`,
    startedAt: payload.startedAt,
    expiresAt: payload.expiresAt,
  };
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
    if (parts.length !== 2) return invalidSession();
    const [encodedPayload, signature] = parts;
    if (!(await verifySignature(encodedPayload, signature, secret))) {
      return invalidSession();
    }
    const payload = payloadSchema.parse(
      JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)))
    );
    if (now > payload.expiresAt) {
      return { ok: false, code: 'SESSION_EXPIRED' };
    }
    return { ok: true, payload };
  } catch {
    return invalidSession();
  }
}
```

Implement private `encodeBase64Url`, `decodeBase64Url`, `importHmacKey`, `sign`, and `verifySignature` using `btoa`, `atob`, `crypto.subtle.importKey`, `crypto.subtle.sign`, and `crypto.subtle.verify`. The HMAC algorithm is `{ name: 'HMAC', hash: 'SHA-256' }`; do not compare signature strings manually.

Use these exact private helpers:

```ts
const encoder = new TextEncoder();

function encodeBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function importHmacKey(
  secret: string,
  usage: 'sign' | 'verify'
) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );
}

async function sign(value: string, secret: string) {
  const key = await importHmacKey(secret, 'sign');
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return encodeBase64Url(new Uint8Array(signature));
}

async function verifySignature(
  value: string,
  signature: string,
  secret: string
) {
  const key = await importHmacKey(secret, 'verify');
  return crypto.subtle.verify(
    'HMAC',
    key,
    decodeBase64Url(signature),
    encoder.encode(value)
  );
}

function invalidSession() {
  return { ok: false, code: 'SESSION_INVALID' } as const;
}
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm.cmd exec tsx --test src/lib/game-session.test.ts`

Expected: 3 tests pass.

Commit:

```powershell
git add src/lib/game-session.ts src/lib/game-session.test.ts
git commit -m "feat: sign server game sessions"
```

### Task 3: Game-session API

**Files:**
- Create: `src/routes/api/game/session.ts`
- Modify: `src/lib/game-session.test.ts`
- Generated: `src/routeTree.gen.ts`

- [ ] **Step 1: Add RED tests for start-time validation**

Export and test `validateGameSessionStart(startedAt, now)` with these cases:

```ts
assert.equal(validateGameSessionStart(now, now), true);
assert.equal(validateGameSessionStart(now - 5_000, now), true);
assert.equal(validateGameSessionStart(now + 1_000, now), true);
assert.equal(validateGameSessionStart(now - 5_001, now), false);
assert.equal(validateGameSessionStart(now + 1_001, now), false);
```

Run: `pnpm.cmd exec tsx --test src/lib/game-session.test.ts`

Expected: FAIL because `validateGameSessionStart` is not exported.

- [ ] **Step 2: Add the minimal validator**

Add to `src/lib/game-session.ts`:

```ts
export function validateGameSessionStart(startedAt: number, now: number) {
  return startedAt >= now - 5_000 && startedAt <= now + 1_000;
}
```

Run the focused test again. Expected: all game-session tests pass.

- [ ] **Step 3: Implement the route**

Create `src/routes/api/game/session.ts`. The POST handler must:

1. Return `413 INVALID_REQUEST` when `content-length` exceeds 4,096.
2. Return `400 INVALID_REQUEST` for non-JSON or schema failure.
3. Return `503 CONFIGURATION_ERROR` unless `readGameSessionSecret(process.env.GAME_SESSION_SECRET)` succeeds.
4. Return `400 INVALID_GAME` unless the game exists and its duration matches.
5. Return `400 INVALID_REQUEST` unless `validateGameSessionStart` succeeds.
6. Call `issueGameSession` and return `{ ok: true, data: issued }` with status 201.
7. Catch unexpected errors, log only `[game-session:post]` plus the error object, and return `503 SERVER_ERROR`.

Use the same `{ ok: false, error: { code, message, fields? } }` shape as the community API. The successful response must expose only `sessionId`, `sessionToken`, `startedAt`, and `expiresAt`.

- [ ] **Step 4: Generate the route tree and verify**

Run: `pnpm.cmd build`

Expected: build succeeds and `src/routeTree.gen.ts` contains `/api/game/session`.

Run: `pnpm.cmd exec tsx --test src/lib/game-session.test.ts`

Expected: all tests pass.

Commit:

```powershell
git add src/lib/game-session.ts src/lib/game-session.test.ts src/routes/api/game/session.ts src/routeTree.gen.ts
git commit -m "feat: issue game sessions from the server"
```

### Task 4: Turnstile Siteverify adapter

**Files:**
- Create: `src/lib/turnstile.test.ts`
- Create: `src/lib/turnstile.ts`

- [ ] **Step 1: Write failing adapter tests**

Use a mock `fetchImpl` returning JSON responses. Cover:

```ts
const successFetch = async () =>
  Response.json({ success: true, action: 'score' });
const failedFetch = async () =>
  Response.json({ success: false, 'error-codes': ['timeout-or-duplicate'] });

assert.deepEqual(
  await verifyTurnstile({
    token: 'token',
    secret: 'secret',
    remoteIp: '127.0.0.1',
    expectedAction: 'score',
    fetchImpl: successFetch,
    idempotencyKey: '00000000-0000-4000-8000-000000000002',
  }),
  { ok: true }
);
assert.deepEqual(
  await verifyTurnstile({
    token: 'token',
    secret: 'secret',
    remoteIp: '127.0.0.1',
    expectedAction: 'score',
    fetchImpl: failedFetch,
    idempotencyKey: '00000000-0000-4000-8000-000000000002',
  }),
  { ok: false, code: 'TURNSTILE_FAILED' }
);
```

Also test a successful response with action `comment` when `score` is expected, and a `fetchImpl` that throws. Expected results are `TURNSTILE_FAILED` and `TURNSTILE_UNAVAILABLE` respectively.

- [ ] **Step 2: Run and verify RED**

Run: `pnpm.cmd exec tsx --test src/lib/turnstile.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement Siteverify**

Create `src/lib/turnstile.ts`:

```ts
import { z } from 'zod';

const responseSchema = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  'error-codes': z.array(z.string()).optional(),
});

type TurnstileAction = 'score' | 'comment';

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
}): Promise<
  | { ok: true }
  | { ok: false; code: 'TURNSTILE_FAILED' | 'TURNSTILE_UNAVAILABLE' }
> {
  try {
    const response = await fetchImpl(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          secret,
          response: token,
          remoteip: remoteIp,
          idempotency_key: idempotencyKey,
        }),
        signal: AbortSignal.timeout(5_000),
      }
    );
    if (!response.ok) {
      return { ok: false, code: 'TURNSTILE_UNAVAILABLE' };
    }
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return { ok: false, code: 'TURNSTILE_UNAVAILABLE' };
    }
    if (!parsed.data.success || parsed.data.action !== expectedAction) {
      return { ok: false, code: 'TURNSTILE_FAILED' };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: 'TURNSTILE_UNAVAILABLE' };
  }
}
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm.cmd exec tsx --test src/lib/turnstile.test.ts`

Expected: 4 tests pass.

Commit:

```powershell
git add src/lib/turnstile.ts src/lib/turnstile.test.ts
git commit -m "feat: verify Turnstile submissions"
```

### Task 5: D1 uniqueness and protected community writes

**Files:**
- Modify: `src/db/app.schema.ts`
- Generate: `src/db/migrations/0005_game_score_sessions.sql`
- Generate: `src/db/migrations/meta/0005_snapshot.json`
- Modify: `src/db/migrations/meta/_journal.json`
- Modify: `src/lib/game-community.ts`
- Modify: `src/lib/game-community.test.ts`
- Modify: `src/routes/api/game/community.ts`

- [ ] **Step 1: Write RED schema and duplicate-error tests**

Change the score test fixture to use `sessionToken` and `turnstileToken`, remove `startedAt` and `finishedAt`, and assert missing either token fails. Change the comment tests to assert `turnstileToken` is required.

Add and test this public helper contract in `src/lib/game-community.ts`:

```ts
assert.equal(
  isDuplicateScoreInsertError(
    new Error('UNIQUE constraint failed: game_scores.session_id')
  ),
  true
);
assert.equal(isDuplicateScoreInsertError(new Error('D1 unavailable')), false);
```

Run: `pnpm.cmd exec tsx --test src/lib/game-community.test.ts`

Expected: FAIL because token fields and `isDuplicateScoreInsertError` are not implemented.

- [ ] **Step 2: Update request schemas and helper**

Use these contracts in `src/lib/game-community.ts`:

```ts
export const scoreSubmissionSchema = z.object({
  gameId: z.string().regex(gameIdPattern),
  playerName: z.string().trim().min(2).max(24),
  guessedNames: z.array(z.string().trim().min(1).max(80)).max(100),
  durationSeconds: z.number().int().min(60).max(900),
  sessionToken: z.string().min(20).max(4_096),
  turnstileToken: z.string().min(1).max(2_048),
});

export const commentSubmissionSchema = z.object({
  gameId: z.string().regex(gameIdPattern),
  displayName: z.string().trim().min(2).max(24),
  message: z.string().trim().min(3).max(280),
  score: z.number().int().min(0).max(100).optional(),
  turnstileToken: z.string().min(1).max(2_048),
});

export function isDuplicateScoreInsertError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('UNIQUE constraint failed') &&
    (message.includes('game_scores.session_id') ||
      message.includes('game_scores.fingerprint'))
  );
}
```

Run the focused test. Expected: all game-community tests pass.

- [ ] **Step 3: Add the D1 column and generate migration**

Add `sessionId: text('session_id')` to `gameScores` and add `uniqueIndex('game_scores_session_idx').on(table.sessionId)`.

Run:

```powershell
pnpm.cmd exec drizzle-kit generate --name game_score_sessions
```

Expected: creates `src/db/migrations/0005_game_score_sessions.sql` containing an `ALTER TABLE game_scores ADD session_id text` statement and a unique `game_scores_session_idx`; creates `meta/0005_snapshot.json`; appends index 5 to `_journal.json`.

Apply locally using a Windows-compatible command:

```powershell
$gameDbName = pnpm.cmd exec tsx scripts/get-db-name.ts; pnpm.cmd exec wrangler d1 migrations apply $gameDbName --local
```

Expected: migration `0005_game_score_sessions.sql` reports success.

- [ ] **Step 4: Protect the score branch**

In `src/routes/api/game/community.ts`, expand `ApiErrorCode` with `CONFIGURATION_ERROR`, `SESSION_REQUIRED`, `SESSION_INVALID`, `SESSION_EXPIRED`, `TURNSTILE_REQUIRED`, `TURNSTILE_FAILED`, and `TURNSTILE_UNAVAILABLE`.

Immediately after validating the top-level `action`, load `readCommunitySecurityConfig(process.env)` and return `503 CONFIGURATION_ERROR` on failure. Before each Zod parse, preserve the dedicated missing-token errors:

```ts
const security = readCommunitySecurityConfig(process.env);
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
```

After schema and game-definition validation, execute this order:

```ts
const session = await verifyGameSession(
  parsed.data.sessionToken,
  security.data.gameSessionSecret
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
  return errorResponse('SESSION_INVALID', 'This game session is invalid.', 403);
}

const clientIp = getClientIp(request);
const turnstile = await verifyTurnstile({
  token: parsed.data.turnstileToken,
  secret: security.data.turnstileSecretKey,
  remoteIp: clientIp,
  expectedAction: 'score',
});
if (!turnstile.ok) return turnstileErrorResponse(turnstile.code);
```

Hash `${security.data.ipHashSalt}:${clientIp}` with the existing SHA-256 helper. Calculate `durationMs` as `Math.min(Date.now() - session.payload.startedAt, parsed.data.durationSeconds * 1000 + 300_000)`. Include `sessionId` in both the fingerprint payload and inserted row.

Wrap only the insert in `try/catch`; map `isDuplicateScoreInsertError(error)` to `409 DUPLICATE_SUBMISSION`, otherwise rethrow for the outer `SERVER_ERROR` handler.

- [ ] **Step 5: Protect the comment branch**

Validate the same fail-closed configuration, compute the salted IP hash, then call `verifyTurnstile` with `expectedAction: 'comment'` before block lookup, rate limiting or D1 reads. Reuse a local `turnstileErrorResponse` function:

```ts
function turnstileErrorResponse(
  code: 'TURNSTILE_FAILED' | 'TURNSTILE_UNAVAILABLE'
) {
  return code === 'TURNSTILE_UNAVAILABLE'
    ? errorResponse(
        code,
        'Human verification is temporarily unavailable.',
        503
      )
    : errorResponse(code, 'Human verification failed. Try again.', 403);
}
```

Do not log Turnstile tokens, session tokens, secrets or raw IPs.

- [ ] **Step 6: Run tests/checks and commit**

Run the complete test set:

```powershell
$tests = @(rg --files src | Where-Object { $_ -match '(\.test\.ts$|^src[\\/]+tests[\\/].+\.test\.ts$)' }); pnpm.cmd exec tsx --test $tests
```

Expected: 0 failed tests.

Run: `pnpm.cmd check`

Expected: exit 0.

Commit:

```powershell
git add src/db src/lib/game-community.ts src/lib/game-community.test.ts src/routes/api/game/community.ts
git commit -m "feat: protect game community writes"
```

### Task 6: Explicit Turnstile React widget

**Files:**
- Create: `src/components/game/turnstile-widget.tsx`
- Modify: `src/tests/homepage-game.test.ts`

- [ ] **Step 1: Add a failing source integration test**

Assert that `name100-game.tsx` imports `TurnstileWidget`, renders actions `score` and `comment`, and sends `turnstileToken`. Assert the widget source contains the official script URL, `turnstile.render`, `expired-callback`, `error-callback`, `reset`, and `remove`.

Run: `pnpm.cmd exec tsx --test src/tests/homepage-game.test.ts`

Expected: FAIL because the component and integration do not exist.

- [ ] **Step 2: Implement the widget**

Create a client component with this public API:

```ts
'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: 'score' | 'comment';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    }
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`
    );
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Turnstile failed to load.')), {
      once: true,
    });
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
  });
  return scriptPromise;
}

export type TurnstileWidgetHandle = { reset: () => void };

export const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  {
    siteKey: string;
    action: 'score' | 'comment';
    onToken: (token: string) => void;
  }
>(function TurnstileWidget({ siteKey, action, onToken }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
      onToken('');
    },
  }));

  useEffect(() => {
    let cancelled = false;
    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          callback: onToken,
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        });
      })
      .catch(() => onToken(''));

    return () => {
      cancelled = true;
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [action, onToken, siteKey]);

  return <div ref={containerRef} />;
});
```

Implement a module-level `loadTurnstileScript()` promise for `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`. Reuse an existing matching script element, resolve immediately when `window.turnstile` exists, and reject on script error.

In the component effect, render into a `div` ref with options:

```ts
{
  sitekey: siteKey,
  action,
  callback: onToken,
  'expired-callback': () => onToken(''),
  'error-callback': () => onToken(''),
}
```

Expose `reset()` through `useImperativeHandle`; on unmount call `window.turnstile.remove(widgetId)`. Guard async completion with a cancelled flag so an unmounted component is never rendered into.

Declare the minimal `window.turnstile` type in the same file. Do not add an npm dependency.

- [ ] **Step 3: Build and commit the standalone component**

Run: `pnpm.cmd build`

Expected: build succeeds; the test remains RED only for the not-yet-wired `name100-game.tsx` assertions.

Commit the widget and the still-failing test only after Task 7 completes; do not create a commit with a knowingly failing repository test.

### Task 7: Persist sessions and wire protected forms

**Files:**
- Modify: `src/components/game/name100-game.tsx`
- Modify: `src/tests/homepage-game.test.ts`
- Include from Task 6: `src/components/game/turnstile-widget.tsx`

- [ ] **Step 1: Extend stored game state**

Add optional `sessionToken` and `sessionExpiresAt` to `StoredGame`. Add matching React state and refs:

```ts
const [sessionToken, setSessionToken] = useState('');
const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
const sessionRequestRef = useRef<Promise<string> | null>(null);
const sessionAbortRef = useRef<AbortController | null>(null);
```

Extend `persistGame` parameters and serialized data with both session values. Restore them from storage; reset and clear must abort an in-flight request and clear both values.

- [ ] **Step 2: Request a session on the first valid guess**

When the first valid guess starts the timer, retain the existing local `startedAt`, then call a new `requestGameSession(startedAt)` function. It POSTs `{ gameId, durationSeconds, startedAt }` to `/api/game/session`, validates `{ ok, data.sessionToken, data.expiresAt }`, stores both values, and returns the token.

Use one promise per round through `sessionRequestRef`; clear the ref after settlement. On failure, set `scoreSubmitStatus` to `This round can be played, but it cannot be submitted.` without interrupting `submitAnswer`.

- [ ] **Step 3: Render and manage both Turnstile widgets**

Read `clientEnv.VITE_TURNSTILE_SITE_KEY ?? ''`. Add:

```ts
const [scoreTurnstileToken, setScoreTurnstileToken] = useState('');
const [commentTurnstileToken, setCommentTurnstileToken] = useState('');
const scoreTurnstileRef = useRef<TurnstileWidgetHandle>(null);
const commentTurnstileRef = useRef<TurnstileWidgetHandle>(null);
```

Render a `score` widget in the final-score form and a `comment` widget in the comment form only when the sitekey is non-empty. If it is empty, show the existing status area message `Community submissions are not configured.` and disable both submit buttons.

- [ ] **Step 4: Send tokens and reset widgets**

The score JSON body must contain `sessionToken`, `turnstileToken: scoreTurnstileToken`, `gameId`, `playerName`, `guessedNames`, and `durationSeconds`; it must not contain `startedAt` or `finishedAt`. If a session request is pending, await it before sending. Reject locally when no signed session or Turnstile token exists.

The comment body adds `turnstileToken: commentTurnstileToken`. In each submit function `finally`, clear the corresponding token and call the corresponding widget ref's `reset()` so a single-use token cannot be reused after success or failure.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm.cmd exec tsx --test src/tests/homepage-game.test.ts`

Expected: all homepage source tests pass.

Run: `pnpm.cmd check`

Expected: exit 0.

Run: `pnpm.cmd build`

Expected: production build succeeds.

Commit:

```powershell
git add src/components/game/name100-game.tsx src/components/game/turnstile-widget.tsx src/tests/homepage-game.test.ts
git commit -m "feat: add protected score and comment forms"
```

### Task 8: End-to-end verification and deployment handoff

**Files:**
- Verify all changed files.
- Do not modify or stage `.env`.

- [ ] **Step 1: Run all automated verification**

Run:

```powershell
$tests = @(rg --files src | Where-Object { $_ -match '(\.test\.ts$|^src[\\/]+tests[\\/].+\.test\.ts$)' }); pnpm.cmd exec tsx --test $tests
pnpm.cmd check
pnpm.cmd locale:check
pnpm.cmd build
git diff --check
```

Expected: all tests pass, both checks exit 0, build exits 0, and `git diff --check` prints nothing.

- [ ] **Step 2: Run local API smoke tests**

Start a fresh dev server on an unused port after local D1 migrations. Verify:

- `POST /api/game/session` with the valid women payload returns 201 and a signed token.
- An old or future `startedAt` returns 400 `INVALID_REQUEST`.
- A score without a session token returns 400/403 according to schema/verification stage and never writes D1.
- A score with a tampered session returns 403 `SESSION_INVALID`.
- Official test Turnstile tokens pass Siteverify only with the test secret.
- Reusing the same session returns 409 `DUPLICATE_SUBMISSION`.
- A comment requires an independent Turnstile token.
- GET `/api/game/community` still works without write secrets.

Stop only the temporary server process after verification.

- [ ] **Step 3: Inspect Git and secret boundaries**

Run:

```powershell
git status --short --branch
git check-ignore -v .env
git grep -n "GAME_SESSION_SECRET='\|GAME_IP_HASH_SALT='\|TURNSTILE_SECRET_KEY='"
```

Expected: `.env` is ignored; tracked files contain only empty examples and variable names, never generated secrets. Review every commit with `git log --oneline --decorate -8`.

- [ ] **Step 4: Record deployment prerequisites**

Do not deploy in this implementation task. Report these required operations in order:

1. Create the production Turnstile widget for `name100challenge.com`.
2. Set the three Worker secrets.
3. Set the public Vite sitekey in the build environment.
4. Run the remote `0005_game_score_sessions.sql` migration.
5. Deploy the Worker and run production smoke tests.

The Windows-compatible remote migration command is:

```powershell
$gameDbName = pnpm.cmd exec tsx scripts/get-db-name.ts; pnpm.cmd exec wrangler d1 migrations apply $gameDbName --remote
```

Do not run it until the user explicitly starts the deployment phase and Cloudflare credentials are available.
