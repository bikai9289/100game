import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('TimerTool source', () => {
  it('uses a completed state instead of restarting from zero with Start', () => {
    const timer = readFileSync('src/components/game/timer-tool.tsx', 'utf8');

    assert.match(
      timer,
      /type TimerStatus = 'idle' \| 'running' \| 'paused' \| 'completed'/
    );
    assert.match(timer, /status === 'completed'/);
    assert.match(timer, /Restart timer/);
    assert.doesNotMatch(timer, /setIsRunning\(\(current\) => !current\)/);
  });
});
