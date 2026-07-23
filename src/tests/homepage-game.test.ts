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

  it('submits the controlled input and persists browser progress', () => {
    const game = readFileSync('src/components/game/name100-game.tsx', 'utf8');

    assert.match(game, /name="answer"/);
    assert.match(game, /value=\{input\}/);
    assert.match(game, /submitGuess\(input\)/);
    assert.match(game, /window\.localStorage\.setItem/);
    assert.match(
      game,
      /persistGame\(\s*gameState,\s*isStarted,\s*deadlineRef\.current,\s*startedAtRef\.current,\s*sessionToken,\s*sessionExpiresAt,\s*storageKey,\s*storageCookie\s*\)/
    );
  });

  it('starts the round and requests its session before evaluating the first guess', () => {
    const game = readFileSync('src/components/game/name100-game.tsx', 'utf8');
    const submitGuess = game.slice(
      game.indexOf('function submitGuess'),
      game.indexOf('function handleSubmit')
    );
    const trimIndex = submitGuess.indexOf('value.trim()');
    const emptyGuardIndex = submitGuess.indexOf('if (!guess)');
    const startIndex = submitGuess.indexOf('if (!isStartedRef.current)');
    const sessionIndex = submitGuess.indexOf('requestGameSession(now)');
    const answerIndex = submitGuess.indexOf('submitAnswer(');

    assert.ok(trimIndex >= 0);
    assert.ok(emptyGuardIndex > trimIndex);
    assert.ok(startIndex > emptyGuardIndex);
    assert.ok(sessionIndex > startIndex);
    assert.ok(answerIndex > sessionIndex);
    assert.doesNotMatch(
      submitGuess.slice(startIndex, answerIndex),
      /result\.isCorrect/
    );
  });

  it('retries sessions only for the current round generation', () => {
    const game = readFileSync('src/components/game/name100-game.tsx', 'utf8');

    assert.match(game, /const roundGenerationRef = useRef\(0\)/);
    assert.match(game, /retryWithPolicy/);
    assert.match(
      game,
      /isCurrent: \(\) => generation === roundGenerationRef\.current/
    );
    assert.match(
      game,
      /throwIfRetryCancelled\(\s*controller\.signal,\s*\(\) => generation === roundGenerationRef\.current\s*\)/
    );
    assert.match(
      game,
      /roundGenerationRef\.current \+= 1;\s*sessionAbortRef\.current\?\.abort\(\)/
    );
  });

  it('uses explicit Turnstile widgets for protected community writes', () => {
    const game = readFileSync('src/components/game/name100-game.tsx', 'utf8');
    const widget = readFileSync(
      'src/components/game/turnstile-widget.tsx',
      'utf8'
    );

    assert.match(game, /TurnstileWidget/);
    assert.match(game, /action="score"/);
    assert.match(game, /action="comment"/);
    assert.match(game, /turnstileToken/);
    assert.match(
      widget,
      /https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/
    );
    assert.match(widget, /turnstile\.render/);
    assert.match(widget, /'expired-callback'/);
    assert.match(widget, /'error-callback'/);
    assert.match(widget, /\.reset\(/);
    assert.match(widget, /\.remove\(/);
  });
});
