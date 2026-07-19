import { Routes } from '@/lib/routes';
import type { MenuItemConfig } from '../types';

export function getNavbarLinks(): MenuItemConfig[] {
  return [
    { title: 'Play', href: Routes.Root, external: false },
    { title: 'Challenge', href: Routes.Challenge, external: false },
    { title: 'Categories', href: Routes.Categories, external: false },
    { title: 'Timer', href: Routes.Timer, external: false },
    { title: 'Men', href: Routes.Men, external: false },
    { title: 'Answers', href: Routes.Answers, external: false },
  ];
}
