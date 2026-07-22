import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { getRetiredTemplateRedirect } from './retired-template-route';

const retiredPaths = ['/about', '/ai', '/contact', '/roadmap', '/waitlist'];
const retiredRouteFiles = retiredPaths.map(
  (path) => `src/routes/(pages)/${path.slice(1)}.tsx`
);

describe('getRetiredTemplateRedirect', () => {
  it('redirects every retired exact path to the same-origin root', () => {
    for (const path of retiredPaths) {
      assert.equal(
        getRetiredTemplateRedirect(`https://example.com${path}`),
        'https://example.com/'
      );
    }
  });

  it('drops query strings from retired paths', () => {
    assert.equal(
      getRetiredTemplateRedirect('https://example.com/about?ref=old'),
      'https://example.com/'
    );
  });

  it('does not redirect unrelated or similarly prefixed paths', () => {
    assert.equal(getRetiredTemplateRedirect('https://example.com/'), null);
    assert.equal(
      getRetiredTemplateRedirect('https://example.com/about/team'),
      null
    );
  });
});

it('removes retired pages from the file routes and generated route tree', () => {
  for (const file of retiredRouteFiles) {
    assert.equal(existsSync(file), false, `${file} should be removed`);
  }

  const routeTree = readFileSync('src/routeTree.gen.ts', 'utf8');
  for (const path of retiredPaths) {
    assert.equal(
      routeTree.includes(`'${path}'`),
      false,
      `${path} should be absent from the route tree`
    );
  }
});
