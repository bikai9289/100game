import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('SEO keyword map', () => {
  it('keeps the homepage title concise and focused on Name 100 Women', () => {
    const route = readFileSync('src/routes/index.tsx', 'utf8');
    const title = route.match(/const title =\s*\n?\s*'([^']+)'/)?.[1];

    assert.ok(title, 'homepage title should be a static string');
    assert.match(title, /^Name 100 Women Challenge/);
    assert.ok(
      title.length <= 60,
      `homepage title should be at most 60 characters, received ${title.length}`
    );
  });

  it('names the daily mode explicitly in global navigation', () => {
    const navbar = readFileSync('src/config/navbar-config.ts', 'utf8');

    assert.match(navbar, /title: 'Daily Challenge', href: Routes\.Challenge/);
    assert.doesNotMatch(navbar, /title: 'Challenge', href: Routes\.Challenge/);
  });

  it('links the answer intent back to the game and category practice', () => {
    const answers = readFileSync('src/routes/(pages)/answers.tsx', 'utf8');

    assert.match(answers, /to="\/"[^>]*>\s*play the Name 100 Women Challenge/i);
    assert.match(answers, /to="\/categories"[^>]*>\s*practice by category/i);
  });
});
