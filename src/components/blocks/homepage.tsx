import { MoreChallenges } from '@/components/blocks/more-challenges';
import { Name100Game } from '@/components/game/name100-game';
import Container from '@/components/layout/container';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'What counts as a valid answer?',
    answer:
      'A valid answer is a real famous woman from any field, including entertainment, science, sports, politics, business, activism, or history. First and last names usually work best, and a few widely known stage names or aliases are accepted too.',
  },
  {
    question: 'How is the score calculated?',
    answer:
      'Your score is the number of unique accepted names you enter before the 12 minute timer reaches zero. Repeating the same person does not add another point.',
  },
  {
    question: 'Can I play on my phone?',
    answer:
      'Yes. The game is designed mobile-first, with the timer and score kept above the input so you can keep typing while the keyboard is open.',
  },
  {
    question: 'Is the game free?',
    answer:
      'Yes. Name 100 Women Challenge is free to play online, and your progress is stored locally in your browser.',
  },
  {
    question: 'Will there be new categories?',
    answer:
      "Yes. Category pages, daily challenge mode, a timer tool, and a men's version are separate pages so each mode can have focused rules and useful practice content.",
  },
];

export function HomePage() {
  return (
    <div className="flex flex-col">
      <section className="border-b bg-background">
        <Container className="px-4 pb-8 pt-6 sm:pb-12 sm:pt-10">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-balance text-3xl font-bold tracking-normal sm:text-5xl lg:text-6xl">
              Name 100 Women Challenge
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
              You have 12 minutes. How many famous women can you name?
            </p>
          </div>
          <div className="mt-5 sm:mt-8">
            <Name100Game />
          </div>
        </Container>
      </section>

      <Container className="px-4 py-8">
        <div id="ad-slot-1" className="min-h-[90px]">
          {/* AdSense slot */}
        </div>
      </Container>

      <section className="border-y bg-muted/30">
        <Container className="grid gap-10 px-4 py-12 lg:grid-cols-[1fr_1fr] lg:py-16">
          <div>
            <h2 className="text-3xl font-bold tracking-normal">How to Play</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The rules are simple: you have 12 minutes to type the names of 100
              famous women. Any field counts, including actresses, singers,
              athletes, scientists, politicians, historical figures, founders,
              writers, and activists. First and last name required for most
              people, though globally recognized stage names and aliases may
              also work. Your answers are checked automatically when you press
              Enter. Correct answers increase your score, duplicate answers are
              ignored, and your progress is saved in this browser so a refresh
              does not erase a good run.
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-normal">
              Tips to Reach 100
            </h2>
            <ul className="mt-4 space-y-3 text-base leading-7 text-muted-foreground">
              <li>Start with modern celebrities you know well.</li>
              <li>Think by category: music, movies, sports, history.</li>
              <li>Move country by country when your first list slows down.</li>
              <li>
                Do not forget scientists, founders, and political leaders.
              </li>
              <li>
                Use last names carefully for instantly recognizable people.
              </li>
              <li>
                Keep typing quickly; you can clean up mistakes next round.
              </li>
            </ul>
          </div>
        </Container>
      </section>

      <MoreChallenges currentPage="home" />

      <section className="border-t bg-muted/30">
        <Container className="px-4 py-12 lg:py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-normal">FAQ</h2>
            <Accordion className="mt-6 rounded-lg border bg-background p-3">
              {faqs.map((item, index) => (
                <AccordionItem
                  key={item.question}
                  value={`faq-${index + 1}`}
                  className="border-dashed"
                >
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-base leading-7 text-muted-foreground">
                      {item.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Container>
      </section>
    </div>
  );
}
