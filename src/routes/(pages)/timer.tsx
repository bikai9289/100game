import { MoreChallenges } from '@/components/blocks/more-challenges';
import { TimerTool } from '@/components/game/timer-tool';
import Container from '@/components/layout/container';
import { seo } from '@/lib/seo';
import { createFileRoute } from '@tanstack/react-router';

const title = 'Name 100 Women Timer – Free 3, 5 & 12 Minute Challenge Timer';
const description =
  'Free online timer for the Name 100 Women challenge. Choose 3, 5 or 12 minutes, start the countdown and play. Share a timed challenge with friends.';

export const Route = createFileRoute('/(pages)/timer')({
  head: () => seo('/timer', { title, description }),
  component: TimerPage,
});

function TimerPage() {
  return (
    <div className="flex flex-col">
      <section className="border-b">
        <Container className="px-4 py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-4xl font-bold tracking-normal sm:text-5xl">
              Name 100 Women Timer
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Choose 3, 5, or 12 minutes, start the countdown, and run a quick
              naming challenge anywhere.
            </p>
          </div>
          <div className="mt-8">
            <TimerTool />
          </div>
        </Container>
      </section>

      <section className="border-b bg-muted/30">
        <Container className="px-4 py-12">
          <article className="mx-auto max-w-3xl space-y-5 text-base leading-7 text-muted-foreground">
            <h2 className="text-3xl font-bold tracking-normal text-foreground">
              Use a Timer for Faster Practice
            </h2>
            <p>
              The Name 100 Women Timer is a simple practice tool for timed
              rounds. The full game uses 12 minutes, but shorter sessions are
              useful when you want to warm up, race a friend, or practice one
              category without playing a complete round. Pick three minutes for
              a sprint, five minutes for category training, or 12 minutes to
              mirror the main challenge.
            </p>
            <p>
              A timer changes how you think. Without a countdown, it is easy to
              browse names slowly or stop when the first obvious answers run
              out. With a visible clock, you learn to keep moving: music,
              movies, sports, science, politics, history, business, activism,
              then back around again. That rotation is the skill that helps
              players break through plateaus.
            </p>
            <p>
              You can also use URL parameters for quick sharing. A link with
              <code className="mx-1 rounded bg-background px-1 py-0.5">
                ?t=5
              </code>
              opens the five-minute version directly, which is handy for group
              chats or classroom games. Start the same timer together, write
              down your answers, then compare totals when the alert says time is
              up.
            </p>
          </article>
        </Container>
      </section>

      <MoreChallenges currentPage="timer" />
    </div>
  );
}
