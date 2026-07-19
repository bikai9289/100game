import Container from '@/components/layout/container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  IconCalendarStats,
  IconClock,
  IconListDetails,
  IconTargetArrow,
  IconUser,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import type { ComponentType } from 'react';

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
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    key: 'home',
    title: 'Name 100 Women Challenge',
    href: '/',
    description: 'Play the classic 12-minute challenge from the beginning.',
    icon: IconTargetArrow,
  },
  {
    key: 'challenge',
    title: 'Daily Challenge Mode',
    href: '/challenge',
    description: 'Play the same seeded challenge as everyone else today.',
    icon: IconCalendarStats,
  },
  {
    key: 'categories',
    title: 'Name 100 Women by Category',
    href: '/categories',
    description: 'Practice actresses, scientists, athletes, history, and more.',
    icon: IconTargetArrow,
  },
  {
    key: 'timer',
    title: 'Practice with the Timer Tool',
    href: '/timer',
    description: 'Set a 3, 5, or 12 minute timer for quick practice rounds.',
    icon: IconClock,
  },
  {
    key: 'men',
    title: 'Try Name 100 Men',
    href: '/men',
    description: "Switch to the men's version with a separate answer list.",
    icon: IconUser,
  },
  {
    key: 'answers',
    title: 'Full Answer List',
    href: '/answers',
    description: 'Browse the full list of accepted answers and aliases.',
    icon: IconListDetails,
  },
];

export function MoreChallenges({
  currentPage,
}: {
  currentPage: ChallengePage;
}) {
  const links = challengeLinks.filter((item) => item.key !== currentPage);

  return (
    <section className="border-t border-border bg-background py-12">
      <Container className="px-4">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="text-3xl font-black tracking-tight">
            More Challenges
          </h2>
          <p className="mt-2 text-muted-foreground">
            Different ways to test yourself.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.href} to={item.href}>
                  <Card className="h-full rounded-2xl transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                    <CardHeader>
                      <Icon className="size-6 text-primary" />
                      <CardTitle className="mt-2 text-base font-bold">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="leading-6">
                        {item.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
