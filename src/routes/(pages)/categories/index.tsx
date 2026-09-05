import { MoreChallenges } from '@/components/blocks/more-challenges';
import Container from '@/components/layout/container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getCategoryStats } from '@/lib/name100-data';
import { gameJsonLd } from '@/lib/game-schema';
import { seo } from '@/lib/seo';
import { createFileRoute, Link } from '@tanstack/react-router';

const title =
  'Name 100 Women Categories – Actresses, Scientists, Athletes & More';
const description =
  'Practice Name 100 Women by category. Pick actresses, musicians, athletes, scientists, politicians, historical figures and more. Free category challenge modes.';

export const Route = createFileRoute('/(pages)/categories/')({
  head: () => ({
    ...seo('/categories', { title, description }),
    scripts: [
      gameJsonLd({
        path: '/categories',
        name: 'Name 100 Women by Category',
        description,
        breadcrumb: 'Categories',
      }),
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const categories = getCategoryStats();

  return (
    <div className="flex flex-col">
      <section className="border-b">
        <Container className="px-4 py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-4xl font-bold tracking-normal sm:text-5xl">
              Name 100 Women by Category
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Pick one category, set a focused five-minute timer, and train the
              mental lanes that help you reach 100 in the full challenge.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to="/categories/$slug"
                params={{ slug: category.slug }}
              >
                <Card className="h-full transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>{category.title}</CardTitle>
                    <CardDescription>{category.count} answers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {category.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b bg-muted/30">
        <Container className="px-4 py-12">
          <article className="mx-auto max-w-3xl space-y-5 text-base leading-7 text-muted-foreground">
            <h2 className="text-3xl font-bold tracking-normal text-foreground">
              Practice Categories Before the Main Game
            </h2>
            <p>
              Category practice is the fastest way to improve at Name 100 Women.
              In the full game, most players get stuck because they keep
              searching one mental list over and over. A category round forces
              you to build separate recall paths for actresses, musicians,
              athletes, scientists, politicians, historical figures, business
              leaders, activists, and writers or cultural figures.
            </p>
            <p>
              Each category page has its own filtered answer list, a shorter
              five-minute timer, and a target of 30 correct names. That makes it
              easy to practice one weak area without committing to the full
              12-minute challenge. If scientists are hard, play that page twice.
              If athletes are easy, move to historical figures or activists.
            </p>
            <p>
              The categories also work as a memory map. When the main challenge
              starts, you can rotate through the same groups instead of waiting
              for random names to appear in your head. Play one or two focused
              pages, then return to the classic challenge and watch your score
              climb.
            </p>
          </article>
        </Container>
      </section>

      <MoreChallenges currentPage="categories" />
    </div>
  );
}
