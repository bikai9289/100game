import { HomePage } from '@/components/blocks/homepage';
import { seo } from '@/lib/seo';
import { getCanonicalUrl } from '@/lib/urls';
import { getLocale, localeConfig } from '@/lib/locale';
import { createFileRoute } from '@tanstack/react-router';

const title =
  'Name 100 Women Challenge – Can You Name 100 Famous Women in 12 Minutes?';
const description =
  'Play the free Name 100 Women Challenge online. 12 minutes to name 100 famous women — actresses, scientists, athletes, musicians. How many can you get?';

const faqItems = [
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
      'Yes. Category pages, daily challenge mode, a timer tool, and a men’s version are planned as separate pages so each mode can have focused rules and SEO content.',
  },
];

export const Route = createFileRoute('/')({
  head: () => {
    const url = getCanonicalUrl('/');
    const inLanguage = localeConfig[getLocale()].hreflang;
    const metadata = seo('/', { title, description });
    const webSiteJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Name100Challenge',
      description,
      url,
      inLanguage,
    };
    const faqPageJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };

    return {
      ...metadata,
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(webSiteJsonLd),
        },
        {
          type: 'application/ld+json',
          children: JSON.stringify(faqPageJsonLd),
        },
      ],
    };
  },
  component: HomePage,
});
