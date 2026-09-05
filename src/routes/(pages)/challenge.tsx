import { MoreChallenges } from '@/components/blocks/more-challenges';
import { Name100Game } from '@/components/game/name100-game';
import Container from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import {
  categoryMeta,
  getDailyAnswers,
  getDailyCategories,
} from '@/lib/name100-data';
import { gameJsonLd } from '@/lib/game-schema';
import { seo } from '@/lib/seo';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

const title =
  'Name 100 Women Daily Challenge – Same Game for Everyone, Today Only';
const description =
  "Play today's Name 100 Women Daily Challenge. A new seeded challenge every day — everyone gets the same categories. Compare your score with friends.";

const faqs = [
  {
    question: 'How does the daily challenge choose categories?',
    answer:
      'The daily challenge uses the current UTC date as a fixed seed, then selects three categories for everyone. The UTC label and countdown show exactly when the shared challenge changes.',
  },
  {
    question: 'Does the daily score reset?',
    answer:
      'Yes. Your daily challenge progress is saved separately for each UTC date in your browser, so the next UTC day starts with a fresh category mix and score.',
  },
  {
    question: 'Why is the daily target 30 instead of 100?',
    answer:
      'The daily version is shorter and category-limited, so the target is 30 names. It is meant to be quick, repeatable, and easy to compare with friends.',
  },
];

export const Route = createFileRoute('/(pages)/challenge')({
  head: () => ({
    ...seo('/challenge', { title, description }),
    scripts: [
      gameJsonLd({
        path: '/challenge',
        name: 'Name 100 Women Daily Challenge',
        description,
        breadcrumb: 'Daily Challenge',
        faqs,
      }),
    ],
  }),
  component: ChallengePage,
});

function ChallengePage() {
  const today = new Date().toISOString().slice(0, 10);
  const categories = getDailyCategories(today);
  const answers = getDailyAnswers(today);

  return (
    <div className="flex flex-col">
      <section className="border-b">
        <Container className="px-4 py-10">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              UTC daily challenge: {today}
            </p>
            <h1 className="mt-3 text-balance text-4xl font-bold tracking-normal sm:text-5xl">
              Daily Challenge: Name 100 Women
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Everyone gets the same three categories for this UTC day. Name 30
              famous women before the timer runs out, then compare your score.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {categories.map((slug) => (
                <Badge key={slug} variant="secondary" className="capitalize">
                  {categoryMeta[slug].shortTitle}
                </Badge>
              ))}
            </div>
            <DailyResetCountdown />
          </div>
          <div className="mt-8">
            <Name100Game
              answers={answers}
              gameId={`daily:${today}`}
              targetScore={30}
              durationSeconds={300}
              storageKey={`name100:daily:${today}`}
              storageCookie={`name100_daily_${today.replaceAll('-', '_')}`}
              ariaLabel="Name 100 Women daily challenge"
              placeholder="Type a name from today's categories..."
              emptyTagsText="Correct daily answers will appear here."
              missText="Not in today's category-limited answer list. Try another name."
            />
          </div>
        </Container>
      </section>

      <section className="border-b bg-muted/30">
        <Container className="px-4 py-12">
          <article className="mx-auto max-w-3xl space-y-5 text-base leading-7 text-muted-foreground">
            <h2 className="text-3xl font-bold tracking-normal text-foreground">
              What Is the Daily Challenge?
            </h2>
            <p>
              The Daily Challenge is a shorter, repeatable version of Name 100
              Women. Instead of drawing from the full answer list, it uses the
              UTC date to select three categories. That means every player in
              the same UTC day sees the same category combination and can
              compare scores fairly. The target is 30 correct answers, which
              makes the mode fast enough for a morning break, a lunch challenge,
              or a group chat competition.
            </p>
            <p>
              A fixed daily seed is useful because it creates a shared puzzle.
              You can send the page to friends and know they are not getting an
              easier or harder set of categories. One day may lean toward
              athletes, musicians, and scientists; another may force you to
              think about political leaders, historical figures, and business
              founders. The changing mix keeps the game fresh without needing a
              backend or account system.
            </p>
            <p>
              Your score is stored locally for the UTC date, so refreshing the
              page does not erase a good run. The next UTC date creates a new
              challenge. If you want to improve quickly, play the daily mode
              first, then jump into category practice for any areas that slowed
              you down.
            </p>
          </article>
        </Container>
      </section>

      <section className="border-b">
        <Container className="px-4 py-12">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-normal">FAQ</h2>
            <div className="mt-6 space-y-5">
              {faqs.map((item) => (
                <div key={item.question} className="rounded-lg border p-5">
                  <h3 className="font-semibold">{item.question}</h3>
                  <p className="mt-2 text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <MoreChallenges currentPage="challenge" />
    </div>
  );
}

function DailyResetCountdown() {
  const [remaining, setRemaining] = useState(() => getSecondsUntilTomorrow());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(getSecondsUntilTomorrow());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  return (
    <p className="mt-4 text-sm text-muted-foreground">
      New UTC challenge in {hours}h {minutes}m. Same categories worldwide.
    </p>
  );
}

function getSecondsUntilTomorrow() {
  const now = new Date();
  const tomorrowUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );

  return Math.max(0, Math.floor((tomorrowUtc - now.getTime()) / 1000));
}
