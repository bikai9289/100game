import { MoreChallenges } from '@/components/blocks/more-challenges';
import Container from '@/components/layout/container';
import { gameJsonLd } from '@/lib/game-schema';
import { seo } from '@/lib/seo';
import { createFileRoute, Link } from '@tanstack/react-router';

const title = 'Name 100 Women Rules – How the 12-Minute Challenge Works';
const description =
  'Learn the Name 100 Women Challenge rules: what names count, how scoring works, when the timer starts, and how aliases are accepted.';

export const Route = createFileRoute('/(pages)/rules')({
  head: () => ({
    ...seo('/rules', { title, description }),
    scripts: [
      gameJsonLd({
        path: '/rules',
        name: 'Name 100 Women Rules',
        description,
        breadcrumb: 'Name 100 Women Rules',
      }),
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b">
        <Container className="px-4 py-12">
          <article className="mx-auto max-w-3xl space-y-5 text-base leading-7 text-muted-foreground">
            <h1 className="text-balance text-4xl font-bold tracking-normal text-foreground sm:text-5xl">
              Name 100 Women Challenge Rules
            </h1>
            <p>
              These are the official rules for the free Name 100 Women Challenge
              on this site. The game is a 12-minute naming quiz. You type famous
              women, the page checks each guess against a curated answer
              library, and your score is the number of unique accepted names
              before time runs out.
            </p>
            <h2 className="pt-4 text-2xl font-bold text-foreground">
              Goal and timer
            </h2>
            <p>
              The goal is 100 accepted names. The clock lasts 12 minutes and
              starts on your first accepted guess. Empty submits and rejected
              names before that first hit do not start the timer. Reaching 100
              ends the round early. If the timer hits zero first, the run stops
              at your current score.
            </p>
            <h2 className="pt-4 text-2xl font-bold text-foreground">
              What names count
            </h2>
            <p>
              A name counts only if it is in the curated library used by this
              site. That library covers actresses, musicians, athletes,
              scientists, politicians, historical figures, business leaders,
              activists, writers, and other public figures. First and last names
              are the safest input. Unambiguous stage names and listed aliases
              also count. Repeating the same person does not add another point.
            </p>
            <p>
              The matcher runs in your browser. It is not a live Wikidata
              search. A one-letter spelling slip can still match the intended
              person. If a guess is not in the list, the game says so and you
              keep going. The miss does not reduce your score.
            </p>
            <h2 className="pt-4 text-2xl font-bold text-foreground">
              How to keep scoring
            </h2>
            <p>
              Most failed rounds look the same: a fast burst of actresses and
              musicians, then a long pause. The clock rewards rotation. After
              five or six entertainment names, switch to athletes, then
              scientists, then leaders, then history. Country groups help: one
              national team or one cabinet can unlock several answers in a row.
              If a name is not accepted, do not argue with the box. Type the
              next person.
            </p>
            <p>
              Practice modes exist so you can train one weak lane without
              spending a full 12 minutes. Category pages use a five-minute timer
              and a target of 30. The daily challenge gives everyone the same
              three categories for a UTC day. The timer tool is for shared
              sprints with no scoring library at all.
            </p>
            <h2 className="pt-4 text-2xl font-bold text-foreground">
              Progress, devices, and sharing
            </h2>
            <p>
              Progress is stored locally in this browser. Refreshing the page
              should not erase a good run. A different phone or a private window
              starts clean. There is no account and no paywall. When the round
              ends you can play again or share the score.
            </p>
            <p>
              The same rules apply to category practice and the daily challenge,
              except those modes use a five-minute timer and a target of 30
              names. The{' '}
              <Link
                to="/men/rules"
                className="font-semibold text-primary hover:underline"
              >
                Name 100 Men rules
              </Link>{' '}
              follow the same scoring model with a separate answer list. Ready
              to play? Open the{' '}
              <Link
                to="/"
                className="font-semibold text-primary hover:underline"
              >
                Name 100 Women Challenge
              </Link>
              .
            </p>
          </article>
        </Container>
      </section>
      <MoreChallenges currentPage="rules" />
    </div>
  );
}
