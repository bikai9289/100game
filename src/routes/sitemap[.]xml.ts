import { createFileRoute } from '@tanstack/react-router';
import { getBaseUrl } from '@/lib/urls';
import {
  baseLocale,
  isLocalizedPath,
  localeConfig,
  locales,
  localizeHref,
} from '@/lib/locale';

/**
 * Dynamic sitemap.xml
 * https://tanstack.dev/start/latest/docs/framework/react/guide/seo#dynamic-sitemap
 */
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const base = getBaseUrl().replace(/\/$/, '');
        const staticUrls: {
          path: string;
          changefreq?: string;
          priority?: string;
        }[] = [
          { path: '/', changefreq: 'daily', priority: '1.0' },
          { path: '/challenge', changefreq: 'daily', priority: '0.9' },
          { path: '/categories', changefreq: 'weekly', priority: '0.9' },
          { path: '/timer', changefreq: 'monthly', priority: '0.8' },
          { path: '/men', changefreq: 'weekly', priority: '0.8' },
          { path: '/answers', changefreq: 'weekly', priority: '0.8' },
          { path: '/men/answers', changefreq: 'weekly', priority: '0.7' },
          { path: '/rules', changefreq: 'monthly', priority: '0.7' },
          { path: '/men/rules', changefreq: 'monthly', priority: '0.7' },
          { path: '/contact', changefreq: 'monthly', priority: '0.5' },
          { path: '/categories/actresses', changefreq: 'weekly' },
          { path: '/categories/musicians', changefreq: 'weekly' },
          { path: '/categories/athletes', changefreq: 'weekly' },
          { path: '/categories/scientists', changefreq: 'weekly' },
          { path: '/categories/politicians', changefreq: 'weekly' },
          { path: '/categories/historical', changefreq: 'weekly' },
          { path: '/categories/business', changefreq: 'weekly' },
          { path: '/categories/activists', changefreq: 'weekly' },
          { path: '/categories/other', changefreq: 'weekly' },
          { path: '/terms', changefreq: 'monthly' },
          { path: '/privacy', changefreq: 'monthly' },
          { path: '/cookie', changefreq: 'monthly' },
        ];

        const alternates = (path: string) => {
          if (!isLocalizedPath(path)) {
            return '';
          }

          const localeLinks = locales
            .map((locale) => {
              const href = `${base}${localizeHref(path, { locale })}`;
              return `\n    <xhtml:link rel="alternate" hreflang="${localeConfig[locale].hreflang}" href="${href}" />`;
            })
            .join('');
          const defaultHref = `${base}${localizeHref(path, {
            locale: baseLocale,
          })}`;
          return `${localeLinks}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultHref}" />`;
        };

        const urlEntry = (
          path: string,
          opts?: { changefreq?: string; priority?: string; lastmod?: string }
        ) => {
          const loc = isLocalizedPath(path)
            ? localizeHref(path, { locale: baseLocale })
            : path;
          const lastmod = opts?.lastmod
            ? `\n    <lastmod>${opts.lastmod}</lastmod>`
            : '';
          const changefreq = opts?.changefreq
            ? `\n    <changefreq>${opts.changefreq}</changefreq>`
            : '';
          const priority = opts?.priority
            ? `\n    <priority>${opts.priority}</priority>`
            : '';
          return `  <url>\n    <loc>${base}${loc}</loc>${alternates(path)}${lastmod}${changefreq}${priority}\n  </url>`;
        };

        const staticPart = staticUrls
          .map((u) =>
            urlEntry(u.path, { changefreq: u.changefreq, priority: u.priority })
          )
          .join('\n');

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticPart}
</urlset>`;

        return new Response(sitemap, {
          headers: {
            'Content-Type': 'application/xml',
          },
        });
      },
    },
  },
});
