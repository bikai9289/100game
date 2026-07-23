import assert from 'node:assert/strict';
import test from 'node:test';

import { getCanonicalHostRedirect } from './canonical-host';

test('redirects www requests to the apex domain without losing the URL', () => {
  assert.equal(
    getCanonicalHostRedirect('https://www.name100challenge.com/men?period=all'),
    'https://name100challenge.com/men?period=all'
  );
});

test('does not redirect requests already using the canonical host', () => {
  assert.equal(
    getCanonicalHostRedirect('https://name100challenge.com/challenge'),
    null
  );
});

test('redirects insecure requests to the HTTPS canonical URL', () => {
  assert.equal(
    getCanonicalHostRedirect('http://name100challenge.com/timer?minutes=12'),
    'https://name100challenge.com/timer?minutes=12'
  );
});
