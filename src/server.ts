// DO NOT DELETE THIS FILE!!!
// This file is a good smoke test to make sure the custom server entry is working
import handler from '@tanstack/react-start/server-entry';
import { localeMiddleware } from '@/locale/middleware';
import { getCanonicalHostRedirect } from '@/lib/canonical-host';
import { getLegacyLocaleRedirect } from '@/lib/legacy-locale';
import { getRetiredTemplateRedirect } from '@/lib/retired-template-route';

/**
 * TanStack Start server entry
 * https://github.com/backpine/tanstack-start-on-cloudflare/blob/main/src/server.ts
 */
console.log("[server-entry]: using custom server entry in 'src/server.ts'");

export default {
  fetch(request: Request) {
    const canonicalHostRedirect = getCanonicalHostRedirect(request.url);

    if (canonicalHostRedirect) {
      return Response.redirect(canonicalHostRedirect, 301);
    }

    const retiredTemplateRedirect = getRetiredTemplateRedirect(request.url);

    if (retiredTemplateRedirect) {
      return Response.redirect(retiredTemplateRedirect, 301);
    }

    const legacyLocaleRedirect = getLegacyLocaleRedirect(request.url);

    if (legacyLocaleRedirect) {
      return Response.redirect(legacyLocaleRedirect, 301);
    }

    return localeMiddleware(request, () =>
      handler.fetch(request, {
        context: {
          fromFetch: true,
        },
      })
    );
  },
};
