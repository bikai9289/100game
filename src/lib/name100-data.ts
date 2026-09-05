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
    listIntro: string;
  }
> = {
  actresses: {
    title: 'Actresses',
    shortTitle: 'Actresses',
    description:
      'Movie stars, television performers, stage icons, award winners, and internationally known screen legends.',
    practiceTips:
      'Start with Hollywood stars, then move to British television, classic cinema, international film festivals, and actresses who crossed into music or activism.',
    listIntro:
      'Players usually start here and still miss names they know well. After the first blockbuster stars, memory jumps around. Work in clusters: current awards, classic Hollywood, British television, international cinema, then actresses who later became directors or activists. First and last names are safest, but a few globally known stage names are accepted too.',
  },
  musicians: {
    title: 'Musicians',
    shortTitle: 'Musicians',
    description:
      'Singers, songwriters, composers, pop stars, opera legends, instrumentalists, and music-industry icons.',
    practiceTips:
      'Move by decade and genre: pop, rock, country, hip-hop, classical, jazz, and global music scenes all help unlock more names.',
    listIntro:
      'Music is one of the fastest scoring lanes if you rotate genres instead of staying in one decade. After pop and hip-hop, switch to country, rock, jazz, opera, and composers. Many players forget instrumentalists and classical names even when those answers are easy to type. Use this list after a round to see which genres you skipped.',
  },
  athletes: {
    title: 'Athletes',
    shortTitle: 'Athletes',
    description:
      'Olympians, tennis champions, soccer stars, runners, swimmers, gymnasts, fighters, and record-breaking competitors.',
    practiceTips:
      'Think sport by sport: tennis, soccer, basketball, track, swimming, gymnastics, combat sports, and Olympic history.',
    listIntro:
      'Sports memory is strong until the first sport dries up. Tennis and soccer come quickly; swimming, gymnastics, track, combat sports, and Olympic history are where scores stall. Scan one sport at a time, then move on. Country teams also help: a national team can unlock several athletes in a row.',
  },
  scientists: {
    title: 'Scientists',
    shortTitle: 'Scientists',
    description:
      'Researchers, inventors, astronauts, mathematicians, doctors, engineers, and Nobel Prize winners.',
    practiceTips:
      'Group names by field: physics, chemistry, medicine, computing, space, environmental science, mathematics, and engineering.',
    listIntro:
      'Science is the category most players under-use. The names are famous, but they sit in a different mental list from celebrities. Group by field: physics, chemistry, medicine, computing, space, and mathematics. Nobel winners, astronauts, and inventors are especially easy to forget under a 12-minute clock. Practice this page twice if your full-game score stalls in the 40s.',
  },
  politicians: {
    title: 'Politicians',
    shortTitle: 'Politicians',
    description:
      'Presidents, prime ministers, ministers, diplomats, judges, first ladies, and public leaders.',
    practiceTips:
      'Think by country and role: heads of government, campaign leaders, cabinet members, diplomats, and modern public figures.',
    listIntro:
      'Political names unlock quickly when you travel country by country. Heads of government, first ladies, diplomats, and campaign leaders all count when they are in the curated list. Players often stay in one country too long. After two or three familiar names, jump to another region instead of forcing a blank.',
  },
  historical: {
    title: 'Historical Figures',
    shortTitle: 'Historical',
    description:
      'Queens, activists, writers, pioneers, reformers, rulers, military figures, and women remembered across history.',
    practiceTips:
      'Move through eras: ancient history, medieval rulers, revolutions, suffrage, civil rights, exploration, and cultural movements.',
    listIntro:
      'Historical figures are easy to name in a trivia night and easy to forget in a speed game. Move by era: ancient rulers, medieval queens, revolutions, suffrage, civil rights, and exploration. Many of these names are short and type quickly, so this category is valuable late in a round when you need momentum more than novelty.',
  },
  business: {
    title: 'Business Leaders',
    shortTitle: 'Business',
    description:
      'Founders, CEOs, entrepreneurs, investors, media moguls, designers, and influential executives.',
    practiceTips:
      'Start with tech and media founders, then move into fashion, finance, retail, publishing, beauty, and global business families.',
    listIntro:
      'Business names sit just outside everyday celebrity memory. Start with tech and media founders, then move into fashion, finance, retail, publishing, and beauty. Designers and executives are often accepted even when players assume only entertainers count. If your score plateaus, this list is usually the unused lane.',
  },
  activists: {
    title: 'Activists',
    shortTitle: 'Activists',
    description:
      'Campaigners, organizers, human-rights leaders, environmental voices, educators, and reformers.',
    practiceTips:
      'Think by movement: civil rights, climate, education, labor, anti-war activism, suffrage, and human-rights campaigns.',
    listIntro:
      'Activists overlap with history and politics, which is why players skip them. Think by movement: civil rights, climate, education, labor, suffrage, and human rights. Many of these names also appear in textbooks, so they are easier than they feel during a timed round. Use the aliases if a person is widely known by a shorter form.',
  },
  other: {
    title: 'Writers & More',
    shortTitle: 'Writers & More',
    description:
      'Authors, media personalities, cultural figures, chefs, artists, designers, broadcasters, and names that cross categories.',
    practiceTips:
      'Use this as the wild-card round: authors, journalists, TV hosts, artists, chefs, fashion figures, and internet-era names all count.',
    listIntro:
      'This is the wild-card list: authors, journalists, TV hosts, artists, chefs, designers, and cultural figures who do not sit cleanly in one field. It is also where players pick up late points after music and film dry up. Read it after a lost round, then replay while those clusters are still warm.',
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
