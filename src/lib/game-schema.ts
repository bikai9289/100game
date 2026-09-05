import { getCanonicalUrl } from '@/lib/urls';

export type FaqItem = {
  question: string;
  answer: string;
};

type GameSchemaInput = {
  path: string;
  name: string;
  description: string;
  breadcrumb?: string;
  faqs?: FaqItem[];
};

export function gameJsonLd({
  path,
  name,
  description,
  breadcrumb,
  faqs,
}: GameSchemaInput) {
  const url = getCanonicalUrl(path);
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebApplication',
      name,
      url,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      inLanguage: 'en',
    },
    {
      '@type': 'Game',
      name,
      url,
      description,
      playMode: 'SinglePlayer',
      gamePlatform: 'Web',
      audience: { '@type': 'PeopleAudience', suggestedMinAge: 10 },
      inLanguage: 'en',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: getCanonicalUrl('/'),
        },
        ...(breadcrumb && path !== '/'
          ? [
              {
                '@type': 'ListItem',
                position: 2,
                name: breadcrumb,
                item: url,
              },
            ]
          : []),
      ],
    },
  ];

  if (faqs?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
  }

  return {
    type: 'application/ld+json' as const,
    children: JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': graph,
    }),
  };
}

export function itemListJsonLd(input: { name: string; items: string[] }) {
  return {
    type: 'application/ld+json' as const,
    children: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: input.name,
      numberOfItems: input.items.length,
      itemListElement: input.items.map((name, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name,
      })),
    }),
  };
}
