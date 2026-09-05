import { MoreChallenges } from '@/components/blocks/more-challenges';
import Container from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import type { Answer } from '@/lib/gameEngine';
import {
  categoryMeta,
  categoryOrder,
  type CategorySlug,
} from '@/lib/name100-data';
import { Link } from '@tanstack/react-router';

export function AnswersListPage({
  answers,
  variant,
}: {
  answers: Answer[];
  variant: 'women' | 'men';
}) {
  const groupedAnswers = categoryOrder.map((slug) => ({
    slug,
    meta: categoryMeta[slug],
    answers: answers
      .filter((answer) => answer.category === slug)
      .toSorted((a, b) => a.name.localeCompare(b.name)),
  }));
  const isWomen = variant === 'women';
  const playTo = isWomen ? '/' : '/men';
  const playLabel = isWomen
    ? 'Name 100 Women Challenge'
    : 'Name 100 Men Challenge';

  return (
    <div className="flex flex-col">
      <section className="border-b">
        <Container className="px-4 py-12">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="destructive">Spoiler warning</Badge>
            <h1 className="mt-4 text-balance text-4xl font-bold tracking-normal sm:text-5xl">
              {isWomen ? '100 Famous Women List' : '100 Famous Men List'}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Play first, then come back. This page lists the accepted answers
              and aliases for the {playLabel}. Use it as a study list, not as
              the first thing you open.
            </p>
            <p className="mt-6">
              <Link
                to={playTo}
                className="inline-flex rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
              >
                Play now
              </Link>
            </p>
          </div>

          <nav
            aria-label="Answer categories"
            className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2"
          >
            {groupedAnswers.map((group) => (
              <a
                key={group.slug}
                href={`#${group.slug}`}
                className="rounded-full border px-3 py-1 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                {group.meta.shortTitle}
              </a>
            ))}
          </nav>
        </Container>
      </section>

      <section className="border-b bg-muted/30">
        <Container className="px-4 py-10">
          <div className="mx-auto max-w-5xl space-y-10">
            {groupedAnswers.map((group) => (
              <CategoryAnswers
                key={group.slug}
                slug={group.slug}
                title={group.meta.title}
                intro={
                  isWomen
                    ? group.meta.listIntro
                    : menListIntro(group.slug, group.meta.listIntro)
                }
                answers={group.answers}
              />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b">
        <Container className="px-4 py-12">
          <article className="mx-auto max-w-3xl space-y-5 text-base leading-7 text-muted-foreground">
            <h2 className="text-3xl font-bold tracking-normal text-foreground">
              How to Use the Answer List
            </h2>
            <p>
              The answer list is best used after you have played at least one
              round. Read through one category at a time, notice which names you
              forgot, then{' '}
              <Link
                to={playTo}
                className="font-semibold text-primary hover:underline"
              >
                play the {playLabel}
              </Link>{' '}
              again while those memory paths are still warm. The goal is not to
              memorize the page in order; it is to build stronger category
              clusters so you can move faster under the 12-minute timer.
            </p>
            <p>
              Aliases show common inputs that the game accepts. Some people are
              widely recognized by a last name, stage name, or shorter variant.
              First and last names are still the safest strategy, but aliases
              make the game feel fair when a person is globally known by a
              simpler form. You can also{' '}
              {isWomen ? (
                <Link
                  to="/categories"
                  className="font-semibold text-primary hover:underline"
                >
                  practice by category
                </Link>
              ) : (
                <Link
                  to="/men/rules"
                  className="font-semibold text-primary hover:underline"
                >
                  read the men&apos;s rules
                </Link>
              )}{' '}
              before starting another full round.
            </p>
          </article>
        </Container>
      </section>

      <MoreChallenges currentPage={isWomen ? 'answers' : 'men-answers'} />
    </div>
  );
}

function CategoryAnswers({
  slug,
  title,
  intro,
  answers,
}: {
  slug: string;
  title: string;
  intro: string;
  answers: Answer[];
}) {
  return (
    <section id={slug}>
      <h2 className="text-2xl font-bold tracking-normal">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{intro}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {answers.length} accepted answers in this category.
      </p>
      <div className="mt-4 grid gap-3">
        {answers.map((answer) => (
          <article key={answer.name} className="rounded-lg border bg-card p-4">
            <h3 className="text-lg font-semibold">{answer.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Aliases:{' '}
              {answer.aliases
                .filter((alias) => alias !== answer.name)
                .join(', ') || '—'}
            </p>
            {answer.hint ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Hint: {answer.hint}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function menListIntro(slug: CategorySlug, womenIntro: string) {
  if (slug === 'actresses') {
    return 'Actors are the first burst for most players and still hide names you already know. After current stars, move to classic cinema, television, international film, and directors who also act. First and last names are safest.';
  }
  return womenIntro
    .replaceAll('women', 'men')
    .replaceAll('female', 'male')
    .replaceAll('actresses', 'actors');
}
