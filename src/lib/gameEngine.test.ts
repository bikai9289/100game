import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkAnswer,
  fuzzyMatch,
  initGame,
  remainingTimeFromDeadline,
  submitAnswer,
  type Answer,
} from './gameEngine';

const answers: Answer[] = [
  {
    id: 'taylor-swift',
    name: 'Taylor Swift',
    aliases: ['taylor swift', 'swift', 'taylor'],
    category: 'musicians',
    hint: 'American singer-songwriter',
  },
  {
    id: 'marie-curie',
    name: 'Marie Curie',
    aliases: ['marie curie', 'curie'],
    category: 'scientists',
    hint: 'Physicist and chemist',
  },
];

describe('gameEngine', () => {
  it('matches answers case-insensitively', () => {
    assert.equal(checkAnswer('TAYLOR SWIFT', answers)?.name, 'Taylor Swift');
  });

  it('matches aliases after normalizing punctuation and spacing', () => {
    assert.equal(checkAnswer('  swift!!! ', answers)?.name, 'Taylor Swift');
  });

  it('returns null for blank input', () => {
    assert.equal(checkAnswer('   ', answers), null);
  });

  it('allows one-character fuzzy matches for longer names', () => {
    assert.equal(fuzzyMatch('taylor swif', 'taylor swift'), true);
  });

  it('tracks score and detects duplicate answers', () => {
    const initialState = initGame(answers);
    const first = submitAnswer('swift', initialState, answers);
    const second = submitAnswer('Taylor Swift', first.newState, answers);

    assert.equal(first.isCorrect, true);
    assert.equal(first.isDuplicate, false);
    assert.equal(first.newState.score, 1);
    assert.equal(second.isCorrect, false);
    assert.equal(second.isDuplicate, true);
    assert.equal(second.newState.score, 1);
  });

  it('rejects an alias shared by multiple answers', () => {
    const ambiguousAnswers: Answer[] = [
      {
        id: 'alex-morgan',
        name: 'Alex Morgan',
        aliases: ['alex', 'alex morgan'],
        category: 'athletes',
      },
      {
        id: 'alex-scott',
        name: 'Alex Scott',
        aliases: ['alex', 'alex scott'],
        category: 'athletes',
      },
    ];

    assert.equal(checkAnswer('alex', ambiguousAnswers), null);
    assert.equal(
      checkAnswer('alex morgan', ambiguousAnswers)?.name,
      'Alex Morgan'
    );
  });

  it('derives remaining time from a wall-clock deadline', () => {
    assert.equal(remainingTimeFromDeadline(70_000, 10_000), 60);
    assert.equal(remainingTimeFromDeadline(10_001, 10_000), 1);
    assert.equal(remainingTimeFromDeadline(9_999, 10_000), 0);
  });
});
