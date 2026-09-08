import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shareChallenge, shouldPreferNativeShare } from './share';

describe('shareChallenge', () => {
  it('copies an invitation instead of bragging for zero and low scores', async () => {
    const clipboardWrites: string[] = [];

    for (const score of [0, 9]) {
      await shareChallenge({
        score,
        targetScore: 100,
        href: 'https://name100challenge.com/',
        shareNavigator: {
          clipboard: {
            writeText: async (text) => {
              clipboardWrites.push(text);
            },
          },
        },
        onMessage: () => {},
      });
    }

    assert.deepEqual(clipboardWrites, [
      'Can you name 100 famous women in 12 minutes? Try the Name 100 Challenge: https://name100challenge.com/',
      'Can you name 100 famous women in 12 minutes? Try the Name 100 Challenge: https://name100challenge.com/',
    ]);
  });

  it('builds invitations from the active game mode and duration', async () => {
    const clipboardWrites: string[] = [];

    await shareChallenge({
      score: 0,
      targetScore: 100,
      durationSeconds: 720,
      subjectLabel: 'famous men',
      challengeTitle: 'Name 100 Men Challenge',
      href: 'https://name100challenge.com/men',
      shareNavigator: {
        clipboard: {
          writeText: async (text) => {
            clipboardWrites.push(text);
          },
        },
      },
      onMessage: () => {},
    });
    await shareChallenge({
      score: 0,
      targetScore: 30,
      durationSeconds: 300,
      subjectLabel: 'famous women',
      challengeTitle: "today's Name 100 Daily Challenge",
      href: 'https://name100challenge.com/challenge',
      shareNavigator: {
        clipboard: {
          writeText: async (text) => {
            clipboardWrites.push(text);
          },
        },
      },
      onMessage: () => {},
    });

    assert.deepEqual(clipboardWrites, [
      'Can you name 100 famous men in 12 minutes? Try the Name 100 Men Challenge: https://name100challenge.com/men',
      "Can you name 30 famous women in 5 minutes? Try today's Name 100 Daily Challenge: https://name100challenge.com/challenge",
    ]);
  });

  it('always includes score text for a finished score share', async () => {
    const clipboardWrites: string[] = [];

    await shareChallenge({
      score: 1,
      targetScore: 30,
      durationSeconds: 300,
      challengeTitle: "today's Name 100 Daily Challenge",
      href: 'https://name100challenge.com/challenge',
      resultMode: 'score',
      shareNavigator: {
        clipboard: {
          writeText: async (text) => {
            clipboardWrites.push(text);
          },
        },
      },
      onMessage: () => {},
    });

    assert.deepEqual(clipboardWrites, [
      "I named 1 of 30 in today's Name 100 Daily Challenge. Can you beat me? https://name100challenge.com/challenge",
    ]);
  });

  it('brags with the score once the score is high enough', async () => {
    const shareCalls: unknown[] = [];

    await shareChallenge({
      score: 10,
      targetScore: 100,
      href: 'https://name100challenge.com/',
      shareNavigator: {
        share: async (payload) => {
          shareCalls.push(payload);
        },
      },
      preferNativeShare: true,
      onMessage: () => {},
    });

    assert.deepEqual(shareCalls, [
      {
        title: 'Name 100 Challenge',
        text: 'I named 10 of 100 in the Name 100 Challenge. Can you beat me?',
        url: 'https://name100challenge.com/',
      },
    ]);
  });

  it('copies by default even when the Web Share API exists', async () => {
    const shareCalls: unknown[] = [];
    const clipboardWrites: string[] = [];
    const messages: string[] = [];

    await shareChallenge({
      score: 17,
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

    assert.deepEqual(shareCalls, []);
    assert.deepEqual(clipboardWrites, [
      'I named 17 of 100 in the Name 100 Challenge. Can you beat me? https://name100challenge.com/',
    ]);
    assert.deepEqual(messages, ['Challenge link copied.']);
  });

  it('uses the Web Share API when native sharing is preferred', async () => {
    const shareCalls: unknown[] = [];
    const clipboardWrites: string[] = [];
    const messages: string[] = [];

    await shareChallenge({
      score: 17,
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
      preferNativeShare: true,
      onMessage: (message) => messages.push(message),
    });

    assert.deepEqual(shareCalls, [
      {
        title: 'Name 100 Challenge',
        text: 'I named 17 of 100 in the Name 100 Challenge. Can you beat me?',
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
      score: 14,
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
      'I named 14 of 100 in the Name 100 Challenge. Can you beat me? https://name100challenge.com/',
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
      preferNativeShare: true,
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
      preferNativeShare: true,
      onMessage: (message) => messages.push(message),
    });

    assert.deepEqual(clipboardWrites, []);
    assert.deepEqual(messages, []);
  });
});

describe('shouldPreferNativeShare', () => {
  it('does not prefer native sharing on desktop pointer devices', () => {
    assert.equal(
      shouldPreferNativeShare({
        coarsePointer: false,
        maxTouchPoints: 0,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0',
      }),
      false
    );
  });

  it('prefers native sharing for mobile and coarse pointer devices', () => {
    assert.equal(
      shouldPreferNativeShare({
        coarsePointer: false,
        maxTouchPoints: 0,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
      }),
      true
    );
    assert.equal(
      shouldPreferNativeShare({
        coarsePointer: true,
        maxTouchPoints: 0,
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0.0.0',
      }),
      true
    );
  });
});
