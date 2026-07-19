import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkAnswer,
  fuzzyMatch,
  initGame,
  submitAnswer,
  type Answer,
} from './gameEngine';

const answers: Answer[] = [
  {
    name: 'Taylor Swift',
    aliases: ['taylor swift', 'swift', 'taylor'],
    category: 'musicians',
    hint: 'American singer-songwriter',
  },
  {
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
});
