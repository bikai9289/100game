import womenAnswers from '@/data/answers-women.json';
import type { Answer } from '@/lib/gameEngine';

export const categoryOrder = [
  'actresses',
  'musicians',
  'athletes',
  'scientists',
  'politicians',
  'historical',
  'business',
  'activists',
  'other',
] as const;

export type CategorySlug = (typeof categoryOrder)[number];

export const categoryMeta: Record<
  CategorySlug,
  {
    title: string;
    shortTitle: string;
    description: string;
    practiceTips: string;
  }
> = {
  actresses: {
    title: 'Actresses',
    shortTitle: 'Actresses',
    description:
      'Movie stars, television performers, stage icons, award winners, and internationally known screen legends.',
    practiceTips:
      'Start with Hollywood stars, then move to British television, classic cinema, international film festivals, and actresses who crossed into music or activism.',
  },
  musicians: {
    title: 'Musicians',
    shortTitle: 'Musicians',
    description:
      'Singers, songwriters, composers, pop stars, opera legends, instrumentalists, and music-industry icons.',
    practiceTips:
      'Move by decade and genre: pop, rock, country, hip-hop, classical, jazz, and global music scenes all help unlock more names.',
  },
  athletes: {
    title: 'Athletes',
    shortTitle: 'Athletes',
    description:
      'Olympians, tennis champions, soccer stars, runners, swimmers, gymnasts, fighters, and record-breaking competitors.',
    practiceTips:
      'Think sport by sport: tennis, soccer, basketball, track, swimming, gymnastics, combat sports, and Olympic history.',
  },
  scientists: {
    title: 'Scientists',
    shortTitle: 'Scientists',
    description:
      'Researchers, inventors, astronauts, mathematicians, doctors, engineers, and Nobel Prize winners.',
    practiceTips:
      'Group names by field: physics, chemistry, medicine, computing, space, environmental science, mathematics, and engineering.',
  },
  politicians: {
    title: 'Politicians',
    shortTitle: 'Politicians',
    description:
      'Presidents, prime ministers, ministers, diplomats, judges, first ladies, and public leaders.',
    practiceTips:
      'Think by country and role: heads of government, campaign leaders, cabinet members, diplomats, and modern public figures.',
  },
  historical: {
    title: 'Historical Figures',
    shortTitle: 'Historical',
    description:
      'Queens, activists, writers, pioneers, reformers, rulers, military figures, and women remembered across history.',
    practiceTips:
      'Move through eras: ancient history, medieval rulers, revolutions, suffrage, civil rights, exploration, and cultural movements.',
  },
  business: {
    title: 'Business Leaders',
    shortTitle: 'Business',
    description:
      'Founders, CEOs, entrepreneurs, investors, media moguls, designers, and influential executives.',
    practiceTips:
      'Start with tech and media founders, then move into fashion, finance, retail, publishing, beauty, and global business families.',
  },
  activists: {
    title: 'Activists',
    shortTitle: 'Activists',
    description:
      'Campaigners, organizers, human-rights leaders, environmental voices, educators, and reformers.',
    practiceTips:
      'Think by movement: civil rights, climate, education, labor, anti-war activism, suffrage, and human-rights campaigns.',
  },
  other: {
    title: 'Writers & More',
    shortTitle: 'Writers & More',
    description:
      'Authors, media personalities, cultural figures, chefs, artists, designers, broadcasters, and names that cross categories.',
    practiceTips:
      'Use this as the wild-card round: authors, journalists, TV hosts, artists, chefs, fashion figures, and internet-era names all count.',
  },
};

export const womenAnswerList = womenAnswers as Answer[];

export function getAnswersByCategory(slug: CategorySlug) {
  return womenAnswerList.filter((answer) => answer.category === slug);
}

export function getCategoryStats() {
  return categoryOrder.map((slug) => ({
    slug,
    count: getAnswersByCategory(slug).length,
    ...categoryMeta[slug],
  }));
}

export function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getDailyCategories(todayKey = getTodayKey()) {
  let seed = 0;
  for (const char of todayKey) {
    seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  }

  const pool = [...categoryOrder];
  const selected: CategorySlug[] = [];

  while (selected.length < 3) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const index = seed % pool.length;
    const [slug] = pool.splice(index, 1);
    if (slug) selected.push(slug);
  }

  return selected;
}

export function getDailyAnswers(todayKey = getTodayKey()) {
  const selected = getDailyCategories(todayKey);
  const selectedSet = new Set<string>(selected);

  return womenAnswerList.filter((answer) => selectedSet.has(answer.category));
}
