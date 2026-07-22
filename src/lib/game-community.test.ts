import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  moderateComment,
  recomputeSubmittedScore,
  scoreSubmissionSchema,
} from './game-community';
import type { Answer } from './gameEngine';

const answers: Answer[] = [
  { name: 'Taylor Swift', aliases: ['taylor', 'swift'], category: 'musicians' },
  { name: 'Alex Morgan', aliases: ['alex', 'morgan'], category: 'athletes' },
  { name: 'Alex Scott', aliases: ['alex', 'scott'], category: 'athletes' },
];

describe('game community validation', () => {
  it('recomputes scores from unique server-side answers', () => {
    assert.deepEqual(
      recomputeSubmittedScore(
        ['Taylor Swift', 'taylor', 'Alex Morgan', 'unknown'],
        answers
      ),
      { score: 2, acceptedNames: ['Taylor Swift', 'Alex Morgan'] }
    );
  });

  it('does not award a point for an ambiguous alias', () => {
    assert.deepEqual(recomputeSubmittedScore(['alex'], answers), {
      score: 0,
      acceptedNames: [],
    });
  });

  it('rejects malformed or impossible score submissions', () => {
    const base = {
      gameId: 'women',
      playerName: 'Player One',
      guessedNames: ['Taylor Swift'],
      startedAt: 10_000,
      finishedAt: 20_000,
      durationSeconds: 720,
    };

    assert.equal(scoreSubmissionSchema.safeParse(base).success, true);
    assert.equal(
      scoreSubmissionSchema.safeParse({ ...base, finishedAt: 9_000 }).success,
      false
    );
    assert.equal(
      scoreSubmissionSchema.safeParse({
        ...base,
        guessedNames: new Array(101).fill('x'),
      }).success,
      false
    );
  });

  it('blocks unsafe comments and normalizes valid plain text', () => {
    assert.deepEqual(moderateComment('  Great   challenge!  '), {
      ok: true,
      text: 'Great challenge!',
    });
    assert.deepEqual(moderateComment('<script>alert(1)</script>'), {
      ok: false,
      code: 'COMMENT_UNSAFE',
    });
    assert.deepEqual(moderateComment('visit https://spam.example now'), {
      ok: false,
      code: 'COMMENT_LINK_NOT_ALLOWED',
    });
  });
});
