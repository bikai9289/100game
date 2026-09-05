import { MoreChallenges } from '@/components/blocks/more-challenges';
import { Name100Game } from '@/components/game/name100-game';
import Container from '@/components/layout/container';
import {
  categoryMeta,
  categoryOrder,
  getAnswersByCategory,
  type CategorySlug,
} from '@/lib/name100-data';
import { gameJsonLd } from '@/lib/game-schema';
import { seo } from '@/lib/seo';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';

export const Route = createFileRoute('/(pages)/categories/$slug')({
  loader: ({ params }) => {
    if (!isCategorySlug(params.slug)) throw notFound();
    const meta = categoryMeta[params.slug];
    const answers = getAnswersByCategory(params.slug);

    return {
      slug: params.slug,
      meta,
      answers,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const title = `Name 100 Women: ${loaderData.meta.title} Edition – Category Challenge`;
    const description = `Practice the Name 100 Women ${loaderData.meta.title.toLowerCase()} category challenge. You have 5 minutes to name 30 famous women from this category.`;

    return {
      ...seo(`/categories/${loaderData.slug}`, { title, description }),
      scripts: [
        gameJsonLd({
          path: `/categories/${loaderData.slug}`,
          name: `Name 100 Women: ${loaderData.meta.title}`,
          description,
          breadcrumb: loaderData.meta.title,
        }),
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug, meta, answers } = Route.useLoaderData();

  return (
    <div className="flex flex-col">
      <section className="border-b">
        <Container className="px-4 py-10">
          <div className="mx-auto max-w-3xl text-center">
            <Link
              to="/categories"
              className="text-sm font-semibold text-primary hover:underline"
            >
              ← All categories
            </Link>
            <h1 className="mt-4 text-balance text-4xl font-bold tracking-normal sm:text-5xl">
              Name 100 Women: {meta.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              You have five minutes to name 30 famous women from the{' '}
              {meta.title.toLowerCase()} category.
            </p>
          </div>

          <div className="mt-8">
            <Name100Game
              answers={answers}
              gameId={`category:${slug}`}
              targetScore={30}
              durationSeconds={300}
              storageKey={`name100:category:${slug}`}
              storageCookie={`name100_category_${slug}`}
              ariaLabel={`Name 100 Women ${meta.title} category game`}
              placeholder={
                slug === 'scientists'
                  ? "Type a famous female scientist's name..."
                  : `Type a famous ${meta.shortTitle.toLowerCase()} name...`
              }
              emptyTagsText={`Correct ${meta.shortTitle.toLowerCase()} answers will appear here.`}
              missText={`Not in the ${meta.shortTitle.toLowerCase()} category list. Try another name.`}
            />
          </div>
        </Container>
      </section>

      <section className="border-b bg-muted/30">
        <Container className="px-4 py-12">
          <article className="mx-auto max-w-3xl space-y-5 text-base leading-7 text-muted-foreground">
            <h2 className="text-3xl font-bold tracking-normal text-foreground">
              How to Play the {meta.title} Edition
            </h2>
            <p>
              This category edition narrows the Name 100 Women challenge to one
              focused field. Instead of scanning every famous woman you know,
              you only need names connected to {meta.title.toLowerCase()}. The
              shorter five-minute timer keeps the round sharp, and the target of
              30 answers gives you a clear practice goal before returning to the
              full 12-minute game.
            </p>
            <p>{meta.practiceTips}</p>
            <p>
              Category pages are useful because memory works better in clusters.
              If you build a strong list of names in each group, the classic
              challenge becomes less chaotic. You can rotate from entertainment
              to science, then to politics, sports, history, business, and
              activism instead of waiting for random names to surface.
            </p>
            <p>
              A good practice routine is simple: play this category once, review
              the missed examples at the end, then immediately play again. After
              two or three rounds, move back to the main challenge and use this
              category as one of your first scoring lanes.
            </p>
          </article>
        </Container>
      </section>

      <MoreChallenges currentPage="categories" />
    </div>
  );
}

function isCategorySlug(slug: string): slug is CategorySlug {
  return (categoryOrder as readonly string[]).includes(slug);
}
