import { AnswersListPage } from '@/components/blocks/answers-list-page';
import answersData from '@/data/answers-women.json';
import type { Answer } from '@/lib/gameEngine';
import { gameJsonLd, itemListJsonLd } from '@/lib/game-schema';
import { seo } from '@/lib/seo';
import { createFileRoute } from '@tanstack/react-router';

const answers = answersData as Answer[];
const title = '100 Famous Women List – Name 100 Women Answers & Aliases';
const description =
  'Browse the full 100 famous women list used by the Name 100 Women Challenge. 500+ accepted answers by category, with aliases for each name.';

export const Route = createFileRoute('/(pages)/answers')({
  head: () => ({
    ...seo('/answers', { title, description }),
    scripts: [
      gameJsonLd({
        path: '/answers',
        name: '100 Famous Women List',
        description,
        breadcrumb: '100 Famous Women List',
      }),
      itemListJsonLd({
        name: 'Full list of accepted answers for Name 100 Women',
        items: answers.map((answer) => answer.name),
      }),
    ],
  }),
  component: AnswersPage,
});

function AnswersPage() {
  return <AnswersListPage answers={answers} variant="women" />;
}
