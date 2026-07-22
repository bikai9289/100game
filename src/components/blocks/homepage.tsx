import { MoreChallenges } from '@/components/blocks/more-challenges';
import { Name100Game } from '@/components/game/name100-game';
import womenAnswersData from '@/data/answers-women.json';
import type { Answer } from '@/lib/gameEngine';
import Container from '@/components/layout/container';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  IconCheck,
  IconClock,
  IconFlag,
  IconKeyboard,
} from '@tabler/icons-react';

const steps = [
  {
    title: 'Type a name, press Enter',
    body: "Type any famous woman's name and hit Enter. Your 12-minute timer starts on your first guess.",
    icon: IconKeyboard,
  },
  {
    title: 'Correct answers fill slots',
    body: 'Every accepted name fills a numbered slot with a colorful category tag and your score goes up. Duplicates are ignored.',
    icon: IconFlag,
  },
  {
    title: 'Name as many as you can',
    body: "Race the clock toward 100. Your progress is saved in this browser, so a refresh won't erase a good run.",
    icon: IconClock,
  },
];

const tips = [
  'Start with modern celebrities you know well.',
  'Think by category: music, movies, sports, history.',
  'Move country by country when your first list slows down.',
  'Do not forget scientists, founders, and political leaders.',
  'Use last names carefully for instantly recognizable people.',
  'Keep typing quickly; you can clean up mistakes next round.',
];

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
          <div className="mx-auto max-w-[1180px]">
            <h2 className="text-[1.75rem] font-extrabold tracking-normal">
              How to Play
            </h2>
            <p className="mt-1.5 text-muted-foreground">
              Three simple steps. No sign-up, free to play.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {steps.map((step) => {
                const Icon = step.icon;

                return (
                  <Card
                    key={step.title}
                    className="rounded-[14px] border border-border bg-card p-5 ring-0"
                  >
                    <CardHeader className="px-0">
                      <div className="grid size-10 place-items-center rounded-full bg-accent text-primary">
                        <Icon className="size-5" />
                      </div>
                      <CardTitle className="mt-3.5 text-[1.0625rem] font-bold">
                        {step.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0">
                      <CardDescription className="mt-1.5 text-sm leading-6">
                        {step.body}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-border bg-muted py-[52px]">
        <Container className="px-[18px]">
          <div className="mx-auto max-w-[1180px]">
            <h2 className="text-[1.75rem] font-extrabold tracking-normal">
              Tips to Reach 100
            </h2>
            <div className="mt-5 grid gap-2.5">
              {tips.map((tip) => (
                <div key={tip} className="flex gap-2.5">
                  <IconCheck className="mt-1 size-4 shrink-0 stroke-[3] text-primary" />
                  <span className="text-muted-foreground">{tip}</span>
                </div>
              ))}
            </div>
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
            <Accordion className="mt-5 grid gap-2.5" defaultValue={['faq-1']}>
              {faqs.map((item, index) => (
                <AccordionItem
                  key={item.question}
                  value={`faq-${index + 1}`}
                  className="rounded-xl border border-border bg-card px-4"
                >
                  <AccordionTrigger className="text-left font-bold hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm leading-6 text-muted-foreground">
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
