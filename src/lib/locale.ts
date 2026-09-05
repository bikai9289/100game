import {
  baseLocale,
  deLocalizeHref,
  getLocale,
  locales,
  localizeHref,
  type Locale,
} from '@/locale/paraglide/runtime';
import { m } from '@/locale/paraglide/messages';

export {
  baseLocale,
  deLocalizeHref,
  getLocale,
  locales,
  localizeHref,
  type Locale,
};

type LocaleConfig = {
  flag?: string;
  name: string;
  hreflang: string;
};

export const localeConfig = {
  en: {
    flag: '🇺🇸',
    name: 'English',
    hreflang: 'en',
  },
} satisfies Record<Locale, LocaleConfig>;

export function parseMessageJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getMessageList(value: string) {
  return parseMessageJson<string[]>(value, []);
}

export function getAuthErrorMessages() {
  return Object.fromEntries(
    parseMessageJson<Array<[string, string]>>(m.auth_error_codes(), [])
  );
}

const authErrorMessageAliases: Record<string, string> = {
  'Invalid email or password': 'invalid_email_or_password',
  'Invalid email or password.': 'invalid_email_or_password',
};

type AuthErrorInput = {
  code?: string;
  message?: string;
};

export function getAuthErrorMessage(error: AuthErrorInput) {
  const messages = getAuthErrorMessages();
  const code = error.code;
  const message = error.message;
  const normalizedCode = code?.toLowerCase();
  const aliasedCode = message ? authErrorMessageAliases[message] : undefined;

  return (
    (code ? messages[code] : undefined) ??
    (normalizedCode ? messages[normalizedCode] : undefined) ??
    (aliasedCode ? messages[aliasedCode] : undefined) ??
    message ??
    m.auth_error_try_again()
  );
}

export function getCanonicalPathname(pathname: string) {
  return deLocalizeHref(pathname).split('?')[0]?.split('#')[0] ?? pathname;
}

/**
 * Paths that are fully translated and should get hreflang alternates
 * in sitemap / SEO metadata.
 */
export const LOCALIZED_PATHS = new Set([
  '/',
  '/changelog',
  '/cookie',
  '/privacy',
  '/terms',
]);

/**
 * True for any user-visible path that exists in every locale and therefore
 * needs hreflang alternates. Used by both
 * `seo()` metadata and the dynamic sitemap.
 */
export function isLocalizedPath(path: string): boolean {
  return LOCALIZED_PATHS.has(path);
}
