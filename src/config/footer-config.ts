import { Routes } from '@/lib/routes';
import type { MenuItemConfig } from '../types';

export function getFooterLinks(): MenuItemConfig[] {
  return [
    {
      title: 'Play',
      items: [
        { title: 'Name 100 Women', href: Routes.Root, external: false },
        { title: 'Daily Challenge', href: Routes.Challenge, external: false },
        { title: 'Timer Tool', href: Routes.Timer, external: false },
      ],
    },
    {
      title: 'Practice',
      items: [
        { title: 'Categories', href: Routes.Categories, external: false },
        { title: 'Name 100 Men', href: Routes.Men, external: false },
        { title: 'Answer List', href: Routes.Answers, external: false },
      ],
    },
  ];
}
