import { AnswersListPage } from '@/components/blocks/answers-list-page';
import menAnswersData from '@/data/answers-men.json';
import type { Answer } from '@/lib/gameEngine';
import { gameJsonLd, itemListJsonLd } from '@/lib/game-schema';
import { seo } from '@/lib/seo';
import { getImageUrl } from '@/lib/urls';
import { createFileRoute } from '@tanstack/react-router';

const answers = menAnswersData as Answer[];
const title = '100 Famous Men List – Name 100 Men Answers & Aliases';
const description =
  'Browse the full 100 famous men list used by the Name 100 Men Challenge. 500+ accepted answers by category, with aliases for each name.';

export const Route = createFileRoute('/(pages)/men/answers')({
  head: () => ({
    ...seo('/men/answers', {
      title,
      description,
      image: getImageUrl('/og-image-men.png'),
    }),
    scripts: [
      gameJsonLd({
        path: '/men/answers',
        name: '100 Famous Men List',
        description,
        breadcrumb: '100 Famous Men List',
      }),
      itemListJsonLd({
        name: 'Full list of accepted answers for Name 100 Men',
        items: answers.map((answer) => answer.name),
      }),
    ],
  }),
  component: MenAnswersPage,
});

function MenAnswersPage() {
  return <AnswersListPage answers={answers} variant="men" />;
}
