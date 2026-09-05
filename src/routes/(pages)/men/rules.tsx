import { MoreChallenges } from '@/components/blocks/more-challenges';
import Container from '@/components/layout/container';
import { gameJsonLd } from '@/lib/game-schema';
import { seo } from '@/lib/seo';
import { getImageUrl } from '@/lib/urls';
import { createFileRoute, Link } from '@tanstack/react-router';

const title = 'Name 100 Men Rules – How the 12-Minute Challenge Works';
const description =
  'Learn the Name 100 Men Challenge rules: what names count, how scoring works, when the timer starts, and how aliases are accepted.';

export const Route = createFileRoute('/(pages)/men/rules')({
  head: () => ({
    ...seo('/men/rules', {
      title,
      description,
      image: getImageUrl('/og-image-men.png'),
    }),
    scripts: [
      gameJsonLd({
        path: '/men/rules',
        name: 'Name 100 Men Rules',
        description,
        breadcrumb: 'Name 100 Men Rules',
      }),
    ],
  }),
  component: MenRulesPage,
});

function MenRulesPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b">
        <Container className="px-4 py-12">
          <article className="mx-auto max-w-3xl space-y-5 text-base leading-7 text-muted-foreground">
            <h1 className="text-balance text-4xl font-bold tracking-normal text-foreground sm:text-5xl">
              Name 100 Men Challenge Rules
            </h1>
            <p>
              These rules cover the men&apos;s 12-minute game. The format
              matches the women&apos;s challenge, but the answer library, saved
              progress, and this page are separate. You type famous men, the
              page checks each guess locally, and your score is the number of
              unique accepted names before time runs out.
            </p>
            <h2 className="pt-4 text-2xl font-bold text-foreground">
              Goal and timer
            </h2>
            <p>
              Name 100 famous men in 12 minutes. The timer starts on the first
              accepted guess. Reaching 100 ends the round early. If the clock
              hits zero first, the run stops at your current score. Rejected
              names never lower that score.
            </p>
            <h2 className="pt-4 text-2xl font-bold text-foreground">
              What names count
            </h2>
            <p>
              A name counts only if it is in the curated men&apos;s library:
              actors, musicians, athletes, scientists, leaders, historical
              figures, founders, activists, writers, and other public figures.
              First and last names are safest. Listed aliases and a one-letter
              spelling slip can still count. The same person cannot be scored
              twice.
            </p>
            <p>
              This is not a live Wikidata quiz. The library is fixed so a replay
              on the same device stays consistent. If you want to study after a
              round, use the{' '}
              <Link
                to="/men/answers"
                className="font-semibold text-primary hover:underline"
              >
                100 famous men list
              </Link>
              .
            </p>
            <h2 className="pt-4 text-2xl font-bold text-foreground">
              How to keep scoring
            </h2>
            <p>
              Start with actors, musicians, and athletes you can type fast.
              Leave that first burst before it stalls, then move through
              scientists, inventors, political leaders, founders, writers, and
              historical figures. Country clusters work especially well for
              heads of government and national teams. A rejected name is not a
              penalty. Keep moving.
            </p>
            <p>
              This page is the long-form rules companion to the men&apos;s game.
              The playable challenge stays on{' '}
              <Link
                to="/men"
                className="font-semibold text-primary hover:underline"
              >
                Name 100 Men Challenge
              </Link>
              . Use this article when you want the scoring details without the
              input box in the way.
            </p>
            <h2 className="pt-4 text-2xl font-bold text-foreground">
              Progress and the other challenge
            </h2>
            <p>
              Progress stays in this browser under a men-only key. Playing the
              home-page women&apos;s game will not overwrite a men&apos;s run.
              There is no account and no paywall. For the matching women&apos;s
              rules, see{' '}
              <Link
                to="/rules"
                className="font-semibold text-primary hover:underline"
              >
                Name 100 Women rules
              </Link>
              , then play the{' '}
              <Link
                to="/men"
                className="font-semibold text-primary hover:underline"
              >
                Name 100 Men Challenge
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
