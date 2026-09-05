import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const mainRoutes = [
  'src/routes/(pages)/challenge.tsx',
  'src/routes/(pages)/categories/index.tsx',
  'src/routes/(pages)/timer.tsx',
  'src/routes/(pages)/men/index.tsx',
  'src/routes/(pages)/answers.tsx',
];

const categorySlugs = [
  'actresses',
  'musicians',
  'athletes',
  'scientists',
  'politicians',
  'historical',
  'business',
  'activists',
  'other',
];

describe('step5 internal pages', () => {
  it('extracts More Challenges and removes user-facing SEO wording', () => {
    assert.ok(existsSync('src/components/blocks/more-challenges.tsx'));

    const homepage = readFileSync('src/components/blocks/homepage.tsx', 'utf8');
    const moreChallenges = readFileSync(
      'src/components/blocks/more-challenges.tsx',
      'utf8'
    );

    assert.match(homepage, /<MoreChallenges currentPage="home" \/>/);
    assert.doesNotMatch(homepage, /for study or SEO/);
    assert.match(
      moreChallenges,
      /Browse the full list of accepted answers and aliases\./
    );
  });

  it('creates the five main SSR pages plus dynamic category route', () => {
    for (const route of mainRoutes) {
      assert.ok(existsSync(route), `${route} should exist`);
    }

    assert.ok(existsSync('src/routes/(pages)/categories/$slug.tsx'));
  });

  it('adds game-specific titles, H1s, FAQ schema, and answer SSR content', () => {
    const challenge = readFileSync('src/routes/(pages)/challenge.tsx', 'utf8');
    const categories = readFileSync(
      'src/routes/(pages)/categories/index.tsx',
      'utf8'
    );
    const timer = readFileSync('src/routes/(pages)/timer.tsx', 'utf8');
    const men = readFileSync('src/routes/(pages)/men/index.tsx', 'utf8');
    const answers = readFileSync('src/routes/(pages)/answers.tsx', 'utf8');

    assert.match(challenge, /Daily Challenge: Name 100 Women/);
    assert.match(challenge, /gameJsonLd/);
    assert.match(readFileSync('src/lib/game-schema.ts', 'utf8'), /FAQPage/);
    assert.match(categories, /Name 100 Women by Category/);
    assert.match(timer, /Name 100 Women Timer/);
    assert.match(men, /Name 100 Men Challenge/);
    assert.match(answers, /Name 100 Women Answers/);
    assert.match(answers, /answers-women\.json/);
  });

  it('lists all new URLs in sitemap including category children', () => {
    const sitemap = readFileSync('src/routes/sitemap[.]xml.ts', 'utf8');

    for (const path of [
      '/challenge',
      '/categories',
      '/timer',
      '/men',
      '/answers',
      ...categorySlugs.map((slug) => `/categories/${slug}`),
    ]) {
      assert.match(sitemap, new RegExp(`path: '${path}'`));
    }
  });

  it('labels the shared daily challenge as UTC', () => {
    const challenge = readFileSync('src/routes/(pages)/challenge.tsx', 'utf8');

    assert.match(challenge, /UTC daily challenge:/i);
    assert.doesNotMatch(challenge, />\s*Today: \{today\}/);
  });

  it('links privacy, terms, and contact from the footer', () => {
    const footerConfig = readFileSync('src/config/footer-config.ts', 'utf8');

    assert.match(footerConfig, /Routes\.PrivacyPolicy/);
    assert.match(footerConfig, /Routes\.TermsOfService/);
    assert.match(footerConfig, /Routes\.Contact/);
    assert.ok(existsSync('src/routes/(pages)/contact.tsx'));
  });
});
