import { MoreChallenges } from '@/components/blocks/more-challenges';
import { Name100Game } from '@/components/game/name100-game';
import Container from '@/components/layout/container';
import menAnswersData from '@/data/answers-men.json';
import type { Answer } from '@/lib/gameEngine';
import { seo } from '@/lib/seo';
import { createFileRoute } from '@tanstack/react-router';

const menAnswers = menAnswersData as Answer[];

const title =
  'Name 100 Men Challenge – Can You Name 100 Famous Men in 12 Minutes?';
const description =
  'Play the free Name 100 Men Challenge online. 12 minutes to name 100 famous men — actors, athletes, scientists, musicians, leaders. How many can you get?';

export const Route = createFileRoute('/(pages)/men')({
  head: () => seo('/men', { title, description }),
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
              Actors, athletes, inventors, musicians, leaders, and historical
              figures all count. You have 12 minutes.
            </p>
          </div>
          <div className="mt-5 sm:mt-8">
            <Name100Game
              answers={menAnswers}
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

      <section className="border-y bg-muted/30">
        <Container className="grid gap-10 px-4 py-12 lg:grid-cols-[1fr_1fr] lg:py-16">
          <article>
            <h2 className="text-3xl font-bold tracking-normal">
              How the Men’s Challenge Works
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The Name 100 Men Challenge uses the same fast typing format as the
              main game, but with a separate answer list and separate saved
              progress. You have 12 minutes to enter 100 famous men from any
              field. Movie stars, musicians, athletes, scientists, political
              leaders, founders, authors, artists, and historical figures all
              count as long as the answer is accepted by the list.
            </p>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The best way to play is to move through clusters. Start with names
              that come instantly from sports, music, film, and politics. Then
              switch to scientists, inventors, explorers, business leaders, and
              older historical figures. The timer rewards momentum more than
              perfect planning.
            </p>
          </article>

          <article>
            <h2 className="text-3xl font-bold tracking-normal">
              Tips for a Higher Score
            </h2>
            <ul className="mt-4 space-y-3 text-base leading-7 text-muted-foreground">
              <li>
                Begin with actors, singers, and athletes you can type fast.
              </li>
              <li>Use country groups for political leaders and royalty.</li>
              <li>
                Think of science by field: physics, medicine, space, tech.
              </li>
              <li>Do not forget founders, writers, directors, and artists.</li>
              <li>
                Switch categories the moment your current list slows down.
              </li>
              <li>Replay once immediately while missed names are fresh.</li>
            </ul>
          </article>
        </Container>
      </section>

      <MoreChallenges currentPage="men" />
    </div>
  );
}
