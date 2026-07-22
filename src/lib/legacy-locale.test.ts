import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getLegacyLocaleRedirect } from './legacy-locale';

describe('getLegacyLocaleRedirect', () => {
  it('redirects the retired Chinese root to the English root', () => {
    assert.equal(
      getLegacyLocaleRedirect('https://example.com/zh'),
      'https://example.com/'
    );
    assert.equal(
      getLegacyLocaleRedirect('https://example.com/zh/?ref=old'),
      'https://example.com/?ref=old'
    );
  });

  it('preserves the path and query string after the retired locale prefix', () => {
    assert.equal(
      getLegacyLocaleRedirect('https://example.com/zh/blog/post?from=search'),
      'https://example.com/blog/post?from=search'
    );
  });

  it('does not redirect unrelated paths', () => {
    assert.equal(getLegacyLocaleRedirect('https://example.com/zhuang'), null);
  });
});
