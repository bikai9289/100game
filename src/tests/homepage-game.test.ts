import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('game homepage source', () => {
  it('renders the game first viewport and static SEO sections', () => {
    const homepage = readFileSync('src/components/blocks/homepage.tsx', 'utf8');

    assert.match(homepage, /Name100Game/);
    assert.match(homepage, /Name 100 Women Challenge/);
    assert.match(homepage, /How to Play/);
    assert.match(homepage, /Tips to Reach 100/);
    assert.match(homepage, /FAQ/);
  });

  it('uses game-specific metadata on the home route', () => {
    const route = readFileSync('src/routes/index.tsx', 'utf8');

    assert.match(route, /Name 100 Women Challenge/);
    assert.match(route, /Can You Name 100 Famous Women/);
  });

  it('submits from form data and persists browser progress', () => {
    const game = readFileSync('src/components/game/name100-game.tsx', 'utf8');

    assert.match(game, /name="answer"/);
    assert.match(game, /new FormData\(event\.currentTarget\)/);
    assert.match(game, /window\.localStorage\.setItem/);
    assert.match(game, /persistGame\(nextState, true\)/);
  });
});
