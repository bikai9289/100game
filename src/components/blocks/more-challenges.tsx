import Container from '@/components/layout/container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link } from '@tanstack/react-router';

type ChallengePage =
  | 'home'
  | 'challenge'
  | 'categories'
  | 'timer'
  | 'men'
  | 'answers';

const challengeLinks: {
  key: ChallengePage;
  title: string;
  href: string;
  description: string;
}[] = [
  {
    key: 'home',
    title: 'Name 100 Women Challenge',
    href: '/',
    description: 'Play the classic 12-minute challenge from the beginning.',
  },
  {
    key: 'challenge',
    title: 'Daily Challenge Mode',
    href: '/challenge',
    description: 'Play the same seeded challenge as everyone else today.',
  },
  {
    key: 'categories',
    title: 'Name 100 Women by Category',
    href: '/categories',
    description: 'Practice actresses, scientists, athletes, history, and more.',
  },
  {
    key: 'timer',
    title: 'Practice with the Timer Tool',
    href: '/timer',
    description: 'Set a 3, 5, or 12 minute timer for quick practice rounds.',
  },
  {
    key: 'men',
    title: 'Try Name 100 Men',
    href: '/men',
    description: "Switch to the men's version with a separate answer list.",
  },
  {
    key: 'answers',
    title: 'Full Answer List',
    href: '/answers',
    description: 'Browse the full list of accepted answers and aliases.',
  },
];

export function MoreChallenges({
  currentPage,
}: {
  currentPage: ChallengePage;
}) {
  const links = challengeLinks.filter((item) => item.key !== currentPage);

  return (
    <section>
      <Container className="px-4 py-12 lg:py-16">
        <h2 className="text-3xl font-bold tracking-normal">More Challenges</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {links.map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="h-full rounded-lg transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
