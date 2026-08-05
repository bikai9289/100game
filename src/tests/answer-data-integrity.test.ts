import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import womenAnswers from '@/data/answers-women.json';
import { checkAnswer, normalizeInput, type Answer } from '@/lib/gameEngine';

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

const requiredInputs = [
  ['Michelle Obama', 'politicians'],
  ['Melania Trump', 'politicians'],
  ['Kate Middleton', 'politicians'],
  ['Rosa Parks', 'activists'],
  ['Marie Curie', 'scientists'],
  ['Ada Lovelace', 'scientists'],
  ['Serena Williams', 'athletes'],
  ['Princess Diana', 'historical'],
  ['Cleopatra', 'historical'],
  ['Frida Kahlo', 'other'],
  ['Jane Austen', 'historical'],
  ['Maya Angelou', 'other'],
  ['Malala Yousafzai', 'activists'],
  ['Greta Thunberg', 'activists'],
  ['Amelia Earhart', 'historical'],
  ['Margaret Thatcher', 'politicians'],
  ['Hillary Clinton', 'politicians'],
  ['Kamala Harris', 'politicians'],
  ['Queen Elizabeth II', 'historical'],
  ['Mother Teresa', 'activists'],
  ['Virginia Woolf', 'historical'],
  ['Helen Keller', 'activists'],
  ['Harriet Tubman', 'activists'],
  ["Georgia O'Keeffe", 'other'],
] as const;

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

  it('accepts the reported and baseline famous women', () => {
    for (const [input, category] of requiredInputs) {
      const match = checkAnswer(input, answers);

      assert.ok(match, `${input} should be accepted`);
      assert.equal(match.category, category, input);
    }
  });

  it('does not accept ambiguous single-word aliases', () => {
    for (const answer of answers) {
      for (const alias of answer.aliases) {
        assert.ok(
          normalizeInput(alias).includes(' '),
          `${answer.name} has ambiguous single-word alias '${alias}'`
        );
      }
    }
  });

  it('keeps known musicians out of the actresses category', () => {
    const musicians = [
      "D'arcy Wretzky",
      'Elizabeth Stokes',
      'Emma Richardson',
      'Gail Greenwood',
      'Melissa Auf der Maur',
      'Paz Lenchantin',
      'Rachel Goswell',
      'Radie Peat',
      'Romy Madley Croft',
      'Ruth Radelet',
      'Victoria Legrand',
    ];

    for (const name of musicians) {
      const answer = answers.find((item) => item.name === name);
      assert.equal(answer?.category, 'musicians', name);
    }
  });

  it('keeps astronauts out of the business category', () => {
    const astronauts = [
      'Kalpana Chawla',
      'Laurel Clark',
      'Stephanie Wilson',
      'Barbara Morgan',
      'Karen Nyberg',
      'Tracy Caldwell Dyson',
      'Shannon Walker',
      'Catherine Coleman',
    ];

    for (const name of astronauts) {
      const answer = answers.find((item) => item.name === name);
      assert.equal(answer?.category, 'scientists', name);
    }
  });

  it('keeps the curated women file as the generator source', () => {
    const generator = readFileSync('scripts/generate-name100-data.mjs', 'utf8');

    assert.doesNotMatch(generator, /REFERENCE_WOMEN_DB/);
    assert.doesNotMatch(generator, /womenSlices/);
    assert.match(generator, /CURATED_WOMEN_DATA/);
  });

  it('only uses supported categories and documents the data repair command', () => {
    assert.ok(
      answers.every((answer) => allowedCategories.has(answer.category))
    );

    const packageJson = readFileSync('package.json', 'utf8');
    assert.match(packageJson, /"data:check"/);
  });
});
