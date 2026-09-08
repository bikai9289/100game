import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkAnswer, getAnswerCategories, normalizeInput } from './gameEngine';
import {
  categoryOrder,
  getAnswersByCategory,
  womenAnswerList,
} from './name100-data';

describe('name100 data quality', () => {
  it('accepts high-recall women from the playtest and community feedback', () => {
    const expectedNames = new Map([
      ['Billie Eilish', 'Billie Eilish'],
      ['Sabrina Carpenter', 'Sabrina Carpenter'],
      ['Zendaya', 'Zendaya'],
      ['Michelle Yeoh', 'Michelle Yeoh'],
      ['Ana de Armas', 'Ana de Armas'],
      ['Margot Robbie', 'Margot Robbie'],
      ['Simone Biles', 'Simone Biles'],
      ['Liu Yifei', 'Liu Yifei'],
      ['Jane Austen', 'Jane Austen'],
      ['JK Rowling', 'J.K. Rowling'],
      ['Virginia Woolf', 'Virginia Woolf'],
      ['Michelle Obama', 'Michelle Obama'],
      ['Melania Trump', 'Melania Trump'],
      ['Kate Middleton', 'Catherine, Princess of Wales'],
      ['Rosa Parks', 'Rosa Parks'],
      ['Marie Curie', 'Marie Curie'],
      ['Ada Lovelace', 'Ada Lovelace'],
    ]);

    for (const [input, expectedName] of expectedNames) {
      assert.equal(checkAnswer(input, womenAnswerList)?.name, expectedName);
    }
  });

  it('supports category membership beyond the primary category', () => {
    assert.equal(
      getAnswersByCategory('other').some(
        (answer) => answer.name === 'Jane Austen'
      ),
      true
    );
    assert.equal(
      getAnswersByCategory('musicians').some(
        (answer) => answer.name === 'Madam C. J. Walker'
      ),
      false
    );
    assert.equal(
      getAnswersByCategory('business').some(
        (answer) => answer.name === 'Madam C. J. Walker'
      ),
      true
    );
    assert.equal(
      getAnswersByCategory('other').some(
        (answer) => answer.name === 'J.K. Rowling'
      ),
      true
    );
    assert.equal(
      getAnswersByCategory('other').some(
        (answer) => answer.name === 'Virginia Woolf'
      ),
      true
    );
    assert.equal(
      getAnswersByCategory('musicians').some(
        (answer) => answer.name === 'Pokimane'
      ),
      false
    );
    assert.equal(
      getAnswersByCategory('other').some(
        (answer) => answer.name === 'Pokimane'
      ),
      true
    );
  });

  it('rejects non-person entries that slipped in from music data', () => {
    assert.equal(checkAnswer('Lady Antebellum', womenAnswerList), null);
  });

  it('keeps answer categories valid', () => {
    const allowedCategories = new Set<string>(categoryOrder);

    for (const answer of womenAnswerList) {
      assert.notEqual(answer.name.trim(), '');
      assert.equal(allowedCategories.has(answer.category), true);

      const categories = getAnswerCategories(answer);
      assert.equal(categories.includes(answer.category), true);
      assert.equal(new Set(categories).size, categories.length);
      for (const category of categories) {
        assert.equal(allowedCategories.has(category), true);
      }
      for (const alias of new Set([answer.name, ...answer.aliases])) {
        assert.notEqual(normalizeInput(alias), '');
      }
    }
  });
});
