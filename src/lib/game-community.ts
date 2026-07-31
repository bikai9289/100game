import { checkAnswer, type Answer } from './gameEngine';
import { z } from 'zod';

const gameIdPattern = /^(women|men|daily:\d{4}-\d{2}-\d{2}|category:[a-z-]+)$/;

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

export function recomputeSubmittedScore(
  guessedNames: string[],
  answers: Answer[]
): { score: number; acceptedNames: string[] } {
  const acceptedNames: string[] = [];
  const acceptedKeys = new Set<string>();

  for (const submittedName of guessedNames) {
    const answer = checkAnswer(submittedName, answers);
    if (!answer) continue;

    const key = answer.id;
    if (acceptedKeys.has(key)) continue;

    acceptedKeys.add(key);
    acceptedNames.push(answer.name);
  }

  return { score: acceptedNames.length, acceptedNames };
}

export type CommentModerationResult =
  | { ok: true; text: string }
  | {
      ok: false;
      code: 'COMMENT_EMPTY' | 'COMMENT_UNSAFE' | 'COMMENT_LINK_NOT_ALLOWED';
    };

export function moderateComment(message: string): CommentModerationResult {
  const text = message.replace(/\s+/g, ' ').trim();

  if (text.length < 3) return { ok: false, code: 'COMMENT_EMPTY' };
  if (/[<>]/.test(text)) return { ok: false, code: 'COMMENT_UNSAFE' };
  if (/(?:https?:\/\/|www\.)/i.test(text)) {
    return { ok: false, code: 'COMMENT_LINK_NOT_ALLOWED' };
  }

  return { ok: true, text };
}
