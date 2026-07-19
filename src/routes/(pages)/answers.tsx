import { MoreChallenges } from '@/components/blocks/more-challenges';
import Container from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import answersData from '@/data/answers-women.json';
import type { Answer } from '@/lib/gameEngine';
import { categoryMeta, categoryOrder } from '@/lib/name100-data';
import { seo } from '@/lib/seo';
import { createFileRoute } from '@tanstack/react-router';

const answers = answersData as Answer[];
const title =
  'Name 100 Women Answers – Full List of Accepted Answers & Aliases';
const description =
  'Complete answer list for the Name 100 Women Challenge. Browse all 500+ accepted answers by category, with accepted aliases for each name.';

export const Route = createFileRoute('/(pages)/answers')({
  head: () => seo('/answers', { title, description }),
  component: AnswersPage,
});

function AnswersPage() {
  const groupedAnswers = categoryOrder.map((slug) => ({
    slug,
    meta: categoryMeta[slug],
    answers: answers
      .filter((answer) => answer.category === slug)
      .toSorted((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <div className="flex flex-col">
      <section className="border-b">
        <Container className="px-4 py-12">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="destructive">Spoiler warning</Badge>
            <h1 className="mt-4 text-balance text-4xl font-bold tracking-normal sm:text-5xl">
              Name 100 Women Answers
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              This page contains the full accepted answer list and aliases for
              the Name 100 Women Challenge. If you want a clean run, play first
              and come back later.
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
          <details className="mx-auto max-w-5xl rounded-xl border bg-background p-4 sm:p-6">
            <summary className="cursor-pointer text-lg font-bold">
              Click to show the full answer list
            </summary>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The answers below are still rendered in the page HTML for
              transparency, accessibility, and quick browser search. Use the
              category links above to jump through the list.
            </p>

            <div className="mt-8 space-y-10">
              {groupedAnswers.map((group) => (
                <section key={group.slug} id={group.slug}>
                  <h2 className="text-2xl font-bold tracking-normal">
                    {group.meta.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {group.answers.length} accepted answers in this category.
                  </p>
                  <div className="mt-4 grid gap-3">
                    {group.answers.map((answer) => (
                      <article
                        key={answer.name}
                        className="rounded-lg border bg-card p-4"
                      >
                        <h3 className="text-lg font-semibold">{answer.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Aliases:{' '}
                          {answer.aliases
                            .filter((alias) => alias !== answer.name)
                            .join(', ')}
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
              ))}
            </div>
          </details>
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
              forgot, then replay the game while those memory paths are still
              warm. The goal is not to memorize the page in order; it is to
              build stronger category clusters so you can move faster under the
              12-minute timer.
            </p>
            <p>
              Aliases show common inputs that the game accepts. Some people are
              widely recognized by a last name, stage name, or shorter variant.
              First and last names are still the safest strategy, but aliases
              make the game feel fair when a person is globally known by a
              simpler form.
            </p>
          </article>
        </Container>
      </section>

      <MoreChallenges currentPage="answers" />
    </div>
  );
}
