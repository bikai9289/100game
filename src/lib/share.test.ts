import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shareChallenge } from './share';

describe('shareChallenge', () => {
  it('uses the Web Share API when it succeeds', async () => {
    const shareCalls: unknown[] = [];
    const clipboardWrites: string[] = [];
    const messages: string[] = [];

    await shareChallenge({
      score: 7,
      targetScore: 100,
      href: 'https://name100challenge.com/',
      shareNavigator: {
        share: async (payload) => {
          shareCalls.push(payload);
        },
        clipboard: {
          writeText: async (text) => {
            clipboardWrites.push(text);
          },
        },
      },
      onMessage: (message) => messages.push(message),
    });

    assert.deepEqual(shareCalls, [
      {
        title: 'Name 100 Challenge',
        text: 'I named 7 of 100 in the Name 100 Challenge. Can you beat me?',
        url: 'https://name100challenge.com/',
      },
    ]);
    assert.deepEqual(clipboardWrites, []);
    assert.deepEqual(messages, []);
  });

  it('copies the challenge link when Web Share is unavailable', async () => {
    const clipboardWrites: string[] = [];
    const messages: string[] = [];

    await shareChallenge({
      score: 4,
      targetScore: 100,
      href: 'https://name100challenge.com/',
      shareNavigator: {
        clipboard: {
          writeText: async (text) => {
            clipboardWrites.push(text);
          },
        },
      },
      onMessage: (message) => messages.push(message),
    });

    assert.deepEqual(clipboardWrites, [
      'I named 4 of 100 in the Name 100 Challenge. Can you beat me? https://name100challenge.com/',
    ]);
    assert.deepEqual(messages, ['Challenge link copied.']);
  });

  it('falls back to copying when Web Share fails without user cancellation', async () => {
    const clipboardWrites: string[] = [];
    const messages: string[] = [];

    await shareChallenge({
      score: 12,
      targetScore: 100,
      href: 'https://name100challenge.com/',
      shareNavigator: {
        share: async () => {
          throw new DOMException('Share target failed', 'NotAllowedError');
        },
        clipboard: {
          writeText: async (text) => {
            clipboardWrites.push(text);
          },
        },
      },
      onMessage: (message) => messages.push(message),
    });

    assert.deepEqual(clipboardWrites, [
      'I named 12 of 100 in the Name 100 Challenge. Can you beat me? https://name100challenge.com/',
    ]);
    assert.deepEqual(messages, ['Challenge link copied.']);
  });

  it('does not copy when the user cancels native sharing', async () => {
    const clipboardWrites: string[] = [];
    const messages: string[] = [];

    await shareChallenge({
      score: 12,
      targetScore: 100,
      href: 'https://name100challenge.com/',
      shareNavigator: {
        share: async () => {
          throw new DOMException('Share cancelled', 'AbortError');
        },
        clipboard: {
          writeText: async (text) => {
            clipboardWrites.push(text);
          },
        },
      },
      onMessage: (message) => messages.push(message),
    });

    assert.deepEqual(clipboardWrites, []);
    assert.deepEqual(messages, []);
  });
});
