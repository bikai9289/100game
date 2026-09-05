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
import menAnswersData from '@/data/answers-men.json';
import type { Answer } from '@/lib/gameEngine';
import { gameJsonLd } from '@/lib/game-schema';
import { homeHowToSteps, menFaqs } from '@/lib/name100-copy';
import { seo } from '@/lib/seo';
import { getImageUrl } from '@/lib/urls';
import { createFileRoute, Link } from '@tanstack/react-router';

const menAnswers = menAnswersData as Answer[];

const title = 'Name 100 Men Challenge - Free 12-Minute Game';
const description =
  'Can you name 100 famous men in 12 minutes? Play the free Name 100 Men Challenge - scientists, athletes, leaders and artists. How many can you get?';

const menTips = [
  {
    title: 'Actors and musicians',
    body: 'Start with film, television, and music names you can type instantly. Leave entertainment as soon as the first burst slows down.',
  },
  {
    title: 'Athletes',
    body: 'Move sport by sport: soccer, basketball, tennis, track, combat sports, and Olympic history. National teams unlock several names in a row.',
  },
  {
    title: 'Scientists and inventors',
    body: 'Group by field: physics, medicine, computing, space, and engineering. This lane is where most scores stall, and it is also where easy points hide.',
  },
  {
    title: 'Leaders and historical figures',
    body: 'Travel country by country for presidents, prime ministers, revolutionaries, writers, and rulers. Short historical names type quickly late in a round.',
  },
  {
    title: 'Business, art, and activism',
    body: 'Founders, directors, authors, painters, and campaigners sit just outside celebrity memory. Switch here when sports and film dry up.',
  },
];

export const Route = createFileRoute('/(pages)/men')({
  head: () => ({
    ...seo('/men', {
      title,
      description,
      image: getImageUrl('/og-image-men.png'),
    }),
    scripts: [
      gameJsonLd({
        path: '/men',
        name: 'Name 100 Men Challenge',
        description,
        breadcrumb: 'Name 100 Men Challenge',
        faqs: menFaqs,
      }),
    ],
  }),
  component: MenPage,
});

function MenPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b bg-background">
        <Container className="px-4 pb-8 pt-6 sm:pb-12 sm:pt-10">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-balance text-4xl font-bold tracking-normal sm:text-5xl lg:text-6xl">
              Name 100 Men Challenge
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Can you name 100 famous men in 12 minutes? Scientists, athletes,
              leaders, and artists all count.
            </p>
          </div>
          <div className="mt-5 sm:mt-8">
            <Name100Game
              answers={menAnswers}
              gameId="men"
              storageKey="name100:men:v1"
              storageCookie="name100_men_v1"
              ariaLabel="Name 100 Men game"
              placeholder="Type a famous man's name..."
              emptyTagsText="Correct men's challenge answers will appear here."
              missText="Not in the men's answer list yet. Try another famous man."
            />
          </div>
        </Container>
      </section>

      <section className="border-b bg-background">
        <Container className="px-4 py-12 lg:py-16">
          <article className="mx-auto max-w-3xl space-y-4 text-base leading-7 text-muted-foreground">
            <h2 className="text-3xl font-bold tracking-normal text-foreground">
              About the Name 100 Men Challenge
            </h2>
            <p>
              Name 100 Men Challenge is the men&apos;s version of the same
              12-minute naming game. Celebrate the achievements of remarkable
              men across history — scientists, athletes, leaders, and artists —
              and see how many you can type before the timer ends. The page uses
              its own curated answer library and its own saved progress, so a
              run here never overwrites the women&apos;s game.
            </p>
            <p>
              The men&apos;s challenge is the larger search family in this
              genre. People look for a free quiz they can finish in one sitting
              and share a score. Twelve minutes is long enough to leave
              celebrity names and reach inventors, athletes, writers, and
              political leaders. That mix is what makes a high score feel
              earned.
            </p>
            <p>
              Answers are checked locally against more than 500 famous men. The
              matcher accepts listed aliases and a one-letter spelling slip. It
              is not a live Wikidata lookup. That keeps the first screen fast,
              works on a phone with the keyboard open, and keeps scoring
              consistent from one replay to the next.
            </p>
          </article>
        </Container>
      </section>

      <section className="border-b bg-muted/30">
        <Container className="px-4 py-12 lg:py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-normal">How to Play</h2>
            <p className="mt-3 text-muted-foreground">
              The format matches the women&apos;s game. Only the answer list
              changes.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {homeHowToSteps.map((step, index) => (
                <Card key={step.title} className="rounded-[14px] p-5 ring-0">
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
                      {step.body.replace("woman's", "man's")}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-6 text-sm leading-6 text-muted-foreground">
              Read the{' '}
              <Link
                to="/men/rules"
                className="font-semibold text-primary hover:underline"
              >
                Name 100 Men rules
              </Link>{' '}
              for scoring details, then compare notes with the{' '}
              <Link
                to="/"
                className="font-semibold text-primary hover:underline"
              >
                Name 100 Women Challenge
              </Link>
              .
            </p>
          </div>
        </Container>
      </section>

      <section className="border-b bg-background">
        <Container className="px-4 py-12 lg:py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-normal">
              Tips and Strategies
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Think across categories instead of waiting for random names.
              Rotate through the groups below the moment your current list slows
              down.
            </p>
            <div className="mt-6 grid gap-5">
              {menTips.map((tip) => (
                <article key={tip.title}>
                  <h3 className="text-lg font-bold">{tip.title}</h3>
                  <p className="mt-2 text-base leading-7 text-muted-foreground">
                    {tip.body}
                  </p>
                </article>
              ))}
            </div>
            <p className="mt-6 text-base leading-7 text-muted-foreground">
              After a round, open the{' '}
              <Link
                to="/men/answers"
                className="font-semibold text-primary hover:underline"
              >
                100 famous men list
              </Link>{' '}
              and replay while missed names are still warm. The goal is not to
              memorize the page in order. It is to build faster category
              clusters for the next 12-minute run.
            </p>
          </div>
        </Container>
      </section>

      <section id="faqs" className="border-b bg-muted/30">
        <Container className="px-4 py-12 lg:py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-normal">FAQ</h2>
            <GameFaq
              faqs={menFaqs}
              renderAnswer={(item, index) =>
                index === 4 ? (
                  <p>
                    Both games use the same 12-minute format and local matching
                    rules, but they have separate answer libraries and saved
                    progress. Play the{' '}
                    <Link
                      to="/"
                      className="font-semibold text-primary hover:underline"
                    >
                      Name 100 Women Challenge
                    </Link>{' '}
                    on the home page, or stay here for famous men.
                  </p>
                ) : (
                  <p>{item.answer}</p>
                )
              }
            />
          </div>
        </Container>
      </section>

      <MoreChallenges currentPage="men" />
    </div>
  );
}
