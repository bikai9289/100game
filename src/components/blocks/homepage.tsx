import { GameFaq } from '@/components/blocks/game-faq';
import { MoreChallenges } from '@/components/blocks/more-challenges';
import { Name100Game } from '@/components/game/name100-game';
import Container from '@/components/layout/container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import womenAnswersData from '@/data/answers-women.json';
import type { Answer } from '@/lib/gameEngine';
import { homeFaqs, homeHowToSteps } from '@/lib/name100-copy';
import { categoryMeta, categoryOrder } from '@/lib/name100-data';
import { IconCheck } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

export function HomePage() {
  return (
    <div className="flex flex-col bg-background">
      <section className="bg-background">
        <Container className="px-[18px] pb-8 pt-5">
          <div className="mx-auto max-w-[1180px] text-center">
            <h1 className="text-balance text-[2rem] font-extrabold leading-tight tracking-normal">
              Name 100 Women Challenge
            </h1>
            <p className="mx-auto mb-[22px] mt-1 max-w-2xl text-[0.9375rem] text-muted-foreground">
              You have 12 minutes. How many famous women can you name?
            </p>
          </div>
          <Name100Game answers={womenAnswersData as Answer[]} />
        </Container>
      </section>

      <section className="border-t border-border bg-background py-[52px]">
        <Container className="px-[18px]">
          <article className="mx-auto max-w-[1180px] space-y-4 text-base leading-7 text-muted-foreground">
            <h2 className="text-[1.75rem] font-extrabold tracking-normal text-foreground">
              About the Name 100 Women Challenge
            </h2>
            <p>
              Name 100 Women Challenge is a free 12-minute typing game: name as
              many famous women as you can before the clock runs out. The format
              spread because it is simple to explain, easy to share, and harder
              than it sounds. Most people can name a dozen actresses or
              musicians immediately, then stall when they try to leave
              entertainment and reach scientists, athletes, leaders, and
              historical figures.
            </p>
            <p>
              The social version of the challenge shows up in group chats,
              classrooms, and short videos because a score is easy to compare.
              Twelve minutes is long enough to feel like a real attempt and
              short enough to finish in one sitting. A friend can play the same
              page and send back a number. That loop is why the Name 100
              Challenge keeps spreading: the game is the content.
            </p>
            <p>
              This site uses a curated answer library, not a live encyclopedia
              lookup. Accepted names are checked in your browser against more
              than 500 women across entertainment, science, sports, politics,
              business, activism, and history. A one-letter spelling slip can
              still count. That keeps the game fair on a phone, works without an
              account, and lets the first screen stay playable.
            </p>
          </article>
        </Container>
      </section>

      <section className="border-t border-border bg-background py-[52px]">
        <Container className="px-[18px]">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="text-[1.75rem] font-extrabold tracking-normal">
              How to Play
            </h2>
            <p className="mt-1.5 text-muted-foreground">
              Six rules. No sign-up, free to play.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {homeHowToSteps.map((step, index) => (
                <Card
                  key={step.title}
                  className="rounded-[14px] border border-border bg-card p-5 ring-0"
                >
                  <CardHeader className="px-0">
                    <p className="text-sm font-bold text-primary">
                      Step {index + 1}
                    </p>
                    <CardTitle className="mt-2 text-[1.0625rem] font-bold">
                      {step.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    <CardDescription className="mt-1.5 text-sm leading-6">
                      {step.body}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-6 text-sm leading-6 text-muted-foreground">
              The full scoring rules, aliases, and edge cases are written out on
              the{' '}
              <Link
                to="/rules"
                className="font-semibold text-primary hover:underline"
              >
                Name 100 Women rules page
              </Link>
              .
            </p>
          </div>
        </Container>
      </section>

      <section className="border-y border-border bg-muted py-[52px]">
        <Container className="px-[18px]">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="text-[1.75rem] font-extrabold tracking-normal">
              Tips and Strategies to Reach 100
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              High scores come from rotating categories, not from staring at one
              mental list. Use the lanes below, then jump to a focused practice
              page when a group dries up.
            </p>
            <div className="mt-6 grid gap-5">
              {categoryOrder.map((slug) => {
                const meta = categoryMeta[slug];
                return (
                  <div key={slug} className="flex gap-2.5">
                    <IconCheck className="mt-1 size-4 shrink-0 stroke-[3] text-primary" />
                    <p className="text-sm leading-6 text-muted-foreground">
                      <Link
                        to="/categories/$slug"
                        params={{ slug }}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {meta.title}.
                      </Link>{' '}
                      {meta.practiceTips} {meta.listIntro}
                    </p>
                  </div>
                );
              })}
            </div>
            <ul className="mt-6 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>
                Start with modern celebrities you can type fast, then leave
                entertainment before you stall.
              </li>
              <li>
                Move country by country for leaders, athletes, and historical
                figures.
              </li>
              <li>
                After a lost round, open the{' '}
                <Link
                  to="/answers"
                  className="font-semibold text-primary hover:underline"
                >
                  full famous women list
                </Link>{' '}
                and replay while missed names are still fresh.
              </li>
            </ul>
          </div>
        </Container>
      </section>

      <MoreChallenges currentPage="home" />

      <section id="faqs" className="border-y border-border bg-muted py-[52px]">
        <Container className="px-[18px]">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="text-[1.75rem] font-extrabold tracking-normal">
              FAQ
            </h2>
            <GameFaq
              faqs={homeFaqs}
              renderAnswer={(item, index) =>
                index === 4 ? (
                  <p>
                    Yes. You can{' '}
                    <Link
                      to="/categories"
                      className="font-semibold text-primary hover:underline"
                    >
                      practice Name 100 Women by category
                    </Link>
                    , play the{' '}
                    <Link
                      to="/challenge"
                      className="font-semibold text-primary hover:underline"
                    >
                      daily challenge
                    </Link>
                    , use the{' '}
                    <Link
                      to="/timer"
                      className="font-semibold text-primary hover:underline"
                    >
                      timer tool
                    </Link>
                    , or switch to the{' '}
                    <Link
                      to="/men"
                      className="font-semibold text-primary hover:underline"
                    >
                      Name 100 Men Challenge
                    </Link>
                    . Each mode has its own rules, answer list, and saved
                    progress.
                  </p>
                ) : (
                  <p>{item.answer}</p>
                )
              }
            />
          </div>
        </Container>
      </section>
    </div>
  );
}
