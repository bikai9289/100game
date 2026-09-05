import type { FaqItem } from '@/lib/game-schema';

export const homeFaqs: FaqItem[] = [
  {
    question: 'What counts as a valid answer?',
    answer:
      'A valid answer is a woman in the curated answer library, covering entertainment, science, sports, politics, business, activism, and history. First and last names are safest; unambiguous stage names and aliases also work. The game matches your input locally and allows a one-letter spelling slip.',
  },
  {
    question: 'How is the score calculated?',
    answer:
      'Your score is the number of unique accepted names you enter before the 12-minute timer reaches zero. Repeating the same person does not add another point, and reaching 100 ends the round early.',
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
    question: 'What other categories can I play?',
    answer:
      'You can practice by category, play the daily challenge, use the timer tool, or switch to Name 100 Men Challenge. Each mode has its own rules, answer list, and saved progress.',
  },
];

export const menFaqs: FaqItem[] = [
  {
    question: 'What counts as a valid answer in Name 100 Men Challenge?',
    answer:
      'A valid answer is a famous man in the curated men answer library, covering science, sports, entertainment, politics, business, activism, and history. First and last names are safest; unambiguous stage names and aliases also work.',
  },
  {
    question: 'How is the score calculated?',
    answer:
      'Your score is the number of unique accepted names you enter before the 12-minute timer reaches zero. Repeating the same person does not add another point, and the timer starts on your first accepted guess.',
  },
  {
    question: 'Can I play Name 100 Men on my phone?',
    answer:
      'Yes. The game is designed mobile-first, with the timer and score kept above the input so you can keep typing while the keyboard is open.',
  },
  {
    question: 'Is the Name 100 Men game free?',
    answer:
      'Yes. Name 100 Men Challenge is free to play online, and your progress is stored locally in your browser.',
  },
  {
    question: 'How is this different from Name 100 Women?',
    answer:
      'Both games use the same 12-minute format and local matching rules, but they have separate answer libraries and saved progress. The women challenge lives on the home page; this page is only for famous men.',
  },
];

export const homeHowToSteps = [
  {
    title: 'Type a name, press Enter',
    body: "Type a famous woman's name from the curated answer library and hit Enter. First and last names are the safest form.",
  },
  {
    title: 'The timer starts on your first hit',
    body: 'The 12-minute clock starts only after your first accepted guess. Misses before that do not start the round.',
  },
  {
    title: 'Correct answers fill numbered slots',
    body: 'Every accepted name fills a slot with a category tag and raises your score. Duplicates are ignored.',
  },
  {
    title: 'Aliases and near-misses can count',
    body: 'Unambiguous stage names and listed aliases work. A one-letter spelling slip can still match the intended person.',
  },
  {
    title: 'Progress stays in this browser',
    body: 'A refresh will not erase a good run. Your score and accepted names are stored locally on this device.',
  },
  {
    title: 'Reach 100 or race the clock',
    body: 'The round ends when you hit 100 names or the timer reaches zero. You can replay immediately and share the score.',
  },
];
