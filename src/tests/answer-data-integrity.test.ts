import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import womenAnswers from '@/data/answers-women.json';
import { normalizeInput, type Answer } from '@/lib/gameEngine';

const answers = womenAnswers as Answer[];
const allowedCategories = new Set([
  'actresses',
  'musicians',
  'athletes',
  'scientists',
  'politicians',
  'historical',
  'business',
  'activists',
  'other',
]);

describe('women answer data integrity', () => {
  it('uses a stable unique ID for every person', () => {
    const ids = answers.map((answer) => answer.id);

    assert.ok(ids.every(Boolean));
    assert.equal(new Set(ids).size, answers.length);
  });

  it('contains no duplicate people or normalized aliases', () => {
    const names = answers.map((answer) => normalizeInput(answer.name));
    assert.equal(new Set(names).size, answers.length);

    for (const answer of answers) {
      const aliases = answer.aliases.map(normalizeInput);
      assert.equal(
        new Set(aliases).size,
        aliases.length,
        `${answer.name} contains duplicate aliases`
      );
      assert.ok(
        !aliases.includes(normalizeInput(answer.name)),
        `${answer.name} repeats its canonical name as an alias`
      );
    }
  });

  it('does not assign one accepted input to multiple people', () => {
    const owners = new Map<string, string>();

    for (const answer of answers) {
      for (const value of [answer.name, ...answer.aliases]) {
        const normalized = normalizeInput(value);
        const owner = owners.get(normalized);
        assert.ok(
          !owner || owner === answer.name,
          `${normalized} is shared by ${owner} and ${answer.name}`
        );
        owners.set(normalized, answer.name);
      }
    }
  });

  it('includes Marie Curie once in the scientists category', () => {
    const matches = answers.filter(
      (answer) => normalizeInput(answer.name) === 'marie curie'
    );

    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.category, 'scientists');
  });

  it('keeps known musicians out of the actresses category', () => {
    const musicians = [
      "D'arcy Wretzky",
      'Elizabeth Stokes',
      'Emma Richardson',
      'Radie Peat',
      'Romy Madley Croft',
    ];

    for (const name of musicians) {
      const answer = answers.find((item) => item.name === name);
      assert.equal(answer?.category, 'musicians', name);
    }
  });

  it('only uses supported categories and documents the data repair command', () => {
    assert.ok(
      answers.every((answer) => allowedCategories.has(answer.category))
    );

    const packageJson = readFileSync('package.json', 'utf8');
    assert.match(packageJson, /"data:check"/);
  });
});
