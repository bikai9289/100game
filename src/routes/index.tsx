import { HomePage } from '@/components/blocks/homepage';
import { gameJsonLd } from '@/lib/game-schema';
import { getLocale, localeConfig } from '@/lib/locale';
import { homeFaqs } from '@/lib/name100-copy';
import { seo } from '@/lib/seo';
import { getCanonicalUrl } from '@/lib/urls';
import { createFileRoute } from '@tanstack/react-router';

const title = 'Name 100 Women Challenge - Free 12-Minute Game';
const description =
  'Play the free Name 100 Women Challenge online. 12 minutes to name 100 famous women - actresses, scientists, athletes, musicians. How many can you get?';

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

    return {
      ...metadata,
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(webSiteJsonLd),
        },
        gameJsonLd({
          path: '/',
          name: 'Name 100 Women Challenge',
          description,
          faqs: homeFaqs,
        }),
      ],
    };
  },
  component: HomePage,
});
