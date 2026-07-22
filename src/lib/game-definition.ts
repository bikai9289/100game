import menAnswersData from '@/data/answers-men.json';
import womenAnswersData from '@/data/answers-women.json';
import {
  categoryOrder,
  getAnswersByCategory,
  getDailyAnswers,
  type CategorySlug,
} from '@/lib/name100-data';
import type { Answer } from './gameEngine';

const womenAnswers = womenAnswersData as Answer[];
const menAnswers = menAnswersData as Answer[];

export type GameDefinition = {
  answers: Answer[];
  durationSeconds: number;
  targetScore: number;
};

export function getGameDefinition(gameId: string): GameDefinition | null {
  if (gameId === 'women') {
    return { answers: womenAnswers, durationSeconds: 720, targetScore: 100 };
  }

  if (gameId === 'men') {
    return { answers: menAnswers, durationSeconds: 720, targetScore: 100 };
  }

  if (gameId.startsWith('daily:')) {
    const date = gameId.slice('daily:'.length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

    return {
      answers: getDailyAnswers(date),
      durationSeconds: 300,
      targetScore: 30,
    };
  }

  if (gameId.startsWith('category:')) {
    const slug = gameId.slice('category:'.length);
    if (!(categoryOrder as readonly string[]).includes(slug)) return null;

    return {
      answers: getAnswersByCategory(slug as CategorySlug),
      durationSeconds: 300,
      targetScore: 30,
    };
  }

  return null;
}
