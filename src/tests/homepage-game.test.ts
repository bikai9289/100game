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
    assert.match(route, /Free 12-Minute Game/);
    assert.match(route, /name 100 famous women/);
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

  it('starts the round only after the first accepted guess', () => {
    const game = readFileSync('src/components/game/name100-game.tsx', 'utf8');
    const submitGuess = game.slice(
      game.indexOf('function submitGuess'),
      game.indexOf('function handleSubmit')
    );
    const trimIndex = submitGuess.indexOf('value.trim()');
    const emptyGuardIndex = submitGuess.indexOf('if (!guess)');
    const startIndex = submitGuess.indexOf(
      'if (result.isCorrect && !isStartedRef.current)'
    );
    const sessionIndex = submitGuess.indexOf('requestGameSession(now)');
    const answerIndex = submitGuess.indexOf('submitAnswer(');

    assert.ok(trimIndex >= 0);
    assert.ok(emptyGuardIndex > trimIndex);
    assert.ok(answerIndex > emptyGuardIndex);
    assert.ok(startIndex > answerIndex);
    assert.ok(sessionIndex > startIndex);
    assert.match(
      submitGuess.slice(startIndex, sessionIndex),
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

  it('shows a labeled share button throughout the round', () => {
    const game = readFileSync('src/components/game/name100-game.tsx', 'utf8');
    const renderedGame = game.slice(game.lastIndexOf('  return ('));
    const shareButtonIndex = renderedGame.indexOf(
      'aria-label="Share challenge"'
    );
    const shareButton = renderedGame.slice(
      shareButtonIndex,
      shareButtonIndex + 240
    );

    assert.ok(shareButtonIndex >= 0);
    assert.match(shareButton, /<IconShare \/>\s*Share/);
    assert.doesNotMatch(shareButton, /size="icon"/);
  });

  it('keeps the score on one line beside the labeled share button', () => {
    const game = readFileSync('src/components/game/name100-game.tsx', 'utf8');
    const renderedGame = game.slice(game.lastIndexOf('  return ('));

    assert.match(renderedGame, /grid-cols-2/);
    assert.match(
      renderedGame,
      /min-\[360px\]:grid-cols-\[auto_auto_auto_auto\]/
    );
    assert.match(
      renderedGame,
      /font-mono[^"']*whitespace-nowrap[^"']*text-primary/
    );
  });

  it('keeps comments and leaderboard visible before a round is completed', () => {
    const game = readFileSync('src/components/game/name100-game.tsx', 'utf8');
    const renderedGame = game.slice(game.lastIndexOf('  return ('));
    const communityIndex = renderedGame.indexOf('Community Wall');
    const answersIndex = renderedGame.indexOf('answerSlots.map');

    assert.doesNotMatch(renderedGame, /Player notes/);
    assert.ok(communityIndex >= 0);
    assert.ok(answersIndex >= 0);
    assert.ok(communityIndex > answersIndex);
    assert.doesNotMatch(
      renderedGame,
      /\{gameState\.isGameOver \? \(\s*<>\s*<Card[\s\S]*?Leaderboard/
    );
    assert.doesNotMatch(
      renderedGame,
      /gameState\.isGameOver && communitySubmissionConfigured/
    );
    assert.doesNotMatch(game, /if \(!gameState\.isGameOver\) return;/);
    assert.match(
      game,
      /useEffect\(\(\) => \{\s*void loadCommunity\(\);\s*\}, \[loadCommunity\]\);/
    );
    assert.match(
      renderedGame,
      /onSubmit=\{\(event\) => void submitComment\(event\)\}/
    );
    assert.match(renderedGame, /Posting is temporarily unavailable\./);
  });

  it('shows the final score before the answer grid on small screens', () => {
    const game = readFileSync('src/components/game/name100-game.tsx', 'utf8');

    assert.match(game, /order-3[^"']*lg:order-none[\s\S]*answerSlots\.map/);
    assert.match(game, /order-2[^"']*lg:order-none[\s\S]*Final score:/);
  });

  it('offers a recovery path after a rejected guess', () => {
    const game = readFileSync('src/components/game/name100-game.tsx', 'utf8');

    assert.match(game, /lastRejectedGuess/);
    assert.match(game, /Report a missing answer/);
    assert.match(game, /to="\/contact"/);
  });
});
