import assert from 'node:assert/strict';
import { test } from 'node:test';
import women from '../data/answers-women.json';
import { checkAnswer, initGame, submitAnswer } from './gameEngine';
import { shareChallenge } from './share';

test('September playtest names and Chinese aliases resolve without duplicate scoring', () => {
  for (const name of [
    'Chappell Roan',
    'Charli XCX',
    'Caitlin Clark',
    'Alexia Putellas',
    'Zheng Qinwen',
    'Sun Yingsha',
    'Jenna Ortega',
    'Sydney Sweeney',
    'Angela Merkel',
    'Jacinda Ardern',
    '郑钦文',
    '孙颖莎',
  ]) {
    assert.ok(checkAnswer(name, women), name);
  }
  const first = submitAnswer('Zheng Qinwen', initGame(women), women);
  assert.equal(submitAnswer('郑钦文', first.newState, women).newState.score, 1);
  assert.equal(checkAnswer('郑钦', women), null);
});

test('daily score sharing includes frozen elapsed time, date and categories', async () => {
  let copied = '';
  await shareChallenge({
    score: 30,
    targetScore: 30,
    resultMode: 'score',
    elapsedSeconds: 78,
    challengeDate: '2026-09-09',
    categoryNames: ['Politicians', 'Writers & More'],
    href: 'https://name100challenge.com/daily',
    shareNavigator: {
      clipboard: {
        writeText: async (text) => {
          copied = text;
        },
      },
    },
    onMessage: () => {},
  });
  for (const value of ['01:18', '2026-09-09', 'Politicians', 'Writers & More'])
    assert.ok(copied.includes(value), value);
});
